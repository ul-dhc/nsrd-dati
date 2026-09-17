'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import {
  Check,
  ChevronRight,
  CircleHelp,
  Eye,
  EyeOff,
  FilterX,
  Info,
  Moon,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pause,
  Play,
  RotateCcw,
  Search,
  Settings2,
  Sun,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import dataset from '@/data/nsrd-seque.json';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';

type EventRecord = (typeof dataset.events)[number];
type PersonRecord = (typeof dataset.people)[number];
type NodeType = 'person' | 'artifact' | 'format' | 'group' | 'institution';
type LayoutMode = 'force' | 'hierarchical' | 'bipartite';
type Locale = 'lv' | 'en';
type Theme = 'light' | 'dark';
type TextSize = 16 | 18 | 20;
type PaletteId = 'archive' | 'neon' | 'autumn' | 'pastel' | 'vivid';
type SelectionLogic = 'any' | 'all';
type LabelMode = 'active' | 'all' | 'none';
type GraphLabelScale = 1 | 1.25 | 1.5;
type AnimationStyle = 'none' | 'rain' | 'echo' | 'wave';
type GraphNode = { id: string; payloadId: string; label: string; type: NodeType; degree: number; x: number; y: number };
type GraphEdge = { source: string; target: string; weight: number; contexts: string[] };
type Graph = { nodes: GraphNode[]; edges: GraphEdge[]; types: NodeType[] };
type Point = { x: number; y: number };

const events = dataset.events as EventRecord[];
const people = dataset.people as PersonRecord[];
const formats = dataset.meta.formats.map((item) => item.format);
const typeLabels: Record<Locale, Record<NodeType, string>> = {
  lv: { person: 'Persona', artifact: 'Artefakts', format: 'Formāts', group: 'Grupa / autors', institution: 'Institūcija' },
  en: { person: 'Person', artifact: 'Artifact', format: 'Format', group: 'Group / artist', institution: 'Institution' },
};

const optionalTypes: NodeType[] = ['person', 'format', 'group', 'institution'];
const nodeTypeOrder: NodeType[] = ['person', 'group', 'artifact', 'format', 'institution'];
const layoutLabels: Record<Locale, Record<LayoutMode, string>> = {
  lv: { force: 'Brīvais', hierarchical: 'Hierarhisks', bipartite: 'Divdaļīgs' },
  en: { force: 'Free', hierarchical: 'Hierarchical', bipartite: 'Bipartite' },
};
const nextLabelMode: Record<LabelMode, LabelMode> = { none: 'active', active: 'all', all: 'none' };
const nextTextSize: Record<TextSize, TextSize> = { 16: 18, 18: 20, 20: 16 };
const nextGraphLabelScale: Record<GraphLabelScale, GraphLabelScale> = { 1: 1.25, 1.25: 1.5, 1.5: 1 };
const animationStyleOptions: Array<{ id: AnimationStyle; lv: string; en: string }> = [
  { id: 'none', lv: 'Nav', en: 'None' },
  { id: 'rain', lv: 'Lietus', en: 'Rain' },
  { id: 'echo', lv: 'Atbalss', en: 'Echo' },
  { id: 'wave', lv: 'Vilnis', en: 'Wave' },
];
const paletteOptions: Array<{ id: PaletteId; lv: string; en: string; colors: string[] }> = [
  { id: 'archive', lv: 'Arhīva spektrs', en: 'Archive Spectrum', colors: ['#c83f00', '#f4a000', '#cf0060', '#114b94', '#02a49f'] },
  { id: 'neon', lv: 'Neona nakts', en: 'Neon Night', colors: ['#0D0D0D', '#00FF85', '#1E90FF', '#FF0099', '#FFFFFF'] },
  { id: 'autumn', lv: 'Dzintara rudens', en: 'Amber Autumn', colors: ['#1C1C1C', '#FF6F61', '#DAA520', '#FF4500', '#F5E8D8'] },
  { id: 'pastel', lv: 'Pasteļu krēsla', en: 'Pastel Twilight', colors: ['#2C2C2C', '#A8DADC', '#FFC1CC', '#B39CD0', '#E4E4E4'] },
  { id: 'vivid', lv: 'Košais impulss', en: 'Vivid Pulse', colors: ['#181818', '#FF5722', '#673AB7', '#FFEB3B', '#F7F7F7'] },
];
const labelModeNames: Record<Locale, Record<LabelMode, string>> = {
  lv: { none: 'nosaukumi paslēpti', active: 'nosaukumi aktīvajiem mezgliem', all: 'visu mezglu nosaukumi' },
  en: { none: 'labels hidden', active: 'labels for active nodes', all: 'labels for all nodes' },
};
const ui = {
  lv: {
    brand: 'NSRD / SEQUE', product: 'NSRD un Seque ierakstu un personu tīkla vizualizācija', explore: 'Saikņu izpēte', networkLayers: 'Tīkla slāņi', showInNetwork: 'Rādīt tīklā',
    searchPerson: 'Meklēt personu', personPlaceholder: 'Sāc rakstīt vārdu…', clearPerson: 'Notīrīt personas meklējumu', searchArtifact: 'Meklēt artefaktu', artifactPlaceholder: 'Sāc rakstīt nosaukumu…', clearArtifact: 'Notīrīt artefakta meklējumu',
    years: 'Gadu diapazons', format: 'Formāts', allFormats: 'Visi formāti', multi: 'Vairāku mezglu atlase', multiHelp: 'Klikšķini, lai pievienotu vai noņemtu', clearFilters: 'Notīrīt filtrus',
    view: 'Skats', left: 'Pa kreisi', right: 'Pa labi', move: 'Kustināt', freeze: 'Fiksēt', compact: 'Sablīvēt tīklu', spread: 'Izretināt tīklu', distance: 'Attālums starp mezgliem', legend: 'Leģenda',
    labels: 'Nosaukumi', labelClick: 'Klikšķini, lai pārslēgtu režīmu.', graphTextSize: 'Tīkla nosaukumu izmērs', networkAria: 'NSRD un Seque daudzslāņu saikņu tīkls', links: 'saites', nodes: 'mezgli', artifacts: 'artefakti',
    noData: 'Šai filtru kombinācijai datu nav', noDataHelp: 'Maini periodu, formātu vai meklējumu.', dragHelp: 'Velc mezglu, lai to pārvietotu; velc tukšā vietā, lai pārbīdītu visu tīklu.', clearSelection: 'Notīrīt atlasi',
    selectionResults: 'Atlases rezultāti', filteredData: 'Filtrētie dati', personsShort: 'pers.', noArtifacts: 'Atlasē nav artefaktu.', showLess: 'Rādīt mazāk', more: '+ vēl',
    selection: 'Atlase', selectedSet: 'Izvēlētā kopa', any: 'Vismaz viens', all: 'Visi izvēlētie', persons: 'Personas', period: 'Periods', formats: 'Formāti', frequent: 'Biežākie līdzdalībnieki', formatDistribution: 'Formātu sadalījums', related: 'Saistītie artefakti', artifactInfo: 'Artefakta informācija', place: 'Vieta', participants: 'Dalībnieki', missing: 'Nav norādīta',
    choose: 'Izvēlies mezglu vai kopu', chooseHelp: 'Klikšķini tīklā, lai izceltu saites un saņemtu atlasīto datu kopsavilkumu.', currently: 'Pašlaik filtrā', hideFilters: 'Paslēpt tīkla slāņu paneli', showFilters: 'Parādīt tīkla slāņu paneli', hideDetails: 'Paslēpt detaļu paneli', showDetails: 'Parādīt detaļu paneli', light: 'Ieslēgt gaišo režīmu', dark: 'Ieslēgt tumšo režīmu', language: 'Switch to English', textSize: 'Mainīt teksta izmēru', settings: 'Iestatījumi', closeSettings: 'Aizvērt iestatījumus', palette: 'Krāsu palete', graphMotion: 'Tīkla kustība', dynamic: 'Kustīgs', static: 'Statisks', motionHelp: 'Statiskais režīms aptur mezglu kustību un saišu animāciju.', animationStyle: 'Animācijas stils', animationHelpNone: 'Bez papildu nepārtrauktas animācijas.', animationHelpRain: 'Nepārtraukta saišu plūsma hierarhiskajā un divdaļīgajā skatā.', animationHelpEcho: 'Izvēloties mezglu, impulss izplatās pa tā saitēm.', animationHelpWave: 'Gaismas vilnis periodiski pāriet pāri visam tīklam.', inDevelopment: 'Izstrādes procesā', aboutComing: 'Par projektu — sadaļa tiek veidota',
  },
  en: {
    brand: 'NSRD / SEQUE', product: 'Network visualization of NSRD and Seque recordings and people', explore: 'Explore connections', networkLayers: 'Network layers', showInNetwork: 'Show in network',
    searchPerson: 'Search for a person', personPlaceholder: 'Start typing a name…', clearPerson: 'Clear person search', searchArtifact: 'Search for an artifact', artifactPlaceholder: 'Start typing a title…', clearArtifact: 'Clear artifact search',
    years: 'Year range', format: 'Format', allFormats: 'All formats', multi: 'Select multiple nodes', multiHelp: 'Click to add or remove', clearFilters: 'Clear filters',
    view: 'View', left: 'Left column', right: 'Right column', move: 'Animate', freeze: 'Freeze', compact: 'Compact network', spread: 'Spread network', distance: 'Distance between nodes', legend: 'Legend',
    labels: 'Labels', labelClick: 'Click to change mode.', graphTextSize: 'Network label size', networkAria: 'NSRD and Seque multilayer network', links: 'links', nodes: 'nodes', artifacts: 'artifacts',
    noData: 'No data for this filter combination', noDataHelp: 'Change the period, format, or search.', dragHelp: 'Drag a node to move it; drag empty space to pan the whole network.', clearSelection: 'Clear selection',
    selectionResults: 'Selection results', filteredData: 'Filtered data', personsShort: 'people', noArtifacts: 'No artifacts in this selection.', showLess: 'Show less', more: '+ more',
    selection: 'Selection', selectedSet: 'Selected set', any: 'At least one', all: 'All selected', persons: 'People', period: 'Period', formats: 'Formats', frequent: 'Frequent collaborators', formatDistribution: 'Format distribution', related: 'Related artifacts', artifactInfo: 'Artifact information', place: 'Place', participants: 'Participants', missing: 'Not specified',
    choose: 'Choose a node or set', chooseHelp: 'Click in the network to highlight links and see a summary of the selected data.', currently: 'Currently filtered', hideFilters: 'Hide network layers panel', showFilters: 'Show network layers panel', hideDetails: 'Hide details panel', showDetails: 'Show details panel', light: 'Use light mode', dark: 'Use dark mode', language: 'Pārslēgt uz latviešu valodu', textSize: 'Change text size', settings: 'Settings', closeSettings: 'Close settings', palette: 'Color palette', graphMotion: 'Network motion', dynamic: 'Dynamic', static: 'Static', motionHelp: 'Static mode pauses node motion and link animation.', animationStyle: 'Animation style', animationHelpNone: 'No additional continuous animation.', animationHelpRain: 'Continuous link flow in hierarchical and bipartite views.', animationHelpEcho: 'Selecting a node sends a pulse through its connections.', animationHelpWave: 'A light wave periodically travels across the network.', inDevelopment: 'In development', aboutComing: 'About this project — coming soon',
  },
} as const;
const displayPersonName = (value: string) => {
  const parts = value.split(',').map((part) => part.trim()).filter(Boolean);
  return parts.length > 1 ? `${parts.slice(1).join(' ')} ${parts[0]}` : value;
};
const personSuggestions = people
  .map((person) => ({ value: displayPersonName(person.name), id: `person:${person.name}` }))
  .sort((a, b) => a.value.localeCompare(b.value, 'lv'));
