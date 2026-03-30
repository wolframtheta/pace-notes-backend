import {
  Injectable,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  lineString,
  length,
  along,
  center,
  nearestPointOnLine,
  point,
} from '@turf/turf';
import type { Feature, LineString, Position } from 'geojson';

/** Tolerància ~1 m per considerar que dos nodes OSM coincideixen (junction entre ways). */
const COORD_EPS = 1e-5;

/** BBox: south,west,north,east — Catalunya aproximada, després Espanya. */
const BBOX_CATALONIA = '40.52,0.15,42.95,3.35';
const BBOX_SPAIN = '35.85,-9.55,43.95,4.65';

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';

export interface RoadPointResult {
  lat: number;
  lng: number;
  source: 'overpass' | 'overpass_milestone' | 'nominatim';
  /** PK des d’OSM és aproximat respecte al punt quilomètric oficial. */
  approximate: boolean;
  detail?: string;
}

interface OverpassWayElement {
  type: string;
  geometry?: Array<{ lon: number; lat: number }>;
}

interface OverpassNodeElement {
  type: string;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

/** Distància màxima (km) de la fita a la línia OSM per acceptar-la. */
const MILESTONE_MAX_OFFSET_KM = 2;

/** Mínim de fites vàlides per calibrar PK per interpolació. */
const MILESTONE_MIN_CALIBRATION = 2;

@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  parseKmParam(km?: string): number | undefined {
    if (km === undefined || km === null || String(km).trim() === '') {
      return undefined;
    }
    const n = parseFloat(String(km).trim().replace(',', '.'));
    if (Number.isNaN(n) || n < 0) return undefined;
    return n;
  }

  async roadPoint(ref: string, km?: number): Promise<RoadPointResult> {
    const r = ref?.trim();
    if (!r) {
      throw new HttpException('El paràmetre ref és obligatori', HttpStatus.BAD_REQUEST);
    }

    if (km !== undefined) {
      const pk = await this.tryOverpassAlong(r, km, BBOX_CATALONIA);
      if (pk) return pk;
      const pkEs = await this.tryOverpassAlong(r, km, BBOX_SPAIN);
      if (pkEs) return pkEs;
    }

    const centerPt = await this.tryOverpassCenter(r, BBOX_CATALONIA);
    if (centerPt) return centerPt;
    const centerEs = await this.tryOverpassCenter(r, BBOX_SPAIN);
    if (centerEs) return centerEs;

    const nom = await this.nominatimSearch(r);
    if (nom) return nom;

    throw new HttpException(
      'No s\'ha trobat la carretera. Prova sense PK o revisa la denominació.',
      HttpStatus.NOT_FOUND,
    );
  }

  private async tryOverpassAlong(
    ref: string,
    km: number,
    bbox: string,
  ): Promise<RoadPointResult | null> {
    const line = await this.fetchMergedRoadCenterline(ref, bbox);
    if (!line) return null;

    const milestone = await this.tryPkCalibratedWithMilestones(ref, km, line, bbox);
    if (milestone) return milestone;

    return this.rawAlongLineFromKm(line, km);
  }

  /**
   * Calibra el PK amb nodes highway=milestone (etiqueta distance + ref): orientació de la línia
   * i chainage per interpolació. Més proper al PK oficial que `along(línia, km)` des de l’extrem OSM.
   */
  private async tryPkCalibratedWithMilestones(
    ref: string,
    km: number,
    line: Feature<LineString>,
    bbox: string,
  ): Promise<RoadPointResult | null> {
    const raw = await this.fetchMilestoneCalibration(ref, bbox);
    if (raw.length < MILESTONE_MIN_CALIBRATION) {
      return null;
    }

    let workLine = line;
    let pairs = this.projectMilestonesOnLine(workLine, raw);
    if (pairs.length < MILESTONE_MIN_CALIBRATION) {
      return null;
    }

    if (this.pkChainageCorrelationNegative(pairs)) {
      workLine = this.reverseLineString(workLine);
      pairs = this.projectMilestonesOnLine(workLine, raw);
      if (pairs.length < MILESTONE_MIN_CALIBRATION) {
        return null;
      }
    }

    const byPk = this.averageChainageByPk(pairs);
    const sorted = [...byPk.entries()]
      .map(([pk, c]) => ({ pk, c }))
      .sort((a, b) => a.pk - b.pk);

    const lenKm = length(workLine, { units: 'kilometers' });
    const chainageKm = this.interpolateChainageKm(sorted, km, lenKm);
    const clamped = Math.min(Math.max(chainageKm, 0), Math.max(lenKm - 1e-9, 0));
    const pt = along(workLine, clamped, { units: 'kilometers' });
    const [lng, lat] = pt.geometry.coordinates;

    return {
      lat,
      lng,
      source: 'overpass_milestone',
      approximate: true,
      detail: `PK ~${km} km (calibrat amb ${sorted.length} fita(es) OSM sobre la línia; longitud traç ~${lenKm.toFixed(2)} km).`,
    };
  }

