'use strict';
const assert = require('node:assert/strict');
const Solver = require('./route-solver.js');
const LIMBS = ['lh', 'rh', 'lf', 'rf'];
const hand = l => l.endsWith('h');
const copy = x => JSON.parse(JSON.stringify(x));

// Deliberately mixed hold types: solving this route cannot use a low foothold
// as a handhold, or place a foot on the hand-only intermediate/finish holds.
const example = {
  width: 3, height: 4, bodyHeight: 1.7, armSpan: 1.7,
  holds: [
    { id: 'H1', x: 1.05, y: 0.25, type: 'foot' },
    { id: 'H2', x: 1.65, y: 0.30, type: 'foot' },
    { id: 'H3', x: 1.05, y: 0.95, type: 'both' },
    { id: 'H4', x: 1.75, y: 1.10, type: 'both' },
    { id: 'H5', x: 1.30, y: 1.50, type: 'hand' },
    { id: 'H6', x: 1.90, y: 1.80, type: 'both' },
    { id: 'H7', x: 1.15, y: 2.10, type: 'both' },
    { id: 'H8', x: 1.75, y: 2.50, type: 'both' },
    { id: 'H9', x: 1.20, y: 2.85, type: 'both' },
    { id: 'H10', x: 1.60, y: 3.25, type: 'both' },
    { id: 'H11', x: 1.50, y: 3.60, type: 'hand' }
  ],
  starts: { lh: 'H3', rh: 'H4', lf: 'H1', rf: 'H2' }, finish: 'H11'
};

function checkReach(pose, contacts, input) {
  assert(pose && Number.isFinite(pose.hip.x) && Number.isFinite(pose.shoulder.y));
  const H = input.bodyHeight;
  const points = new Map(input.holds.map(p => [p.id, p]));
  // Verify positions independently with the published anatomical proportions.
  for (const l of LIMBS) {
    const target = points.get(contacts[l]);
    assert(target, `${l} must stay on an existing hold`);
    assert(target.type === 'both' || target.type === (hand(l) ? 'hand' : 'foot'));
    const center = hand(l) ? pose.shoulder : pose.hip;
    const offset = (l[0] === 'l' ? -1 : 1) * H * (hand(l) ? .10 : .065);
    const length = hand(l) ? (input.armSpan - .20 * H) / 2 : .48 * H;
    assert(Math.hypot(target.x - center.x - offset, target.y - center.y) <= length + 1e-6, `${l} exceeds anatomical reach`);
  }
  assert(Math.abs(Math.hypot(pose.shoulder.x - pose.hip.x, pose.shoulder.y - pose.hip.y) - .28 * H) < 1e-6);
}

const original = JSON.stringify(example);
const result = Solver.solve(example);
assert.equal(JSON.stringify(example), original, 'solving must not edit the user layout');
assert.equal(result.status, 'ok');
assert(result.routes.length >= 1 && result.routes.length <= 3);
assert(result.stats.expanded <= result.stats.maxStates);
for (let i = 1; i < result.routes.length; i++) assert(result.routes[i - 1].score <= result.routes[i].score);
for (const route of result.routes) {
  assert.deepEqual(route.states[0].contacts, example.starts);
  assert.equal(route.states.length, route.moves.length + 1);
  assert(route.moves.length <= 28);
  for (let i = 0; i < route.states.length; i++) {
    const state = route.states[i];
    checkReach(state.pose, state.contacts, example);
    assert(![state.contacts.lh, state.contacts.rh].some(id => id === state.contacts.lf || id === state.contacts.rf));
    if (!i) continue;
    const previous = route.states[i - 1], move = route.moves[i - 1];
    const changed = LIMBS.filter(l => previous.contacts[l] !== state.contacts[l]);
    assert.deepEqual(changed, [move.limb], 'a move cannot teleport two limbs at once');
    assert.equal(move.from, previous.contacts[move.limb]);
    assert.equal(move.to, state.contacts[move.limb]);
    checkReach(move.movePose, previous.contacts, example);
    checkReach(move.movePose, state.contacts, example);
    assert(move.reason.length > 10);
  }
  const end = route.states.at(-1).contacts;
  assert.equal(end.lh, example.finish);
  assert.equal(end.rh, example.finish, 'one hand at finish is not completion');
}