const artifactSuggestions = events
  .map((event) => ({ value: event.title, id: `artifact:${event.id}` }))
  .sort((a, b) => a.value.localeCompare(b.value, 'lv'));

const normalize = (value: string) => value.toLocaleLowerCase('lv-LV').normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const hash = (value: string) => Array.from(value).reduce((result, char) => ((result << 5) - result + char.charCodeAt(0)) | 0, 0);

function buildGraph(sourceEvents: EventRecord[], visibleTypes: Set<NodeType>): Graph {
  const nodes = new Map<string, Omit<GraphNode, 'degree' | 'x' | 'y'>>();
  const edgeMap = new Map<string, GraphEdge>();
  const addNode = (type: NodeType, payloadId: string, label = payloadId) => {
    const id = `${type}:${payloadId}`;
    if (!nodes.has(id)) nodes.set(id, { id, payloadId, label, type });
    return id;
  };
  const addEdge = (source: string, target: string, context: string, amount = 1) => {
    const [a, b] = source.localeCompare(target) < 0 ? [source, target] : [target, source];
    const key = `${a}|${b}`;
    const existing = edgeMap.get(key);
    if (existing) {
      existing.weight += amount;
      if (!existing.contexts.includes(context)) existing.contexts.push(context);
    } else edgeMap.set(key, { source: a, target: b, weight: amount, contexts: [context] });
  };

  sourceEvents.forEach((event) => {
    const artifactId = addNode('artifact', event.id, `${event.title} (${event.year})`);
    if (visibleTypes.has('person')) event.credits.forEach((credit) => addEdge(addNode('person', credit.person, displayPersonName(credit.person)), artifactId, event.id));
    if (visibleTypes.has('format')) addEdge(artifactId, addNode('format', event.format), event.id);
    if (visibleTypes.has('group') && event.artist) addEdge(addNode('group', event.artist), artifactId, event.id);
    if (visibleTypes.has('institution')) event.institutions.forEach((institution) => addEdge(artifactId, addNode('institution', institution), event.id));
  });

  const edges = Array.from(edgeMap.values());
  const degree = new Map<string, number>();
  edges.forEach((edge) => {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + edge.weight);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + edge.weight);
  });
  const rawNodes = Array.from(nodes.values());
  const types = Array.from(new Set(rawNodes.map((node) => node.type)));
  const laidOut = layoutNodes(rawNodes.map((node) => ({ ...node, degree: degree.get(node.id) ?? 0 })), edges, types);
  return { nodes: laidOut, edges, types };
}

function layoutNodes(rawNodes: Array<Omit<GraphNode, 'x' | 'y'>>, edges: GraphEdge[], types: NodeType[]): GraphNode[] {
  const width = 900; const height = 570;
  const anchorFor = (type: NodeType) => {
    if (type === 'artifact' || types.length === 1) return { x: width / 2, y: height / 2 };
    const categories = types.filter((item) => item !== 'artifact');
    const index = Math.max(0, categories.indexOf(type));
    const angle = -Math.PI / 2 + index * ((Math.PI * 2) / Math.max(categories.length, 1));
    return { x: width / 2 + Math.cos(angle) * 335, y: height / 2 + Math.sin(angle) * 225 };
  };
  const nodes = rawNodes.map((node, index) => {
    const sameType = rawNodes.filter((item) => item.type === node.type);
    const itemIndex = sameType.findIndex((item) => item.id === node.id);
    const anchor = anchorFor(node.type);
    const seeded = Math.abs(hash(node.id));
    const angle = itemIndex * 2.39996 + (seeded % 29) / 29;
    const radius = 24 + Math.sqrt(itemIndex) * 24;
    return { ...node, x: anchor.x + Math.cos(angle) * radius, y: anchor.y + Math.sin(angle) * radius + (index % 3) * 2 };
  });
  const indexById = new Map(nodes.map((node, index) => [node.id, index]));
  const vx = new Array(nodes.length).fill(0); const vy = new Array(nodes.length).fill(0);
  for (let iteration = 0; iteration < 95; iteration += 1) {
    for (let i = 0; i < nodes.length; i += 1) for (let j = i + 1; j < nodes.length; j += 1) {
      const dx = nodes[j].x - nodes[i].x; const dy = nodes[j].y - nodes[i].y; const distance = Math.max(1, Math.hypot(dx, dy));
      const minimum = 36 + Math.min(15, Math.sqrt(nodes[i].degree + nodes[j].degree));
      if (distance < minimum) { const force = (minimum - distance) * 0.035; vx[i] -= (dx / distance) * force; vy[i] -= (dy / distance) * force; vx[j] += (dx / distance) * force; vy[j] += (dy / distance) * force; }
    }
    edges.forEach((edge) => {
      const i = indexById.get(edge.source); const j = indexById.get(edge.target); if (i === undefined || j === undefined) return;
      const dx = nodes[j].x - nodes[i].x; const dy = nodes[j].y - nodes[i].y; const distance = Math.max(1, Math.hypot(dx, dy)); const force = (distance - 148) * 0.00165;
      vx[i] += (dx / distance) * force; vy[i] += (dy / distance) * force; vx[j] -= (dx / distance) * force; vy[j] -= (dy / distance) * force;
    });
    nodes.forEach((node, index) => {
      const anchor = anchorFor(node.type);
      vx[index] += (anchor.x - node.x) * 0.0025; vy[index] += (anchor.y - node.y) * 0.0025;
      node.x = Math.max(34, Math.min(width - 34, node.x + vx[index])); node.y = Math.max(32, Math.min(height - 32, node.y + vy[index])); vx[index] *= 0.72; vy[index] *= 0.72;
    });
  }
  return nodes;
}

