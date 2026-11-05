'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const E = require('./route-examples.js');
const S = require('./route-solver.js');
const copy = x => JSON.parse(JSON.stringify(x));
const legacy = {
  width: 3, height: 4, bodyHeight: 1.7, armSpan: 1.7,
  holds: [
    ['H1', 1.05, .25], ['H2', 1.65, .3], ['H3', 1.05, .95],
    ['H4', 1.75, 1.1], ['H5', 1.3, 1.5], ['H6', 1.9, 1.8],
    ['H7', 1.15, 2.1], ['H8', 1.75, 2.5], ['H9', 1.2, 2.85],
    ['H10', 1.6, 3.25], ['H11', 1.5, 3.6]
  ].map(([id, x, y]) => ({ id, x, y, type: 'both' })),
  starts: { lh: 'H3', rh: 'H4', lf: 'H1', rf: 'H2' }, finish: 'H11'
};
const input = E.example(), unchanged = JSON.stringify(input);
assert(S.validate(input).valid);
const pose = S.poseFor(input.starts, input);
assert(pose.hip.y > .65, 'default start should leave room for the legs');
const solved = S.solve(input);
assert.equal(solved.status, 'ok');
assert.equal(JSON.stringify(input), unchanged);
for (const route of solved.routes) {
  for (let i = 1; i < route.states.length; i++) {
    const before = route.states[i - 1], after = route.states[i];
    assert.deepEqual(['lh', 'rh', 'lf', 'rf'].filter(l => before.contacts[l] !== after.contacts[l]), [route.moves[i - 1].limb]);
  }
  assert.equal(route.states.at(-1).contacts.lh, input.finish);
  assert.equal(route.states.at(-1).contacts.rh, input.finish);
}
const separate = E.example(); separate.holds[0].y = 99;
assert.equal(JSON.stringify(E.example()), unchanged, 'each caller gets independent points');
assert.deepEqual(E.restore(legacy), { layout: input, migrated: true });
const reordered = copy(legacy); reordered.holds.reverse();
assert(E.restore(reordered).migrated, 'hold ordering is not a custom edit');
for (const change of [
  x => { x.holds[0].x += .01; }, x => { x.holds[0].type = 'foot'; },
  x => { x.bodyHeight = 1.71; }, x => { x.armSpan = 1.71; },
  x => { x.width = 3.1; }, x => { x.height = 4.1; },
  x => { x.starts.lh = 'H4'; }, x => { x.finish = 'H10'; },
  x => { x.holds.pop(); }
]) {
  const custom = copy(legacy); change(custom);
  const restored = E.restore(custom);
  assert.equal(restored.migrated, false, 'custom layouts must be preserved');
  assert.strictEqual(restored.layout, custom);
}
assert.equal(E.restore(legacy, E.revision).migrated, false, 'undo/import must survive a reload');
assert.equal(E.restore(input).migrated, false);

// Exercise the actual startup/undo/import handlers with a small DOM harness.
function boot(saved) {
  const nodes = new Map();
  const node = id => {
    if (!nodes.has(id)) nodes.set(id, { value: '', dataset: {}, classList: { toggle() {}, add() {}, remove() {} }, addEventListener() {}, setAttribute() {} });
    return nodes.get(id);
  };
  const storage = new Map(saved === undefined ? [] : [['climbing-guide-beta-v1', JSON.stringify(saved)]]);
  const sandbox = {
    document: { querySelector: node, querySelectorAll: () => [] },
    window: { ClimbingExamples: E, ClimbingSolver: S,
      ClimbingRenderer: { wallSvg: () => '' }, ClimbingPhotoUI: { mount: () => ({ get: () => null }) } },
    localStorage: { getItem: k => storage.get(k), setItem: (k, v) => storage.set(k, v) },
    matchMedia: () => ({ matches: true }), setTimeout() {}, cancelAnimationFrame() {}
  };
  vm.runInNewContext(fs.readFileSync(require.resolve('./route-lab.js'), 'utf8'), sandbox);
  return { node, saved: () => JSON.parse(storage.get('climbing-guide-beta-v1')) };
}
(async () => {
  const first = boot();
  assert.equal(first.node('#hold-count').textContent, '14 / 24 点');
  const migrated = boot({ version: 1, layout: legacy });
  assert.deepEqual(migrated.saved().layout, input);
  assert.equal(migrated.saved().exampleRevision, E.revision);
  assert.equal(migrated.node('#undo-edit').disabled, false);
  migrated.node('#undo-edit').onclick();
  assert.deepEqual(migrated.saved().layout, legacy);
  const undone = boot(migrated.saved());
  assert.equal(undone.node('#hold-count').textContent, '11 / 24 点');
  assert.equal(undone.node('#undo-edit').disabled, true);
  const custom = copy(legacy); custom.holds[0].x += .01;
  assert.deepEqual(boot({ version: 1, layout: custom }).saved().layout, custom);
  const imported = boot();
  const target = { files: [{ size: 1000, text: async () => JSON.stringify({ version: 1, layout: legacy }) }] };
  await imported.node('#load-layout').onchange({ target });
  assert.deepEqual(imported.saved().layout, legacy);
  assert.equal(imported.saved().exampleRevision, E.revision);
  assert.equal(boot(imported.saved()).node('#hold-count').textContent, '11 / 24 点');
  console.log('PASS: new preset reaches both hands at finish; old preset migration; custom layout preservation; startup, undo, reload and explicit JSON import.');
})().catch(error => { console.error(error); process.exitCode = 1; });
