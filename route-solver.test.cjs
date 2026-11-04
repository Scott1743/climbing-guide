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
    if (hand(l)) {
      const meta = pose.armPosture[l === 'lh' ? 'left' : 'right'];
      assert(['support', 'moving'].includes(meta.role));
      assert(meta.reason.length > 10);
      // During a hand transition metadata describes the departing hand, while
      // this checker is also called on its arrival contact: compare the fixed
      // support arm in both calls, and both arms in every stationary stance.
      if (meta.role === 'support') {
        const ratio = Math.min(1, Math.hypot(target.x - center.x - offset, target.y - center.y) / length);
        assert(Math.abs(meta.extensionRatio - ratio) < 1e-9);
        assert(Math.abs(meta.elbowDegrees - 2 * Math.asin(ratio) * 180 / Math.PI) < 1e-4, 'angle metadata must match geometry (allow inverse-sine rounding at full extension)');
        if (target.y < pose.shoulder.y - .015 * H) assert.equal(meta.mode, 'low-hand-contact');
      }
    }
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

function staticFixture(points) {
  return { width: 3, height: 4, bodyHeight: 1.7, armSpan: 1.7,
    holds: points.map(([id, x, y, type]) => ({ id, x, y, type })),
    starts: { lh: 'L', rh: 'R', lf: 'FL', rf: 'FR' }, finish: 'R' };
}
const symmetric = staticFixture([
  ['L', 1.33, 2.4, 'hand'], ['R', 1.67, 2.4, 'hand'],
  ['FL', 1.2, .65, 'foot'], ['FR', 1.8, .65, 'foot']
]);
const symmetricPose = Solver.poseFor(symmetric.starts, symmetric);
checkReach(symmetricPose, symmetric.starts, symmetric);
assert.equal(symmetricPose.armPosture.mode, 'both-extended');
assert(symmetricPose.armPosture.left.elbowDegrees >= 170 && symmetricPose.armPosture.right.elbowDegrees >= 170);
assert(symmetricPose.reach.lf < .9 && symmetricPose.reach.rf < .9, 'straight arms must not require artificial straight legs in the roomy fixture');
assert(symmetricPose.shoulder.y < 2.4);

const asymmetric = staticFixture([
  ['L', 1.3, 2.2, 'hand'], ['R', 1.7, 2.8, 'hand'],
  ['FL', 1.1, 1.1, 'foot'], ['FR', 1.9, 1.1, 'foot']
]);
const asymmetricPose = Solver.poseFor(asymmetric.starts, asymmetric);
checkReach(asymmetricPose, asymmetric.starts, asymmetric);
assert.equal(asymmetricPose.armPosture.mode, 'one-extended');
assert(asymmetricPose.armPosture.right.elbowDegrees >= 170);
assert(asymmetricPose.armPosture.left.elbowDegrees < 150);
assert(asymmetricPose.shoulder.y <= 2.2 + 1e-6, 'do not make the lower hand look straight by moving it below the shoulder');

const constrained = staticFixture([
  ['L', 1.33, 1.7, 'hand'], ['R', 1.67, 1.7, 'hand'],
  ['FL', .9, 1.2, 'foot'], ['FR', 2.1, 1.2, 'foot']
]);
const constrainedPose = Solver.poseFor(constrained.starts, constrained);
checkReach(constrainedPose, constrained.starts, constrained);
assert.equal(constrainedPose.armPosture.mode, 'bent-support');
// Independent upper bound while hands remain at/above shoulders:
// foot reach restricts hip x to [1.1735,1.8265], foot height requires y>=1.132,
// and the hand-center disks are x in [1.364,1.636], y<=1.243843.
// Thus neither arm can reach the near-straight threshold in this stance.
const constrainedArmUpperBound = Math.hypot(1.636 - 1.1735, 1.243843 - 1.132) / .68;
assert(constrainedArmUpperBound < .71);
assert(constrainedPose.armPosture.left.extensionRatio < .71 && constrainedPose.armPosture.right.extensionRatio < .71);
assert(constrainedPose.armPosture.left.reason.includes('保留了屈肘'));

// Preserve a previously geometrically valid shoulder-low contact; label its
// limitation instead of fabricating a suspension posture or rejecting input.
const lowHands = staticFixture([
  ['L', 1.33, 1.5, 'hand'], ['R', 1.67, 1.5, 'hand'],
  ['FL', 1.2, 1.2, 'foot'], ['FR', 1.8, 1.2, 'foot']
]);
const lowPose = Solver.poseFor(lowHands.starts, lowHands);
checkReach(lowPose, lowHands.starts, lowHands);
assert.equal(lowPose.armPosture.mode, 'low-hand-contact');

const reportedScreenshot = {
  width: 6, height: 4, bodyHeight: 1.7, armSpan: 1.7,
  holds: [['H1', .55, 2.92], ['H2', 1.05, 1.35], ['H3', 1.65, 2.83], ['H4', 2.4, 1.4], ['H5', 2.8, 2.9], ['H6', .35, 1.25]]
    .map(([id, x, y]) => ({ id, x, y, type: 'both' })),
  starts: { lh: 'H3', rh: 'H3', lf: 'H2', rf: 'H4' }, finish: 'H5'
};
const reportedPose = Solver.poseFor(reportedScreenshot.starts, reportedScreenshot);
checkReach(reportedPose, reportedScreenshot.starts, reportedScreenshot);
assert(reportedPose.armPosture.left.elbowDegrees >= 170 && reportedPose.armPosture.right.elbowDegrees >= 170);
assert(reportedPose.hip.y < 1.75, 'the reported start should use its available lower hip position');
assert(reportedPose.reach.lf < .9 && reportedPose.reach.rf < .9);
for (const route of result.routes) for (const move of route.moves) if (hand(move.limb)) {
  const moving = move.limb === 'lh' ? 'left' : 'right';
  assert.equal(move.movePose.armPosture[moving].role, 'moving');
  assert.equal(move.movePose.armPosture[moving === 'left' ? 'right' : 'left'].role, 'support');
}

console.log(`PASS: geometric/contact/type invariants; default and left/right traverse; required descent; start diagnostics; symmetric straight arms; unequal-height support; constrained bent-arm case; shoulder-low contact labelling; reported screenshot posture.`);
console.log(JSON.stringify({ symmetricElbows: [symmetricPose.armPosture.left.elbowDegrees, symmetricPose.armPosture.right.elbowDegrees].map(n => +n.toFixed(1)),
  screenshotElbows: [reportedPose.armPosture.left.elbowDegrees, reportedPose.armPosture.right.elbowDegrees].map(n => +n.toFixed(1)),
  defaultMs: result.stats.elapsedMs, rightTraverseMs: rightResult.stats.elapsedMs, leftTraverseMs: leftResult.stats.elapsedMs }));