function layoutHierarchically(graph: Graph): Graph {
  const orderedTypes = nodeTypeOrder.filter((type) => graph.types.includes(type));
  const top = 110; const bottom = 510; const left = 58; const right = 842;
  const nodes = graph.nodes.map((node) => {
    const typeIndex = orderedTypes.indexOf(node.type);
    const sameType = graph.nodes
      .filter((item) => item.type === node.type)
      .sort((a, b) => b.degree - a.degree || a.label.localeCompare(b.label, 'lv'));
    const itemIndex = sameType.findIndex((item) => item.id === node.id);
    const y = orderedTypes.length === 1 ? 285 : top + typeIndex * ((bottom - top) / (orderedTypes.length - 1));
    const x = sameType.length === 1 ? 450 : left + itemIndex * ((right - left) / (sameType.length - 1));
    return { ...node, x, y };
  });
  return { ...graph, nodes, types: orderedTypes };
}

function valuesForType(event: EventRecord, type: NodeType): Array<{ payloadId: string; label: string }> {
  if (type === 'artifact') return [{ payloadId: event.id, label: `${event.title} (${event.year})` }];
  if (type === 'person') return Array.from(new Set(event.credits.map((credit) => credit.person))).map((name) => ({ payloadId: name, label: displayPersonName(name) }));
  if (type === 'format') return event.format ? [{ payloadId: event.format, label: event.format }] : [];
  if (type === 'group') return event.artist ? [{ payloadId: event.artist, label: event.artist }] : [];
  return Array.from(new Set(event.institutions)).map((institution) => ({ payloadId: institution, label: institution }));
}

function buildBipartiteGraph(sourceEvents: EventRecord[], leftType: NodeType, rightType: NodeType): Graph {
  const nodeMap = new Map<string, Omit<GraphNode, 'degree' | 'x' | 'y'>>();
  const edgeMap = new Map<string, GraphEdge>();
  sourceEvents.forEach((event) => {
    const leftValues = valuesForType(event, leftType);
    const rightValues = valuesForType(event, rightType);
    leftValues.forEach((left) => rightValues.forEach((right) => {
      const source = `${leftType}:${left.payloadId}`;
      const target = `${rightType}:${right.payloadId}`;
      nodeMap.set(source, { id: source, payloadId: left.payloadId, label: left.label, type: leftType });
      nodeMap.set(target, { id: target, payloadId: right.payloadId, label: right.label, type: rightType });
      const key = `${source}|${target}`;
      const existing = edgeMap.get(key);
      if (existing) {
        existing.weight += 1;
        if (!existing.contexts.includes(event.id)) existing.contexts.push(event.id);
      } else edgeMap.set(key, { source, target, weight: 1, contexts: [event.id] });
    }));
  });
  const edges = Array.from(edgeMap.values());
  const degree = new Map<string, number>();
  edges.forEach((edge) => {
    degree.set(edge.source, (degree.get(edge.source) ?? 0) + edge.weight);
    degree.set(edge.target, (degree.get(edge.target) ?? 0) + edge.weight);
  });
  const positionColumn = (type: NodeType, x: number) => Array.from(nodeMap.values())
    .filter((node) => node.type === type)
    .sort((a, b) => (degree.get(b.id) ?? 0) - (degree.get(a.id) ?? 0) || a.label.localeCompare(b.label, 'lv'))
    .map((node, index, column) => ({
      ...node,
      degree: degree.get(node.id) ?? 0,
      x,
      y: column.length === 1 ? 285 : 35 + index * (500 / (column.length - 1)),
    }));
  return { nodes: [...positionColumn(leftType, 230), ...positionColumn(rightType, 670)], edges, types: [leftType, rightType] };
}

function eventIdsForNode(node: GraphNode): Set<string> {
  if (node.type === 'artifact') return new Set([node.payloadId]);
  if (node.type === 'person') return new Set(people.find((person) => person.name === node.payloadId)?.eventIds ?? []);
  if (node.type === 'format') return new Set(events.filter((event) => event.format === node.payloadId).map((event) => event.id));
  if (node.type === 'group') return new Set(events.filter((event) => event.artist === node.payloadId).map((event) => event.id));
  return new Set(events.filter((event) => (event.institutions as string[]).includes(node.payloadId)).map((event) => event.id));
}

function NodeShape({ type, radius }: { type: NodeType; radius: number }) {
  if (type === 'person') return <circle className="node-shape" r={radius} />;
  if (type === 'artifact') return <polygon className="node-shape" points={`0,${-radius} ${radius},0 0,${radius} ${-radius},0`} />;
  if (type === 'format') return <rect className="node-shape" x={-radius} y={-radius} width={radius * 2} height={radius * 2} rx={Math.max(2, radius * .2)} />;
  if (type === 'group') return <polygon className="node-shape" points={`0,${-radius} ${radius * .92},${radius * .82} ${-radius * .92},${radius * .82}`} />;
  return <polygon className="node-shape" points={`${-radius * .88},${-radius * .5} 0,${-radius} ${radius * .88},${-radius * .5} ${radius * .88},${radius * .5} 0,${radius} ${-radius * .88},${radius * .5}`} />;
}

const nodeRadius = (node: GraphNode, layoutMode: LayoutMode) => layoutMode === 'force'
  ? Math.min(27, 6 + Math.sqrt(node.degree) * 2.2)
  : Math.min(15, 3.5 + Math.sqrt(node.degree) * 1.45);

