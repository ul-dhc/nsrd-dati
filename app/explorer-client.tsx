'use client';

import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type WheelEvent as ReactWheelEvent } from 'react';
import {
  BarChart3,
  ChevronDown,
  ChevronRight,
  Circle,
  CircleHelp,
  Eye,
  EyeOff,
  ChartScatter,
  FilterX,
  Info,
  ListFilter,
  Maximize2,
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
  Type,
  Users,
  X,
  ZoomIn,
  ZoomOut,
} from 'lucide-react';

import dataset from '@/data/nsrd-seque.json';
import { startAnimationLoop } from '@/lib/animation-loop';
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
type PaletteId = 'archive' | 'neon' | 'autumn' | 'pastel' | 'vivid' | 'bolderaja';
type SelectionLogic = 'any' | 'all';
type LabelMode = 'active' | 'all' | 'none';
type AnimationStyle = 'none' | 'rain' | 'echo' | 'wave';
type VisualizationStyle = 'standard' | 'pencil';
type NodeShapeMode = 'category' | 'circle';
type NetworkMotionStyle = 'drift' | 'orbit' | 'chaos';
type AppView = 'network' | 'dashboard';
type GraphNode = { id: string; payloadId: string; label: string; type: NodeType; degree: number; x: number; y: number; depthScale?: number; depthOpacity?: number };
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
const mobileVisibleTypes = new Set<NodeType>(['person', 'artifact']);
const layoutLabels: Record<Locale, Record<LayoutMode, string>> = {
  lv: { force: 'Brīvais', hierarchical: 'Hierarhisks', bipartite: 'Divdaļīgs' },
  en: { force: 'Free', hierarchical: 'Hierarchical', bipartite: 'Bipartite' },
};
const nextLabelMode: Record<LabelMode, LabelMode> = { none: 'active', active: 'all', all: 'none' };
const nextTextSize: Record<TextSize, TextSize> = { 16: 18, 18: 20, 20: 16 };
const animationStyleOptions: Array<{ id: AnimationStyle; lv: string; en: string }> = [
  { id: 'none', lv: 'Nav', en: 'None' },
  { id: 'rain', lv: 'Lietus', en: 'Rain' },
  { id: 'echo', lv: 'Atbalss', en: 'Echo' },
  { id: 'wave', lv: 'Vilnis', en: 'Wave' },
];
const visualizationStyleOptions: Array<{ id: VisualizationStyle; lv: string; en: string }> = [
  { id: 'standard', lv: 'Standarta', en: 'Standard' },
  { id: 'pencil', lv: 'Zīmulis', en: 'Pencil' },
];
const networkMotionStyleOptions: Array<{ id: NetworkMotionStyle; lv: string; en: string }> = [
  { id: 'drift', lv: 'Plūdums', en: 'Drift' },
  { id: 'orbit', lv: 'Orbīta', en: 'Orbit' },
  { id: 'chaos', lv: 'Haoss', en: 'Chaos' },
];
const appViewOptions: Array<{ id: AppView; lv: string; en: string }> = [
  { id: 'network', lv: 'Tīkls', en: 'Network' },
  { id: 'dashboard', lv: 'Pārskats', en: 'Data overview' },
];
const paletteOptions: Array<{ id: PaletteId; lv: string; en: string; colors: string[] }> = [
  { id: 'archive', lv: 'Seque', en: 'Seque', colors: ['#c83f00', '#f4a000', '#cf0060', '#114b94', '#02a49f'] },
  { id: 'neon', lv: 'Telefons', en: 'Telephone', colors: ['#0D0D0D', '#00FF85', '#1E90FF', '#FF0099', '#FFFFFF'] },
  { id: 'autumn', lv: 'Karstvīns', en: 'Mulled Wine', colors: ['#1C1C1C', '#FF6F61', '#DAA520', '#FF4500', '#F5E8D8'] },
  { id: 'pastel', lv: 'Binoklis', en: 'Binoculars', colors: ['#2C2C2C', '#A8DADC', '#FFC1CC', '#B39CD0', '#E4E4E4'] },
  { id: 'vivid', lv: 'Pankūkas', en: 'Pancakes', colors: ['#181818', '#FF5722', '#673AB7', '#FFEB3B', '#F7F7F7'] },
  { id: 'bolderaja', lv: 'Bolderāja', en: 'Bolderāja', colors: ['#2F725F', '#A34D42', '#8E6C2E', '#6670A3'] },
];
const labelModeNames: Record<Locale, Record<LabelMode, string>> = {
  lv: { none: 'nosaukumi paslēpti', active: 'nosaukumi aktīvajiem mezgliem', all: 'visu mezglu nosaukumi' },
  en: { none: 'labels hidden', active: 'labels for active nodes', all: 'labels for all nodes' },
};
const ui = {
  lv: {
    brand: 'NSRD / SEQUE', product: 'NSRD un Seque ierakstu un personu tīkla vizualizācija', explore: 'Saikņu izpēte', networkLayers: 'Tīkla slāņi', showInNetwork: 'Rādīt tīklā',
    searchPerson: 'Meklēt personu', personPlaceholder: 'Sāc rakstīt vārdu…', clearPerson: 'Notīrīt personas meklējumu', searchArtifact: 'Meklēt artefaktu', artifactPlaceholder: 'Sāc rakstīt nosaukumu…', clearArtifact: 'Notīrīt artefakta meklējumu',
    years: 'Laika diapazons', format: 'Formāts', allFormats: 'Visi formāti', multi: 'Vairāku mezglu atlase', clearFilters: 'Notīrīt filtrus',
    view: 'Skats', left: 'Pa kreisi', right: 'Pa labi', move: 'Atsākt mezglu kustību', freeze: 'Apturēt mezglu kustību', compact: 'Attālināt tīklu', spread: 'Pietuvināt tīklu', scatter: 'Izkliedēt mezglus', fullscreen: 'Rādīt tikai tīklu pilnekrānā', exitFullscreen: 'Aizvērt pilnekrānu', distance: 'Tīkla mērogs', legend: 'Leģenda',
    labels: 'Nosaukumi', labelClick: 'Klikšķini, lai pārslēgtu režīmu.', graphTextSize: 'Tīkla nosaukumu izmērs', nodeSize: 'Mezglu izmērs', networkAria: 'NSRD un Seque daudzslāņu saikņu tīkls', links: 'saites', nodes: 'mezgli', artifacts: 'artefakti',
    noData: 'Šai filtru kombinācijai datu nav', noDataHelp: 'Maini periodu, formātu vai meklējumu.', dragHelp: 'Velc mezglu, lai to pārvietotu; velc tukšā vietā, lai pārbīdītu visu tīklu.', clearSelection: 'Notīrīt atlasi',
    selectionResults: 'Atlases rezultāti', filteredData: 'Filtrētie dati', personsShort: 'pers.', noArtifacts: 'Atlasē nav artefaktu.', showLess: 'Rādīt mazāk', more: '+ vēl',
    selection: 'Atlase', selectedSet: 'Izvēlētā kopa', any: 'Vismaz viens', all: 'Visi izvēlētie', persons: 'Personas', period: 'Periods', formats: 'Formāti', frequent: 'Biežākie līdzdalībnieki', formatDistribution: 'Formātu sadalījums', related: 'Saistītie artefakti', artifactInfo: 'Artefakta informācija', place: 'Vieta', participants: 'Dalībnieki', missing: 'Nav norādīta',
    choose: 'Izvēlies mezglu', chooseHelp: 'Klikšķini vizualizācijā, lai izgaismotu saites un saņemtu atlasīto datu kopsavilkumu.', currently: 'Pašlaik filtrā', hideFilters: 'Paslēpt filtru paneli', showFilters: 'Parādīt filtru paneli', hideDetails: 'Paslēpt detaļu paneli', showDetails: 'Parādīt detaļu paneli', light: 'Ieslēgt gaišo režīmu', dark: 'Ieslēgt tumšo režīmu', language: 'Switch to English', textSize: 'Mainīt teksta izmēru', settings: 'Iestatījumi', closeSettings: 'Aizvērt iestatījumus', about: 'Par projektu', closeAbout: 'Aizvērt informāciju par projektu', palette: 'Krāsu palete', morePalettes: 'Vēl 5 paletes', graphMotion: 'Vizualizāciju kustība', dynamic: 'Kustīgs', static: 'Statisks', motionHelp: 'Statiskais režīms aptur tīkla un analītisko grafu animācijas.', networkMotion: 'Tīkla kustība', movementIntensity: 'Kustības intensitāte', movementHelpDrift: 'Mezgli lēni un viegli dreifē ap savu vietu.', movementHelpOrbit: 'Viss tīkls lēni riņķo ap centru, bet katram mezglam ir arī sava orbīta, ātrums un virziens.', movementHelpChaos: 'Mezgli kustas aktīvāk un neregulārāk, nezaudējot tīkla pamatstruktūru.', movementFreeOnly: 'Kustība darbojas brīvajā tīkla skatā.', animationStyle: 'Animācijas stils', animationHelpNone: 'Bez papildu nepārtrauktas animācijas.', animationHelpRain: 'Plūstoša saišu un grafu elementu kustība.', animationHelpEcho: 'Atlase rada vienreizēju impulsu saistītajos elementos.', animationHelpWave: 'Gaismas vilnis periodiski pāriet pāri vizualizācijai.', visualizationStyle: 'Vizualizācijas stils', visualizationHelpStandard: 'Standarta noformējums ar vienmērīgi aizpildītiem krāsu laukumiem.', visualizationHelpPencil: 'Plānas skices līnijas un krāsains zīmuļa šrafējums uz papīra fona.', nodeShape: 'Mezglu forma', categoryShapes: 'Pēc kategorijas', circleShapes: 'Visi apļi', nodeShapeHelp: 'Kategorijas var atšķirt pēc formas un krāsas vai tikai pēc krāsas.', inDevelopment: 'Izstrādes procesā',
    filters: 'Filtri', filterViews: 'Filtrēt skatus', details: 'Detaļas', showRecords: 'Rādīt ierakstus', showNetwork: 'Rādīt tīklu', mobileNote: 'Pilnā izpētes vide paredzēta datoram. Mobilajā skatā pieejams kompakts personu un ierakstu tīkls.', mobileOrbit: 'Orbīta', mobileSpeed: 'Orbītas ātrums', mobilePause: 'Apturēt tīkla kustību', mobilePlay: 'Ieslēgt tīkla kustību', mobileColors: 'Krāsu palete', visualization: 'Vizualizācija', overviewAria: 'NSRD un Seque datu analītiskais pārskats', collaborationAria: 'NSRD un Seque personu sadarbību matrica',
    records: 'Ieraksti', documentedPeople: 'Personas', relatedPeople: 'Līdzdalībnieki', visibleFormats: 'Formāti', formatChart: 'Ieraksti pēc formāta', peopleChart: 'Personas pēc ierakstu skaita', artifactChart: 'Ieraksti pēc dalībnieku skaita', collaborationMatrix: 'Kopīgo ierakstu matrica', collaborationMobile: 'Personu sadarbības', collaborationHelp: 'Klikšķini šūnā, lai atlasītu personu pāri un apskatītu kopīgos ierakstus.', topCollaborations: 'Biežākie sadarbību pāri', sharedRecords: 'kopīgi ieraksti', noCollaborations: 'Šai atlasei nav pietiekami daudz personu sadarbību.',
  },
  en: {
    brand: 'NSRD / SEQUE', product: 'Network visualization of NSRD and Seque recordings and people', explore: 'Explore connections', networkLayers: 'Network layers', showInNetwork: 'Show in network',
    searchPerson: 'Search for a person', personPlaceholder: 'Start typing a name…', clearPerson: 'Clear person search', searchArtifact: 'Search for an artifact', artifactPlaceholder: 'Start typing a title…', clearArtifact: 'Clear artifact search',
    years: 'Year range', format: 'Format', allFormats: 'All formats', multi: 'Select multiple nodes', clearFilters: 'Clear filters',
    view: 'View', left: 'Left column', right: 'Right column', move: 'Resume node motion', freeze: 'Pause node motion', compact: 'Zoom out from network', spread: 'Zoom in to network', scatter: 'Spread nodes apart', fullscreen: 'Show only the network in fullscreen', exitFullscreen: 'Exit fullscreen', distance: 'Network scale', legend: 'Legend',
    labels: 'Labels', labelClick: 'Click to change mode.', graphTextSize: 'Network label size', nodeSize: 'Node size', networkAria: 'NSRD and Seque multilayer network', links: 'links', nodes: 'nodes', artifacts: 'artifacts',
    noData: 'No data for this filter combination', noDataHelp: 'Change the period, format, or search.', dragHelp: 'Drag a node to move it; drag empty space to pan the whole network.', clearSelection: 'Clear selection',
    selectionResults: 'Selection results', filteredData: 'Filtered data', personsShort: 'people', noArtifacts: 'No artifacts in this selection.', showLess: 'Show less', more: '+ more',
    selection: 'Selection', selectedSet: 'Selected set', any: 'At least one', all: 'All selected', persons: 'People', period: 'Period', formats: 'Formats', frequent: 'Frequent collaborators', formatDistribution: 'Format distribution', related: 'Related artifacts', artifactInfo: 'Artifact information', place: 'Place', participants: 'Participants', missing: 'Not specified',
    choose: 'Choose a node or set', chooseHelp: 'Click in a visualization to highlight connections and see a summary of the selected data.', currently: 'Currently filtered', hideFilters: 'Hide filters panel', showFilters: 'Show filters panel', hideDetails: 'Hide details panel', showDetails: 'Show details panel', light: 'Use light mode', dark: 'Use dark mode', language: 'Pārslēgt uz latviešu valodu', textSize: 'Change text size', settings: 'Settings', closeSettings: 'Close settings', about: 'About the project', closeAbout: 'Close project information', palette: 'Color palette', morePalettes: '5 more palettes', graphMotion: 'Visualization motion', dynamic: 'Dynamic', static: 'Static', motionHelp: 'Static mode pauses network and analytical chart animations.', networkMotion: 'Network motion', movementIntensity: 'Motion intensity', movementHelpDrift: 'Nodes drift slowly and gently around their positions.', movementHelpOrbit: 'The whole network revolves slowly around its center while every node follows its own orbit, speed, and direction.', movementHelpChaos: 'Nodes move more actively and irregularly without losing the underlying structure.', movementFreeOnly: 'Motion applies to the free network view.', animationStyle: 'Animation style', animationHelpNone: 'No additional continuous animation.', animationHelpRain: 'A flowing motion moves through links and chart elements.', animationHelpEcho: 'A selection sends a single pulse through related elements.', animationHelpWave: 'A light wave periodically travels across the visualization.', visualizationStyle: 'Visualization style', visualizationHelpStandard: 'Standard appearance with evenly filled color areas.', visualizationHelpPencil: 'Fine sketch lines and colored-pencil hatching on a paper background.', nodeShape: 'Node shape', categoryShapes: 'By category', circleShapes: 'All circles', nodeShapeHelp: 'Categories can be distinguished by shape and color or by color alone.', inDevelopment: 'In development',
    filters: 'Filters', filterViews: 'Filter views', details: 'Details', showRecords: 'Show recordings', showNetwork: 'Show network', mobileNote: 'The full exploration environment is designed for desktop. A compact people and recordings network is available on mobile.', mobileOrbit: 'Orbit', mobileSpeed: 'Orbit speed', mobilePause: 'Pause network motion', mobilePlay: 'Start network motion', mobileColors: 'Color palette', visualization: 'Visualization', overviewAria: 'Analytical overview of NSRD and Seque data', collaborationAria: 'NSRD and Seque person collaboration matrix',
    records: 'Recordings', documentedPeople: 'People', relatedPeople: 'Collaborators', visibleFormats: 'Formats', formatChart: 'Recordings by format', peopleChart: 'People by number of recordings', artifactChart: 'Recordings by number of participants', collaborationMatrix: 'Shared-recording matrix', collaborationMobile: 'Person collaborations', collaborationHelp: 'Click a cell to select a pair of people and inspect their shared recordings.', topCollaborations: 'Top collaboration pairs', sharedRecords: 'shared recordings', noCollaborations: 'There are not enough person collaborations in this selection.',
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
const singleSliderValue = (value: number | readonly number[]) => typeof value === 'number' ? value : value[0];

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

function NodeShape({ type, radius, mode, className = 'node-shape' }: { type: NodeType; radius: number; mode: NodeShapeMode; className?: string }) {
  if (mode === 'circle' || type === 'person') return <circle className={className} r={radius} />;
  if (type === 'artifact') return <polygon className={className} points={`0,${-radius} ${radius},0 0,${radius} ${-radius},0`} />;
  if (type === 'format') return <rect className={className} x={-radius} y={-radius} width={radius * 2} height={radius * 2} rx={Math.max(2, radius * .2)} />;
  if (type === 'group') return <polygon className={className} points={`0,${-radius} ${radius * .92},${radius * .82} ${-radius * .92},${radius * .82}`} />;
  return <polygon className={className} points={`${-radius * .88},${-radius * .5} 0,${-radius} ${radius * .88},${-radius * .5} ${radius * .88},${radius * .5} 0,${radius} ${-radius * .88},${radius * .5}`} />;
}

const nodeRadius = (node: GraphNode, layoutMode: LayoutMode) => layoutMode === 'force'
  ? Math.min(27, 6 + Math.sqrt(node.degree) * 2.2)
  : Math.min(15, 3.5 + Math.sqrt(node.degree) * 1.45);

function PencilFilterDefs() {
  return <svg className="svg-filter-definitions" aria-hidden="true" focusable="false">
    <defs>
      <filter id="pencil-wobble" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.055" numOctaves="2" seed="17" result="noise" />
        <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.25" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      {[
        ['person', 'var(--node-person)', -18],
        ['artifact', 'var(--node-artifact)', 22],
        ['format', 'var(--node-format)', -32],
        ['group', 'var(--node-group)', 28],
        ['institution', 'var(--node-institution)', -24],
      ].map(([name, color, angle]) => <pattern key={name} id={`pencil-${name}`} patternUnits="userSpaceOnUse" width="5" height="5" patternTransform={`rotate(${angle})`}>
        <rect width="5" height="5" fill="#fffdf7" />
        <path d="M 0 1 L 5 1 M 0 3.7 L 5 3.7" stroke={String(color)} strokeWidth=".75" opacity=".82" />
      </pattern>)}
      {['var(--palette-green)', 'var(--palette-amber)', 'var(--palette-teal)', 'var(--palette-blue)', 'var(--palette-magenta)', 'var(--palette-orange)'].map((color, index) => <pattern key={color} id={`pencil-chart-${index}`} patternUnits="userSpaceOnUse" width="4" height="4" patternTransform={`rotate(${index % 2 ? 24 : -24})`}>
        <rect width="4" height="4" fill="#fffdf7" />
        <path d="M 0 1 L 4 1 M 0 3 L 4 3" stroke={color} strokeWidth=".8" opacity=".9" />
      </pattern>)}
    </defs>
  </svg>;
}