  private rawAlongLineFromKm(line: Feature<LineString>, km: number): RoadPointResult {
    const lenKm = length(line, { units: 'kilometers' });
    const dist = Math.min(km, Math.max(0, lenKm - 1e-9));
    const pt = along(line, dist, { units: 'kilometers' });
    const [lng, lat] = pt.geometry.coordinates;
    return {
      lat,
      lng,
      source: 'overpass',
      approximate: true,
      detail: `PK ~${km} km al llarg del traç OSM (~${lenKm.toFixed(2)} km). Sense prou fites PK mapades; orientació des de l’extrem de la línia fusionada.`,
    };
  }

  private reverseLineString(feat: Feature<LineString>): Feature<LineString> {
    const coords = [...feat.geometry.coordinates].reverse();
    return lineString(coords);
  }

  private parseMilestoneDistanceTag(v: string | undefined): number | undefined {
    if (v === undefined || v === null) return undefined;
    const s = String(v).trim().replace(',', '.');
    const m = s.match(/^([\d.]+)/);
    if (!m) return undefined;
    const n = parseFloat(m[1]);
    return Number.isNaN(n) || n < 0 ? undefined : n;
  }

  /** ref de cerca (p.ex. C-16) vs etiqueta ref OSM (pot ser "C-16; C-55"). */
  private refMatchesMilestone(refQuery: string, refTag: string | undefined): boolean {
    if (!refTag?.trim()) return false;
    const q = refQuery.trim().toUpperCase().replace(/\s+/g, '');
    const parts = refTag.split(/[;/|]/).map((p) => p.trim().toUpperCase().replace(/\s+/g, ''));
    return parts.some((p) => p === q);
  }

  private async fetchMilestoneCalibration(
    ref: string,
    bbox: string,
  ): Promise<Array<{ lat: number; lng: number; pk: number }>> {
    const data = await this.runOverpassMilestones(ref, bbox);
    const elements = (data?.elements ?? []) as OverpassNodeElement[];
    const out: Array<{ lat: number; lng: number; pk: number }> = [];

    for (const el of elements) {
      if (el.type !== 'node' || el.lat === undefined || el.lon === undefined) continue;
      const tags = el.tags ?? {};
      const pk = this.parseMilestoneDistanceTag(tags.distance ?? tags.pk);
      if (pk === undefined) continue;
      const refTag = tags.ref ?? tags.nat_ref;
      if (!this.refMatchesMilestone(ref, refTag)) continue;
      out.push({ lat: el.lat, lng: el.lon, pk });
    }

    return out;
  }

  private projectMilestonesOnLine(
    line: Feature<LineString>,
    raw: Array<{ lat: number; lng: number; pk: number }>,
  ): Array<{ pk: number; chainageKm: number }> {
    const pairs: Array<{ pk: number; chainageKm: number }> = [];
    for (const m of raw) {
      const np = nearestPointOnLine(line, point([m.lng, m.lat]), {
        units: 'kilometers',
      });
      const offset = np.properties.dist ?? np.properties.pointDistance;
      if (offset !== undefined && offset > MILESTONE_MAX_OFFSET_KM) {
        continue;
      }
      const loc = np.properties.location;
      if (typeof loc !== 'number' || loc < 0) continue;
      pairs.push({ pk: m.pk, chainageKm: loc });
    }
    return pairs;
  }