export default function Home() {
  const [locale, setLocale] = useState<Locale>('lv');
  const [theme, setTheme] = useState<Theme>('light');
  const [textSize, setTextSize] = useState<TextSize>(16);
  const [palette, setPalette] = useState<PaletteId>('archive');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [controlsPanelOpen, setControlsPanelOpen] = useState(true);
  const [inspectorPanelOpen, setInspectorPanelOpen] = useState(true);
  const [preferencesReady, setPreferencesReady] = useState(false);
  const [personQuery, setPersonQuery] = useState('');
  const [artifactQuery, setArtifactQuery] = useState('');
  const [format, setFormat] = useState('all');
  const [yearRange, setYearRange] = useState<number[]>([dataset.meta.yearStart, dataset.meta.yearEnd]);
  const [visibleTypes, setVisibleTypes] = useState<Set<NodeType>>(new Set(nodeTypeOrder));
  const [multiSelect, setMultiSelect] = useState(false);
  const [selectionLogic, setSelectionLogic] = useState<SelectionLogic>('any');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [layoutMode, setLayoutMode] = useState<LayoutMode>('force');
  const [leftType, setLeftType] = useState<NodeType>('person');
  const [rightType, setRightType] = useState<NodeType>('artifact');
  const [motionFrozen, setMotionFrozen] = useState(false);
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>('none');
  const [labelMode, setLabelMode] = useState<LabelMode>('active');
  const [graphLabelScale, setGraphLabelScale] = useState<GraphLabelScale>(1);
  const [driftClock, setDriftClock] = useState(0);
  const [zoom, setZoom] = useState(.84);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [manualPositions, setManualPositions] = useState<Record<string, Point>>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const hierarchicalInitialized = useRef(false);
  const animationFrame = useRef<number | null>(null);
  const lastFrame = useRef<number | null>(null);
  const panStart = useRef<{ clientX: number; clientY: number; x: number; y: number; moved: boolean } | null>(null);
  const nodePointerStart = useRef<{ id: string; clientX: number; clientY: number; additive: boolean; moved: boolean } | null>(null);
  const dragCluster = useRef<{ pointer: Point; positions: Record<string, Point>; strengths: Record<string, number> } | null>(null);
  const elasticTargets = useRef<Record<string, Point>>({});
  const elasticVelocities = useRef<Record<string, Point>>({});
  const elasticFrame = useRef<number | null>(null);
  const t = ui[locale];
  const currentTypeLabels = typeLabels[locale];
  const animationHelp = {
    none: t.animationHelpNone,
    rain: t.animationHelpRain,
    echo: t.animationHelpEcho,
    wave: t.animationHelpWave,
  }[animationStyle];

  useEffect(() => {
    const savedLocale = window.localStorage.getItem('nsrd-locale');
    const savedTheme = window.localStorage.getItem('nsrd-theme');
    const savedTextSize = Number(window.localStorage.getItem('nsrd-text-size'));
    const savedPalette = window.localStorage.getItem('nsrd-palette');
    const savedMotion = window.localStorage.getItem('nsrd-motion');
    const savedAnimationStyle = window.localStorage.getItem('nsrd-animation-style');
    const savedRainAnimation = window.localStorage.getItem('nsrd-rain-animation');
    const initialLocale = savedLocale === 'lv' || savedLocale === 'en' ? savedLocale : 'lv';
    const initialTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    const initialTextSize: TextSize = savedTextSize === 18 || savedTextSize === 20 ? savedTextSize : 16;
    const initialPalette = paletteOptions.some((option) => option.id === savedPalette) ? savedPalette as PaletteId : 'archive';
    const initialAnimationStyle = savedAnimationStyle
      ? animationStyleOptions.some((option) => option.id === savedAnimationStyle) ? savedAnimationStyle as AnimationStyle : 'none'
      : savedRainAnimation === 'true' ? 'rain' : 'none';
    setLocale(initialLocale);
    setTheme(initialTheme);
    setTextSize(initialTextSize);
    setPalette(initialPalette);
    setMotionFrozen(savedMotion === 'static');
    setAnimationStyle(initialAnimationStyle);
    document.documentElement.lang = initialLocale;
    document.documentElement.classList.toggle('dark', initialTheme === 'dark');
    document.documentElement.style.colorScheme = initialTheme;
    document.documentElement.style.fontSize = `${initialTextSize}px`;
    document.documentElement.dataset.palette = initialPalette;
    setPreferencesReady(true);
  }, []);
  useEffect(() => {
    if (!preferencesReady) return;
    document.documentElement.lang = locale;
    window.localStorage.setItem('nsrd-locale', locale);
  }, [locale, preferencesReady]);
  useEffect(() => {
    if (!preferencesReady) return;
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.style.colorScheme = theme;
    window.localStorage.setItem('nsrd-theme', theme);
  }, [preferencesReady, theme]);
  useEffect(() => {
    if (!preferencesReady) return;
    document.documentElement.style.fontSize = `${textSize}px`;
    window.localStorage.setItem('nsrd-text-size', String(textSize));
  }, [preferencesReady, textSize]);
  useEffect(() => {
    if (!preferencesReady) return;
    document.documentElement.dataset.palette = palette;
    window.localStorage.setItem('nsrd-palette', palette);
  }, [palette, preferencesReady]);
  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem('nsrd-motion', motionFrozen ? 'static' : 'dynamic');
  }, [motionFrozen, preferencesReady]);
  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem('nsrd-animation-style', animationStyle);
  }, [animationStyle, preferencesReady]);
  useEffect(() => {
    if (!settingsOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => { if (event.key === 'Escape') setSettingsOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [settingsOpen]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    return event.year >= yearRange[0] && event.year <= yearRange[1]
      && (format === 'all' || event.format === format);
  }), [format, yearRange]);
  const graph = useMemo(() => {
    if (layoutMode === 'bipartite') return buildBipartiteGraph(filteredEvents, leftType, rightType);
    const baseGraph = buildGraph(filteredEvents, visibleTypes);
    return layoutMode === 'hierarchical' ? layoutHierarchically(baseGraph) : baseGraph;
  }, [filteredEvents, layoutMode, leftType, rightType, visibleTypes]);
  useEffect(() => {
    setManualPositions({});
    setPan({ x: 0, y: 0 });
    setZoom(layoutMode === 'force' ? .84 : 1);
  }, [layoutMode, leftType, rightType]);
  useEffect(() => {
    setManualPositions((current) => Object.fromEntries(Object.entries(current).filter(([id]) => graph.nodes.some((node) => node.id === id))));
  }, [graph]);
  useEffect(() => {
    const animateElasticPull = () => {
      const ids = Object.keys(elasticTargets.current);
      if (ids.length) setManualPositions((current) => {
        const next = { ...current };
        ids.forEach((id) => {
          const target = elasticTargets.current[id];
          if (!target) return;
          const position = next[id] ?? target;
          const velocity = elasticVelocities.current[id] ?? { x: 0, y: 0 };
          const vx = (velocity.x + (target.x - position.x) * .085) * .76;
          const vy = (velocity.y + (target.y - position.y) * .085) * .76;
          next[id] = { x: position.x + vx, y: position.y + vy };
          elasticVelocities.current[id] = { x: vx, y: vy };
          if (!draggingId && Math.hypot(target.x - next[id].x, target.y - next[id].y) < .12 && Math.hypot(vx, vy) < .08) {
            delete elasticTargets.current[id];
            delete elasticVelocities.current[id];
          }
        });
        return next;
      });
      elasticFrame.current = requestAnimationFrame(animateElasticPull);
    };
    elasticFrame.current = requestAnimationFrame(animateElasticPull);
    return () => { if (elasticFrame.current !== null) cancelAnimationFrame(elasticFrame.current); };
  }, [draggingId]);
  useEffect(() => {
    if (motionFrozen || layoutMode !== 'force') { lastFrame.current = null; return; }
    let lastPaint = 0;
    const animate = (time: number) => {
      if (lastFrame.current === null) lastFrame.current = time;
      if (time - lastPaint >= 32) {
        const delta = Math.min(50, time - lastFrame.current);
        setDriftClock((current) => current + delta);
        lastFrame.current = time;
        lastPaint = time;
      }
      animationFrame.current = requestAnimationFrame(animate);
    };
    animationFrame.current = requestAnimationFrame(animate);
    return () => { if (animationFrame.current !== null) cancelAnimationFrame(animationFrame.current); lastFrame.current = null; };
  }, [layoutMode, motionFrozen]);
  const positionedNodes = useMemo(() => graph.nodes.map((node) => {
    const base = manualPositions[node.id] ?? node;
    if (layoutMode !== 'force' || draggingId === node.id) return { ...node, x: base.x, y: base.y };
    const phase = Math.abs(hash(node.id)) % 628 / 100;
    const amplitude = 6 + (Math.abs(hash(`${node.id}:drift`)) % 35) / 10;
    const orbit = driftClock * .00013 + phase;
    const sharedX = Math.sin(driftClock * .000065) * 4;
    const sharedY = Math.cos(driftClock * .000055) * 3;
    return {
      ...node,
      x: Math.round((base.x + sharedX + Math.sin(orbit) * amplitude) * 1000) / 1000,
      y: Math.round((base.y + sharedY + Math.cos(orbit) * amplitude * .76) * 1000) / 1000,
    };
  }), [draggingId, driftClock, graph.nodes, layoutMode, manualPositions]);
  const driftPositionById = useMemo(() => new Map(positionedNodes.map((node) => [node.id, node])), [positionedNodes]);
  const displayNodes = useMemo(() => positionedNodes.map((node) => ({
    ...node,
    x: 450 + (node.x - 450) * zoom + pan.x,
    y: 285 + (node.y - 285) * zoom + pan.y,
  })), [pan, positionedNodes, zoom]);
  const labelPlacementById = useMemo(() => {
    const placements = new Map<string, { x: number; y: number; textAnchor: 'start' | 'middle' | 'end'; rotation?: number }>();
    if (layoutMode === 'force') return placements;

    const orderedTypes = nodeTypeOrder.filter((type) => displayNodes.some((node) => node.type === type));
    orderedTypes.forEach((type) => {
      const sameType = displayNodes.filter((node) => node.type === type).sort((a, b) => layoutMode === 'bipartite'
        ? a.y - b.y || a.label.localeCompare(b.label, 'lv')
        : a.x - b.x || a.label.localeCompare(b.label, 'lv'));
      sameType.forEach((node) => {
        const radius = nodeRadius(node, layoutMode);
        if (layoutMode === 'bipartite') {
          const leftColumn = node.x < 450;
          const direction = leftColumn ? -1 : 1;
          placements.set(node.id, {
            x: direction * (radius + 8),
            y: 3,
            textAnchor: direction < 0 ? 'end' : 'start',
          });
          return;
        }

        const diagonal = sameType.length > 10;
        const leanLeft = diagonal && node.x > 765;
        placements.set(node.id, {
          x: diagonal ? (leanLeft ? -radius - 6 : radius + 6) : 0,
          y: -radius - 8,
          textAnchor: diagonal ? (leanLeft ? 'end' : 'start') : 'middle',
          rotation: diagonal ? (leanLeft ? 45 : -45) : undefined,
        });
      });
    });
    return placements;
  }, [displayNodes, layoutMode]);
  const positionById = useMemo(() => new Map(displayNodes.map((node) => [node.id, node])), [displayNodes]);
  const selectedNodes = selectedIds.map((id) => graph.nodes.find((node) => node.id === id)).filter(Boolean) as GraphNode[];
  useEffect(() => setSelectedIds((current) => current.filter((id) => graph.nodes.some((node) => node.id === id))), [graph]);

  const selectedEventIds = useMemo(() => {
    if (!selectedNodes.length) return new Set(filteredEvents.map((event) => event.id));
    const sets = selectedNodes.map(eventIdsForNode);
    if (selectionLogic === 'all') return new Set(Array.from(sets[0]).filter((id) => sets.every((set) => set.has(id))));
    return new Set(sets.flatMap((set) => Array.from(set)));
  }, [filteredEvents, selectedNodes, selectionLogic]);
  const resultEvents = filteredEvents.filter((event) => selectedEventIds.has(event.id));
  const activeIds = useMemo(() => {
    const result = new Set(selectedIds);
    graph.edges.forEach((edge) => { if (selectedIds.includes(edge.source)) result.add(edge.target); if (selectedIds.includes(edge.target)) result.add(edge.source); });
    return result;
  }, [graph.edges, selectedIds]);
  const echoDistanceById = useMemo(() => {
    const distances = new Map<string, number>();
    if (!selectedIds.length) return distances;
    const adjacent = new Map<string, string[]>();
    graph.edges.forEach((edge) => {
      adjacent.set(edge.source, [...(adjacent.get(edge.source) ?? []), edge.target]);
      adjacent.set(edge.target, [...(adjacent.get(edge.target) ?? []), edge.source]);
    });
    const queue = selectedIds.filter((id) => graph.nodes.some((node) => node.id === id));
    queue.forEach((id) => distances.set(id, 0));
    for (let index = 0; index < queue.length; index += 1) {
      const id = queue[index];
      const distance = distances.get(id) ?? 0;
      (adjacent.get(id) ?? []).forEach((neighbor) => {
        if (distances.has(neighbor)) return;
        distances.set(neighbor, distance + 1);
        queue.push(neighbor);
      });
    }
    return distances;
  }, [graph.edges, graph.nodes, selectedIds]);
  const clearFilters = () => { setPersonQuery(''); setArtifactQuery(''); setFormat('all'); setYearRange([dataset.meta.yearStart, dataset.meta.yearEnd]); setSelectedIds([]); };
  const toggleType = (type: NodeType, checked: boolean) => setVisibleTypes((current) => { const next = new Set(current); if (checked) next.add(type); else next.delete(type); return next; });
  const choosePersonSuggestion = (value: string) => {
    setPersonQuery(value);
    const suggestion = personSuggestions.find((item) => normalize(item.value) === normalize(value));
    if (!suggestion) return;
    setVisibleTypes((current) => new Set([...current, 'person']));
    setSelectedIds([suggestion.id]);
  };
  const chooseArtifactSuggestion = (value: string) => {
    setArtifactQuery(value);
    const suggestion = artifactSuggestions.find((item) => normalize(item.value) === normalize(value));
    if (!suggestion) return;
    setSelectedIds([suggestion.id]);
  };
  const selectNode = (node: GraphNode, additive = false) => setSelectedIds((current) => {
    if (additive || multiSelect) return current.includes(node.id) ? current.filter((id) => id !== node.id) : [...current, node.id];
    if (current.length === 1 && current[0] === node.id) return [];
    return [node.id];
  });
  const pointerToGraph = (clientX: number, clientY: number): Point | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    const svgX = (clientX - rect.left) / rect.width * 900;
    const svgY = (clientY - rect.top) / rect.height * 570;
    return { x: 450 + (svgX - pan.x - 450) / zoom, y: 285 + (svgY - pan.y - 285) / zoom };
  };
  const startDrag = (node: GraphNode, event: ReactPointerEvent<SVGGElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const current = driftPositionById.get(node.id) ?? node;
    const pointer = pointerToGraph(event.clientX, event.clientY) ?? current;
    const linkedEdges = layoutMode === 'force' ? graph.edges.filter((edge) => edge.source === node.id || edge.target === node.id) : [];
    const maxWeight = Math.max(1, ...linkedEdges.map((edge) => edge.weight));
    const positions: Record<string, Point> = { [node.id]: { x: current.x, y: current.y } };
    const strengths: Record<string, number> = { [node.id]: 1 };
    linkedEdges.forEach((edge) => {
      const neighborId = edge.source === node.id ? edge.target : edge.source;
      const neighbor = graph.nodes.find((item) => item.id === neighborId);
      if (!neighbor) return;
      const base = manualPositions[neighborId] ?? neighbor;
      positions[neighborId] = { x: base.x, y: base.y };
      strengths[neighborId] = .16 + Math.sqrt(edge.weight / maxWeight) * .18;
    });
    dragCluster.current = { pointer, positions, strengths };
    setManualPositions((currentPositions) => ({ ...currentPositions, ...positions }));
    nodePointerStart.current = { id: node.id, clientX: event.clientX, clientY: event.clientY, additive: event.shiftKey, moved: false };
    setDraggingId(node.id);
  };
  const moveDraggedNode = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (panning && panStart.current && svgRef.current) {
      const rect = svgRef.current.getBoundingClientRect();
      if (Math.hypot(event.clientX - panStart.current.clientX, event.clientY - panStart.current.clientY) > 4) panStart.current.moved = true;
      setPan({
        x: panStart.current.x + (event.clientX - panStart.current.clientX) / rect.width * 900,
        y: panStart.current.y + (event.clientY - panStart.current.clientY) / rect.height * 570,
      });
      return;
    }
    if (!draggingId) return;
    if (nodePointerStart.current && Math.hypot(event.clientX - nodePointerStart.current.clientX, event.clientY - nodePointerStart.current.clientY) > 4) nodePointerStart.current.moved = true;
    const point = pointerToGraph(event.clientX, event.clientY);
    if (!point) return;
    const cluster = dragCluster.current;
    if (!cluster) return;
    const dx = point.x - cluster.pointer.x;
    const dy = point.y - cluster.pointer.y;
    const draggedStart = cluster.positions[draggingId];
    setManualPositions((current) => ({ ...current, [draggingId]: {
      x: Math.max(24, Math.min(876, draggedStart.x + dx)),
      y: Math.max(24, Math.min(546, draggedStart.y + dy)),
    } }));
    Object.entries(cluster.positions).forEach(([id, start]) => {
      if (id === draggingId) return;
      const strength = cluster.strengths[id] ?? .2;
      elasticTargets.current[id] = {
        x: Math.max(24, Math.min(876, start.x + dx * strength)),
        y: Math.max(24, Math.min(546, start.y + dy * strength)),
      };
    });
  };
  const startPanning = (event: ReactPointerEvent<SVGRectElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panStart.current = { clientX: event.clientX, clientY: event.clientY, x: pan.x, y: pan.y, moved: false };
    setPanning(true);
  };
  const stopDragging = () => {
    if (draggingId && nodePointerStart.current && !nodePointerStart.current.moved) {
      const node = graph.nodes.find((item) => item.id === nodePointerStart.current?.id);
      if (node) selectNode(node, nodePointerStart.current.additive);
    }
    if (panning && panStart.current && !panStart.current.moved) setSelectedIds([]);
    setDraggingId(null); setPanning(false); panStart.current = null; nodePointerStart.current = null; dragCluster.current = null;
  };
  const cancelInteraction = () => { setDraggingId(null); setPanning(false); panStart.current = null; nodePointerStart.current = null; dragCluster.current = null; elasticTargets.current = {}; elasticVelocities.current = {}; };
  const changeZoom = (next: number) => setZoom(Math.max(.35, Math.min(8, next)));
  const changeLayoutMode = (mode: LayoutMode) => {
    setLayoutMode(mode);
    if (mode === 'hierarchical' && !hierarchicalInitialized.current) {
      hierarchicalInitialized.current = true;
      setVisibleTypes(new Set(nodeTypeOrder));
    }
  };
  const zoomWithWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    event.preventDefault();
    changeZoom(zoom * (event.deltaY > 0 ? .86 : 1.16));
  };

  return (
    <main className="prototype-shell">
      <header className="topbar">
        <a className="brand" href="#network" aria-label={`${t.brand} — ${t.product}`}><span className="brand-symbol" aria-hidden="true"><i /><i /><i /></span><span><strong>{t.brand}</strong><small>{t.product}</small></span></a>
        <nav className="topnav" aria-label={t.explore}><a href="#network" aria-current="page">{t.explore}</a><span className="development-badge">{t.inDevelopment}</span></nav>
        <div className="header-utilities">
          <button type="button" className="language-switch" onClick={() => setLocale((current) => current === 'lv' ? 'en' : 'lv')} aria-label={t.language}>{locale === 'lv' ? 'EN' : 'LV'}</button>
          <button type="button" className="text-size-switch" onClick={() => setTextSize((current) => nextTextSize[current])} aria-label={t.textSize} aria-pressed={textSize !== 16} title={`${t.textSize}: ${textSize}px`}>A+</button>
          <span className="utility-divider" aria-hidden="true" />
          <button type="button" className="theme-switch" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} aria-label={theme === 'dark' ? t.light : t.dark} title={theme === 'dark' ? t.light : t.dark}>{theme === 'dark' ? <Sun /> : <Moon />}</button>
          <button type="button" className="about-switch" disabled aria-label={t.aboutComing} title={t.aboutComing}><Info /></button>
          <button type="button" className="settings-switch" onClick={() => setSettingsOpen((current) => !current)} aria-label={t.settings} aria-expanded={settingsOpen} aria-controls="settings-panel"><Settings2 /></button>
        </div>
      </header>
      {settingsOpen && <>
        <button type="button" className="settings-scrim" aria-label={t.closeSettings} onClick={() => setSettingsOpen(false)} />
        <section id="settings-panel" className="settings-panel" role="dialog" aria-modal="false" aria-labelledby="settings-title">
          <div className="settings-heading"><div><span>{t.product}</span><h2 id="settings-title">{t.settings}</h2></div><button type="button" onClick={() => setSettingsOpen(false)} aria-label={t.closeSettings}><X /></button></div>
          <fieldset className="settings-section"><legend>{t.palette}</legend><div className="palette-options">
            {paletteOptions.map((option) => <button type="button" className="palette-option" key={option.id} aria-pressed={palette === option.id} onClick={() => setPalette(option.id)}><span className="palette-swatches" aria-hidden="true">{option.colors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}</span><span><strong>{option[locale]}</strong><small>{option[locale === 'lv' ? 'en' : 'lv']}</small></span>{palette === option.id && <Check aria-hidden="true" />}</button>)}
          </div></fieldset>
          <fieldset className="settings-section"><legend>{t.graphMotion}</legend><div className="motion-options"><button type="button" aria-pressed={!motionFrozen} onClick={() => setMotionFrozen(false)}><Play />{t.dynamic}</button><button type="button" aria-pressed={motionFrozen} onClick={() => setMotionFrozen(true)}><Pause />{t.static}</button></div><p>{t.motionHelp}</p></fieldset>
          <fieldset className="settings-section"><legend>{t.animationStyle}</legend><div className="animation-style-field"><Select value={animationStyle} onValueChange={(value) => setAnimationStyle(value as AnimationStyle)}><SelectTrigger aria-label={t.animationStyle}><SelectValue>{animationStyleOptions.find((option) => option.id === animationStyle)?.[locale]}</SelectValue></SelectTrigger><SelectContent className="nsrd-select-content" align="start">{animationStyleOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option[locale]}</SelectItem>)}</SelectContent></Select></div><p>{animationHelp}</p></fieldset>
        </section>
      </>}
      <div className={`workspace ${controlsPanelOpen ? '' : 'is-controls-collapsed'} ${inspectorPanelOpen ? '' : 'is-inspector-collapsed'}`}>
        <aside id="network-layers-panel" className="controls-panel" aria-label={t.networkLayers} hidden={!controlsPanelOpen}>
          <div className="panel-title"><Network aria-hidden="true" /><div><span>{t.networkLayers}</span><strong>{t.showInNetwork}</strong></div></div>
          <fieldset className="node-type-options"><legend className="sr-only">{t.showInNetwork}</legend>
            <span className="layer-chip is-fixed"><i className="node-swatch artifact" />{currentTypeLabels.artifact}</span>
            {optionalTypes.map((type) => <button type="button" className="layer-chip" aria-pressed={visibleTypes.has(type)} key={type} onClick={() => toggleType(type, !visibleTypes.has(type))}><i className={`node-swatch ${type}`} />{currentTypeLabels[type]}</button>)}
          </fieldset>
          <label className="field-label search-label">{t.searchPerson}<span className="input-with-icon"><Search aria-hidden="true" /><Input list="person-suggestions" value={personQuery} onChange={(event) => choosePersonSuggestion(event.target.value)} placeholder={t.personPlaceholder} />{personQuery && <button aria-label={t.clearPerson} onClick={() => { setPersonQuery(''); setSelectedIds([]); }}><X /></button>}</span></label>
          <datalist id="person-suggestions">{personSuggestions.map((item) => <option key={item.id} value={item.value} />)}</datalist>
          <label className="field-label search-label">{t.searchArtifact}<span className="input-with-icon"><Search aria-hidden="true" /><Input list="artifact-suggestions" value={artifactQuery} onChange={(event) => chooseArtifactSuggestion(event.target.value)} placeholder={t.artifactPlaceholder} />{artifactQuery && <button aria-label={t.clearArtifact} onClick={() => { setArtifactQuery(''); setSelectedIds([]); }}><X /></button>}</span></label>
          <datalist id="artifact-suggestions">{artifactSuggestions.map((item) => <option key={item.id} value={item.value} />)}</datalist>
          <label className="field-label">{t.years} <b>{yearRange[0]}–{yearRange[1]}</b><Slider min={dataset.meta.yearStart} max={dataset.meta.yearEnd} value={yearRange} onValueChange={(value) => setYearRange(value as number[])} /></label>
          <div className="field-label format-label"><span>{t.format}</span><Select value={format} onValueChange={(value) => setFormat(value ?? 'all')}><SelectTrigger aria-label={t.format}><SelectValue>{format === 'all' ? t.allFormats : format}</SelectValue></SelectTrigger><SelectContent className="nsrd-select-content" align="start"><SelectItem value="all">{t.allFormats}</SelectItem>{formats.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          <label className="selection-toggle"><Checkbox checked={multiSelect} onCheckedChange={(checked) => setMultiSelect(Boolean(checked))} /><span><strong>{t.multi}</strong><small>{t.multiHelp}</small></span></label>
          <Button variant="outline" className="w-full" onClick={clearFilters}><RotateCcw aria-hidden="true" /> {t.clearFilters}</Button>
        </aside>

        <section id="network" className="network-panel" aria-label={t.networkAria}>
          <div className="network-toolbar">
            <button type="button" className="panel-visibility-toggle" onClick={() => setControlsPanelOpen((current) => !current)} aria-label={controlsPanelOpen ? t.hideFilters : t.showFilters} aria-controls="network-layers-panel" aria-expanded={controlsPanelOpen} title={controlsPanelOpen ? t.hideFilters : t.showFilters}>{controlsPanelOpen ? <PanelLeftClose /> : <PanelLeftOpen />}</button>
            <div className="toolbar-tools">
              <div className="network-view-options">
                <div className="network-select"><span>{t.view}</span><Select value={layoutMode} onValueChange={(value) => changeLayoutMode(value as LayoutMode)}><SelectTrigger aria-label={t.view}><SelectValue>{layoutLabels[locale][layoutMode]}</SelectValue></SelectTrigger><SelectContent className="nsrd-select-content" align="start">{(Object.keys(layoutLabels[locale]) as LayoutMode[]).map((mode) => <SelectItem key={mode} value={mode}>{layoutLabels[locale][mode]}</SelectItem>)}</SelectContent></Select></div>
                {layoutMode === 'bipartite' && <div className="bipartite-options" aria-label={layoutLabels[locale].bipartite}>
                  <div className="network-select"><span>{t.left}</span><Select value={leftType} onValueChange={(value) => setLeftType(value as NodeType)}><SelectTrigger aria-label={t.left}><SelectValue>{currentTypeLabels[leftType]}</SelectValue></SelectTrigger><SelectContent className="nsrd-select-content" align="start">{nodeTypeOrder.map((type) => <SelectItem key={type} value={type} disabled={type === rightType}>{currentTypeLabels[type]}</SelectItem>)}</SelectContent></Select></div>
                  <div className="network-select"><span>{t.right}</span><Select value={rightType} onValueChange={(value) => setRightType(value as NodeType)}><SelectTrigger aria-label={t.right}><SelectValue>{currentTypeLabels[rightType]}</SelectValue></SelectTrigger><SelectContent className="nsrd-select-content" align="start">{nodeTypeOrder.map((type) => <SelectItem key={type} value={type} disabled={type === leftType}>{currentTypeLabels[type]}</SelectItem>)}</SelectContent></Select></div>
                </div>}
              </div>
              <div className="network-controls" aria-label={t.distance}>
                {layoutMode === 'force' && <button type="button" onClick={() => setMotionFrozen((current) => !current)} aria-pressed={motionFrozen}>{motionFrozen ? <Play /> : <Pause />}<span>{motionFrozen ? t.move : t.freeze}</span></button>}
                <button type="button" className={`label-mode-button is-${labelMode}`} onClick={() => setLabelMode((current) => nextLabelMode[current])} aria-label={`${t.labels}: ${labelModeNames[locale][labelMode]}. ${t.labelClick}`} title={`${t.labels}: ${labelModeNames[locale][labelMode]}`}>{labelMode === 'none' ? <EyeOff /> : <Eye />}</button>
                <button type="button" className="graph-text-size-button" onClick={() => setGraphLabelScale((current) => nextGraphLabelScale[current])} aria-label={`${t.graphTextSize}: ${Math.round(graphLabelScale * 100)}%`} aria-pressed={graphLabelScale !== 1} title={`${t.graphTextSize}: ${Math.round(graphLabelScale * 100)}%`}>A+</button>
                <button type="button" onClick={() => changeZoom(zoom / 1.35)} aria-label={t.compact}><ZoomOut /></button>
                <output aria-label={t.distance}>{Math.round(zoom * 100)}%</output>
                <button type="button" onClick={() => changeZoom(zoom * 1.35)} aria-label={t.spread}><ZoomIn /></button>
              </div>
            </div>
            <div className="legend" aria-label={t.legend}>{graph.types.map((type) => <span key={type}><i className={`node-swatch ${type}`} />{currentTypeLabels[type]}</span>)}</div>
            <button type="button" className="panel-visibility-toggle" onClick={() => setInspectorPanelOpen((current) => !current)} aria-label={inspectorPanelOpen ? t.hideDetails : t.showDetails} aria-controls="selection-details-panel" aria-expanded={inspectorPanelOpen} title={inspectorPanelOpen ? t.hideDetails : t.showDetails}>{inspectorPanelOpen ? <PanelRightClose /> : <PanelRightOpen />}</button>
          </div>
          {graph.nodes.length ? <div className="network-stage">
            <svg ref={svgRef} className={`network-canvas ${layoutMode !== 'force' ? 'is-structured' : ''} ${layoutMode === 'bipartite' ? 'is-bipartite' : ''} ${selectedIds.length ? 'has-selection' : ''} animation-${animationStyle} ${motionFrozen ? 'is-motion-paused' : ''} ${draggingId ? 'is-dragging' : ''} ${panning ? 'is-panning' : ''}`} style={{ '--graph-label-scale': graphLabelScale } as CSSProperties} viewBox="0 0 900 570" role="img" aria-label={t.networkAria} onPointerMove={moveDraggedNode} onPointerUp={stopDragging} onPointerCancel={cancelInteraction} onWheel={zoomWithWheel}>
              <rect className="network-hit-area" x="0" y="0" width="900" height="570" onPointerDown={startPanning} />
              <g>
                <g className="network-edges">{graph.edges.map((edge, edgeIndex) => {
                  const source = positionById.get(edge.source)!;
                  const target = positionById.get(edge.target)!;
                  const sourceSelected = selectedIds.includes(edge.source);
                  const targetSelected = selectedIds.includes(edge.target);
                  const active = selectedIds.length > 0 && (sourceSelected || targetSelected);
                  const reverseFlow = sourceSelected !== targetSelected ? targetSelected : layoutMode === 'hierarchical' && source.y > target.y;
                  const start = reverseFlow ? target : source;
                  const end = reverseFlow ? source : target;
                  const baseWidth = active ? Math.min(1.65, .45 + Math.sqrt(edge.weight) * .32) : .48;
                  const showFlow = animationStyle === 'rain' || selectedIds.length === 0 || active;
                  const flowStyle = {
                    strokeWidth: active ? Math.min(1.9, baseWidth + .25) : .72,
                    '--arrival-duration': `${active ? 1.05 + (edgeIndex % 3) * .08 : 1.4 + (edgeIndex % 5) * .08}s`,
                    '--flow-delay': `${(edgeIndex % 9) * .035}s`,
                    '--rain-duration': `${4.4 + (edgeIndex % 5) * .32}s`,
                    '--rain-delay': `${-(edgeIndex % 9) * .43}s`,
                  } as CSSProperties;
                  const baseStyle = { strokeWidth: baseWidth, '--wave-delay': `${-(((start.x + end.x) / 2) / 900) * 4.8}s` } as CSSProperties;
                  const flowKey = `${layoutMode}-${animationStyle}-${selectedIds.join('|') || 'intro'}`;
                  return <g key={`${edge.source}-${edge.target}`} className={active ? 'is-active' : ''}><line className="network-edge-base" x1={start.x} y1={start.y} x2={end.x} y2={end.y} style={baseStyle} />{layoutMode !== 'force' && showFlow && <line key={flowKey} className="network-edge-flow" x1={start.x} y1={start.y} x2={end.x} y2={end.y} pathLength="100" style={flowStyle} />}</g>;
                })}</g>
                <g className="network-nodes">{displayNodes.map((node) => {
                  const selected = selectedIds.includes(node.id);
                  const active = !selectedIds.length || activeIds.has(node.id);
                  const radius = nodeRadius(node, layoutMode);
                  const showLabel = labelMode === 'all' || (labelMode === 'active' && selectedIds.length > 0 && active);
                  const emphasisClass = selectedIds.length ? (active ? 'is-active' : 'is-dimmed') : 'is-ambient';
                  const structuredLabel = labelPlacementById.get(node.id);
                  const labelX = structuredLabel?.x ?? (node.x < 450 ? radius + 7 : -radius - 7);
                  const labelY = structuredLabel?.y ?? 4;
                  const labelAnchor = structuredLabel?.textAnchor ?? (node.x < 450 ? 'start' : 'end');
                  const labelTransform = structuredLabel?.rotation ? `rotate(${structuredLabel.rotation} ${labelX} ${labelY})` : undefined;
                  const echoDistance = echoDistanceById.get(node.id);
                  const nodeAnimationStyle = {
                    '--wave-delay': `${-(node.x / 900) * 4.8}s`,
                    '--echo-delay': `${Math.min(echoDistance ?? 0, 6) * .14}s`,
                  } as CSSProperties;
                  return <g key={`${node.id}-${animationStyle === 'echo' ? selectedIds.join('|') : ''}`} className={`graph-node ${node.type} ${selected ? 'is-selected' : ''} ${emphasisClass} ${echoDistance !== undefined ? 'has-echo-path' : ''}`} style={nodeAnimationStyle} transform={`translate(${node.x} ${node.y})`} onPointerDown={(event) => startDrag(node, event)} role="button" tabIndex={0} aria-label={`${currentTypeLabels[node.type]}: ${node.label}; ${node.degree} ${t.links}`} aria-pressed={selected} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') selectNode(node, event.shiftKey); }}><NodeShape type={node.type} radius={radius} />{showLabel && <text x={labelX} y={labelY} textAnchor={labelAnchor} dominantBaseline={structuredLabel ? 'middle' : undefined} transform={labelTransform}>{node.label}</text>}</g>;
                })}</g>
              </g>
            </svg>
          </div> : <div className="graph-empty"><FilterX /><h3>{t.noData}</h3><p>{t.noDataHelp}</p><Button variant="outline" onClick={clearFilters}>{t.clearFilters}</Button></div>}
          <div className="network-hint"><div><strong>{graph.nodes.length} {t.nodes} · {graph.edges.length} {t.links} · {filteredEvents.length} {t.artifacts}</strong><span>{t.dragHelp}</span></div>{selectedIds.length > 0 && <button onClick={() => setSelectedIds([])}>{t.clearSelection}</button>}</div>
          <ResultList locale={locale} resultEvents={resultEvents} selectedCount={selectedIds.length} onSelect={(event) => setSelectedIds([`artifact:${event.id}`])} />
        </section>

        <aside id="selection-details-panel" className="inspector-panel" aria-label={t.selection} hidden={!inspectorPanelOpen}>
          {selectedNodes.length ? <SelectionInspector locale={locale} nodes={selectedNodes} resultEvents={resultEvents} logic={selectionLogic} setLogic={setSelectionLogic} removeNode={(id) => setSelectedIds((current) => current.filter((item) => item !== id))} /> : <EmptyInspector locale={locale} count={resultEvents.length} />}
        </aside>
      </div>
    </main>
  );
}