function AboutContent({ locale }: { locale: Locale }) {
  const external = { target: '_blank', rel: 'noreferrer' } as const;

  return <div className="about-content">
    <div className="about-meta">
      <p>Kevin C. Karnes, Jānis Daugavietis</p>
      <a href="https://doi.org/10.5281/zenodo.19686162" {...external}>doi.org/10.5281/zenodo.19686162</a>
      <p>{locale === 'lv' ? 'Atjaunots' : 'Updated'}: 2026.04.23</p>
    </div>

    <section>
      <h3>{locale === 'lv' ? 'Par vizualizāciju' : 'About the visualization'}</h3>
      {locale === 'lv' ? <>
        <p>Saite savieno personu ar skaņu ierakstu, kurā viņš vai viņa piedalījusies.</p>
        <p>Tā balstīta datos, kas apkopoti no daudziem avotiem: galvenokārt dokumentiem un artefaktiem, kas glabājas <a href="https://lcca.lv/" {...external}>Latvijas Laikmetīgās mākslas centra</a> kolekcijas Hardija Lediņa krājumā, kā arī artefaktiem, kas atrodas privātkolekcijās Latvijā un ASV, daži no tiem tika iekļauti izstādē <a href="https://lcca.lv/lv/izstades/nsrd--izstade/" {...external}>“NSRD: Informācija par transformētu situāciju”</a> (Viļņa, Radvila pils mākslas muzejs, 2024.–2025. g.) vai digitalizēti tiešsaistes arhīvā <a href="http://pietura.lv/" {...external}>“Pietura nebijušām sajūtām”</a>.</p>
        <p>Redzi kļūdas vai nepilnības? Sūti e-pastu uz janis.daugavietis lulfmi.lv.</p>
      </> : <>
        <p>A link connects a person to a sound recording in which they participated.</p>
        <p>It is based on data compiled from many sources: primarily documents and artifacts held in the Hardijs Lediņš collection of the <a href="https://lcca.lv/en/" {...external}>Latvian Centre for Contemporary Art</a>, as well as artifacts in private collections in Latvia and the United States. Some were included in the exhibition <a href="https://lcca.lv/lv/izstades/nsrd--izstade/" {...external}>“NSRD: Information on a Transformed Situation”</a> (Vilnius, Radvila Palace Art Museum, 2024–2025) or digitized in the online archive <a href="http://pietura.lv/" {...external}>“A Stop for Unprecedented Feelings”</a>.</p>
        <p>See an error or omission? Email janis.daugavietis lulfmi.lv.</p>
      </>}
    </section>

    <section>
      <h3>{locale === 'lv' ? 'Citi avoti' : 'Other sources'}</h3>
      <ul className="about-sources">
        <li>Astahovska, Ieva, &amp; Žeikare, Māra. (2016). <cite>Nebijušu sajūtu restaurēšanas darbnīca. Juris Boiko un Hardijs Lediņš.</cite> Latvijas Laikmetīgās mākslas centrs.</li>
        <li>Mazvērsīte, Daiga (2025). <a href="https://enciklopedija.lv/skirklis/111774" {...external}>“Nebijušu sajūtu restaurēšanas darbnīca”</a>. Nacionālā enciklopēdija.</li>
        <li>Mazvērsīte, Daiga &amp; Traumane, Māra (2017). <a href="http://www.soundexchange.eu/#latvia_en?id=43" {...external}>“Avant-garde Trends in Latvian Music, 1970s–1990s”</a>. <cite>Soundexchange</cite>.</li>
        <li>Karnes, Kevin C. (2021). <a href="https://press.uchicago.edu/ucp/books/book/chicago/S/bo123169154.html" {...external}><cite>Sounds Beyond: Arvo Pärt and the 1970s Soviet Underground.</cite></a> University of Chicago Press.</li>
        <li>Karnes, Kevin C. (2024). <a href="https://doi.org/10.3390/arts13030088" {...external}>“A German DJ, Postmodern Dreams, and the Ambivalent Politics of East–West Exchange at the First Exhibition of Approximate Art in Riga, April 1987.”</a> <cite>Arts</cite>, 13(3), 88.</li>
        <li><a href="https://www.nsrd.lv/" {...external}>“Hardija Lediņa gads 2015”</a>. www.nsrd.lv.</li>
      </ul>
    </section>

    <section className="about-support">
      {locale === 'lv' ? <>
        <p>Vizualizācija tapusi projekta <a href="https://lulfmi.lv/petijumi/projekti/primitiva-un-troksnaina-muzika-padomju-latvija-1956-1986-kontroles-mehanismi-un-izvairisanas-prakses-autoritaras-varas-apstaklos" {...external}>“‘Primitīvā un trokšņainā mūzika’ Padomju Latvijā (1956-1986): kontroles mehānismi un izvairīšanās prakses autoritāras varas apstākļos”</a> (lzp-2024/1-0059) ietvaros.</p>
        <p>Papildu atbalstu sniedza <a href="https://www.emory.edu/" {...external}>Emorija Universitātes</a> Mākslas un zinātņu koledža (Atlanta, ASV).</p>
      </> : <>
        <p>This visualization was created as part of the project <a href="https://lulfmi.lv/en/research/projects/primitive-and-noisy-music-in-soviet-latvia-1956-1986-control-mechanisms-and-practices-of-avoidance-under-authoritarian-rule-1" {...external}>“‘Primitive and Noisy Music’ in Soviet Latvia (1956-1986): Control Mechanisms and Practices of Avoidance Under Authoritarian Rule”</a> (lzp-2024/1-0059).</p>
        <p>Additional support was provided by Emory College of Arts &amp; Sciences, <a href="https://www.emory.edu/" {...external}>Emory University</a> (Atlanta, USA).</p>
      </>}
    </section>

    <p className="about-developer">{locale === 'lv' ? 'Vizualizācijas rīku izstrādāja ' : 'The visualization tool was developed by '}<a href="https://dhc.lu.lv/" {...external}>{locale === 'lv' ? 'LU Digitālo humanitāro zinātņu centrs' : 'University of Latvia Digital Humanities Centre'}</a>.</p>
  </div>;
}

