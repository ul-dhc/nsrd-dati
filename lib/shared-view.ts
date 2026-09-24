const choice = <T extends string | number>(...values: T[]) => (value: unknown): T => {
  if (!values.includes(value as T)) throw new Error('Invalid option');
  return value as T;
};
const number = (min: number, max: number) => (value: unknown): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < min || value > max) throw new Error('Invalid number');
  return value;
};
const text = (value: unknown): string => {
  if (typeof value !== 'string' || value.length > 500) throw new Error('Invalid text');
  return value;
};
const bool = (value: unknown): boolean => {
  if (typeof value !== 'boolean') throw new Error('Invalid boolean');
  return value;
};
const list = <T>(validate: (value: unknown) => T) => (value: unknown): T[] => {
  if (!Array.isArray(value) || value.length > 1000) throw new Error('Invalid list');
  return value.map(validate);
};
const point = (value: unknown): { x: number; y: number } => {
  if (!value || typeof value !== 'object') throw new Error('Invalid point');
  const p = value as Record<string, unknown>;
  return { x: number(-1e7, 1e7)(p.x), y: number(-1e7, 1e7)(p.y) };
};
const nodeType = choice('person', 'artifact', 'group', 'format', 'institution');
const schema = {
  locale: choice('lv', 'en'), theme: choice('light', 'dark'), textSize: choice(16, 18, 20),
  palette: choice('archive', 'neon', 'autumn', 'pastel', 'vivid', 'bolderaja'),
  personQuery: text, artifactQuery: text, format: text,
  yearRange: (value: unknown): number[] => {
    const years = list(number(0, 9999))(value);
    if (years.length !== 2 || years[0] > years[1]) throw new Error('Invalid years');
    return years;
  },
  visibleTypes: list(nodeType), multiSelect: bool, selectionLogic: choice('any', 'all'), selectedIds: list(text),
  layoutMode: choice('force', 'hierarchical', 'bipartite'), leftType: nodeType, rightType: nodeType,
  motionFrozen: bool, networkMotionStyle: choice('drift', 'orbit', 'chaos'), networkMotionIntensity: number(10, 200),
  animationStyle: choice('none', 'rain', 'echo', 'wave'), visualizationStyle: choice('standard', 'pencil'),
  nodeShapeMode: choice('circle', 'category'), appView: choice('network', 'dashboard'), labelMode: choice('none', 'active', 'all'),
  graphLabelScale: number(.5, 3), nodeScale: number(.1, 2), zoom: number(.35, 8), pan: point,
  driftClock: number(0, 1e12), controlsPanelOpen: bool, inspectorPanelOpen: bool,
  manualPositions: (value: unknown): Record<string, { x: number; y: number }> => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid positions');
    const entries = Object.entries(value);
    if (entries.length > 1000) throw new Error('Too many positions');
    return Object.fromEntries(entries.map(([id, p]) => [text(id), point(p)]));
  },
};
export type SharedView = { [K in keyof typeof schema]: ReturnType<typeof schema[K]> };
export const SHARE_PREFIX = '#view=';

export function encodeSharedView(view: SharedView): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ v: 1, ...view }));
  return SHARE_PREFIX + btoa(Array.from(bytes, (byte) => String.fromCharCode(byte)).join('')).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '');
}

export function decodeSharedView(hash: string): SharedView | null {
  if (!hash.startsWith(SHARE_PREFIX) || hash.length > 250000) return null;
  try {
    const encoded = hash.slice(SHARE_PREFIX.length);
    if (!/^[A-Za-z0-9_-]+$/.test(encoded)) return null;
    const binary = atob(encoded.replaceAll('-', '+').replaceAll('_', '/'));
    const raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0))));
    if (!raw || raw.v !== 1) return null;
    const result = Object.fromEntries(Object.entries(schema).map(([key, validate]) => [key, validate(raw[key])])) as SharedView;
    if (result.leftType === result.rightType) return null;
    return result;
  } catch {
    return null;
  }
}