function SelectionInspector({ locale, nodes, resultEvents, logic, setLogic, removeNode }: { locale: Locale; nodes: GraphNode[]; resultEvents: EventRecord[]; logic: SelectionLogic; setLogic: (value: SelectionLogic) => void; removeNode: (id: string) => void }) {
  const [showAllRelated, setShowAllRelated] = useState(false);
  const t = ui[locale];
  const selectionKey = nodes.map((node) => node.id).join('|');
  useEffect(() => setShowAllRelated(false), [selectionKey]);
  const personNames = new Set(resultEvents.flatMap((event) => event.credits.map((credit) => credit.person)));
  const formatCounts = Array.from(resultEvents.reduce((map, event) => map.set(event.format, (map.get(event.format) ?? 0) + 1), new Map<string, number>())).sort((a, b) => b[1] - a[1]);
  const years = resultEvents.map((event) => event.year);
  const single = nodes.length === 1 ? nodes[0] : null;
  const person = single?.type === 'person' ? people.find((item) => item.name === single.payloadId) : null;
  const artifact = single?.type === 'artifact' ? events.find((item) => item.id === single.payloadId) : null;
  const collaboratorCounts = person ? Array.from(resultEvents.reduce((map, event) => {
    event.credits.forEach((credit) => {
      if (credit.person !== person.name) map.set(credit.person, (map.get(credit.person) ?? 0) + 1);
    });
    return map;
  }, new Map<string, number>())).sort((a, b) => b[1] - a[1]) : [];
  return <div>
    <p className="inspector-type">{single ? typeLabels[locale][single.type] : `${t.selection} · ${nodes.length} ${t.nodes}`}</p>
    <h2>{single?.label ?? t.selectedSet}</h2>
    {nodes.length > 1 && <><div className="selection-chips">{nodes.map((node) => <button key={node.id} onClick={() => removeNode(node.id)}>{node.label}<X /></button>)}</div><div className="logic-switch"><button aria-pressed={logic === 'any'} onClick={() => setLogic('any')}>{t.any}</button><button aria-pressed={logic === 'all'} onClick={() => setLogic('all')}>{t.all}</button></div></>}
    <dl className="summary-grid"><div><dt>{typeLabels[locale].artifact}</dt><dd>{resultEvents.length}</dd></div><div><dt>{t.persons}</dt><dd>{personNames.size}</dd></div><div><dt>{t.period}</dt><dd>{years.length ? `${Math.min(...years)}–${Math.max(...years)}` : '—'}</dd></div><div><dt>{t.formats}</dt><dd>{formatCounts.length}</dd></div></dl>
    {person && collaboratorCounts.length > 0 && <section className="inspector-section"><h3>{t.frequent}</h3>{collaboratorCounts.slice(0, 5).map(([name, count]) => <div className="data-row" key={name}><span>{displayPersonName(name)}</span><strong>{count}</strong></div>)}</section>}
    {artifact && <section className="inspector-section"><h3>{t.artifactInfo}</h3><div className="data-row"><span>{locale === 'lv' ? 'Gads' : 'Year'}</span><strong>{artifact.year}</strong></div><div className="data-row"><span>{t.format}</span><strong>{artifact.format}</strong></div><div className="data-row"><span>{t.place}</span><strong>{artifact.place || t.missing}</strong></div><div className="data-row"><span>{t.participants}</span><strong>{artifact.credits.length}</strong></div></section>}
    {!artifact && <section className="inspector-section"><h3>{t.formatDistribution}</h3>{formatCounts.slice(0, 5).map(([name, count]) => <div className="data-row" key={name}><span>{name}</span><strong>{count}</strong></div>)}</section>}
    <section className="inspector-section"><h3>{t.related}</h3>{(showAllRelated ? resultEvents : resultEvents.slice(0, 7)).map((event) => <div className="mini-result" key={event.id}><span>{event.year}</span><strong>{event.title}</strong></div>)}{resultEvents.length > 7 && <button type="button" className="more-results more-results-button" onClick={() => setShowAllRelated((current) => !current)}>{showAllRelated ? t.showLess : `${t.more} ${resultEvents.length - 7}`}</button>}</section>
  </div>;
}