export default function Home() {
  const [locale, setLocale] = useState<Locale>('lv');
  const [theme, setTheme] = useState<Theme>('dark');
  const [textSize, setTextSize] = useState<TextSize>(16);
  const [palette, setPalette] = useState<PaletteId>('archive');
  const [paletteOptionsOpen, setPaletteOptionsOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [controlsPanelOpen, setControlsPanelOpen] = useState(true);
  const [inspectorPanelOpen, setInspectorPanelOpen] = useState(true);
  const [compactPanels, setCompactPanels] = useState(false);
  const [mobileLite, setMobileLite] = useState(false);
  const [networkInView, setNetworkInView] = useState(true);
  const [mobileMotionEnabled, setMobileMotionEnabled] = useState(true);
  const [mobileOrbitSpeed, setMobileOrbitSpeed] = useState(80);
  const [mobileNetworkMotionStyle, setMobileNetworkMotionStyle] = useState<NetworkMotionStyle>('orbit');
  const [pageVisible, setPageVisible] = useState(() => typeof document === 'undefined' || document.visibilityState === 'visible');
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
  const [networkMotionStyle, setNetworkMotionStyle] = useState<NetworkMotionStyle>('drift');
  const [networkMotionIntensity, setNetworkMotionIntensity] = useState(100);
  const [animationStyle, setAnimationStyle] = useState<AnimationStyle>('none');
  const [visualizationStyle, setVisualizationStyle] = useState<VisualizationStyle>('standard');
  const [nodeShapeMode, setNodeShapeMode] = useState<NodeShapeMode>('circle');
  const [appView, setAppView] = useState<AppView>('network');
  const [presentationMode, setPresentationMode] = useState(false);
  const [labelMode, setLabelMode] = useState<LabelMode>('active');
  const [graphLabelScale, setGraphLabelScale] = useState(1);
  const [nodeScale, setNodeScale] = useState(1);
  const [activeScaleControl, setActiveScaleControl] = useState<'node' | 'label' | null>(null);
  const [driftClock, setDriftClock] = useState(0);
  const [zoom, setZoom] = useState(.84);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [panning, setPanning] = useState(false);
  const [pan, setPan] = useState<Point>({ x: 0, y: 0 });
  const [manualPositions, setManualPositions] = useState<Record<string, Point>>({});
  const svgRef = useRef<SVGSVGElement>(null);
  const hierarchicalInitialized = useRef(false);
  const panStart = useRef<{ clientX: number; clientY: number; x: number; y: number; moved: boolean } | null>(null);
  const nodePointerStart = useRef<{ id: string; clientX: number; clientY: number; additive: boolean; moved: boolean } | null>(null);
  const dragCluster = useRef<{ pointer: Point; positions: Record<string, Point>; strengths: Record<string, number> } | null>(null);
  const elasticTargets = useRef<Record<string, Point>>({});
  const elasticVelocities = useRef<Record<string, Point>>({});
  const elasticFrame = useRef<number | null>(null);
  const pinchStart = useRef<{ distance: number; zoom: number; pan: Point; midpoint: Point } | null>(null);
  const cameraRef = useRef({ zoom, pan });
  useEffect(() => { cameraRef.current = { zoom, pan }; }, [zoom, pan]);
  const compactPanelsRef = useRef<boolean | null>(null);
  const t = ui[locale];
  const selectedPalette = paletteOptions.find((option) => option.id === palette) ?? paletteOptions[0];
  const currentTypeLabels = typeLabels[locale];
  const effectiveLayoutMode: LayoutMode = mobileLite ? 'force' : layoutMode;
  const effectiveAnimationStyle: AnimationStyle = mobileLite ? 'none' : animationStyle;
  const effectiveVisualizationStyle: VisualizationStyle = mobileLite ? 'standard' : visualizationStyle;
  const effectiveMotionFrozen = (mobileLite ? !mobileMotionEnabled || controlsPanelOpen || settingsOpen || aboutOpen || !networkInView || appView !== 'network' : motionFrozen) || !pageVisible;
  const effectiveNetworkMotionStyle: NetworkMotionStyle = mobileLite ? mobileNetworkMotionStyle : networkMotionStyle;
  const effectiveNetworkMotionIntensity = mobileLite ? mobileOrbitSpeed : networkMotionIntensity;
  const effectiveNodeShapeMode = nodeShapeMode;
  const effectiveLabelMode = labelMode;
  const animationHelp = {
    none: t.animationHelpNone,
    rain: t.animationHelpRain,
    echo: t.animationHelpEcho,
    wave: t.animationHelpWave,
  }[animationStyle];
  const visualizationHelp = visualizationStyle === 'pencil' ? t.visualizationHelpPencil : t.visualizationHelpStandard;
  const networkMovementHelp = {
    drift: t.movementHelpDrift,
    orbit: t.movementHelpOrbit,
    chaos: t.movementHelpChaos,
  }[effectiveNetworkMotionStyle];

  useEffect(() => {
    const savedLocale = window.localStorage.getItem('nsrd-locale');
    const savedTheme = window.localStorage.getItem('nsrd-theme');
    const savedTextSize = Number(window.localStorage.getItem('nsrd-text-size'));
    const savedPalette = window.localStorage.getItem('nsrd-palette');
    const savedMotion = window.localStorage.getItem('nsrd-motion');
    const savedNetworkMotionStyle = window.localStorage.getItem('nsrd-network-motion-style');
    const savedNetworkMotionIntensity = Number(window.localStorage.getItem('nsrd-network-motion-intensity'));
    const savedMobileNetworkMotionStyle = window.localStorage.getItem('nsrd-mobile-network-motion-style');
    const savedMobileMotion = window.localStorage.getItem('nsrd-mobile-motion');
    const savedMobileOrbitSpeed = Number(window.localStorage.getItem('nsrd-mobile-orbit-speed'));
    const savedAnimationStyle = window.localStorage.getItem('nsrd-animation-style');
    const savedVisualizationStyle = window.localStorage.getItem('nsrd-visualization-style');
    const savedNodeShapeMode = window.localStorage.getItem('nsrd-node-shape');
    const savedNodeScale = Number(window.localStorage.getItem('nsrd-node-scale'));
    const savedGraphLabelScale = Number(window.localStorage.getItem('nsrd-graph-label-scale'));
    const savedRainAnimation = window.localStorage.getItem('nsrd-rain-animation');
    const initialLocale = savedLocale === 'lv' || savedLocale === 'en' ? savedLocale : 'lv';
    const initialTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : 'dark';
    const initialTextSize: TextSize = savedTextSize === 18 || savedTextSize === 20 ? savedTextSize : 16;
    const initialPalette = paletteOptions.some((option) => option.id === savedPalette) ? savedPalette as PaletteId : 'archive';
    const initialAnimationStyle = savedAnimationStyle && savedAnimationStyle !== 'pencil'
      ? animationStyleOptions.some((option) => option.id === savedAnimationStyle) ? savedAnimationStyle as AnimationStyle : 'none'
      : savedRainAnimation === 'true' ? 'rain' : 'none';
    const initialVisualizationStyle: VisualizationStyle = savedVisualizationStyle === 'pencil' || savedAnimationStyle === 'pencil' ? 'pencil' : 'standard';
    setLocale(initialLocale);
    setTheme(initialTheme);
    setTextSize(initialTextSize);
    setPalette(initialPalette);
    setMotionFrozen(savedMotion === 'static' || (savedMotion === null && initialVisualizationStyle === 'pencil'));
    setNetworkMotionStyle(networkMotionStyleOptions.some((option) => option.id === savedNetworkMotionStyle) ? savedNetworkMotionStyle as NetworkMotionStyle : 'drift');
    setNetworkMotionIntensity(savedNetworkMotionIntensity >= 10 && savedNetworkMotionIntensity <= 200 ? savedNetworkMotionIntensity : 100);
    setMobileMotionEnabled(savedMobileMotion !== 'paused');
    setMobileNetworkMotionStyle(networkMotionStyleOptions.some((option) => option.id === savedMobileNetworkMotionStyle) ? savedMobileNetworkMotionStyle as NetworkMotionStyle : 'orbit');
    setMobileOrbitSpeed(savedMobileOrbitSpeed >= 10 && savedMobileOrbitSpeed <= 200 ? savedMobileOrbitSpeed : 80);
    setAnimationStyle(initialAnimationStyle);
    setVisualizationStyle(initialVisualizationStyle);
    setNodeShapeMode(savedNodeShapeMode === 'category' ? 'category' : 'circle');
    setNodeScale(savedNodeScale >= .1 && savedNodeScale <= 2 ? savedNodeScale : 1);
    setGraphLabelScale(savedGraphLabelScale >= .5 && savedGraphLabelScale <= 3 ? savedGraphLabelScale : 1);
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
    window.localStorage.setItem('nsrd-network-motion-style', networkMotionStyle);
  }, [networkMotionStyle, preferencesReady]);
  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem('nsrd-network-motion-intensity', String(networkMotionIntensity));
  }, [networkMotionIntensity, preferencesReady]);
  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem('nsrd-mobile-network-motion-style', mobileNetworkMotionStyle);
    window.localStorage.setItem('nsrd-mobile-motion', mobileMotionEnabled ? 'playing' : 'paused');
    window.localStorage.setItem('nsrd-mobile-orbit-speed', String(mobileOrbitSpeed));
  }, [mobileMotionEnabled, mobileOrbitSpeed, mobileNetworkMotionStyle, preferencesReady]);
  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem('nsrd-animation-style', animationStyle);
  }, [animationStyle, preferencesReady]);
  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem('nsrd-visualization-style', visualizationStyle);
  }, [preferencesReady, visualizationStyle]);
  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem('nsrd-node-shape', nodeShapeMode);
  }, [nodeShapeMode, preferencesReady]);
  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem('nsrd-node-scale', String(nodeScale));
  }, [nodeScale, preferencesReady]);
  useEffect(() => {
    if (!preferencesReady) return;
    window.localStorage.setItem('nsrd-graph-label-scale', String(graphLabelScale));
  }, [graphLabelScale, preferencesReady]);
  useEffect(() => {
    if (!activeScaleControl) return;
    const closeScaleControl = (event: PointerEvent) => {
      if (event.target instanceof Element && event.target.closest('.graph-scale-control')) return;
      setActiveScaleControl(null);
    };
    const closeScaleControlWithKeyboard = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveScaleControl(null);
    };
    document.addEventListener('pointerdown', closeScaleControl);
    window.addEventListener('keydown', closeScaleControlWithKeyboard);
    return () => {
      document.removeEventListener('pointerdown', closeScaleControl);
      window.removeEventListener('keydown', closeScaleControlWithKeyboard);
    };
  }, [activeScaleControl]);
  useEffect(() => {
    if (!settingsOpen && !aboutOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setSettingsOpen(false);
      setAboutOpen(false);
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [aboutOpen, settingsOpen]);
  useEffect(() => {
    const media = window.matchMedia('(max-width: 1100px)');
    const mobileMedia = window.matchMedia('(max-width: 720px)');
    const syncPanels = () => {
      const compact = media.matches;
      const mobile = mobileMedia.matches;
      setCompactPanels(compact);
      setMobileLite(mobile);
      if (mobile) {
        setSettingsOpen(false);
        setActiveScaleControl(null);
      }
      if (compactPanelsRef.current !== compact) {
        setControlsPanelOpen(!compact);
        setInspectorPanelOpen(!compact);
        compactPanelsRef.current = compact;
      }
    };
    syncPanels();
    media.addEventListener('change', syncPanels);
    mobileMedia.addEventListener('change', syncPanels);
    return () => {
      media.removeEventListener('change', syncPanels);
      mobileMedia.removeEventListener('change', syncPanels);
    };
  }, []);
  useEffect(() => {
    const syncVisibility = () => setPageVisible(document.visibilityState === 'visible');
    const suspend = () => setPageVisible(false);
    document.addEventListener('visibilitychange', syncVisibility);
    window.addEventListener('pagehide', suspend);
    window.addEventListener('pageshow', syncVisibility);
    return () => {
      document.removeEventListener('visibilitychange', syncVisibility);
      window.removeEventListener('pagehide', suspend);
      window.removeEventListener('pageshow', syncVisibility);
    };
  }, []);
  useEffect(() => {
    if (!compactPanels || !selectedIds.length) return;
    setControlsPanelOpen(false);
    setInspectorPanelOpen(true);
  }, [compactPanels, selectedIds]);
  useEffect(() => {
    if (!compactPanels || (!controlsPanelOpen && (!inspectorPanelOpen || mobileLite))) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setControlsPanelOpen(false); setInspectorPanelOpen(false); }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', closeOnEscape); };
  }, [compactPanels, controlsPanelOpen, inspectorPanelOpen, mobileLite]);
  useEffect(() => {
    if (!presentationMode) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const closePresentation = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setPresentationMode(false);
    };
    window.addEventListener('keydown', closePresentation);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', closePresentation);
    };
  }, [presentationMode]);

  const filteredEvents = useMemo(() => events.filter((event) => {
    return event.year >= yearRange[0] && event.year <= yearRange[1]
      && (format === 'all' || event.format === format);
  }), [format, yearRange]);
  const activeFilterCount = (personQuery ? 1 : 0) + (artifactQuery ? 1 : 0) + (format !== 'all' ? 1 : 0)
    + (yearRange[0] !== dataset.meta.yearStart || yearRange[1] !== dataset.meta.yearEnd ? 1 : 0)
    + (!mobileLite && visibleTypes.size !== nodeTypeOrder.length ? 1 : 0);
  const graph = useMemo(() => {
    if (effectiveLayoutMode === 'bipartite') return buildBipartiteGraph(filteredEvents, leftType, rightType);
    const baseGraph = buildGraph(filteredEvents, mobileLite ? mobileVisibleTypes : visibleTypes);
    return effectiveLayoutMode === 'hierarchical' ? layoutHierarchically(baseGraph) : baseGraph;
  }, [effectiveLayoutMode, filteredEvents, leftType, mobileLite, rightType, visibleTypes]);
  useEffect(() => {
    setManualPositions({});
    setPan({ x: 0, y: 0 });
    setZoom(effectiveLayoutMode === 'force' ? (mobileLite ? 1.05 : .84) : 1);
  }, [effectiveLayoutMode, leftType, mobileLite, rightType]);
  useEffect(() => {
    setManualPositions((current) => Object.fromEntries(Object.entries(current).filter(([id]) => graph.nodes.some((node) => node.id === id))));
  }, [graph]);
  useEffect(() => {
    const animateElasticPull = () => {
      const ids = Object.keys(elasticTargets.current);
      if (!draggingId && !ids.length) {
        elasticFrame.current = null;
        return;
      }
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
    setDriftClock(0);
  }, [effectiveNetworkMotionStyle]);
  useEffect(() => {
    if (effectiveMotionFrozen || effectiveLayoutMode !== 'force') return;
    return startAnimationLoop((delta) => setDriftClock((current) => current + delta), mobileLite ? 80 : 32);
  }, [effectiveLayoutMode, effectiveMotionFrozen, mobileLite]);
  useEffect(() => {
    const svg = svgRef.current;
    if (!mobileLite || !svg || typeof IntersectionObserver === 'undefined') {
      setNetworkInView(true);
      return;
    }
    const observer = new IntersectionObserver(([entry]) => setNetworkInView(entry.isIntersecting));
    observer.observe(svg);
    return () => observer.disconnect();
  }, [mobileLite, appView, graph.nodes.length]);
  const positionedNodes = useMemo(() => graph.nodes.map((node) => {
    const base = manualPositions[node.id] ?? node;
    if (effectiveLayoutMode !== 'force' || draggingId === node.id) return { ...node, x: base.x, y: base.y };
    const intensity = effectiveNetworkMotionIntensity / 100;
    const seed = Math.abs(hash(node.id));
    const phase = seed % 628 / 100;
    let x = base.x;
    let y = base.y;
    let depthScale = 1;
    let depthOpacity = 1;

    if (effectiveNetworkMotionStyle === 'orbit') {
      const angle = driftClock * .000018 * intensity;
      const dx = base.x - 450;
      const dy = base.y - 285;
      const sharedX = 450 + dx * Math.cos(angle) - dy * Math.sin(angle);
      const sharedY = 285 + (dx * Math.sin(angle) + dy * Math.cos(angle)) * .92;
      const direction = seed % 2 === 0 ? 1 : -1;
      const localSpeed = (.00016 + (seed % 13) * .000009) * intensity * direction;
      const localAngle = phase + driftClock * localSpeed;
      const localRadius = (6 + seed % 13) * Math.min(1.6, intensity);
      const orbitX = sharedX + (Math.cos(localAngle) - Math.cos(phase)) * localRadius;
      const orbitY = sharedY + (Math.sin(localAngle) - Math.sin(phase)) * localRadius * .62;
      const depth = Math.sin(localAngle + phase * .37);
      const depthStrength = Math.min(1.65, intensity);
      const perspective = 1 + depth * .3 * Math.min(1.4, depthStrength);
      x = 450 + (orbitX - 450) * perspective;
      y = 285 + (orbitY - 285) * perspective;
      depthScale = Math.max(.18, Math.min(2.25, 1 + depth * .82 * Math.min(1.5, intensity)));
      const farOpacity = .26 + ((depth + 1) / 2) * .74;
      depthOpacity = 1 - (1 - farOpacity) * Math.min(1, intensity);
    } else if (effectiveNetworkMotionStyle === 'chaos') {
      const amplitude = (15 + seed % 16) * intensity;
      const speed = .00045 + (seed % 11) * .000018;
      x = base.x + Math.sin(driftClock * speed + phase) * amplitude + Math.sin(driftClock * speed * 2.17 + phase * .43) * amplitude * .28;
      y = base.y + Math.cos(driftClock * speed * 1.31 + phase * 1.27) * amplitude * .78 + Math.sin(driftClock * speed * 1.83 + phase) * amplitude * .24;
    } else {
      const amplitude = (8 + (Math.abs(hash(`${node.id}:drift`)) % 45) / 10) * intensity;
      const orbit = driftClock * .00022 * Math.max(.25, intensity) + phase;
      const sharedX = Math.sin(driftClock * .00011 * Math.max(.25, intensity)) * 5.5 * intensity;
      const sharedY = Math.cos(driftClock * .00009 * Math.max(.25, intensity)) * 4 * intensity;
      x = base.x + sharedX + Math.sin(orbit) * amplitude;
      y = base.y + sharedY + Math.cos(orbit) * amplitude * .76;
    }

    return { ...node, x: Math.round(x * 1000) / 1000, y: Math.round(y * 1000) / 1000, depthScale, depthOpacity };
  }), [draggingId, driftClock, effectiveLayoutMode, effectiveNetworkMotionIntensity, effectiveNetworkMotionStyle, graph.nodes, manualPositions]);
  const driftPositionById = useMemo(() => new Map(positionedNodes.map((node) => [node.id, node])), [positionedNodes]);
  const displayNodes = useMemo(() => positionedNodes.map((node) => ({
    ...node,
    x: 450 + (node.x - 450) * zoom + pan.x,
    y: 285 + (node.y - 285) * zoom + pan.y,
  })), [pan, positionedNodes, zoom]);
  const renderedNodes = useMemo(() => !mobileLite && effectiveNetworkMotionStyle === 'orbit' && effectiveLayoutMode === 'force'
    ? [...displayNodes].sort((left, right) => (left.depthScale ?? 1) - (right.depthScale ?? 1))
    : displayNodes, [displayNodes, effectiveLayoutMode, effectiveNetworkMotionStyle, mobileLite]);
  const labelPlacementById = useMemo(() => {
    const placements = new Map<string, { x: number; y: number; textAnchor: 'start' | 'middle' | 'end'; rotation?: number }>();
    if (effectiveLayoutMode === 'force') return placements;

    const orderedTypes = nodeTypeOrder.filter((type) => displayNodes.some((node) => node.type === type));
    orderedTypes.forEach((type) => {
      const sameType = displayNodes.filter((node) => node.type === type).sort((a, b) => effectiveLayoutMode === 'bipartite'
        ? a.y - b.y || a.label.localeCompare(b.label, 'lv')
        : a.x - b.x || a.label.localeCompare(b.label, 'lv'));
      sameType.forEach((node) => {
        const radius = nodeRadius(node, effectiveLayoutMode) * nodeScale;
        if (effectiveLayoutMode === 'bipartite') {
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
        const alignInsideRightEdge = diagonal && node.x > 765;
        placements.set(node.id, {
          x: diagonal ? (alignInsideRightEdge ? -radius - 6 : radius + 6) : 0,
          y: -radius - 8,
          textAnchor: diagonal ? (alignInsideRightEdge ? 'end' : 'start') : 'middle',
          rotation: diagonal ? -45 : undefined,
        });
      });
    });
    return placements;
  }, [displayNodes, effectiveLayoutMode, nodeScale]);
  const positionById = useMemo(() => new Map(displayNodes.map((node) => [node.id, node])), [displayNodes]);
  const selectedNodes = useMemo(() => selectedIds.map((id) => graph.nodes.find((node) => node.id === id)).filter(Boolean) as GraphNode[], [selectedIds, graph.nodes]);
  useEffect(() => setSelectedIds((current) => current.filter((id) => graph.nodes.some((node) => node.id === id))), [graph]);

  const selectedEventIds = useMemo(() => {
    if (!selectedNodes.length) return new Set(filteredEvents.map((event) => event.id));
    const sets = selectedNodes.map(eventIdsForNode);
    if (selectionLogic === 'all') return new Set(Array.from(sets[0]).filter((id) => sets.every((set) => set.has(id))));
    return new Set(sets.flatMap((set) => Array.from(set)));
  }, [filteredEvents, selectedNodes, selectionLogic]);
  const resultEvents = useMemo(() => filteredEvents.filter((event) => selectedEventIds.has(event.id)), [filteredEvents, selectedEventIds]);
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
    const matrix = svg.getScreenCTM();
    if (!matrix) return null;
    const pointer = svg.createSVGPoint();
    pointer.x = clientX;
    pointer.y = clientY;
    const graphPoint = pointer.matrixTransform(matrix.inverse());
    return { x: 450 + (graphPoint.x - pan.x - 450) / zoom, y: 285 + (graphPoint.y - pan.y - 285) / zoom };
  };
  const startDrag = (node: GraphNode, event: ReactPointerEvent<SVGGElement>) => {
    if (mobileLite && event.pointerType === 'touch') {
      if (!pinchStart.current) nodePointerStart.current = { id: node.id, clientX: event.clientX, clientY: event.clientY, additive: false, moved: false };
      return;
    }
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const current = driftPositionById.get(node.id) ?? node;
    const pointer = pointerToGraph(event.clientX, event.clientY) ?? current;
    const linkedEdges = effectiveLayoutMode === 'force' ? graph.edges.filter((edge) => edge.source === node.id || edge.target === node.id) : [];
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
    if (pinchStart.current) return;
    if (mobileLite && event.pointerType === 'touch') {
      const start = nodePointerStart.current;
      if (start && Math.hypot(event.clientX - start.clientX, event.clientY - start.clientY) > 8) start.moved = true;
      return;
    }
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
    if (mobileLite && event.pointerType === 'touch') return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panStart.current = { clientX: event.clientX, clientY: event.clientY, x: pan.x, y: pan.y, moved: false };
    setPanning(true);
  };
  const stopDragging = () => {
    if (nodePointerStart.current && !nodePointerStart.current.moved && !pinchStart.current) {
      const node = graph.nodes.find((item) => item.id === nodePointerStart.current?.id);
      if (node) selectNode(node, nodePointerStart.current.additive);
    }
    if (panning && panStart.current && !panStart.current.moved) setSelectedIds([]);
    setDraggingId(null); setPanning(false); panStart.current = null; nodePointerStart.current = null; dragCluster.current = null;
  };
  const cancelInteraction = () => { setDraggingId(null); setPanning(false); panStart.current = null; nodePointerStart.current = null; dragCluster.current = null; elasticTargets.current = {}; elasticVelocities.current = {}; };
  const changeZoom = (next: number) => setZoom(Math.max(.35, Math.min(8, next)));
  const scatterNodes = () => {
    setManualPositions((current) => {
      const positions = graph.nodes.map((node) => {
        const position = current[node.id] ?? node;
        return { x: position.x, y: position.y };
      });
      const center = positions.reduce((result, position) => ({ x: result.x + position.x / positions.length, y: result.y + position.y / positions.length }), { x: 0, y: 0 });
      const indexById = new Map(graph.nodes.map((node, index) => [node.id, index]));
      const bounds = { left: 28, right: 872, top: 28, bottom: 542 };

      positions.forEach((position) => {
        position.x = 450 + (position.x - center.x) * 1.28;
        position.y = 285 + (position.y - center.y) * 1.24;
      });

      for (let iteration = 0; iteration < 64; iteration += 1) {
        const shifts = positions.map(() => ({ x: 0, y: 0 }));
        for (let leftIndex = 0; leftIndex < positions.length; leftIndex += 1) {
          for (let rightIndex = leftIndex + 1; rightIndex < positions.length; rightIndex += 1) {
            const left = positions[leftIndex];
            const right = positions[rightIndex];
            let dx = right.x - left.x;
            let dy = right.y - left.y;
            let distance = Math.hypot(dx, dy);
            const minimumDistance = (nodeRadius(graph.nodes[leftIndex], effectiveLayoutMode) + nodeRadius(graph.nodes[rightIndex], effectiveLayoutMode)) * nodeScale + (effectiveLayoutMode === 'force' ? 9 : 5);
            const influenceDistance = minimumDistance + (effectiveLayoutMode === 'force' ? 34 : 14);
            if (distance >= influenceDistance) continue;
            if (distance < .01) {
              const angle = (Math.abs(hash(`${graph.nodes[leftIndex].id}:${graph.nodes[rightIndex].id}`)) % 628) / 100;
              dx = Math.cos(angle);
              dy = Math.sin(angle);
              distance = 1;
            }
            const overlap = Math.max(0, minimumDistance - distance);
            const proximity = Math.max(0, (influenceDistance - distance) / influenceDistance);
            const push = Math.min(9, overlap * .38 + proximity * proximity * 2.4);
            const pushX = dx / distance * push;
            const pushY = dy / distance * push;
            shifts[leftIndex].x -= pushX;
            shifts[leftIndex].y -= pushY;
            shifts[rightIndex].x += pushX;
            shifts[rightIndex].y += pushY;
          }
        }

        graph.edges.forEach((edge) => {
          const sourceIndex = indexById.get(edge.source);
          const targetIndex = indexById.get(edge.target);
          if (sourceIndex === undefined || targetIndex === undefined) return;
          const source = positions[sourceIndex];
          const target = positions[targetIndex];
          const dx = target.x - source.x;
          const dy = target.y - source.y;
          const distance = Math.max(1, Math.hypot(dx, dy));
          if (distance <= 230) return;
          const pull = Math.min(1.1, (distance - 230) * .0035);
          const pullX = dx / distance * pull;
          const pullY = dy / distance * pull;
          shifts[sourceIndex].x += pullX;
          shifts[sourceIndex].y += pullY;
          shifts[targetIndex].x -= pullX;
          shifts[targetIndex].y -= pullY;
        });

        positions.forEach((position, index) => {
          if (position.x < bounds.left) shifts[index].x += (bounds.left - position.x) * .18;
          if (position.x > bounds.right) shifts[index].x -= (position.x - bounds.right) * .18;
          if (position.y < bounds.top) shifts[index].y += (bounds.top - position.y) * .18;
          if (position.y > bounds.bottom) shifts[index].y -= (position.y - bounds.bottom) * .18;
          position.x = Math.max(bounds.left, Math.min(bounds.right, position.x + Math.max(-10, Math.min(10, shifts[index].x))));
          position.y = Math.max(bounds.top, Math.min(bounds.bottom, position.y + Math.max(-10, Math.min(10, shifts[index].y))));
        });
      }

      return Object.fromEntries(graph.nodes.map((node, index) => [node.id, positions[index]]));
    });
  };
  const changeLayoutMode = (mode: LayoutMode) => {
    setLayoutMode(mode);
    if (mode === 'hierarchical' && !hierarchicalInitialized.current) {
      hierarchicalInitialized.current = true;
      setVisibleTypes(new Set(nodeTypeOrder));
    }
  };
  const zoomWithWheel = (event: ReactWheelEvent<SVGSVGElement>) => {
    if (mobileLite) return;
    event.preventDefault();
    changeZoom(zoom * (event.deltaY > 0 ? .86 : 1.16));
  };
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg || appView !== 'network') return;
    const midpointInGraph = (first: Touch, second: Touch): Point | null => {
      const matrix = svg.getScreenCTM();
      if (!matrix) return null;
      const point = svg.createSVGPoint();
      point.x = (first.clientX + second.clientX) / 2;
      point.y = (first.clientY + second.clientY) / 2;
      const transformed = point.matrixTransform(matrix.inverse());
      return { x: transformed.x, y: transformed.y };
    };
    const start = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      if (event.cancelable) event.preventDefault();
      const [first, second] = Array.from(event.touches);
      const midpoint = midpointInGraph(first, second);
      if (!midpoint) return;
      pinchStart.current = {
        distance: Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY),
        ...cameraRef.current,
        midpoint,
      };
      setDraggingId(null);
      setPanning(false);
      panStart.current = null;
      nodePointerStart.current = null;
      dragCluster.current = null;
    };
    const move = (event: TouchEvent) => {
      const gesture = pinchStart.current;
      if (!gesture) return;
      // Keep the remainder of a two-finger gesture from scrolling the page.
      if (event.cancelable) event.preventDefault();
      if (event.touches.length !== 2) return;
      const [first, second] = Array.from(event.touches);
      const midpoint = midpointInGraph(first, second);
      if (!midpoint) return;
      const distance = Math.hypot(second.clientX - first.clientX, second.clientY - first.clientY);
      const nextZoom = Math.max(.35, Math.min(8, gesture.zoom * distance / Math.max(1, gesture.distance)));
      const ratio = nextZoom / gesture.zoom;
      setZoom(nextZoom);
      setPan({
        x: midpoint.x - 450 - (gesture.midpoint.x - 450 - gesture.pan.x) * ratio,
        y: midpoint.y - 285 - (gesture.midpoint.y - 285 - gesture.pan.y) * ratio,
      });
    };
    const end = (event: TouchEvent) => {
      if (event.touches.length === 0) pinchStart.current = null;
    };
    const cancel = () => { pinchStart.current = null; };
    // React touch listeners are passive; cancel native scrolling only for two fingers.
    svg.addEventListener('touchstart', start, { passive: false });
    svg.addEventListener('touchmove', move, { passive: false });
    svg.addEventListener('touchend', end);
    svg.addEventListener('touchcancel', cancel);
    return () => {
      svg.removeEventListener('touchstart', start);
      svg.removeEventListener('touchmove', move);
      svg.removeEventListener('touchend', end);
      svg.removeEventListener('touchcancel', cancel);
      pinchStart.current = null;
    };
  }, [appView, mobileLite, graph.nodes.length]);
  const enterPresentationMode = () => {
    setActiveScaleControl(null);
    setPresentationMode(true);
  };

  return (
    <main className={`prototype-shell ${effectiveNodeShapeMode === 'circle' ? 'node-shape-circles' : ''}`}>
      {effectiveVisualizationStyle === 'pencil' && <PencilFilterDefs />}
      <header className="topbar">
        <a className="brand" href="#network" aria-label={`${t.brand} — ${t.product}`}><span className="brand-symbol" aria-hidden="true"><i /><i /><i /></span><span><strong>{t.brand}</strong><small>{t.product}</small></span></a>
        <div className="header-utilities">
          <button type="button" className="language-switch" onClick={() => setLocale((current) => current === 'lv' ? 'en' : 'lv')} aria-label={t.language}>{locale === 'lv' ? 'EN' : 'LV'}</button>
          {!mobileLite && <button type="button" className="text-size-switch" onClick={() => setTextSize((current) => nextTextSize[current])} aria-label={t.textSize} aria-pressed={textSize !== 16} title={`${t.textSize}: ${textSize}px`}>A+</button>}
          {!mobileLite && <span className="utility-divider" aria-hidden="true" />}
          <button type="button" className="theme-switch" onClick={() => setTheme((current) => current === 'light' ? 'dark' : 'light')} aria-label={theme === 'dark' ? t.light : t.dark} title={theme === 'dark' ? t.light : t.dark}>{theme === 'dark' ? <Sun /> : <Moon />}</button>
          <button type="button" className="about-switch" onClick={() => { setSettingsOpen(false); setPaletteOptionsOpen(false); setAboutOpen((current) => !current); }} aria-label={t.about} aria-expanded={aboutOpen} aria-controls="about-panel" title={t.about}><Info /></button>
          {!mobileLite && <button type="button" className="settings-switch" onClick={() => { setAboutOpen(false); setPaletteOptionsOpen(false); setSettingsOpen((current) => !current); }} aria-label={t.settings} aria-expanded={settingsOpen} aria-controls="settings-panel"><Settings2 /></button>}
        </div>
      </header>
      {aboutOpen && <>
        <button type="button" className="settings-scrim" aria-label={t.closeAbout} onClick={() => setAboutOpen(false)} />
        <section id="about-panel" className="about-panel" role="dialog" aria-modal="true" aria-labelledby="about-title">
          <div className="about-heading"><div><span>{t.about}</span><h2 id="about-title">{t.product}</h2></div><button type="button" onClick={() => setAboutOpen(false)} aria-label={t.closeAbout}><X /></button></div>
          <AboutContent locale={locale} />
        </section>
      </>}
      {settingsOpen && <>
        <button type="button" className="settings-scrim" aria-label={t.closeSettings} onClick={() => { setSettingsOpen(false); setPaletteOptionsOpen(false); }} />
        <section id="settings-panel" className="settings-panel" role="dialog" aria-modal="false" aria-labelledby="settings-title">
          <div className="settings-heading"><div><span>{t.product}</span><h2 id="settings-title">{t.settings}</h2></div><button type="button" onClick={() => { setSettingsOpen(false); setPaletteOptionsOpen(false); }} aria-label={t.closeSettings}><X /></button></div>
          <fieldset className="settings-section"><legend>{t.palette}</legend><div className={`palette-picker${paletteOptionsOpen ? ' is-open' : ''}`}>
            <button type="button" className="palette-option palette-current" aria-expanded={paletteOptionsOpen} aria-controls="palette-options-more" onClick={() => setPaletteOptionsOpen((current) => !current)}><span className="palette-swatches" aria-hidden="true">{selectedPalette.colors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}</span><span><strong>{selectedPalette[locale]}</strong><small>{t.morePalettes}</small></span><ChevronDown aria-hidden="true" /></button>
            {paletteOptionsOpen && <div id="palette-options-more" className="palette-options palette-options-more">
              {paletteOptions.filter((option) => option.id !== palette).map((option) => <button type="button" className="palette-option" key={option.id} onClick={() => { setPalette(option.id); setPaletteOptionsOpen(false); }}><span className="palette-swatches" aria-hidden="true">{option.colors.map((color) => <i key={color} style={{ backgroundColor: color }} />)}</span><span><strong>{option[locale]}</strong><small>{option[locale === 'lv' ? 'en' : 'lv']}</small></span></button>)}
            </div>}
          </div></fieldset>
          <fieldset className="settings-section"><legend>{t.graphMotion}</legend><div className="motion-options"><button type="button" aria-pressed={mobileLite ? mobileMotionEnabled : !motionFrozen} onClick={() => mobileLite ? setMobileMotionEnabled(true) : setMotionFrozen(false)}><Play />{t.dynamic}</button><button type="button" aria-pressed={mobileLite ? !mobileMotionEnabled : motionFrozen} onClick={() => mobileLite ? setMobileMotionEnabled(false) : setMotionFrozen(true)}><Pause />{t.static}</button></div>{!mobileLite && <p>{t.motionHelp}</p>}</fieldset>
          <fieldset className="settings-section"><legend>{t.networkMotion}</legend><div className="network-motion-field"><Select value={effectiveNetworkMotionStyle} onValueChange={(value) => mobileLite ? setMobileNetworkMotionStyle(value as NetworkMotionStyle) : setNetworkMotionStyle(value as NetworkMotionStyle)}><SelectTrigger aria-label={t.networkMotion}><SelectValue>{networkMotionStyleOptions.find((option) => option.id === effectiveNetworkMotionStyle)?.[locale]}</SelectValue></SelectTrigger><SelectContent className="nsrd-select-content" align="start">{networkMotionStyleOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option[locale]}</SelectItem>)}</SelectContent></Select><label className="motion-intensity-control"><span>{t.movementIntensity}<output>{effectiveNetworkMotionIntensity}%</output></span><Slider min={10} max={200} step={5} value={[effectiveNetworkMotionIntensity]} onValueChange={(value) => mobileLite ? setMobileOrbitSpeed(singleSliderValue(value)) : setNetworkMotionIntensity(singleSliderValue(value))} aria-label={t.movementIntensity} /></label></div><p>{networkMovementHelp} {!mobileLite && t.movementFreeOnly}</p></fieldset>
          {!mobileLite && <fieldset className="settings-section"><legend>{t.animationStyle}</legend><div className="animation-style-field"><Select value={animationStyle} onValueChange={(value) => setAnimationStyle(value as AnimationStyle)}><SelectTrigger aria-label={t.animationStyle}><SelectValue>{animationStyleOptions.find((option) => option.id === animationStyle)?.[locale]}</SelectValue></SelectTrigger><SelectContent className="nsrd-select-content" align="start">{animationStyleOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option[locale]}</SelectItem>)}</SelectContent></Select></div><p>{animationHelp}</p></fieldset>}
          {!mobileLite && <fieldset className="settings-section"><legend>{t.visualizationStyle}</legend><div className="visualization-style-field"><Select value={visualizationStyle} onValueChange={(value) => { const nextStyle = value as VisualizationStyle; setVisualizationStyle(nextStyle); if (nextStyle === 'pencil') setMotionFrozen(true); }}><SelectTrigger aria-label={t.visualizationStyle}><SelectValue>{visualizationStyleOptions.find((option) => option.id === visualizationStyle)?.[locale]}</SelectValue></SelectTrigger><SelectContent className="nsrd-select-content" align="start">{visualizationStyleOptions.map((option) => <SelectItem key={option.id} value={option.id}>{option[locale]}</SelectItem>)}</SelectContent></Select></div><p>{visualizationHelp}</p></fieldset>}
          <fieldset className="settings-section"><legend>{t.nodeShape}</legend><div className="node-shape-options"><button type="button" aria-pressed={nodeShapeMode === 'category'} onClick={() => setNodeShapeMode('category')}>{t.categoryShapes}</button><button type="button" aria-pressed={nodeShapeMode === 'circle'} onClick={() => setNodeShapeMode('circle')}>{t.circleShapes}</button></div><p>{t.nodeShapeHelp}</p></fieldset>
        </section>
      </>}
      <div className={`workspace ${compactPanels ? 'is-compact' : ''} ${mobileLite ? 'is-mobile-lite' : ''} ${controlsPanelOpen ? '' : 'is-controls-collapsed'} ${inspectorPanelOpen ? '' : 'is-inspector-collapsed'}`}>
        {compactPanels && (controlsPanelOpen || (!mobileLite && inspectorPanelOpen)) && <button type="button" className="panel-scrim" aria-label={controlsPanelOpen ? t.hideFilters : t.hideDetails} onClick={() => { setControlsPanelOpen(false); setInspectorPanelOpen(false); }} />}
        <aside id="network-layers-panel" className="controls-panel" aria-label={t.filters} hidden={!controlsPanelOpen}>
          <div className="panel-title"><ListFilter aria-hidden="true" /><div><strong>{t.filters}</strong></div>{compactPanels && <button type="button" className="panel-drawer-close" aria-label={t.hideFilters} onClick={() => setControlsPanelOpen(false)}><X /></button>}</div>
          {mobileLite && <p className="mobile-lite-note">{t.mobileNote}</p>}
          {appView === 'network' && !mobileLite && <fieldset className="node-type-options"><legend className="sr-only">{t.showInNetwork}</legend>
            <span className="layer-chip is-fixed"><i className="node-swatch artifact" />{currentTypeLabels.artifact}</span>
            {optionalTypes.map((type) => <button type="button" className="layer-chip" aria-pressed={visibleTypes.has(type)} key={type} onClick={() => toggleType(type, !visibleTypes.has(type))}><i className={`node-swatch ${type}`} />{currentTypeLabels[type]}</button>)}
          </fieldset>}
          <label className="field-label search-label">{t.searchPerson}<span className="input-with-icon"><Search aria-hidden="true" /><Input list="person-suggestions" value={personQuery} onChange={(event) => choosePersonSuggestion(event.target.value)} placeholder={t.personPlaceholder} />{personQuery && <button aria-label={t.clearPerson} onClick={() => { setPersonQuery(''); setSelectedIds([]); }}><X /></button>}</span></label>
          <datalist id="person-suggestions">{personSuggestions.map((item) => <option key={item.id} value={item.value} />)}</datalist>
          <label className="field-label search-label">{t.searchArtifact}<span className="input-with-icon"><Search aria-hidden="true" /><Input list="artifact-suggestions" value={artifactQuery} onChange={(event) => chooseArtifactSuggestion(event.target.value)} placeholder={t.artifactPlaceholder} />{artifactQuery && <button aria-label={t.clearArtifact} onClick={() => { setArtifactQuery(''); setSelectedIds([]); }}><X /></button>}</span></label>
          <datalist id="artifact-suggestions">{artifactSuggestions.map((item) => <option key={item.id} value={item.value} />)}</datalist>
          <label className="field-label">{t.years} <b>{yearRange[0]}–{yearRange[1]}</b><Slider min={dataset.meta.yearStart} max={dataset.meta.yearEnd} value={yearRange} onValueChange={(value) => setYearRange(value as number[])} /></label>
          <div className="field-label format-label"><span>{t.format}</span><Select value={format} onValueChange={(value) => setFormat(value ?? 'all')}><SelectTrigger aria-label={t.format}><SelectValue>{format === 'all' ? t.allFormats : format}</SelectValue></SelectTrigger><SelectContent className="nsrd-select-content" align="start"><SelectItem value="all">{t.allFormats}</SelectItem>{formats.map((item) => <SelectItem key={item} value={item}>{item}</SelectItem>)}</SelectContent></Select></div>
          {appView === 'network' && !mobileLite && <label className="selection-toggle"><Checkbox checked={multiSelect} onCheckedChange={(checked) => setMultiSelect(Boolean(checked))} /><span><strong>{t.multi}</strong></span></label>}
          <Button variant="outline" className="clear-filters-button w-full" onClick={clearFilters}><RotateCcw aria-hidden="true" /> {t.clearFilters}</Button>
          {compactPanels && <div className="mobile-panel-actions"><Button className="w-full" onClick={() => setControlsPanelOpen(false)}>{mobileLite ? t.showNetwork : `${t.showRecords} · ${resultEvents.length}`}</Button></div>}
        </aside>

        <section id="network" className={`network-panel ${presentationMode ? 'is-presentation' : ''}`} aria-label={appView === 'network' ? t.networkAria : t.overviewAria}>
          <div className={`view-mode-bar ${mobileLite ? 'is-mobile-lite' : ''} ${selectedIds.length ? 'has-selection' : ''}`}>
            <button type="button" className="panel-visibility-toggle" onClick={() => { const next = !controlsPanelOpen; setControlsPanelOpen(next); if (compactPanels && next) setInspectorPanelOpen(false); }} aria-label={controlsPanelOpen ? t.hideFilters : t.showFilters} aria-controls="network-layers-panel" aria-expanded={controlsPanelOpen} title={controlsPanelOpen ? t.hideFilters : t.showFilters}>{compactPanels ? <ListFilter /> : controlsPanelOpen ? <PanelLeftClose /> : <PanelLeftOpen />}<span className="mobile-toggle-label">{t.filters}</span>{activeFilterCount > 0 && <b className="mobile-toggle-badge">{activeFilterCount}</b>}</button>
            <div className="app-view-switcher" role="tablist" aria-label={t.visualization}>
              {appViewOptions.map((option) => <button type="button" role="tab" aria-selected={appView === option.id} key={option.id} onClick={() => setAppView(option.id)}>{option.id === 'network' ? <Network aria-hidden="true" /> : <BarChart3 aria-hidden="true" />}<span>{option[locale]}</span></button>)}
            </div>
            {mobileLite && <div className="mobile-view-actions">
              {appView === 'network' && <button type="button" className={`panel-visibility-toggle label-mode-button is-${labelMode}`} onClick={() => setLabelMode((current) => nextLabelMode[current])} aria-label={`${t.labels}: ${labelModeNames[locale][labelMode]}. ${t.labelClick}`} title={`${t.labels}: ${labelModeNames[locale][labelMode]}`}>{labelMode === 'none' ? <EyeOff /> : <Eye />}</button>}
              <button type="button" className="panel-visibility-toggle" onClick={() => { setAboutOpen(false); setControlsPanelOpen(false); setPaletteOptionsOpen(false); setSettingsOpen((current) => !current); }} aria-label={t.settings} title={t.settings} aria-expanded={settingsOpen} aria-controls="settings-panel"><Settings2 /></button>
              {appView === 'network' && <button type="button" className="panel-visibility-toggle" onClick={enterPresentationMode} aria-label={t.fullscreen} title={t.fullscreen}><Maximize2 /></button>}
            </div>}
            {!mobileLite && <button type="button" className="panel-visibility-toggle" onClick={() => { const next = !inspectorPanelOpen; setInspectorPanelOpen(next); if (compactPanels && next) setControlsPanelOpen(false); }} aria-label={inspectorPanelOpen ? t.hideDetails : t.showDetails} aria-controls="selection-details-panel" aria-expanded={inspectorPanelOpen} title={inspectorPanelOpen ? t.hideDetails : t.showDetails}>{compactPanels ? <Info /> : inspectorPanelOpen ? <PanelRightClose /> : <PanelRightOpen />}<span className="mobile-toggle-label">{t.details}</span>{selectedIds.length > 0 && <b className="mobile-toggle-badge">{selectedIds.length}</b>}</button>}
          </div>
          {appView === 'network' && <>
          {!mobileLite && <div className="network-toolbar network-toolbar-secondary">
            <div className="toolbar-tools">
              <div className="network-view-options">
                <div className="network-select"><Select value={layoutMode} onValueChange={(value) => changeLayoutMode(value as LayoutMode)}><SelectTrigger aria-label={t.view}><SelectValue>{layoutLabels[locale][layoutMode]}</SelectValue></SelectTrigger><SelectContent className="nsrd-select-content" align="start">{(Object.keys(layoutLabels[locale]) as LayoutMode[]).map((mode) => <SelectItem key={mode} value={mode}>{layoutLabels[locale][mode]}</SelectItem>)}</SelectContent></Select></div>
                {layoutMode === 'bipartite' && <div className="bipartite-options" aria-label={layoutLabels[locale].bipartite}>
                  <div className="network-select"><span>{t.left}</span><Select value={leftType} onValueChange={(value) => setLeftType(value as NodeType)}><SelectTrigger aria-label={t.left}><SelectValue>{currentTypeLabels[leftType]}</SelectValue></SelectTrigger><SelectContent className="nsrd-select-content" align="start">{nodeTypeOrder.map((type) => <SelectItem key={type} value={type} disabled={type === rightType}>{currentTypeLabels[type]}</SelectItem>)}</SelectContent></Select></div>
                  <div className="network-select"><span>{t.right}</span><Select value={rightType} onValueChange={(value) => setRightType(value as NodeType)}><SelectTrigger aria-label={t.right}><SelectValue>{currentTypeLabels[rightType]}</SelectValue></SelectTrigger><SelectContent className="nsrd-select-content" align="start">{nodeTypeOrder.map((type) => <SelectItem key={type} value={type} disabled={type === leftType}>{currentTypeLabels[type]}</SelectItem>)}</SelectContent></Select></div>
                </div>}
              </div>
              <div className="network-controls" aria-label={t.distance}>
                {layoutMode === 'force' && <button type="button" onClick={() => setMotionFrozen((current) => !current)} aria-pressed={motionFrozen} aria-label={motionFrozen ? t.move : t.freeze} title={motionFrozen ? t.move : t.freeze}>{motionFrozen ? <Play /> : <Pause />}</button>}
                <button type="button" className={`label-mode-button is-${labelMode}`} onClick={() => setLabelMode((current) => nextLabelMode[current])} aria-label={`${t.labels}: ${labelModeNames[locale][labelMode]}. ${t.labelClick}`} title={`${t.labels}: ${labelModeNames[locale][labelMode]}`}>{labelMode === 'none' ? <EyeOff /> : <Eye />}</button>
                <div className="graph-scale-control">
                  <button type="button" onClick={() => setActiveScaleControl((current) => current === 'node' ? null : 'node')} aria-label={`${t.nodeSize}: ${Math.round(nodeScale * 100)}%`} aria-expanded={activeScaleControl === 'node'} aria-controls="node-size-control" title={`${t.nodeSize}: ${Math.round(nodeScale * 100)}%`}><Circle /></button>
                  {activeScaleControl === 'node' && <div id="node-size-control" className="graph-scale-popover"><span>{t.nodeSize}</span><Slider min={.1} max={2} step={.05} value={[nodeScale]} onValueChange={(value) => setNodeScale(singleSliderValue(value))} aria-label={t.nodeSize} /><output>{Math.round(nodeScale * 100)}%</output></div>}
                </div>
                <div className="graph-scale-control">
                  <button type="button" className="graph-text-size-button" onClick={() => setActiveScaleControl((current) => current === 'label' ? null : 'label')} aria-label={`${t.graphTextSize}: ${Math.round(graphLabelScale * 100)}%`} aria-expanded={activeScaleControl === 'label'} aria-controls="graph-text-size-control" title={`${t.graphTextSize}: ${Math.round(graphLabelScale * 100)}%`}><Type /></button>
                  {activeScaleControl === 'label' && <div id="graph-text-size-control" className="graph-scale-popover"><span>{t.graphTextSize}</span><Slider min={.5} max={3} step={.1} value={[graphLabelScale]} onValueChange={(value) => setGraphLabelScale(singleSliderValue(value))} aria-label={t.graphTextSize} /><output>{Math.round(graphLabelScale * 100)}%</output></div>}
                </div>
                {layoutMode === 'force' && <button type="button" className="node-scatter-button" onClick={scatterNodes} aria-label={t.scatter} title={t.scatter}><ChartScatter /></button>}
                <button type="button" onClick={() => changeZoom(zoom / 1.35)} aria-label={t.compact} title={t.compact}><ZoomOut /></button>
                <output aria-label={t.distance}>{Math.round(zoom * 100)}%</output>
                <button type="button" onClick={() => changeZoom(zoom * 1.35)} aria-label={t.spread} title={t.spread}><ZoomIn /></button>
                <button type="button" className="fullscreen-network-button" onClick={enterPresentationMode} aria-label={t.fullscreen} title={t.fullscreen}><Maximize2 /></button>
              </div>
            </div>
            <div className="legend" aria-label={t.legend}>{graph.types.map((type) => <span key={type}><i className={`node-swatch ${type}`} />{currentTypeLabels[type]}</span>)}</div>
          </div>}
          {graph.nodes.length ? <div className="network-stage">
            {presentationMode && <button type="button" className="exit-presentation-button" onClick={() => setPresentationMode(false)} aria-label={t.exitFullscreen} title={t.exitFullscreen}><X /></button>}
            <svg ref={svgRef} className={`network-canvas ${effectiveLayoutMode !== 'force' ? 'is-structured' : ''} ${effectiveLayoutMode === 'bipartite' ? 'is-bipartite' : ''} ${selectedIds.length ? 'has-selection' : ''} animation-${effectiveAnimationStyle} style-${effectiveVisualizationStyle} ${effectiveMotionFrozen ? 'is-motion-paused' : ''} ${draggingId ? 'is-dragging' : ''} ${panning ? 'is-panning' : ''}`} style={{ '--graph-label-scale': graphLabelScale } as CSSProperties} viewBox="0 0 900 570" preserveAspectRatio={mobileLite ? 'xMidYMid slice' : 'xMidYMid meet'} role="img" aria-label={t.networkAria} onPointerMove={moveDraggedNode} onPointerUp={stopDragging} onPointerCancel={cancelInteraction} onWheel={zoomWithWheel}>
              <rect className="network-hit-area" x="0" y="0" width="900" height="570" onPointerDown={startPanning} />
              <g>
                <g className="network-edges">{graph.edges.map((edge, edgeIndex) => {
                  const source = positionById.get(edge.source)!;
                  const target = positionById.get(edge.target)!;
                  const sourceSelected = selectedIds.includes(edge.source);
                  const targetSelected = selectedIds.includes(edge.target);
                  const active = selectedIds.length > 0 && (sourceSelected || targetSelected);
                  const threadType = source.type === 'artifact' ? target.type : target.type === 'artifact' ? source.type : target.type;
                  const reverseFlow = sourceSelected !== targetSelected ? targetSelected : effectiveLayoutMode === 'hierarchical' && source.y > target.y;
                  const start = reverseFlow ? target : source;
                  const end = reverseFlow ? source : target;
                  const baseWidth = active ? Math.min(1.65, .45 + Math.sqrt(edge.weight) * .32) : .48;
                  const showFlow = effectiveAnimationStyle === 'rain' || selectedIds.length === 0 || active;
                  const flowStyle = {
                    strokeWidth: active ? Math.min(1.9, baseWidth + .25) : effectiveAnimationStyle === 'rain' ? .9 : .72,
                    '--arrival-duration': `${active ? 1.05 + (edgeIndex % 3) * .08 : 1.4 + (edgeIndex % 5) * .08}s`,
                    '--flow-delay': `${(edgeIndex % 9) * .035}s`,
                    '--rain-duration': `${4.4 + (edgeIndex % 5) * .32}s`,
                    '--rain-delay': `${-(edgeIndex % 9) * .43}s`,
                  } as CSSProperties;
                  const baseStyle = { strokeWidth: baseWidth, '--wave-delay': `${-(((start.x + end.x) / 2) / 900) * 4.8}s` } as CSSProperties;
                  const flowKey = `${effectiveLayoutMode}-${effectiveAnimationStyle}-${selectedIds.join('|') || 'intro'}`;
                  return <g key={`${edge.source}-${edge.target}`} className={`edge-${threadType} ${active ? 'is-active' : ''}`}><line className="network-edge-base" x1={start.x} y1={start.y} x2={end.x} y2={end.y} style={baseStyle} />{effectiveVisualizationStyle === 'pencil' && <line className="network-edge-pencil" x1={start.x} y1={start.y} x2={end.x} y2={end.y} style={baseStyle} />}{effectiveLayoutMode !== 'force' && showFlow && <line key={flowKey} className="network-edge-flow" x1={start.x} y1={start.y} x2={end.x} y2={end.y} pathLength="100" style={flowStyle} />}</g>;
                })}</g>
                <g className="network-nodes">{renderedNodes.map((node) => {
                  const selected = selectedIds.includes(node.id);
                  const active = !selectedIds.length || activeIds.has(node.id);
                  const radius = nodeRadius(node, effectiveLayoutMode) * nodeScale * (node.depthScale ?? 1);
                  const showLabel = effectiveLabelMode === 'all' || (effectiveLabelMode === 'active' && selectedIds.length > 0 && active);
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
                    opacity: selected ? Math.max(.82, node.depthOpacity ?? 1) : active && selectedIds.length ? Math.max(.65, node.depthOpacity ?? 1) : node.depthOpacity ?? 1,
                  } as CSSProperties;
                  return <g key={`${node.id}-${effectiveAnimationStyle === 'echo' ? selectedIds.join('|') : ''}`} className={`graph-node ${node.type} ${selected ? 'is-selected' : ''} ${emphasisClass} ${echoDistance !== undefined ? 'has-echo-path' : ''}`} style={nodeAnimationStyle} transform={`translate(${node.x} ${node.y})`} onPointerDown={(event) => startDrag(node, event)} role="button" tabIndex={0} aria-label={`${currentTypeLabels[node.type]}: ${node.label}; ${node.degree} ${t.links}`} aria-pressed={selected} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') selectNode(node, event.shiftKey); }}><circle className="node-hit-target" r={Math.max(radius, 7)} /><NodeShape type={node.type} radius={radius} mode={effectiveNodeShapeMode} />{effectiveVisualizationStyle === 'pencil' && <NodeShape type={node.type} radius={radius} mode={effectiveNodeShapeMode} className="pencil-node-outline" />}{showLabel && <text x={labelX} y={labelY} textAnchor={labelAnchor} dominantBaseline={structuredLabel ? 'middle' : undefined} transform={labelTransform}>{node.label}</text>}</g>;
                })}</g>
              </g>
            </svg>
          </div> : <div className="graph-empty"><FilterX /><h3>{t.noData}</h3><p>{t.noDataHelp}</p><Button variant="outline" onClick={clearFilters}>{t.clearFilters}</Button></div>}
          {!mobileLite && <div className="network-hint"><div><strong>{graph.nodes.length} {t.nodes} · {graph.edges.length} {t.links} · {filteredEvents.length} {t.artifacts}</strong><span>{t.dragHelp}</span></div>{selectedIds.length > 0 && <button onClick={() => setSelectedIds([])}>{t.clearSelection}</button>}</div>}
          {!mobileLite && <ResultList locale={locale} resultEvents={resultEvents} selectedCount={selectedIds.length} onSelect={(event) => setSelectedIds([`artifact:${event.id}`])} />}
          </>}
          {appView === 'dashboard' && <OverviewDashboard locale={locale} resultEvents={resultEvents} selectedIds={selectedIds} animationStyle={effectiveAnimationStyle} visualizationStyle={effectiveVisualizationStyle} motionFrozen={effectiveMotionFrozen} onSelectPerson={(name) => { setSelectionLogic('any'); setSelectedIds([`person:${name}`]); }} onSelectPair={(left, right) => { setSelectionLogic('all'); setSelectedIds([`person:${left}`, `person:${right}`]); }} onSelectArtifact={(id) => setSelectedIds([`artifact:${id}`])} onSelectFormat={(name) => { setFormat(name); setSelectedIds([]); }} onClearSelection={() => setSelectedIds([])} />}
        </section>

        <aside id="selection-details-panel" className={`inspector-panel ${mobileLite ? 'mobile-inline-inspector' : ''}`} aria-label={t.selection} hidden={!inspectorPanelOpen}>
          {compactPanels && <div className="mobile-inspector-heading"><strong>{t.details}</strong><button type="button" aria-label={t.hideDetails} onClick={() => setInspectorPanelOpen(false)}><X /></button></div>}
          {selectedNodes.length ? <SelectionInspector locale={locale} nodes={selectedNodes} resultEvents={resultEvents} logic={selectionLogic} setLogic={setSelectionLogic} removeNode={(id) => setSelectedIds((current) => current.filter((item) => item !== id))} showRelated={mobileLite} /> : <EmptyInspector locale={locale} count={resultEvents.length} />}
        </aside>
      </div>
      <SiteFooter />
    </main>
  );
}

