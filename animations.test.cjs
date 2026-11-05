// Run with: node animations.test.cjs
// Exercise the homepage's actual swap geometry and rendered storyboard.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const { test } = require('node:test');

const source = fs.readFileSync(path.join(__dirname, 'animations.js'), 'utf8');
new vm.Script(source);
const end = source.lastIndexOf('})();');
assert.ok(end > 0, 'The homepage animation module has its closing boundary.');
const sandbox = {
  window: {},
  document: { getElementById: () => ({}) },
};
vm.runInNewContext(
  source.slice(0, end) + '\n;globalThis.model={swapPose,swapScene,lessons};\n' + source.slice(end),
  sandbox,
  { filename: 'homepage-animation-model.js' },
);
const { swapPose, swapScene, lessons } = sandbox.model;
const last = lessons.swap.stages.length - 1;
const distance = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const near = (a, b) => distance(a, b) < 1e-7;
const samples = Array.from({ length: last * 120 + 1 }, (_, index) => ({
  q: index / 120,
  pose: swapPose(index / 120),
}));
const initialContact = swapPose(0).old;
const stacked = samples.filter(({ pose }) => pose.stacked);

test('the supporting shoe stays fixed until the replacement toe has stacked above it', () => {
  assert.ok(stacked.length > 12, 'The overlap has a visible dwell, not a single transient frame.');
  const lastStack = stacked.at(-1).q;
  for (const { q, pose } of samples.filter(sample => sample.q <= lastStack)) {
    assert.ok(near(pose.old, initialContact), `Supporting toe must not slide at ${q}.`);
  }
  assert.ok(samples.some(({ pose }) => distance(pose.old, initialContact) > 30),
    'The old shoe eventually leaves the shared contact.');
});

test('the overlap is vertical toe-on-toe, rather than two shoes side by side on the hold', () => {
  for (const { q, pose } of stacked) {
    assert.ok(Math.abs(pose.next[0] - pose.old[0]) < 10,
      `The toe regions overlap horizontally at ${q}.`);
    const separation = pose.old[1] - pose.next[1];
    assert.ok(separation >= 10 && separation <= 20,
      `The new sole sits above the old shoe's upper, not on the rock, at ${q}.`);
    assert.equal(pose.landed, false, 'Stacked on a shoe is not yet landed on the hold.');
  }
  const markup = swapScene('swap-test', stacked[0].q);
  const shoes = [...markup.matchAll(/data-swap-shoe="(old|new)" transform="([^"]+)"/g)];
  assert.equal(shoes.length, 2, 'Both shoes are rendered separately.');
  for (const [, name, transform] of shoes) {
    assert.doesNotMatch(transform, /scale\(\s*-/, `${name} shoe is not mirrored away from the wall.`);
    const angle = Number(transform.match(/rotate\(([-\d.]+)\)/)?.[1]);
    assert.ok(Number.isFinite(angle) && Math.abs(angle) < 45,
      `${name} shoe points toward the same wall.`);
  }
  assert.match(markup, /data-swap-overlap/, 'The tiny toe contact is visibly highlighted.');
});

test('the lower toe starts withdrawing before the upper toe descends into its place', () => {
  const stackHeight = stacked.at(-1).pose.next[1];
  const afterStack = samples.filter(({ q }) => q > stacked.at(-1).q);
  const firstWithdrawal = afterStack.find(({ pose }) => distance(pose.old, initialContact) > 0.01);
  const firstDescent = afterStack.find(({ pose }) => pose.next[1] > stackHeight + 0.01);
  assert.ok(firstWithdrawal && firstDescent, 'Withdrawal and descent both occur.');
  assert.ok(firstWithdrawal.q < firstDescent.q, 'The lower toe starts clearing first.');
  assert.ok(firstDescent.pose.next[0] - firstDescent.pose.old[0] > 10,
    'The old toe clears the overlap before the new sole descends.');
  assert.ok(Math.abs(firstWithdrawal.pose.old[1] - initialContact[1]) < 1,
    'The old toe initially draws outward, rather than lifting through the new shoe.');
});

test('the replacement lands at the original contact and stays there as the old foot leaves', () => {
  const landed = samples.filter(({ pose }) => pose.landed);
  assert.ok(landed.length > 12, 'The completed support is shown long enough to read.');
  for (const { q, pose } of landed) {
    assert.ok(near(pose.next, initialContact), `New shoe takes the exact original contact at ${q}.`);
    assert.ok(distance(pose.old, pose.next) > 30, `Old shoe no longer occupies the toe region at ${q}.`);
    assert.ok(Math.abs(pose.angle) < 1e-7, `The replacement sole settles on the hold at ${q}.`);
  }
});

test('the two shoes move continuously throughout the exchange', () => {
  samples.forEach(({ q, pose }, index) => {
    assert.ok([...pose.old, ...pose.next, pose.angle].every(Number.isFinite), `Finite pose at ${q}.`);
    if (index === 0) return;
    for (const key of ['old', 'next']) {
      assert.ok(distance(pose[key], samples[index - 1].pose[key]) < 3,
        `${key} shoe does not jump between adjacent frames at ${q}.`);
    }
  });
});

test('the three still panels include the stacked contact, between initial support and replacement', () => {
  const container = { innerHTML: '' };
  sandbox.window.mountClimbingStoryboard(container, 'swap');
  const panels = container.innerHTML.match(/<figure\b[\s\S]*?<\/figure>/g);
  assert.equal(panels.length, 3);
  assert.match(panels[0], /data-swap-phase="approach"/);
  assert.match(panels[1], /data-swap-phase="stacked"/);
  assert.match(panels[1], /data-swap-overlap/);
  assert.match(panels[1], /还没有直接踩到岩点/);
  assert.match(panels[2], /data-swap-phase="landed"/);
});
