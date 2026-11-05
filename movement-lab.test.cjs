// Run with: node movement-lab.test.cjs
// These checks exercise the standalone HTML's actual pose model without a browser.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const html = fs.readFileSync(path.join(__dirname, 'movement-lab.html'), 'utf8');
const script = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(script, 'The standalone HTML must contain its animation script.');
new vm.Script(script);
const boundary = script.indexOf('function holdMarkup');
assert.ok(boundary > 0, 'The pure pose model must precede the SVG rendering helpers.');

function loadModel(reducedMotion) {
  const elements = new Map();
  const sandbox = {
    document: {
      getElementById(id) {
        if (!elements.has(id)) elements.set(id, {});
        return elements.get(id);
      },
    },
    window: { matchMedia: () => ({ matches: reducedMotion }) },
  };
  vm.runInNewContext(
    script.slice(0, boundary) + '\n;globalThis.model={scenes,poseAt,geometry};})();',
    sandbox,
    { filename: 'movement-lab-model.js' },
  );
  return { ...sandbox.model, reducedMotion };
}

const models = [loadModel(false), loadModel(true)];
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const near = (a, b, tolerance = 1e-7) => distance(a, b) <= tolerance;
const hands = ['lh', 'rh'];
const extremities = ['lh', 'rh', 'lf', 'rf'];
const samplesPerStep = 120;
const samples = [];
for (const model of models) {
  for (const scene of model.scenes) {
    const end = scene.frames.length - 1;
    for (let n = 0; n <= end * samplesPerStep; n++) {
      const progress = n / samplesPerStep;
      const pose = model.poseAt(scene, progress);
      samples.push({ model, scene, progress, pose, geometry: model.geometry(pose) });
    }
  }
}
const context = ({ model, scene, progress }) =>
  `${scene.id} at ${progress.toFixed(4)} (${model.reducedMotion ? 'reduced' : 'normal'} motion)`;

function angle(a, vertex, b) {
  const u = [a[0] - vertex[0], a[1] - vertex[1]];
  const v = [b[0] - vertex[0], b[1] - vertex[1]];
  const cosine = (u[0] * v[0] + u[1] * v[1]) / (Math.hypot(...u) * Math.hypot(...v));
  return Math.acos(Math.max(-1, Math.min(1, cosine))) * 180 / Math.PI;
}
function armAngles(pose, g) {
  return [angle(g.ls, g.le, pose.lh), angle(g.rs, g.re, pose.rh)];
}
function poseFor(model, id, phase) {
  const scene = model.scenes.find(item => item.id === id);
  assert.ok(scene, `Scene ${id} is present.`);
  const pose = model.poseAt(scene, phase);
  return { scene, pose, geometry: model.geometry(pose) };
}

test('every scene has a complete sequence of poses, stage labels and explanations', () => {
  const scenes = models[0].scenes;
  assert.equal(new Set(scenes.map(scene => scene.id)).size, scenes.length);
  for (const scene of scenes) {
    assert.equal(scene.phases.length, scene.frames.length, `${scene.id}: phase labels`);
    assert.equal(scene.steps.length, scene.frames.length, `${scene.id}: explanations`);
    assert.ok(scene.frames.length >= 2, `${scene.id}: animated sequence`);
  }
});

test('all sampled joints remain finite and the four limbs retain their segment lengths', () => {
  for (const sample of samples) {
    const { pose: p, geometry: g } = sample;
    const label = context(sample);
    for (const point of [...Object.values(g.joints), p.hip, p.lh, p.rh, p.lf, p.rf]) {
      assert.ok(point.length === 2 && point.every(Number.isFinite), `${label}: finite joint`);
    }
    for (const [name, root, middle, end, upper, lower] of [
      ['left arm', g.ls, g.le, p.lh, 72, 70],
      ['right arm', g.rs, g.re, p.rh, 72, 70],
      ['left leg', g.lh, g.lk, p.lf, 88, 86],
      ['right leg', g.rh, g.rk, p.rf, 88, 86],
    ]) {
      assert.ok(distance(root, end) <= upper + lower + 1e-6, `${label}: ${name} reachable`);
      // The IK solver leaves 0.001 px clearance from full extension.
      assert.ok(Math.abs(distance(root, middle) - upper) < 0.002, `${label}: ${name} upper length`);
      assert.ok(Math.abs(distance(middle, end) - lower) < 0.002, `${label}: ${name} lower length`);
    }
  }
});

