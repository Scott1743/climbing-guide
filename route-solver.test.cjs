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

console.log(`PASS: ${result.routes.length} complete routes; geometry/type/contact invariants; transition reach; size sensitivity; unreachable and invalid inputs.`);