function SiteFooter() {
  const [year, setYear] = useState(2026);
  useEffect(() => { setYear(new Date().getFullYear()); }, []);

  return <footer className="site-footer"><small>© {year} <a href="https://dhc.lu.lv/">LU Digitālo humanitāro zinātņu centrs</a></small></footer>;
}

function OverviewDashboard({ locale, resultEvents, selectedIds, animationStyle, visualizationStyle, motionFrozen, onSelectPerson, onSelectPair, onSelectArtifact, onSelectFormat, onClearSelection }: {
  locale: Locale;
  resultEvents: EventRecord[];
  selectedIds: string[];
  animationStyle: AnimationStyle;
  visualizationStyle: VisualizationStyle;
  motionFrozen: boolean;
  onSelectPerson: (name: string) => void;
  onSelectPair: (left: string, right: string) => void;
  onSelectArtifact: (id: string) => void;
  onSelectFormat: (name: string) => void;
  onClearSelection: () => void;
}) {
  const t = ui[locale];
  const selectedPeople = selectedIds.filter((id) => id.startsWith('person:')).map((id) => id.slice('person:'.length));
  const focusPerson = selectedPeople.length === 1 ? selectedPeople[0] : null;
  const formatCounts = Array.from(resultEvents.reduce((map, event) => map.set(event.format, (map.get(event.format) ?? 0) + 1), new Map<string, number>())).sort((a, b) => b[1] - a[1]);
  const personCounts = Array.from(resultEvents.reduce((map, event) => {
    new Set(event.credits.map((credit) => credit.person)).forEach((name) => map.set(name, (map.get(name) ?? 0) + 1));
    return map;
  }, new Map<string, number>())).filter(([name]) => name !== focusPerson).sort((a, b) => b[1] - a[1] || displayPersonName(a[0]).localeCompare(displayPersonName(b[0]), 'lv')).slice(0, 8);
  const artifactCounts = resultEvents.map((event) => ({ event, count: new Set(event.credits.map((credit) => credit.person)).size })).sort((a, b) => b.count - a.count || a.event.title.localeCompare(b.event.title, 'lv')).slice(0, 8);
  const peopleCount = new Set(resultEvents.flatMap((event) => event.credits.map((credit) => credit.person)).filter((name) => name !== focusPerson)).size;
  const maxPerson = Math.max(1, ...personCounts.map(([, count]) => count));
  const maxArtifact = Math.max(1, ...artifactCounts.map(({ count }) => count));
  const totalFormats = Math.max(1, formatCounts.reduce((sum, [, count]) => sum + count, 0));
  const chartColors = ['var(--palette-green)', 'var(--palette-amber)', 'var(--palette-teal)', 'var(--palette-blue)', 'var(--palette-magenta)', 'var(--palette-orange)'];
  const chartPencilPatterns = chartColors.map((_, index) => `url(#pencil-chart-${index})`);
  let donutOffset = 0;
  const surfaceClass = `analytics-surface animation-${animationStyle} style-${visualizationStyle} ${motionFrozen ? 'is-motion-paused' : ''} ${selectedIds.length ? 'has-selection' : ''}`;

  return <div className={surfaceClass}>
    <div className="analytics-summary" aria-label={t.overviewAria}>
      <div><strong>{resultEvents.length}</strong><span>{t.records}</span></div>
      <div><strong>{peopleCount}</strong><span>{focusPerson ? t.relatedPeople : t.documentedPeople}</span></div>
      <div><strong>{formatCounts.length}</strong><span>{t.visibleFormats}</span></div>
    </div>
    <div className="analytics-grid">
      <section className="analytics-chart format-chart">
        <h2>{t.formatChart}</h2>
        <div className="format-donut-layout">
          <div className="format-donut" role="img" aria-label={`${t.formatChart}: ${resultEvents.length} ${t.records.toLocaleLowerCase()}`}>
            <svg viewBox="0 0 120 120" aria-hidden="true"><circle className="donut-track" cx="60" cy="60" r="46" pathLength="100" />{formatCounts.map(([name, count], index) => {
              const segment = count / totalFormats * 100;
              const offset = donutOffset;
              donutOffset += segment;
              return <circle key={name} className="donut-segment" cx="60" cy="60" r="46" pathLength="100" style={{ stroke: visualizationStyle === 'pencil' ? chartPencilPatterns[index % chartPencilPatterns.length] : chartColors[index % chartColors.length], strokeDasharray: `${segment} ${100 - segment}`, strokeDashoffset: -offset, '--animation-index': index } as CSSProperties} />;
            })}</svg>
            <div><strong>{resultEvents.length}</strong><span>{t.records}</span></div>
          </div>
          <div className="format-legend">{formatCounts.map(([name, count], index) => <button type="button" key={name} onClick={() => onSelectFormat(name)} style={{ '--chart-color': chartColors[index % chartColors.length], '--animation-index': index } as CSSProperties}><i aria-hidden="true" /><span>{name}</span><strong>{count}</strong></button>)}</div>
        </div>
      </section>
      <section className="analytics-chart people-chart">
        <h2>{focusPerson ? t.frequent : t.peopleChart}</h2>
        <div className="analytics-bars">{personCounts.map(([name, count], index) => {
          const active = selectedIds.includes(`person:${name}`);
          return <button type="button" key={name} className={`analytics-bar person-bar ${active ? 'is-active' : ''}`} aria-pressed={active} onClick={() => onSelectPerson(name)} style={{ '--bar-size': `${count / maxPerson * 100}%`, '--animation-index': index } as CSSProperties}><span className="bar-label">{displayPersonName(name)}</span><i aria-hidden="true"><b /></i><strong>{count}</strong></button>;
        })}</div>
      </section>
      <section className="analytics-chart artifact-chart">
        <h2>{t.artifactChart}</h2>
        <div className="artifact-columns">{artifactCounts.map(({ event, count }, index) => {
          const active = selectedIds.includes(`artifact:${event.id}`);
          return <button type="button" key={event.id} className={`artifact-column ${active ? 'is-active' : ''}`} aria-pressed={active} onClick={() => onSelectArtifact(event.id)} style={{ '--bar-size': `${count / maxArtifact * 100}%`, '--animation-index': index } as CSSProperties}><strong>{count}</strong><i aria-hidden="true"><b /></i><span>{event.title}</span></button>;
        })}</div>
      </section>
      <CollaborationMatrixChart locale={locale} resultEvents={resultEvents} selectedIds={selectedIds} onSelectPerson={onSelectPerson} onSelectPair={onSelectPair} />
    </div>
    <AnalyticsFooter locale={locale} count={resultEvents.length} selected={selectedIds.length > 0} onClearSelection={onClearSelection} />
  </div>;
}