function ResultList({ locale, resultEvents, selectedCount, onSelect }: { locale: Locale; resultEvents: EventRecord[]; selectedCount: number; onSelect: (event: EventRecord) => void }) {
  const [expanded, setExpanded] = useState(false);
  const t = ui[locale];
  return <section className="result-list" aria-labelledby="result-title"><div className="result-heading"><div><p>{selectedCount ? t.selectionResults : t.filteredData}</p><h3 id="result-title">{typeLabels[locale].artifact} <span>{resultEvents.length}</span></h3></div></div>{resultEvents.length ? <div className="result-rows">{(expanded ? resultEvents : resultEvents.slice(0, 10)).map((event) => <button key={event.id} onClick={() => onSelect(event)}><time>{event.year}</time><span><strong>{event.title}</strong><small>{[event.format, event.artist, event.place].filter(Boolean).join(' · ')}</small></span><em>{event.credits.length} {t.personsShort}</em><ChevronRight /></button>)}</div> : <p className="no-results">{t.noArtifacts}</p>}{resultEvents.length > 10 && <button type="button" className="more-results more-results-button" onClick={() => setExpanded((current) => !current)}>{expanded ? t.showLess : `${t.more} ${resultEvents.length - 10}`}</button>}</section>;
}

function EmptyInspector({ locale, count }: { locale: Locale; count: number }) {
  const t = ui[locale];
  return <div className="empty-inspector"><CircleHelp aria-hidden="true" /><h2>{t.choose}</h2><p>{t.chooseHelp}</p><div><Users aria-hidden="true" /> {t.currently}: {count} {t.artifacts}</div></div>;
}