  private pkChainageCorrelationNegative(
    pairs: Array<{ pk: number; chainageKm: number }>,
  ): boolean {
    if (pairs.length < 2) return false;
    const meanPk =
      pairs.reduce((s, p) => s + p.pk, 0) / pairs.length;
    const meanC =
      pairs.reduce((s, p) => s + p.chainageKm, 0) / pairs.length;
    let num = 0;
    let denPk = 0;
    let denC = 0;
    for (const p of pairs) {
      const dp = p.pk - meanPk;
      const dc = p.chainageKm - meanC;
      num += dp * dc;
      denPk += dp * dp;
      denC += dc * dc;
    }
    const denom = Math.sqrt(denPk) * Math.sqrt(denC);
    if (denom < 1e-12) return false;
    return num / denom < 0;
  }

  /** Mitjana de chainage per mateix PK (diverses fites al mateix valor). */
  private averageChainageByPk(
    pairs: Array<{ pk: number; chainageKm: number }>,
  ): Map<number, number> {
    const acc = new Map<number, { sum: number; n: number }>();
    for (const p of pairs) {
      const cur = acc.get(p.pk) ?? { sum: 0, n: 0 };
      cur.sum += p.chainageKm;
      cur.n += 1;
      acc.set(p.pk, cur);
    }
    const out = new Map<number, number>();
    for (const [pk, { sum, n }] of acc) {
      out.set(pk, sum / n);
    }
    return out;
  }

