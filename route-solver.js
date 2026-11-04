/* Climbing Guide: bounded, geometric route search. No force/friction model. */
(function (root, factory) {
  'use strict';
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ClimbingSolver = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const LIMBS = ['lh', 'rh', 'lf', 'rf'];
  const NAMES = { lh: '左手', rh: '右手', lf: '左脚', rf: '右脚' };
  const EPS = 1e-7;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
  const hand = limb => limb.endsWith('h');
  const side = limb => limb.startsWith('l') ? -1 : 1;
  const allowed = (hold, limb) => hold && (hold.type === 'both' || hold.type === (hand(limb) ? 'hand' : 'foot'));
  const key = contacts => LIMBS.map(l => contacts[l]).join('|');
  const now = () => typeof performance !== 'undefined' ? performance.now() : Date.now();

  function dimensions(input) {
    const H = input.bodyHeight;
    return { arm: (input.armSpan - 0.20 * H) / 2, leg: 0.48 * H,
      torso: 0.28 * H, shoulderWidth: 0.20 * H, hipWidth: 0.13 * H };
  }

  function validate(input) {
    const errors = [];
    if (!input || typeof input !== 'object') return { valid: false, errors: ['请先摆放岩点并设置起终点。'] };
    for (const [name, min, max, label] of [
      ['width', 1, 6, '墙面宽度'], ['height', 1.5, 6, '墙面高度'],
      ['bodyHeight', 1, 2.3, '身高'], ['armSpan', 1, 2.5, '臂展']
    ]) {
      if (typeof input[name] !== 'number' || !Number.isFinite(input[name]) || input[name] < min || input[name] > max)
        errors.push(`${label}请设置在 ${min}–${max} 米之间。`);
    }
    if (Number.isFinite(input.bodyHeight) && Number.isFinite(input.armSpan) &&
        (input.armSpan / input.bodyHeight < 0.7 || input.armSpan / input.bodyHeight > 1.3))
      errors.push('臂展与身高差距过大，请检查是否使用了相同单位。');
    if (!Array.isArray(input.holds) || input.holds.length < 3 || input.holds.length > 24)
      errors.push('请设置 3–24 个岩点。');
    const holds = Array.isArray(input.holds) ? input.holds : [];
    const ids = new Set();
    for (const p of holds) {
      if (!p || typeof p.id !== 'string' || !/^[A-Za-z0-9_-]{1,40}$/.test(p.id)) {
        errors.push('岩点编号应为 1–40 位字母、数字、下划线或连字符。'); continue;
      }
      if (ids.has(p.id)) errors.push(`岩点编号 ${p.id} 重复。`);
      ids.add(p.id);
      if (!['hand', 'foot', 'both'].includes(p.type)) errors.push(`岩点 ${p.id} 的用途无效。`);
      if (![p.x, p.y].every(v => typeof v === 'number' && Number.isFinite(v)) ||
          p.x < 0 || p.x > input.width || p.y < 0 || p.y > input.height)
        errors.push(`岩点 ${p.id} 超出墙面或坐标无效。`);
    }
    const map = new Map(holds.filter(Boolean).map(p => [p.id, p]));
    for (const limb of LIMBS) {
      const p = map.get(input.starts && input.starts[limb]);
      if (!p) errors.push(`请设置${NAMES[limb]}的起点。`);
      else if (!allowed(p, limb)) errors.push(`${NAMES[limb]}起点 ${p.id} 的手脚用途不匹配。`);
    }
    const finish = map.get(input.finish);
    if (!finish) errors.push('请设置终点。');
    else if (!allowed(finish, 'lh')) errors.push('终点必须可以用手抓。');
    return { valid: errors.length === 0, errors: [...new Set(errors)] };
  }

  function context(input) {
    return { input, dim: dimensions(input), map: new Map(input.holds.map(p => [p.id, p])), cache: new Map() };
  }

  function startDiagnostic(contacts, ctx) {
    const { input, dim, map } = ctx, H = input.bodyHeight;
    const diagnostic = {
      kind: 'start-unreachable', searchStarted: false,
      width: input.width, height: input.height,
      bodyHeight: H, armSpan: input.armSpan,
      maxTorsoLeanDegrees: Math.asin(0.08 / 0.28) * 180 / Math.PI,
      checkedTorsoPoses: 3, pair: null
    };
    // A pair is reported only when its two reach disks are disjoint in EVERY
    // torso pose that this model checks. Actual hold distance is descriptive;
    // it is not itself the proof, nor a claim about a real climber's ability.
    let largestGap = 0;
    for (let i = 0; i < LIMBS.length; i++) for (let j = i + 1; j < LIMBS.length; j++) {
      const a = LIMBS[i], b = LIMBS[j], pa = map.get(contacts[a]), pb = map.get(contacts[b]);
      const radiusSum = (hand(a) ? dim.arm : dim.leg) + (hand(b) ? dim.arm : dim.leg);
      const distances = [0, -0.08 * H, 0.08 * H].map(lean => {
        const torsoY = Math.sqrt(dim.torso ** 2 - lean ** 2);
        const disk = (l, p) => ({
          x: p.x - (hand(l) ? lean + side(l) * dim.shoulderWidth / 2 : side(l) * dim.hipWidth / 2),
          y: p.y - (hand(l) ? torsoY : 0)
        });
        return dist(disk(a, pa), disk(b, pb));
      });
      const gap = Math.min(...distances) - radiusSum;
      if (gap > EPS && gap > largestGap) {
        largestGap = gap;
        diagnostic.pair = { limbs: [a, b], ids: [pa.id, pb.id], distance: dist(pa, pb),
          minHipDiskDistance: Math.min(...distances), combinedReach: radiusSum, gap,
          proof: 'reach-disks-disjoint-in-all-checked-torso-poses' };
      }
    }
    return diagnostic;
  }

  // All reach disks are expressed in hip-center coordinates. A candidate at a
  // disk intersection, disk center or rectangle boundary proves feasibility.
  // This is a conservative 2D stance model, not a contact-force solution.
  function findPose(contacts, ctx, extra) {
    const { input, dim, map } = ctx;
    const H = input.bodyHeight;
    // A hold may match two hands or two feet, but cannot simultaneously house a hand and foot.
    if ([contacts.lh, contacts.rh].some(id => id === contacts.lf || id === contacts.rf)) return null;
    const points = LIMBS.map(l => ({ limb: l, p: map.get(contacts[l]) }));
    if (points.some(q => !allowed(q.p, q.limb))) return null;
    if (extra) points.push({ limb: extra.limb, p: map.get(extra.id) });
    if (points.some(q => !allowed(q.p, q.limb))) return null;
    const lh = map.get(contacts.lh), rh = map.get(contacts.rh);
    const lf = map.get(contacts.lf), rf = map.get(contacts.rf);
    if (lh.x > rh.x + 0.55 * H || lf.x > rf.x + 0.35 * H) return null;
    const supportFeet = extra && !hand(extra.limb)
      ? [extra.limb === 'lf' ? rf : lf] : [lf, rf];
    const supportMid = supportFeet.reduce((s, p) => s + p.x, 0) / supportFeet.length;
    const supportPadding = (supportFeet.length === 1 ? 0.30 : 0.27) * H;
    const minSupport = Math.min(...supportFeet.map(p => p.x)) - supportPadding;
    const maxSupport = Math.max(...supportFeet.map(p => p.x)) + supportPadding;
    let best = null, bestQuality = Infinity;
    for (const lean of [0, -0.08 * H, 0.08 * H]) {
      const torsoY = Math.sqrt(dim.torso * dim.torso - lean * lean);
      const disks = points.map(({ limb, p }) => ({
        x: p.x - (hand(limb) ? lean + side(limb) * dim.shoulderWidth / 2 : side(limb) * dim.hipWidth / 2),
        y: p.y - (hand(limb) ? torsoY : 0),
        r: hand(limb) ? dim.arm : dim.leg, limb, p
      }));
      let minX = Math.max(0.06 * H, minSupport, ...disks.map(d => d.x - d.r));
      let maxX = Math.min(input.width - 0.06 * H, maxSupport, ...disks.map(d => d.x + d.r));
      let minY = Math.max(0.08 * H, ...points.filter(q => !hand(q.limb)).map(q => q.p.y - 0.04 * H), ...disks.map(d => d.y - d.r));
      let maxY = Math.min(input.height, ...points.filter(q => hand(q.limb)).map(q => q.p.y - 0.03 * H), ...disks.map(d => d.y + d.r));
      if (minX > maxX || minY > maxY) continue;
      const candidates = [];
      const add = (x, y) => { if (Number.isFinite(x) && Number.isFinite(y)) candidates.push({ x, y }); };
      add(clamp(supportMid, minX, maxX), clamp((lf.y + rf.y) / 2 + 0.38 * H, minY, maxY));
      add((minX + maxX) / 2, (minY + maxY) / 2);
      for (const x of [minX, maxX]) for (const y of [minY, maxY]) add(x, y);
      for (const d of disks) {
        add(d.x, d.y); add(clamp(d.x, minX, maxX), clamp(d.y, minY, maxY));
        for (const x of [minX, maxX]) {
          const q = d.r * d.r - (x - d.x) ** 2;
          if (q >= -EPS) { const dy = Math.sqrt(Math.max(0, q)); add(x, d.y + dy); add(x, d.y - dy); }
        }
        for (const y of [minY, maxY]) {
          const q = d.r * d.r - (y - d.y) ** 2;
          if (q >= -EPS) { const dx = Math.sqrt(Math.max(0, q)); add(d.x + dx, y); add(d.x - dx, y); }
        }
      }
      for (let i = 0; i < disks.length; i++) for (let j = i + 1; j < disks.length; j++) {
        const a = disks[i], b = disks[j], d = dist(a, b);
        if (d < EPS || d > a.r + b.r + EPS || d < Math.abs(a.r - b.r) - EPS) continue;
        const k = (a.r * a.r - b.r * b.r + d * d) / (2 * d);
        const q = Math.sqrt(Math.max(0, a.r * a.r - k * k));
        const ux = (b.x - a.x) / d, uy = (b.y - a.y) / d;
        add(a.x + k * ux - q * uy, a.y + k * uy + q * ux);
        add(a.x + k * ux + q * uy, a.y + k * uy - q * ux);
      }
      for (const p of candidates) {
        if (p.x < minX - EPS || p.x > maxX + EPS || p.y < minY - EPS || p.y > maxY + EPS) continue;
        if (disks.some(d => (p.x - d.x) ** 2 + (p.y - d.y) ** 2 > d.r * d.r + EPS)) continue;
        let quality = 0.18 * ((p.x - supportMid) / H) ** 2 + 0.08 * Math.abs(lean) / H;
        const reach = {};
        for (const d of disks) {
          const r = dist(p, d) / d.r;
          quality += hand(d.limb) ? 0.55 * r ** 4 : 0.18 * (r - 0.78) ** 2;
          reach[d.limb] = Math.max(reach[d.limb] || 0, r);
        }
        if (quality < bestQuality) {
          bestQuality = quality;
          best = { hip: { x: p.x, y: p.y }, shoulder: { x: p.x + lean, y: p.y + torsoY }, reach, quality };
        }
      }
    }
    return best;
  }

  function poseFor(contacts, input) {
    if (!validate(input).valid || !contacts) return null;
    return findPose(contacts, context(input));
  }

  class Heap {
    constructor() { this.a = []; }
    get length() { return this.a.length; }
    push(n) { const a = this.a; a.push(n); let i = a.length - 1;
      while (i) { const p = (i - 1) >> 1; if (a[p].f <= n.f) break; a[i] = a[p]; i = p; } a[i] = n; }
    pop() { const a = this.a, top = a[0], last = a.pop(); if (a.length) { let i = 0;
      while (i * 2 + 1 < a.length) { let c = i * 2 + 1; if (c + 1 < a.length && a[c + 1].f < a[c].f) c++;
        if (a[c].f >= last.f) break; a[i] = a[c]; i = c; } a[i] = last; } return top; }
  }

  function solve(input) {
    const started = now(), check = validate(input);
    const stats = { expanded: 0, generated: 0, elapsedMs: 0, truncated: false, maxStates: 4500, maxSteps: 28 };
    const finishResult = (status, message, routes = []) => {
      stats.elapsedMs = Math.round(now() - started);
      return { status, message, routes, stats };
    };
    if (!check.valid) return finishResult('invalid', check.errors.join(' '));
    const ctx = context(input), { map, dim } = ctx, H = input.bodyHeight;
    const start = { ...input.starts }, startPose = findPose(start, ctx);
    if (!startPose) {
      const diagnostic = startDiagnostic(start, ctx), p = diagnostic.pair;
      const scale = `墙面宽 ${input.width} 米、高 ${input.height} 米；身高 ${Math.round(H * 100)} 厘米、臂展 ${Math.round(input.armSpan * 100)} 厘米。`;
      const detail = p
        ? `${NAMES[p.limbs[0]]} ${p.ids[0]} 与${NAMES[p.limbs[1]]} ${p.ids[1]} 的岩点直线距离约 ${p.distance.toFixed(2)} 米；模型检查的姿势无法同时接触这两点。`
        : '当前四个起点没有找到共同可行的姿态；没有足够证据把问题归因于某一对岩点。';
      return { ...finishResult('invalid', `起步姿势未通过检查，尚未搜索换点。\n${scale}\n${detail}模型只表示直立和小幅侧倾，不能据此判断真人一定做不到。先核对实际比例与起点。`), diagnostic };
    }
    const target = map.get(input.finish);
    const h = c => {
      const hands = [map.get(c.lh), map.get(c.rh)], feet = [map.get(c.lf), map.get(c.rf)];
      return hands.reduce((s, p) => s + Math.max(0, target.y - p.y) / (0.35 * H) + Math.abs(target.x - p.x) / (2.5 * H), 0) +
        1.8 * Math.max(0, target.y - Math.max(...feet.map(p => p.y)) - 1.05 * H) / (0.35 * H);
    };
    const heap = new Heap(), seen = new Map(), goals = [], signatures = new Set();
    const initial = { contacts: start, pose: startPose, g: 0, f: h(start) * 1.7, depth: 0, parent: null, move: null };
    heap.push(initial); seen.set(key(start), 0);
    let exhausted = false;
    while (heap.length && goals.length < 3) {
      if (stats.expanded >= stats.maxStates || now() - started > 2500) { stats.truncated = true; break; }
      const node = heap.pop(), nodeKey = key(node.contacts);
      if (node.g > seen.get(nodeKey) + EPS) continue;
      stats.expanded++;
      if (node.contacts.lh === input.finish && node.contacts.rh === input.finish) {
        const states = [], moves = []; let n = node;
        while (n) { states.push({ contacts: { ...n.contacts }, pose: n.pose }); if (n.move) moves.push(n.move); n = n.parent; }
        states.reverse(); moves.reverse();
        const signature = moves.map(m => `${m.limb}:${m.to}`).join(',');
        if (!signatures.has(signature)) {
          signatures.add(signature);
          const maxReach = Math.max(...states.flatMap(s => Object.values(s.pose.reach)), ...moves.flatMap(m => Object.values(m.movePose.reach)));
          goals.push({ score: Number(node.g.toFixed(2)), states, moves, metrics: {
            steps: moves.length, handMoves: moves.filter(m => hand(m.limb)).length,
            footMoves: moves.filter(m => !hand(m.limb)).length,
            maxReachRatio: Number(maxReach.toFixed(3)), matchedHands: states.filter(s => s.contacts.lh === s.contacts.rh).length
          } });
        }
        continue;
      }
      if (node.depth >= stats.maxSteps) { exhausted = true; continue; }
      for (const limb of LIMBS) {
        const from = map.get(node.contacts[limb]);
        // Keep all directions, including horizontal travel and downward setup
        // moves. Two endpoints can share a reach disk only within 2 limb lengths;
        // the full common-pose test below still decides actual feasibility.
        const candidates = input.holds.filter(p => p.id !== from.id && allowed(p, limb) &&
          dist(p, from) <= (hand(limb) ? dim.arm : dim.leg) * 2 + EPS)
          .sort((a, b) => dist(a, target) - dist(b, target) || dist(a, from) - dist(b, from));
        if (hand(limb) && node.contacts[limb] === input.finish) continue;
        for (const to of candidates) {
          const contacts = { ...node.contacts, [limb]: to.id }, stateKey = key(contacts);
          if (node.parent && stateKey === key(node.parent.contacts)) continue;
          let pose = ctx.cache.get(stateKey);
          if (pose === undefined) { pose = findPose(contacts, ctx); ctx.cache.set(stateKey, pose); }
          if (!pose) continue;
          // New and old positions of the moving limb must be reachable while
          // the other three contacts remain fixed; no teleporting between poses.
          const movePose = findPose(node.contacts, ctx, { limb, id: to.id });
          if (!movePose) continue;
          stats.generated++;
          const distance = dist(from, to), reachCost = Math.max(...Object.values(movePose.reach)) ** 4;
          const matchCost = (contacts.lh === contacts.rh ? 0.18 : 0) + (contacts.lf === contacts.rf ? 0.22 : 0);
          const crossed = map.get(contacts.lh).x > map.get(contacts.rh).x + 0.08 * H || map.get(contacts.lf).x > map.get(contacts.rf).x + 0.08 * H;
          const g = node.g + 1 + 0.45 * distance / (hand(limb) ? dim.arm : dim.leg) + 0.32 * reachCost + matchCost + (crossed ? 0.35 : 0) + (to.y < from.y ? 0.25 : 0);
          if (seen.has(stateKey) && seen.get(stateKey) <= g + EPS) continue;
          seen.set(stateKey, g);
          const shift = movePose.hip.x - node.pose.hip.x;
          const setup = Math.abs(shift) > 0.06 ? `先把髋稍向${shift > 0 ? '右' : '左'}移，` : '先稳定其余三个接触点，';
          const reason = hand(limb)
            ? `${setup}再把${NAMES[limb]}移到 ${to.id}。两脚继续提供接触；图示只验证位置可达，实际仍要确认脚压与抓点方向。`
            : `${setup}${NAMES[limb]}移到 ${to.id}，踩稳后再准备下一次出手。移动时另一只脚与双手保留接触。`;
          const move = { limb, from: from.id, to: to.id, movePose, reason, distance: Number(distance.toFixed(3)) };
          heap.push({ contacts, pose, g, f: g + 1.7 * h(contacts), depth: node.depth + 1, parent: node, move });
        }
      }
    }
    goals.sort((a, b) => a.score - b.score);
    if (goals.length) return finishResult('ok', `找到 ${goals.length} 个二维候选方案。按步数、伸展和换点代价排序，不代表真实最佳或安全认证。`, goals);
    if (stats.truncated || exhausted) return finishResult('budget', '在本次搜索预算内没有找到方案。可补充中间手点或脚点、检查起点和尺寸；这不证明真实线路无法完成。');
    return finishResult('no-route', '这个简化模型没有找到连接到双手终点的方案。检查是否缺少中间点、脚点或墙面尺度；它不涵盖动态跳跃、摩擦和三维动作，不能据此判定真实线路不可攀。');
  }

  function traverseExample() {
    return {
      width: 3, height: 3, bodyHeight: 1.7, armSpan: 1.7,
      holds: [
        ...[0.5, 0.9, 1.3, 1.7, 2.1, 2.5].map((x, i) => ({ id: `H${i + 1}`, x, y: 1.5, type: 'hand' })),
        ...[0.4, 0.8, 1.2, 1.6, 2, 2.4].map((x, i) => ({ id: `F${i + 1}`, x, y: 0.4, type: 'foot' }))
      ],
      starts: { lh: 'H1', rh: 'H2', lf: 'F1', rf: 'F2' }, finish: 'H6'
    };
  }

  return Object.freeze({ solve, validate, poseFor, dimensions, traverseExample });
});