function CollaborationMatrixChart({ locale, resultEvents, selectedIds, onSelectPerson, onSelectPair }: {
  locale: Locale;
  resultEvents: EventRecord[];
  selectedIds: string[];
  onSelectPerson: (name: string) => void;
  onSelectPair: (left: string, right: string) => void;
}) {
  const t = ui[locale];
  const peopleCounts = resultEvents.reduce((map, event) => {
    new Set(event.credits.map((credit) => credit.person)).forEach((name) => map.set(name, (map.get(name) ?? 0) + 1));
    return map;
  }, new Map<string, number>());
  const rankedPeople = Array.from(peopleCounts).sort((a, b) => b[1] - a[1] || displayPersonName(a[0]).localeCompare(displayPersonName(b[0]), 'lv')).slice(0, 12).map(([name]) => name);
  const pairCounts = new Map<string, number>();
  resultEvents.forEach((event) => {
    const names = Array.from(new Set(event.credits.map((credit) => credit.person))).filter((name) => rankedPeople.includes(name));
    names.forEach((left, leftIndex) => names.slice(leftIndex + 1).forEach((right) => {
      const key = [left, right].sort().join('|');
      pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
    }));
  });
  const maxPair = Math.max(1, ...pairCounts.values());
  const topPairs = Array.from(pairCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([key, count]) => {
    const [left, right] = key.split('|');
    return { left, right, count };
  });
  const hasCollaborations = pairCounts.size > 0;
  const isSelected = (name: string) => selectedIds.includes(`person:${name}`);

  return <section className="analytics-chart matrix-section">
      <div className="matrix-heading"><div><h2><span className="desktop-matrix-title">{t.collaborationMatrix}</span><span className="mobile-matrix-title">{t.collaborationMobile}</span></h2><p>{t.collaborationHelp}</p></div><span>{rankedPeople.length} {t.documentedPeople.toLocaleLowerCase()}</span></div>
      {hasCollaborations ? <><div className="mobile-collaboration-list" aria-label={t.topCollaborations}><h3>{t.topCollaborations}</h3>{topPairs.map(({ left, right, count }) => {
        const active = isSelected(left) && isSelected(right);
        return <button type="button" key={`${left}|${right}`} className={active ? 'is-active' : ''} onClick={() => onSelectPair(left, right)} aria-pressed={active}><span><strong>{displayPersonName(left)}</strong><small>{displayPersonName(right)}</small></span><i aria-hidden="true"><b style={{ width: `${count / maxPair * 100}%` }} /></i><em>{count}</em></button>;
      })}</div><div className="matrix-scroll"><div className="collaboration-matrix" style={{ '--matrix-size': rankedPeople.length } as CSSProperties}>
        <span className="matrix-corner" />
        {rankedPeople.map((name) => <button type="button" key={`column-${name}`} className={`matrix-column-label ${isSelected(name) ? 'is-active' : ''}`} onClick={() => onSelectPerson(name)} aria-pressed={isSelected(name)}><span>{displayPersonName(name)}</span></button>)}
        {rankedPeople.map((rowName, rowIndex) => <div className="matrix-row" key={rowName}>
          <button type="button" className={`matrix-row-label ${isSelected(rowName) ? 'is-active' : ''}`} onClick={() => onSelectPerson(rowName)} aria-pressed={isSelected(rowName)}>{displayPersonName(rowName)}</button>
          {rankedPeople.map((columnName, columnIndex) => {
            const count = rowName === columnName ? peopleCounts.get(rowName) ?? 0 : pairCounts.get([rowName, columnName].sort().join('|')) ?? 0;
            const active = rowName !== columnName && isSelected(rowName) && isSelected(columnName);
            return <button type="button" key={`${rowName}-${columnName}`} disabled={rowName === columnName || count === 0} className={`matrix-cell ${rowName === columnName ? 'is-diagonal' : ''} ${active ? 'is-active' : ''}`} style={{ '--cell-strength': rowName === columnName ? .12 : .12 + count / maxPair * .78, '--animation-index': rowIndex + columnIndex } as CSSProperties} onClick={() => onSelectPair(rowName, columnName)} aria-label={`${displayPersonName(rowName)} + ${displayPersonName(columnName)}: ${count} ${t.sharedRecords}`} aria-pressed={active}><span>{rowName !== columnName && count > 0 ? count : ''}</span></button>;
          })}
        </div>)}
      </div></div></> : <div className="graph-empty compact-empty"><Network /><h3>{t.noCollaborations}</h3></div>}
    </section>;
}