  private interpolateChainageKm(
    sorted: Array<{ pk: number; c: number }>,
    targetPk: number,
    lineLenKm: number,
  ): number {
    if (sorted.length === 0) return 0;
    if (sorted.length === 1) {
      const { pk, c } = sorted[0];
      if (pk <= 1e-9) return Math.min(Math.max(targetPk, 0), lineLenKm);
      const ratio = targetPk / pk;
      return Math.min(Math.max(ratio * c, 0), lineLenKm);
    }

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (targetPk <= first.pk) {
      if (sorted.length >= 2) {
        const b = sorted[1];
        const slope = (b.c - first.c) / (b.pk - first.pk || 1e-9);
        return Math.min(Math.max(first.c + slope * (targetPk - first.pk), 0), lineLenKm);
      }
      const slope = first.pk > 1e-9 ? first.c / first.pk : 0;
      return Math.min(Math.max(slope * targetPk, 0), lineLenKm);
    }

    if (targetPk >= last.pk) {
      if (sorted.length >= 2) {
        const prev = sorted[sorted.length - 2];
        const slope = (last.c - prev.c) / (last.pk - prev.pk || 1e-9);
        return Math.min(Math.max(last.c + slope * (targetPk - last.pk), 0), lineLenKm);
      }
      return Math.min(last.c, lineLenKm);
    }

    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i];
      const b = sorted[i + 1];
      if (targetPk >= a.pk && targetPk <= b.pk) {
        const t = (targetPk - a.pk) / (b.pk - a.pk || 1e-9);
        return a.c + t * (b.c - a.c);
      }
    }

    return Math.min(Math.max(targetPk, 0), lineLenKm);
  }

  private async runOverpassMilestones(
    ref: string,
    bbox: string,
  ): Promise<{ elements: unknown[] }> {
    const escaped = ref.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
    const query = `
[out:json][timeout:60];
(
  node["highway"="milestone"]["ref"~"${escaped}",i](${bbox});
  node["highway"="milestone"]["nat_ref"~"${escaped}",i](${bbox});
);
out;
`.trim();

    try {
      const res = await fetch(OVERPASS_URL, {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
      if (!res.ok) {
        this.logger.warn(`Overpass milestones HTTP ${res.status}`);
        return { elements: [] };
      }
      return (await res.json()) as { elements: unknown[] };
    } catch (e) {
      this.logger.warn(`Overpass milestones error: ${e}`);
      return { elements: [] };
    }
  }

  private async tryOverpassCenter(
    ref: string,
    bbox: string,
  ): Promise<RoadPointResult | null> {
    const line = await this.fetchMergedRoadCenterline(ref, bbox);
    if (!line) return null;

    const c = center(line);
    const [lng, lat] = c.geometry.coordinates;

    return {
      lat,
      lng,
      source: 'overpass',
      approximate: true,
      detail: 'Centre de la carretera OSM fusionada (sense PK).',
    };
  }

  /**
   * Obté una sola línia amb tots els ways amb la mateixa ref connectats en cadena,
   * i en cas de diversos trams desconnectats (mateix ref en zones diferents),
   * retorna el component fusionat amb més quilòmetres de longitud.
   */
  private async fetchMergedRoadCenterline(
    ref: string,
    bbox: string,
  ): Promise<Feature<LineString> | null> {
    const segments = await this.fetchWaySegments(ref, bbox);
    if (segments.length === 0) return null;

    const components = this.clusterSegmentsBySharedEndpoints(segments);
    let bestLine: Feature<LineString> | null = null;
    let bestLenKm = 0;

    for (const comp of components) {
      const merged = this.mergeConnectedSegmentsToPolyline(comp);
      if (!merged || merged.length < 2) continue;
      const feat = lineString(merged);
      const lenKm = length(feat, { units: 'kilometers' });
      if (lenKm > bestLenKm) {
        bestLenKm = lenKm;
        bestLine = feat;
      }
    }

    return bestLine;
  }

  private async fetchWaySegments(ref: string, bbox: string): Promise<Position[][]> {
    const data = await this.runOverpass(ref, bbox);
    const elements = (data?.elements ?? []) as OverpassWayElement[];
    const segments: Position[][] = [];

    for (const el of elements) {
      if (el.type !== 'way' || !Array.isArray(el.geometry)) continue;
      const coords: Position[] = el.geometry.map((n) => [n.lon, n.lat]);
      if (coords.length < 2) continue;
      segments.push(coords);
    }

    return segments;
  }

  /** Cada component és la llista de segments (ways) que comparteixen extrems. */
  private clusterSegmentsBySharedEndpoints(
    segments: Position[][],
  ): Position[][][] {
    const n = segments.length;
    if (n === 0) return [];
    const adj: number[][] = Array.from({ length: n }, () => []);
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (this.segmentsShareEndpoint(segments[i], segments[j])) {
          adj[i].push(j);
          adj[j].push(i);
        }
      }
    }
    const visited = new Set<number>();
    const components: Position[][][] = [];
    for (let i = 0; i < n; i++) {
      if (visited.has(i)) continue;
      const stack = [i];
      visited.add(i);
      const idxs: number[] = [];
      while (stack.length) {
        const u = stack.pop()!;
        idxs.push(u);
        for (const v of adj[u]) {
          if (!visited.has(v)) {
            visited.add(v);
            stack.push(v);
          }
        }
      }
      components.push(idxs.map((k) => segments[k]));
    }
    return components;
  }

  private segmentsShareEndpoint(a: Position[], b: Position[]): boolean {
    const a0 = a[0],
      a1 = a[a.length - 1];
    const b0 = b[0],
      b1 = b[b.length - 1];
    return (
      this.coordsEqual(a0, b0) ||
      this.coordsEqual(a0, b1) ||
      this.coordsEqual(a1, b0) ||
      this.coordsEqual(a1, b1)
    );
  }

  private coordsEqual(p: Position, q: Position): boolean {
    return (
      Math.abs(p[0] - q[0]) < COORD_EPS && Math.abs(p[1] - q[1]) < COORD_EPS
    );
  }

  /**
   * Ordena i concatena segments en un sol recorregut seguint la cadena OSM (node a node).
   */
  private mergeConnectedSegmentsToPolyline(segs: Position[][]): Position[] | null {
    if (segs.length === 0) return null;
    if (segs.length === 1) return [...segs[0]];

    const key = (p: Position) =>
      `${p[0].toFixed(6)},${p[1].toFixed(6)}`;
    const counts = new Map<string, number>();
    for (const seg of segs) {
      counts.set(key(seg[0]), (counts.get(key(seg[0])) ?? 0) + 1);
      counts.set(
        key(seg[seg.length - 1]),
        (counts.get(key(seg[seg.length - 1])) ?? 0) + 1,
      );
    }

    let startPoint: Position | null = null;
    for (const [k, c] of counts) {
      if (c !== 1) continue;
      for (const seg of segs) {
        if (key(seg[0]) === k) {
          startPoint = seg[0];
          break;
        }
        if (key(seg[seg.length - 1]) === k) {
          startPoint = seg[seg.length - 1];
          break;
        }
      }
      if (startPoint) break;
    }
    if (!startPoint) {
      startPoint = segs[0][0];
    }

    const used = new Set<number>();
    let path: Position[] = [];
    let segIdx = -1;
    let reversed = false;
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i];
      if (this.coordsEqual(s[0], startPoint)) {
        segIdx = i;
        reversed = false;
        break;
      }
      if (this.coordsEqual(s[s.length - 1], startPoint)) {
        segIdx = i;
        reversed = true;
        break;
      }
    }
    if (segIdx === -1) {
      return this.mergeGreedyPairwise(segs);
    }

    const first = reversed ? [...segs[segIdx]].reverse() : [...segs[segIdx]];
    path = first;
    used.add(segIdx);
    let currentEnd = path[path.length - 1];

    while (used.size < segs.length) {
      let found = -1;
      let extension: Position[] | null = null;
      for (let i = 0; i < segs.length; i++) {
        if (used.has(i)) continue;
        const s = segs[i];
        if (this.coordsEqual(s[0], currentEnd)) {
          found = i;
          extension = s;
          break;
        }
        if (this.coordsEqual(s[s.length - 1], currentEnd)) {
          found = i;
          extension = [...s].reverse();
          break;
        }
      }
      if (found === -1 || !extension) {
        return this.mergeGreedyPairwise(segs);
      }
      path = path.concat(extension.slice(1));
      currentEnd = path[path.length - 1];
      used.add(found);
    }

    return path;
  }

  /** Fallback: fusiona parells mentre comparteixin extrem (topologia no lineal o junctions). */
  private mergeGreedyPairwise(segs: Position[][]): Position[] | null {
    let list = segs.map((s) => [...s]);
    while (list.length > 1) {
      let merged = false;
      outer: for (let i = 0; i < list.length; i++) {
        for (let j = i + 1; j < list.length; j++) {
          const m = this.mergeTwoPolylinesAtEndpoints(list[i], list[j]);
          if (m) {
            list.splice(j, 1);
            list.splice(i, 1);
            list.push(m);
            merged = true;
            break outer;
          }
        }
      }
      if (!merged) {
        let best: Position[] = list[0];
        let bestLen = length(lineString(best), { units: 'kilometers' });
        for (let k = 1; k < list.length; k++) {
          const len = length(lineString(list[k]), { units: 'kilometers' });
          if (len > bestLen) {
            bestLen = len;
            best = list[k];
          }
        }
        return best;
      }
    }
    return list[0] ?? null;
  }

  private mergeTwoPolylinesAtEndpoints(
    a: Position[],
    b: Position[],
  ): Position[] | null {
    const a0 = a[0],
      a1 = a[a.length - 1];
    const b0 = b[0],
      b1 = b[b.length - 1];
    if (this.coordsEqual(a1, b0)) return [...a, ...b.slice(1)];
    if (this.coordsEqual(a1, b1)) return [...a, ...[...b].reverse().slice(1)];
    if (this.coordsEqual(a0, b1)) return [...b, ...a.slice(1)];
    if (this.coordsEqual(a0, b0)) return [...[...a].reverse(), ...b.slice(1)];
    return null;
  }

  private async runOverpass(
    ref: string,
    bbox: string,
  ): Promise<{ elements: unknown[] }> {
    const escaped = ref.replace(/[\\^$*+?.()|[\]{}]/g, '\\$&');
    const query = `
[out:json][timeout:60];
(
  way["ref"~"${escaped}"](${bbox});
);
out geom;
`.trim();

    try {
      const res = await fetch(OVERPASS_URL, {
        method: 'POST',
        body: query,
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
      });
      if (!res.ok) {
        this.logger.warn(`Overpass HTTP ${res.status}`);
        return { elements: [] };
      }
      return (await res.json()) as { elements: unknown[] };
    } catch (e) {
      this.logger.warn(`Overpass error: ${e}`);
      return { elements: [] };
    }
  }

  private async nominatimSearch(ref: string): Promise<RoadPointResult | null> {
    const q = `${ref}, Catalunya, Spain`;
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('q', q);
    url.searchParams.set('format', 'json');
    url.searchParams.set('limit', '1');

    try {
      const res = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'BarrufaNotes/1.0 (editor de traçats; contacte: dev@local)',
          Accept: 'application/json',
        },
      });
      if (!res.ok) return null;
      const json = (await res.json()) as Array<{ lat: string; lon: string }>;
      if (!json?.length) return null;
      const lat = parseFloat(json[0].lat);
      const lng = parseFloat(json[0].lon);
      if (Number.isNaN(lat) || Number.isNaN(lng)) return null;

      return {
        lat,
        lng,
        source: 'nominatim',
        approximate: true,
        detail: 'Resultat de cerca Nominatim (sense geometria de carretera).',
      };
    } catch (e) {
      this.logger.warn(`Nominatim error: ${e}`);
      return null;
    }
  }
}
