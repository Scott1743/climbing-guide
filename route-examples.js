/* Climbing Guide: teaching layouts and one-time migration of the old preset. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ClimbingExamples = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const revision = 2;
  const legacyHolds = [
    ['H1', 1.05, .25], ['H2', 1.65, .3], ['H3', 1.05, .95],
    ['H4', 1.75, 1.1], ['H5', 1.3, 1.5], ['H6', 1.9, 1.8],
    ['H7', 1.15, 2.1], ['H8', 1.75, 2.5], ['H9', 1.2, 2.85],
    ['H10', 1.6, 3.25], ['H11', 1.5, 3.6]
  ];
  function example() {
    return {
      width: 3, height: 4, bodyHeight: 1.7, armSpan: 1.7,
      holds: [
        ['H1', 1.1, .25, 'foot'], ['H2', 1.7, .3, 'foot'],
        ['F1', 1.25, .7, 'foot'], ['F2', 1.8, 1, 'foot'],
        ['F3', 1.1, 1.35, 'foot'], ['F4', 1.75, 1.7, 'foot'],
        ['F5', 1.2, 2.05, 'foot'],
        ['H3', 1.15, 1.8, 'both'], ['H4', 1.75, 1.9, 'both'],
        ['H5', 1.15, 2.25, 'both'], ['H6', 1.8, 2.6, 'both'],
        ['H7', 1.2, 2.95, 'both'], ['H8', 1.7, 3.3, 'both'],
        ['H9', 1.5, 3.65, 'hand']
      ].map(([id, x, y, type]) => ({ id, x, y, type })),
      starts: { lh: 'H3', rh: 'H4', lf: 'H1', rf: 'H2' }, finish: 'H9'
    };
  }
  function isLegacyExample(layout) {
    if (!layout || layout.width !== 3 || layout.height !== 4 ||
        layout.bodyHeight !== 1.7 || layout.armSpan !== 1.7 || layout.finish !== 'H11' ||
        !Array.isArray(layout.holds) || layout.holds.length !== legacyHolds.length) return false;
    if (!Object.entries({ lh: 'H3', rh: 'H4', lf: 'H1', rf: 'H2' })
      .every(([limb, id]) => layout.starts && layout.starts[limb] === id)) return false;
    const points = new Map(layout.holds.map(p => [p.id, p]));
    return legacyHolds.every(([id, x, y]) => {
      const p = points.get(id);
      return p && p.x === x && p.y === y && p.type === 'both';
    });
  }
  // Only called for browser restoration, never for explicit JSON imports.
  function restore(layout, savedRevision) {
    const migrated = !(savedRevision >= revision) && isLegacyExample(layout);
    return { layout: migrated ? example() : layout, migrated };
  }
  return Object.freeze({ revision, example, restore });
});