function AnalyticsFooter({ locale, count, selected, onClearSelection }: { locale: Locale; count: number; selected: boolean; onClearSelection: () => void }) {
  const t = ui[locale];
  return <div className="analytics-footer"><strong>{t.currently}: {count} {t.artifacts}</strong>{selected && <button type="button" onClick={onClearSelection}>{t.clearSelection}</button>}</div>;
}

function SelectionInspector({ locale, nodes, resultEvents, logic, setLogic, removeNode, showRelated }: { locale: Locale; nodes: GraphNode[]; resultEvents: EventRecord[]; logic: SelectionLogic; setLogic: (value: SelectionLogic) => void; removeNode: (id: string) => void; showRelated: boolean }) {
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
    {showRelated && <section className="inspector-section"><h3>{t.related}</h3>{(showAllRelated ? resultEvents : resultEvents.slice(0, 7)).map((event) => <div className="mini-result" key={event.id}><span>{event.year}</span><strong>{event.title}</strong></div>)}{resultEvents.length > 7 && <button type="button" className="more-results more-results-button" onClick={() => setShowAllRelated((current) => !current)}>{showAllRelated ? t.showLess : `${t.more} ${resultEvents.length - 7}`}</button>}</section>}
  </div>;
}

function ResultList({ locale, resultEvents, selectedCount, onSelect }: { locale: Locale; resultEvents: EventRecord[]; selectedCount: number; onSelect: (event: EventRecord) => void }) {
  const [expanded, setExpanded] = useState(false);
  const t = ui[locale];
  return <section className="result-list" aria-labelledby="result-title"><div className="result-heading"><div><p>{selectedCount ? t.selectionResults : t.filteredData}</p><h3 id="result-title">{selectedCount ? t.related : typeLabels[locale].artifact} <span>{resultEvents.length}</span></h3></div></div>{resultEvents.length ? <div className="result-rows">{(expanded ? resultEvents : resultEvents.slice(0, 10)).map((event) => <button key={event.id} onClick={() => onSelect(event)}><time>{event.year}</time><span><strong>{event.title}</strong><small>{[event.format, event.artist, event.place].filter(Boolean).join(' · ')}</small></span><em>{event.credits.length} {t.personsShort}</em><ChevronRight /></button>)}</div> : <p className="no-results">{t.noArtifacts}</p>}{resultEvents.length > 10 && <button type="button" className="more-results more-results-button" onClick={() => setExpanded((current) => !current)}>{expanded ? t.showLess : `${t.more} ${resultEvents.length - 10}`}</button>}</section>;
}

function EmptyInspector({ locale, count }: { locale: Locale; count: number }) {
  const t = ui[locale];
  return <div className="empty-inspector"><CircleHelp aria-hidden="true" /><h2>{t.choose}</h2><p>{t.chooseHelp}</p><div><Users aria-hidden="true" /> {t.currently}: {count} {t.artifacts}</div></div>;
}
