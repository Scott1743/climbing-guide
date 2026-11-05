'use strict';
const assert = require('node:assert/strict');
const Solver = require('./route-solver.js');
const Renderer = require('./route-render.js');
const Examples = require('./route-examples.js');
const limbs = ['lh', 'rh', 'lf', 'rf'];
const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);

// Preserve the reported low-start layout as a regression, independently of the
// new teaching preset: user-created sit starts must not become invalid input.
const lowStart = {
  width: 3, height: 4, bodyHeight: 1.7, armSpan: 1.7,
  holds: [
    ['H1', 1.05, .25], ['H2', 1.65, .3], ['H3', 1.05, .95],
    ['H4', 1.75, 1.1], ['H5', 1.3, 1.5], ['H6', 1.9, 1.8],
    ['H7', 1.15, 2.1], ['H8', 1.75, 2.5], ['H9', 1.2, 2.85],
    ['H10', 1.6, 3.25], ['H11', 1.5, 3.6]
  ].map(([id, x, y]) => ({ id, x, y, type: 'both' })),
  starts: { lh: 'H3', rh: 'H4', lf: 'H1', rf: 'H2' }, finish: 'H11'
};
const lowPose = Solver.poseFor(lowStart.starts, lowStart);
assert(lowPose, 'a cramped start remains reachable');
assert(lowPose.hip.y > .4, 'avoid the reported pelvis-at-foot-height solution when a higher squat is feasible');
assert(lowPose.reach.rf > .4, 'avoid folding the right leg to the reported 23% reach');

function checkFrame(input, frame) {
  const joints = Renderer.measureJoints(input, frame);
  for (const limb of limbs) {
    const measurement = joints[limb];
    assert(measurement, `${limb} has a measurable two-link chain`);
    assert.deepEqual(measurement.end, frame.points[limb], 'rendering keeps the exact contact endpoint');
    assert(Math.abs(distance(measurement.start, measurement.joint) - measurement.length / 2) < 1e-7,
      `${limb} upper segment must not shrink to hide a collision`);
    assert(Math.abs(distance(measurement.joint, measurement.end) - measurement.length / 2) < 1e-7,
      `${limb} lower segment must retain its anatomical length`);
    if (limb.endsWith('f')) assert(measurement.joint.y >= 0, `${limb} knee must stay above the floor`);
  }
  return joints;
}

// Frozen pre-fix solution exercises the renderer's alternate knee branch even
// after the solver stops choosing this pose. Left knee previously reached -6cm.
const reportedState = { contacts: lowStart.starts, pose: {
  hip: { x: 1.7115656918607791, y: .232 },
  shoulder: { x: 1.8475656918607792, y: .6881578674099571 }
} };
const reportedFrame = Renderer.frameAt(lowStart, reportedState);
const corrected = checkFrame(lowStart, reportedFrame);
assert(corrected.lf.joint.y > .5, 'the above-floor circle intersection is used without moving the foot');
const rendered = Renderer.poseSvg(lowStart, reportedState);
const renderedKnees = [...rendered.matchAll(/data-segment="(lf|rf)"[^>]*data-joint-y="([^"]+)"/g)];
assert.equal(renderedKnees.length, 2);
assert(renderedKnees.every(match => Number(match[2]) >= 0), 'actual SVG uses the measured safe knee joints');

// A foot crossing hip height used to flip the knee to the opposite side of the
// two-circle solution. Preserve the branch continuously through that crossing.
const crossing = y => ({ pose: { hip: { x: 1.5, y }, shoulder: { x: 1.5, y: y + .476 } },
  points: { lf: { x: .9, y: 1.5 }, rf: { x: 2.1, y: 1.5 } } });
const before = Renderer.measureJoints(lowStart, crossing(1.5 - 1e-6));
const after = Renderer.measureJoints(lowStart, crossing(1.5 + 1e-6));
for (const limb of ['lf', 'rf']) {
  assert(distance(before[limb].joint, after[limb].joint) < 1e-4, 'knee branch must not flip at equal hip/foot height');
}

function inspectRoutes(name, input) {
  const original = JSON.stringify(input), result = Solver.solve(input);
  assert.equal(result.status, 'ok', `${name} still reaches the finish`);
  let frames = 0, minimumKnee = Infinity, maximumKneeStep = 0, minimumLegReach = Infinity;
  for (const route of result.routes) {
    const first = checkFrame(input, Renderer.frameAt(input, route.states[0]));
    for (const limb of ['lf', 'rf']) minimumKnee = Math.min(minimumKnee, first[limb].joint.y);
    for (let index = 1; index < route.states.length; index++) {
      const previousState = route.states[index - 1], state = route.states[index], move = route.moves[index - 1];
      let previousJoints;
      for (let sample = 0; sample <= 100; sample++) {
        const frame = Renderer.frameAt(input, state, { previousState, move, progress: sample / 100 });
        const joints = checkFrame(input, frame);
        for (const limb of limbs) {
          if (limb !== move.limb || sample === 0 || sample === 100) {
            const contacts = sample === 100 ? state.contacts : previousState.contacts;
            const hold = input.holds.find(hold => hold.id === contacts[limb]);
            assert.deepEqual(frame.points[limb], { x: hold.x, y: hold.y }, 'fixed contacts and transfer endpoints stay on their holds');
          }
          if (!limb.endsWith('f')) continue;
          minimumKnee = Math.min(minimumKnee, joints[limb].joint.y);
          minimumLegReach = Math.min(minimumLegReach, distance(joints[limb].start, joints[limb].end));
          if (previousJoints) maximumKneeStep = Math.max(maximumKneeStep, distance(previousJoints[limb].joint, joints[limb].joint));
        }
        previousJoints = joints;
        frames++;
      }
    }
  }
  assert.equal(JSON.stringify(input), original, 'neither solving nor rendering edits hold positions');
  return { name, routes: result.routes.length, steps: result.routes.map(route => route.moves.length), frames,
    minimumKnee, minimumLegReach, maximumKneeStep };
}

const legacy = inspectRoutes('original low start', lowStart);
const teaching = inspectRoutes('teaching preset', Examples.example());
assert(teaching.minimumLegReach > .2, 'the teaching routes must not sweep the hip through a planted foot');
assert(teaching.maximumKneeStep < .12, 'teaching animations avoid knee spins between adjacent 1% samples');
console.log('PASS: low starts remain reachable; knees stay above floor; segment lengths and contacts preserved; hip-height crossing remains continuous; all candidate animations sampled.');
console.log(JSON.stringify({ lowStartHip: lowPose.hip.y, routes: [legacy, teaching] }));
