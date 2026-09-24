import assert from 'node:assert/strict';
import test from 'node:test';
import { encodeSharedView, decodeSharedView } from '../lib/shared-view.ts';

const view = {
  locale: 'lv', theme: 'dark', textSize: 18, palette: 'bolderaja',
  personQuery: 'Mārtiņš', artifactQuery: 'Ļoti lielais', format: 'Kasete', yearRange: [1978, 1992],
  visibleTypes: ['person', 'artifact'], multiSelect: true, selectionLogic: 'all',
  selectedIds: ['person:Hardijs Lediņš', 'artifact:42'], layoutMode: 'hierarchical',
  leftType: 'person', rightType: 'artifact', motionFrozen: true, networkMotionStyle: 'orbit', networkMotionIntensity: 75,
  animationStyle: 'rain', visualizationStyle: 'pencil', nodeShapeMode: 'category', appView: 'network', labelMode: 'all',
  graphLabelScale: 1.8, nodeScale: .75, zoom: 1.35, pan: { x: -81.2, y: 42 }, driftClock: 98765,
  controlsPanelOpen: false, inspectorPanelOpen: true, manualPositions: { 'person:Hardijs Lediņš': { x: 500, y: 280 } },
};

test('share link round-trips all settings, Latvian text and manual positions', () => {
  const hash = encodeSharedView(view);
  assert.match(hash, /^#view=[A-Za-z0-9_-]+$/);
  assert.deepEqual(decodeSharedView(hash), view);
  assert.deepEqual(decodeSharedView(new URL('https://dhc.lu.lv/nsrd-dati/' + hash).hash), view);
});

test('ordinary anchors, malformed or oversized links fail safely', () => {
  for (const hash of ['', '#network', '#view=%zz', '#view=!!', '#view=abcd', '#view=' + 'x'.repeat(250000)]) {
    assert.equal(decodeSharedView(hash), null);
  }
});

test('reject invalid values, future versions, and missing settings', () => {
  for (const change of [
    { zoom: -1 }, { nodeScale: 100 }, { pan: { x: null, y: 0 } }, { yearRange: [2000, 1976] },
    { theme: 'invalid' }, { visibleTypes: ['invalid'] }, { selectedIds: [42] },
    { visualizationStyle: undefined }, { v: 2 }, { leftType: 'artifact' },
    { manualPositions: { a: { x: Infinity, y: 0 } } }, { motionFrozen: 'false' },
  ]) assert.equal(decodeSharedView(encodeSharedView({ ...view, ...change })), null);
});

test('unknown fields cannot be applied as app state', () => {
  assert.deepEqual(decodeSharedView(encodeSharedView({ ...view, surprise: 'ignored' })), view);
});