const shorter = { ...copy(example), bodyHeight: 1.2, armSpan: 1.2 };
assert.equal(Solver.validate(shorter).valid, true);
assert(Solver.poseFor(shorter.starts, shorter), 'the shorter climber can start this example');
assert.notEqual(Solver.solve(shorter).status, 'ok', 'body dimensions must affect reach, not just SVG scale');

const isolated = copy(example);
isolated.height = 6;
isolated.holds.at(-1).y = 5.8;
const disconnected = Solver.solve(isolated);
assert.equal(disconnected.routes.length, 0);
assert(['no-route', 'budget'].includes(disconnected.status));
assert(disconnected.message.includes('不') && disconnected.message.includes('真实'), 'failure must not claim real-world impossibility');

const wrongStart = copy(example); wrongStart.starts.lh = 'H1';
assert.equal(Solver.solve(wrongStart).status, 'invalid');
const absent = copy(example); absent.starts.rf = 'missing';
assert.equal(Solver.solve(absent).status, 'invalid');
const wrongFinish = copy(example); wrongFinish.finish = 'H1';
assert.equal(Solver.solve(wrongFinish).status, 'invalid');
const duplicate = copy(example); duplicate.holds[1].id = duplicate.holds[0].id;
assert.equal(Solver.solve(duplicate).status, 'invalid');
const malformed = copy(example); malformed.holds[3].x = NaN;
assert.equal(Solver.solve(malformed).status, 'invalid');
assert.equal(Solver.solve(null).status, 'invalid');

const alreadyFinished = copy(example);
alreadyFinished.finish = 'H4';
alreadyFinished.starts = { ...alreadyFinished.starts, lh: 'H4', rh: 'H4' };
const done = Solver.solve(alreadyFinished);
assert.equal(done.status, 'ok');
assert.equal(done.routes[0].moves.length, 0);
assert.equal(done.routes[0].states.length, 1);

function checkRouteResult(solved, input) {
  assert.equal(solved.status, 'ok');
  assert(solved.routes.length > 0);
  for (const route of solved.routes) {
    for (const state of route.states) checkReach(state.pose, state.contacts, input);
    for (let i = 0; i < route.moves.length; i++) {
      const move = route.moves[i], before = route.states[i], after = route.states[i + 1];
      assert.deepEqual(LIMBS.filter(l => before.contacts[l] !== after.contacts[l]), [move.limb]);
      checkReach(move.movePose, before.contacts, input);
      checkReach(move.movePose, after.contacts, input);
    }
    assert.equal(route.states.at(-1).contacts.lh, input.finish);
    assert.equal(route.states.at(-1).contacts.rh, input.finish);
  }
}

const rightTraverse = Solver.traverseExample();
const freshTraverse = Solver.traverseExample();
rightTraverse.holds[0].x += .01;
assert.equal(freshTraverse.holds[0].x, .5, 'example callers must receive independent layouts');
const rightResult = Solver.solve(freshTraverse);
checkRouteResult(rightResult, freshTraverse);
const leftTraverse = Solver.traverseExample();
leftTraverse.holds.forEach(p => { p.x = leftTraverse.width - p.x; });
leftTraverse.starts = { lh: 'H2', rh: 'H1', lf: 'F2', rf: 'F1' };
const leftResult = Solver.solve(leftTraverse);
checkRouteResult(leftResult, leftTraverse);
assert.equal(leftResult.routes[0].moves.length, rightResult.routes[0].moves.length, 'mirrored traverses should not favor an upward/rightward direction');
for (const [layout, solved] of [[freshTraverse, rightResult], [leftTraverse, leftResult]]) {
  const points = new Map(layout.holds.map(p => [p.id, p]));
  assert(solved.routes[0].moves.every(m => points.get(m.from).y === points.get(m.to).y), 'fixture must be pure sideways motion');
}