test('retained contacts stay on their holds and unchanged endpoints never slide', () => {
  for (const sample of samples) {
    const { pose, scene, progress } = sample;
    const label = context(sample);
    const index = Math.min(scene.frames.length - 2, Math.floor(progress));
    const a = scene.frames[index], b = scene.frames[index + 1];
    for (const key of extremities) {
      if (!pose.free.includes(key)) {
        assert.ok(scene.holds.some(hold => {
          const radius = hold.t === 'handwide' ? 27 : hold.t === 'wide' ? 11 : 4;
          return distance(hold.p, pose[key]) < radius;
        }), `${label}: ${key} is attached to a hold`);
      }
      if (near(a[key], b[key])) {
        assert.ok(near(pose[key], a[key]), `${label}: ${key} fixed world contact`);
      }
    }
  }
});

test('the leftward scene is an exact reflection of the rightward scene', () => {
  for (const model of models) {
    const right = model.scenes.find(scene => scene.id === 'right');
    const left = model.scenes.find(scene => scene.id === 'left');
    assert.equal(right.frames.length, left.frames.length);
    for (let n = 0; n <= (right.frames.length - 1) * samplesPerStep; n++) {
      const q = n / samplesPerStep, a = model.poseAt(right, q), b = model.poseAt(left, q);
      for (const [one, two] of [['hip', 'hip'], ['lh', 'rh'], ['rh', 'lh'], ['lf', 'rf'], ['rf', 'lf']]) {
        assert.ok(near([740 - a[one][0], a[one][1]], b[two]), `mirrored ${one}/${two} at ${q}`);
      }
      const ga = model.geometry(a), gb = model.geometry(b);
      for (const [one, two] of [['ls', 'rs'], ['rs', 'ls'], ['le', 're'], ['re', 'le'], ['lk', 'rk'], ['rk', 'lk']]) {
        assert.ok(near([740 - ga[one][0], ga[one][1]], gb[two]), `mirrored joint ${one}/${two} at ${q}`);
      }
    }
  }
});

test('static keyframes show a naturally long arm, except the explicit stand-up power phase', () => {
  for (const model of models) {
    for (const scene of model.scenes) {
      if (scene.id === 'dyno') continue;
      for (let phase = 0; phase < scene.frames.length; phase++) {
        if (scene.id === 'square' && phase === 2) continue;
        const pose = model.poseAt(scene, phase);
        const angles = armAngles(pose, model.geometry(pose));
        assert.ok(Math.max(...angles) >= 165 - 1e-6,
          `${scene.id} phase ${phase}: a long arm is visible (${angles.map(n => n.toFixed(1)).join('/')} degrees)`);
      }
    }
  }
});

test('long support arms stay long between keyframes during foot preparation and hip movement', () => {
  let checked = 0;
  for (const sample of samples) {
    const { scene, progress, pose, geometry: g } = sample;
    if (scene.id === 'dyno') continue;
    const index = Math.min(scene.frames.length - 2, Math.floor(progress));
    const a = scene.frames[index], b = scene.frames[index + 1];
    if ((a.longArm ?? 1) !== 1 || (b.longArm ?? 1) !== 1) continue;
    if (!hands.every(key => near(a[key], b[key]))) continue;
    const angles = armAngles(pose, g);
    assert.ok(Math.max(...angles) >= 165 - 1e-6,
      `${context(sample)}: support arm should not bend along the interpolation chord`);
    checked++;
  }
  assert.ok(checked > 100, 'The support-motion check samples complete intervals.');
});

test('dyno has long-arm preparation, an airborne phase, a real catch and long-arm recovery', () => {
  for (const model of models) {
    const dyno = model.scenes.find(scene => scene.id === 'dyno');
    assert.equal(dyno.frames.length, 7, 'Dyno has seven distinct phases.');
    for (const phase of [1, 4, 6]) {
      const { pose, geometry: g } = poseFor(model, 'dyno', phase);
      const angles = armAngles(pose, g);
      assert.ok(angles.every(value => value >= 165 - 1e-6),
        `dyno phase ${phase}: both arms near straight (${angles.map(n => n.toFixed(1)).join('/')} degrees)`);
    }
    assert.deepEqual([...poseFor(model, 'dyno', 3).pose.free].sort(), ['lf', 'lh', 'rf', 'rh']);
    assert.deepEqual([...poseFor(model, 'dyno', 4).pose.free].sort(), ['lf', 'rf']);
  }
});

test('the square stand-up retains a meaningful rise of the hips', () => {
  for (const model of models) {
    const prepared = poseFor(model, 'square', 1).pose;
    const raised = poseFor(model, 'square', 2).pose;
    assert.ok(prepared.hip[1] - raised.hip[1] > 25, 'Standing up raises the hips by more than 25 px.');
  }
});