// The only intermediate handhold is 45 cm LOWER than the start. The finish
// is back at the original height and too far for a direct hand transition.
// This exercises a necessary downward setup move, not merely a lower finish.
const dipTraverse = {
  width: 3, height: 3, bodyHeight: 1.7, armSpan: 1.7,
  holds: [
    { id: 'A', x: .55, y: 1.9, type: 'hand' },
    { id: 'B', x: 1.4, y: 1.45, type: 'hand' },
    { id: 'C', x: 2.2, y: 1.9, type: 'hand' },
    ...[.4, .8, 1.4, 1.9].map((x, i) => ({ id: `F${i}`, x, y: .7, type: 'foot' }))
  ],
  starts: { lh: 'A', rh: 'A', lf: 'F0', rf: 'F1' }, finish: 'C'
};
const dipResult = Solver.solve(dipTraverse);
checkRouteResult(dipResult, dipTraverse);
for (const route of dipResult.routes) assert(route.moves.some(m => hand(m.limb) && m.from === 'A' && m.to === 'B'));

const screenshotLayout = {
  width: 6, height: 4, bodyHeight: 1.7, armSpan: 1.7,
  holds: [['H1', .55, 2.92], ['H6', .38, 1.25], ['H2', 1.8, 1.4], ['H3', 2.95, 2.72], ['H4', 4.3, 1.78], ['H5', 5.05, 3.42]]
    .map(([id, x, y]) => ({ id, x, y, type: 'both' })),
  starts: { lh: 'H1', rh: 'H1', lf: 'H6', rf: 'H2' }, finish: 'H5'
};
const diagnosticResult = Solver.solve(screenshotLayout);
assert.equal(diagnosticResult.status, 'invalid');
assert.equal(diagnosticResult.stats.expanded, 0, 'the start error happens before route search');
assert.equal(diagnosticResult.diagnostic.kind, 'start-unreachable');
assert.equal(diagnosticResult.diagnostic.searchStarted, false);
assert.deepEqual(diagnosticResult.diagnostic.pair.limbs, ['rh', 'rf']);
assert.deepEqual(diagnosticResult.diagnostic.pair.ids, ['H1', 'H2']);
assert(Math.abs(diagnosticResult.diagnostic.pair.distance - Math.hypot(1.8 - .55, 1.4 - 2.92)) < 1e-10);
for (const lean of [0, -.136, .136]) {
  const shoulderY = Math.sqrt(.476 ** 2 - lean ** 2);
  const handDisk = { x: .55 - lean - .17, y: 2.92 - shoulderY };
  const footDisk = { x: 1.8 - .1105, y: 1.4 };
  assert(Math.hypot(handDisk.x - footDisk.x, handDisk.y - footDisk.y) > .68 + .816, 'reported pair must prove disjoint reach disks for every tested torso pose');
}
assert.equal(diagnosticResult.message.split('\n').length, 3);
assert(diagnosticResult.message.includes('尚未搜索换点'));
assert(!diagnosticResult.message.includes('16.6'), 'technical angles belong in diagnostic metadata, not beginner error copy');

const noPairProof = {
  width: 3, height: 3, bodyHeight: 1.7, armSpan: 1.7,
  holds: [{ id: 'A', x: 1, y: 1, type: 'both' }, { id: 'B', x: 1.6, y: 1.1, type: 'both' }, { id: 'C', x: 1.5, y: .4, type: 'foot' }],
  starts: { lh: 'A', rh: 'B', lf: 'A', rf: 'C' }, finish: 'B'
};
assert.equal(Solver.solve(noPairProof).diagnostic.pair, null, 'do not invent a pairwise distance explanation when none was proved');

const allPurposeExample = copy(example); allPurposeExample.holds.forEach(p => { p.type = 'both'; });
checkRouteResult(Solver.solve(allPurposeExample), allPurposeExample);
console.log(`PASS: ${result.routes.length} complete routes; geometry/type/contact invariants; transition reach; size sensitivity; unreachable/invalid inputs; left/right traverse; required downward setup; evidence-based start diagnostic.`);
