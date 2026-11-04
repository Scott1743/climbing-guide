/* Climbing Guide: original two-dimensional SVG route schematics. MIT. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ClimbingRenderer = api;
})(typeof window !== 'undefined' ? window : typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var serial = 0;
  var C = { purple: '#7928ca', ink: '#17121f', muted: '#655b70', line: '#ddd4e8', pale: '#f7f3fb', soft: '#e9d9f6', magenta: '#ad247c' };
  var names = { lh: '左手', rh: '右手', lf: '左脚', rf: '右脚' };
  var limbs = ['lh', 'rh', 'lf', 'rf'];
  function esc(v) { return String(v == null ? '' : v).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function finite(n, fallback) { return Number.isFinite(Number(n)) ? Number(n) : fallback; }
  function n(v) { return finite(v, 0).toFixed(2); }
  function clamp(x, a, b) { return Math.max(a, Math.min(b, x)); }
  function mix(a, b, t) { return a + (b - a) * t; }
  function pointMix(a, b, t) { return { x: mix(a.x, b.x, t), y: mix(a.y, b.y, t) }; }
  function ease(t) { return t * t * (3 - 2 * t); }
  function size(input) { return { width: Math.max(.1, finite(input.width, 3)), height: Math.max(.1, finite(input.height, 4)) }; }
  function viewport(input) {
    var s = size(input), scale = 600 / s.width, height = s.height * scale;
    return { viewBox: '0 0 696 ' + n(height + 112), width: 696, height: height + 112, wall: { x: 48, y: 44, width: 600, height: height }, scale: scale };
  }
  function project(pt, view) { return { x: view.wall.x + pt.x * view.scale, y: view.wall.y + view.wall.height - pt.y * view.scale }; }
  function dims(input) {
    var h = finite(input.bodyHeight, 1.7), span = finite(input.armSpan, h);
    return { height: h, shoulderWidth: .20 * h, hipWidth: .13 * h, torso: .28 * h, arm: Math.max(.1, (span - .20 * h) / 2), leg: .48 * h };
  }
  function index(input) { var result = Object.create(null); (input.holds || []).forEach(function (h) { result[String(h.id)] = h; }); return result; }
  function text(x, y, value, opts) {
    opts = opts || {};
    return '<text x="' + n(x) + '" y="' + n(y) + '" font-size="' + (opts.size || 15) + '" fill="' + (opts.color || C.ink) + '" text-anchor="' + (opts.anchor || 'start') + '"' + (opts.bold ? ' font-weight="700"' : '') + '>' + esc(value) + '</text>';
  }
  function label(x, y, value, opts) {
    opts = opts || {};
    var font = opts.size || 13, count = Array.from(String(value)).reduce(function (a, ch) { return a + (/[^\x00-\x7F]/.test(ch) ? 1 : .56); }, 0), width = count * font + 12;
    var start = opts.anchor === 'middle' ? x - width / 2 : opts.anchor === 'end' ? x - width : x - 6;
    return '<rect x="' + n(start) + '" y="' + n(y - font) + '" width="' + n(width) + '" height="' + (font + 7) + '" rx="4" fill="' + (opts.fill || '#fff') + '" fill-opacity=".96"/>' + text(x, y, value, opts);
  }
  function shell(view, title, desc, content, extra, role) {
    var id = 'cg-route-' + (++serial);
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + view.viewBox + '" role="' + (role || 'img') + '" aria-labelledby="' + id + '-title ' + id + '-desc" class="route-wall-svg"' + (extra || '') + '><title id="' + id + '-title">' + esc(title) + '</title><desc id="' + id + '-desc">' + esc(desc) + '</desc><g font-family="system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif">' + content + '</g></svg>';
  }
  function grid(input, view, opts) {
    opts = opts || {};
    var s = size(input), w = view.wall, out = '<rect width="' + view.width + '" height="' + n(view.height) + '" fill="#fff"/><rect x="' + w.x + '" y="' + w.y + '" width="' + w.width + '" height="' + n(w.height) + '" rx="9" fill="' + C.pale + '" stroke="' + C.line + '"/>';
    var step = .5;
    for (var x = 0; x <= s.width + .001; x += step) {
      var xp = w.x + x * view.scale;
      out += '<path d="M' + n(xp) + ' ' + w.y + 'V' + n(w.y + w.height) + '" stroke="' + C.line + '" stroke-width="' + (Math.abs(x - Math.round(x)) < .001 ? 1 : .6) + '"/>';
      out += text(xp, w.y + w.height + 23, Number(x.toFixed(1)), { size: 13, color: C.muted, anchor: 'middle' });
    }
    for (var y = 0; y <= s.height + .001; y += step) {
      var yp = w.y + w.height - y * view.scale;
      out += '<path d="M' + w.x + ' ' + n(yp) + 'H' + (w.x + w.width) + '" stroke="' + C.line + '" stroke-width="' + (Math.abs(y - Math.round(y)) < .001 ? 1 : .6) + '"/>';
      out += text(w.x - 11, yp + 4, Number(y.toFixed(1)), { size: 13, color: C.muted, anchor: 'end' });
    }
    out += '<path d="M' + w.x + ' ' + n(w.y + w.height) + 'H' + (w.x + w.width) + '" stroke="' + C.ink + '" stroke-width="3"/>';
    out += text(w.x, 25, opts.heading || '岩壁正面 · 长度单位：米', { size: 15, bold: true });
    out += text(w.x + w.width, view.height - 16, opts.footnote || '左右均按攀爬者本人描述', { size: 13, anchor: 'end', color: C.muted });
    return out;
  }
  function holdShape(p, type, selected) {
    var fill = selected ? '#fff' : type === 'foot' ? C.ink : type === 'hand' ? C.purple : '#c596e9';
    var stroke = selected ? C.purple : type === 'both' ? C.purple : '#fff';
    var attr = ' fill="' + fill + '" stroke="' + stroke + '" stroke-width="' + (selected ? 4 : 2) + '"';
    if (type === 'foot') return '<path d="M' + n(p.x - 12) + ' ' + n(p.y + 6) + 'L' + n(p.x) + ' ' + n(p.y - 9) + 'L' + n(p.x + 12) + ' ' + n(p.y + 6) + 'Z"' + attr + '/>';
    if (type === 'hand') return '<rect x="' + n(p.x - 13) + '" y="' + n(p.y - 8) + '" width="26" height="16" rx="6"' + attr + '/>';
    return '<path d="M' + n(p.x - 12) + ' ' + n(p.y - 5) + 'L' + n(p.x - 3) + ' ' + n(p.y - 12) + 'L' + n(p.x + 11) + ' ' + n(p.y - 7) + 'L' + n(p.x + 13) + ' ' + n(p.y + 5) + 'L' + n(p.x + 2) + ' ' + n(p.y + 11) + 'L' + n(p.x - 12) + ' ' + n(p.y + 6) + 'Z"' + attr + '/>';
  }
  function holds(input, view, opts) {
    opts = opts || {};
    return (input.holds || []).map(function (h) {
      var p = project(h, view), selected = String(opts.selectedId) === String(h.id), finish = String(input.finish) === String(h.id), roles = limbs.filter(function (key) { return input.starts && String(input.starts[key]) === String(h.id); }).map(function (key) { return names[key]; });
      var id = String(h.id), kind = { hand: '手点', foot: '脚点', both: '手脚通用点' }[h.type] || '岩点';
      var out = '<g class="route-hold" data-hold-id="' + esc(id) + '"' + (opts.interactive === false ? '' : ' role="button" tabindex="0"') + ' aria-label="' + esc(id + '，' + kind + '，横向 ' + h.x + ' 米，距地 ' + h.y + ' 米' + (roles.length ? '，起点 ' + roles.join('、') : '') + (finish ? '，终点' : '')) + '"><title>' + esc(id + ' · ' + kind) + '</title><circle cx="' + n(p.x) + '" cy="' + n(p.y) + '" r="24" fill="transparent" pointer-events="all"/>';
      if (finish) out += '<circle cx="' + n(p.x) + '" cy="' + n(p.y) + '" r="21" fill="none" stroke="' + C.magenta + '" stroke-width="2"/><circle cx="' + n(p.x) + '" cy="' + n(p.y) + '" r="17" fill="none" stroke="' + C.magenta + '" stroke-width="1"/>';
      if (selected) out += '<circle cx="' + n(p.x) + '" cy="' + n(p.y) + '" r="27" fill="none" stroke="' + C.purple + '" stroke-width="2" stroke-dasharray="4 4"/>';
      out += holdShape(p, h.type, selected);
      if (opts.showLabels !== false) out += label(clamp(p.x, 72, 624), p.y - (finish ? 27 : 19), (id.length > 14 ? id.slice(0, 13) + '…' : id) + (finish ? ' · 终点' : ''), { anchor: 'middle', size: 13, color: finish ? C.magenta : C.ink, bold: true });
      if (roles.length && opts.showStarts !== false) out += label(clamp(p.x, 100, 596), p.y + 30, roles.join(' / '), { anchor: 'middle', size: 12, color: C.purple });
      return out + '</g>';
    }).join('');
  }
  function poseMix(a, b, t) { return { hip: pointMix(a.hip, b.hip, t), shoulder: pointMix(a.shoulder, b.shoulder, t) }; }
  function frameAt(input, state, options) {
    var opts = options || {}, byId = index(input), previous = opts.previousState, move = opts.move, t = clamp(finite(opts.progress, 1), 0, 1), points = {}, currentContacts = state.contacts || {};
    limbs.forEach(function (key) { var h = byId[String(currentContacts[key])]; if (h) points[key] = { x: h.x, y: h.y }; });
    if (!previous || !move || !names[move.limb] || !previous.pose || !state.pose) return { pose: state.pose, points: points, phase: '稳定姿态', progress: 1, contacts: currentContacts };
    var middle = move.movePose || previous.pose, pose, phase;
    if (t < .25) { pose = poseMix(previous.pose, middle, ease(t / .25)); phase = '先移身体，手脚留在原点'; }
    else if (t < .75) { pose = middle; phase = '保留三个支点，移动' + names[move.limb]; }
    else { pose = poseMix(middle, state.pose, ease((t - .75) / .25)); phase = '新点接稳，再整理身体'; }
    limbs.forEach(function (key) {
      var oldHold = byId[String(previous.contacts[key])], nextHold = byId[String(currentContacts[key])];
      if (!oldHold || !nextHold) return;
      points[key] = key === move.limb ? pointMix(oldHold, nextHold, ease(clamp((t - .25) / .5, 0, 1))) : { x: oldHold.x, y: oldHold.y };
    });
    return { pose: pose, points: points, phase: phase, progress: t, contacts: currentContacts };
  }
  function joint(a, b, length, side) {
    var dx = b.x - a.x, dy = b.y - a.y, dist = Math.sqrt(dx * dx + dy * dy), half = length / 2;
    if (dist < .00001) return { x: a.x + side * half, y: a.y };
    var h = Math.sqrt(Math.max(0, half * half - dist * dist / 4)), mid = pointMix(a, b, .5), px = -dy / dist, py = dx / dist;
    var sign = side * px >= 0 ? 1 : -1;
    return { x: mid.x + sign * px * h, y: mid.y + sign * py * h };
  }
  function bone(points, view, color, width, extra) {
    var p = points.map(function (v) { return project(v, view); });
    return '<path d="' + p.map(function (v, i) { return (i ? 'L' : 'M') + n(v.x) + ' ' + n(v.y); }).join('') + '" fill="none" stroke="' + color + '" stroke-width="' + width + '" stroke-linecap="round" stroke-linejoin="round"' + (extra || '') + '/>';
  }
  // Tapered rounded segments keep their centerline endpoints at the solver joints.
  function capsule(a, b, startRadius, endRadius, fill, outline) {
    var dx = b.x - a.x, dy = b.y - a.y, length = Math.sqrt(dx * dx + dy * dy);
    if (length < .001) return '<circle cx="' + n(a.x) + '" cy="' + n(a.y) + '" r="' + n(startRadius) + '" fill="' + fill + '" stroke="' + C.ink + '" stroke-width="' + n(outline) + '"/>';
    var ux = dx / length, uy = dy / length, px = -uy, py = ux;
    function xy(x, y) { return n(x) + ' ' + n(y); }
    var path = 'M' + xy(a.x + px * startRadius, a.y + py * startRadius) +
      'L' + xy(b.x + px * endRadius, b.y + py * endRadius) +
      'Q' + xy(b.x + ux * endRadius * 1.65, b.y + uy * endRadius * 1.65) + ' ' + xy(b.x - px * endRadius, b.y - py * endRadius) +
      'L' + xy(a.x - px * startRadius, a.y - py * startRadius) +
      'Q' + xy(a.x - ux * startRadius * 1.65, a.y - uy * startRadius * 1.65) + ' ' + xy(a.x + px * startRadius, a.y + py * startRadius) + 'Z';
    return '<path d="' + path + '" fill="' + fill + '" stroke="' + C.ink + '" stroke-width="' + n(outline) + '" stroke-linejoin="round"/>';
  }
  function person(input, frame, view, opts) {
    opts = opts || {};
    if (!frame.pose || !frame.pose.hip || !frame.pose.shoulder) return '';
    var d = dims(input), hip = frame.pose.hip, shoulder = frame.pose.shoulder, a = {
      lh: { x: shoulder.x - d.shoulderWidth / 2, y: shoulder.y }, rh: { x: shoulder.x + d.shoulderWidth / 2, y: shoulder.y },
      lf: { x: hip.x - d.hipWidth / 2, y: hip.y }, rf: { x: hip.x + d.hipWidth / 2, y: hip.y }
    }, unit = d.height * view.scale, outline = clamp(unit * .0065, 1.4, 2.8), out = '';
    var paint = { left: '#ba9ad8', right: '#7928ca', leftLeg: '#c2aad7', rightLeg: '#8b54b6', body: '#e8dcf1', shorts: '#b99ad3', neck: '#ad91c2', face: '#d4bedf', hair: '#4b3659' };
    function limbShape(key, isLeg) {
      var endpoint = frame.points[key]; if (!endpoint) return '';
      var left = key[0] === 'l', j = joint(a[key], endpoint, isLeg ? d.leg : d.arm, left ? -1 : 1);
      var start = project(a[key], view), bend = project(j, view), end = project(endpoint, view);
      var fill = isLeg ? (left ? paint.leftLeg : paint.rightLeg) : (left ? paint.left : paint.right);
      var upper = unit * (isLeg ? .029 : .023), knee = unit * (isLeg ? .025 : .019), wrist = unit * (isLeg ? .017 : .014);
      return '<g class="route-body-segment" data-segment="' + key + '" data-joint-x="' + n(j.x) + '" data-joint-y="' + n(j.y) + '">' +
        capsule(start, bend, upper, knee, fill, outline) + capsule(bend, end, knee, wrist, fill, outline) +
        '<circle cx="' + n(bend.x) + '" cy="' + n(bend.y) + '" r="' + n(knee * .57) + '" fill="' + fill + '"/>' + '</g>';
    }
    // Legs are behind the pelvis. The joint positions are unchanged by the silhouette.
    out += limbShape('lf', true) + limbShape('rf', true);
    var hp = project(hip, view), sp = project(shoulder, view), ls = project(a.lh, view), rs = project(a.rh, view), lp = project(a.lf, view), rp = project(a.rf, view);
    var waist = project(pointMix(shoulder, hip, .68), view), waistHalf = unit * .064;
    var neckTop = project({ x: shoulder.x, y: shoulder.y + d.height * .061 }, view);
    out += capsule(sp, neckTop, unit * .032, unit * .028, paint.neck, outline);
    var trunk = 'M' + n(ls.x) + ' ' + n(ls.y) +
      'Q' + n(sp.x) + ' ' + n(sp.y - unit * .045) + ' ' + n(rs.x) + ' ' + n(rs.y) +
      'C' + n(rs.x + unit * .012) + ' ' + n(rs.y + unit * .055) + ' ' + n(waist.x + waistHalf) + ' ' + n(waist.y - unit * .035) + ' ' + n(waist.x + waistHalf) + ' ' + n(waist.y) +
      'Q' + n(rp.x + unit * .023) + ' ' + n(hp.y - unit * .005) + ' ' + n(rp.x + unit * .009) + ' ' + n(hp.y + unit * .028) +
      'Q' + n(hp.x) + ' ' + n(hp.y + unit * .061) + ' ' + n(lp.x - unit * .009) + ' ' + n(hp.y + unit * .028) +
      'Q' + n(lp.x - unit * .023) + ' ' + n(hp.y - unit * .005) + ' ' + n(waist.x - waistHalf) + ' ' + n(waist.y) +
      'C' + n(waist.x - waistHalf) + ' ' + n(waist.y - unit * .035) + ' ' + n(ls.x - unit * .012) + ' ' + n(ls.y + unit * .055) + ' ' + n(ls.x) + ' ' + n(ls.y) + 'Z';
    out += '<path class="route-body-torso" d="' + trunk + '" fill="' + paint.body + '" stroke="' + C.ink + '" stroke-width="' + n(outline) + '" stroke-linejoin="round"/>';
    // A soft shirt seam and a curved waistband make the trunk readable without moving it.
    var chest = project(pointMix(shoulder, hip, .31), view), belt = project(pointMix(shoulder, hip, .84), view), beltHalf = unit * .066;
    out += '<path d="M' + n(sp.x) + ' ' + n(sp.y + unit * .015) + 'L' + n(belt.x) + ' ' + n(belt.y) + 'M' + n(chest.x - unit * .055) + ' ' + n(chest.y) + 'Q' + n(chest.x) + ' ' + n(chest.y + unit * .018) + ' ' + n(chest.x + unit * .055) + ' ' + n(chest.y) + '" fill="none" stroke="#ceb7df" stroke-width="' + n(outline * .65) + '"/>';
    out += '<path d="M' + n(belt.x - beltHalf) + ' ' + n(belt.y) + 'Q' + n(belt.x) + ' ' + n(belt.y + unit * .019) + ' ' + n(belt.x + beltHalf) + ' ' + n(belt.y) +
      'L' + n(rp.x + unit * .009) + ' ' + n(hp.y + unit * .028) + 'Q' + n(hp.x) + ' ' + n(hp.y + unit * .061) + ' ' + n(lp.x - unit * .009) + ' ' + n(hp.y + unit * .028) + 'Z" fill="' + paint.shorts + '" stroke="' + C.ink + '" stroke-width="' + n(outline * .7) + '" stroke-linejoin="round"/>';
    var head = project({ x: shoulder.x, y: shoulder.y + d.height * .105 }, view), hx = unit * .059, hy = unit * .073;
    out += '<ellipse class="route-body-head" cx="' + n(head.x) + '" cy="' + n(head.y) + '" rx="' + n(hx) + '" ry="' + n(hy) + '" fill="' + paint.face + '" stroke="' + C.ink + '" stroke-width="' + n(outline) + '"/>';
    out += '<path class="route-body-hair" d="M' + n(head.x - hx * .96) + ' ' + n(head.y + hy * .05) + 'Q' + n(head.x - hx * 1.14) + ' ' + n(head.y - hy * 1.13) + ' ' + n(head.x) + ' ' + n(head.y - hy * 1.08) +
      'Q' + n(head.x + hx * 1.16) + ' ' + n(head.y - hy * 1.12) + ' ' + n(head.x + hx) + ' ' + n(head.y + hy * .04) + 'Q' + n(head.x + hx * .22) + ' ' + n(head.y - hy * .48) + ' ' + n(head.x - hx * .96) + ' ' + n(head.y + hy * .05) + 'Z" fill="' + paint.hair + '"/>';
    out += limbShape('lh', false) + limbShape('rh', false);
    limbs.forEach(function (key) {
      var pt = frame.points[key]; if (!pt) return;
      var p = project(pt, view), left = key[0] === 'l', color = left ? paint.left : paint.right, unitShoe = unit / 350;
      out += '<g data-limb="' + key + '" data-contact-id="' + esc(frame.contacts[key]) + '" data-contact-x="' + n(pt.x) + '" data-contact-y="' + n(pt.y) + '">';
      if (key[1] === 'h') out += '<ellipse cx="' + n(p.x) + '" cy="' + n(p.y) + '" rx="' + n(unit * .024) + '" ry="' + n(unit * .027) + '" fill="' + color + '" stroke="' + C.ink + '" stroke-width="' + n(outline * .75) + '"/>';
      else out += '<g transform="translate(' + n(p.x) + ' ' + n(p.y) + ') rotate(' + (left ? -8 : 8) + ') scale(' + unitShoe.toFixed(6) + ')"><path d="M-8 -7Q0 -11 7 -5L12 2Q10 9 -9 7L-12 4Z" fill="' + (left ? '#6d527e' : '#4e2d68') + '" stroke="' + C.ink + '" stroke-width="1.6"/><path d="M-9 4Q1 7 10 2" fill="none" stroke="#eadcf6" stroke-width="2" stroke-linecap="round"/></g>';
      // This small contact mark is at the exact solver endpoint, independent of shoe/hand volume.
      out += '<circle class="route-contact-anchor" cx="' + n(p.x) + '" cy="' + n(p.y) + '" r="' + n(Math.max(1.5, unit * .005)) + '" fill="#fff" fill-opacity=".8"/>';
      if (opts.limbLabels !== false) out += label(clamp(p.x + (left ? -31 : 31), view.wall.x + 22, view.wall.x + view.wall.width - 22), p.y + (key[1] === 'h' ? 6 : 24), names[key], { anchor: 'middle', size: 13, bold: true, color: left ? '#65457e' : C.purple });
      out += '</g>';
    });
    out += '<circle cx="' + n(hp.x) + '" cy="' + n(hp.y) + '" r="5" fill="' + C.magenta + '" stroke="#fff" stroke-width="2"/>';
    if (opts.bodyLabels !== false) out += label(hp.x + 12, hp.y + 7, '髋', { size: 13, color: C.magenta }) + label(sp.x + 12, sp.y - 8, '肩', { size: 13 });
    return '<g class="route-climber" data-figure-style="demo-purple" pointer-events="none">' + out + '</g>';
  }
  function motion(input, view, options) {
    if (!options.move) return '';
    var holdsById = index(input), from = holdsById[String(options.move.from)], to = holdsById[String(options.move.to)];
    if (!from || !to) return '';
    var a = project(from, view), b = project(to, view), id = 'cg-move-' + (++serial);
    return '<defs><marker id="' + id + '" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0 7 3.5 0 7Z" fill="' + C.magenta + '"/></marker></defs><path d="M' + n(a.x) + ' ' + n(a.y) + 'L' + n(b.x) + ' ' + n(b.y) + '" fill="none" stroke="' + C.magenta + '" stroke-width="2.5" stroke-dasharray="5 6" opacity=".8" marker-end="url(#' + id + ')"/><circle cx="' + n(b.x) + '" cy="' + n(b.y) + '" r="28" fill="none" stroke="' + C.magenta + '" stroke-width="2" stroke-dasharray="4 4"/>';
  }
  function wallSvg(input, options) {
    var opts = options || {}, view = viewport(input);
    return shell(view, '摆放岩点', '二维岩壁编辑图。横轴是距左边的距离，纵轴是距地面的高度；单位米。拖动或选择岩点设置用途及起终点。', grid(input, view, opts) + holds(input, view, opts), ' data-editor-wall="true"', 'group');
  }
  function poseSvg(input, state, options) {
    var opts = options || {}, view = viewport(input), frame = frameAt(input, state, opts);
    var holdOpts = { showLabels: opts.showLabels !== false, showStarts: false, interactive: false, selectedId: opts.selectedId };
    var heading = opts.stepLabel || '候选动作 · 二维姿态示意';
    var content = grid(input, view, { heading: heading, footnote: '浅紫：左侧 · 深紫：右侧 · 髋点不是精确重心' });
    content += motion(input, view, opts) + holds(input, view, holdOpts) + person(input, frame, view, opts);
    content += label(view.wall.x + 12, view.wall.y + 25, frame.phase, { size: 14, color: C.purple, bold: true });
    return shell(view, heading, '手脚位置对应岩点，浅紫为左侧，深紫为右侧。图中人体比例和动作均为二维几何示意，不表示力学安全保证。' + frame.phase, content);
  }
  function wrap(value, max) {
    var chars = Array.from(String(value || '')), lines = [], line = '', width = 0;
    chars.forEach(function (ch) { var w = /[^\x00-\x7F]/.test(ch) ? 1 : .56; if (width + w > max) { lines.push(line); line = ''; width = 0; } line += ch; width += w; });
    if (line) lines.push(line);
    return lines;
  }
  function storyboardSvg(input, route) {
    var states = route.states || [], moves = route.moves || [], view = viewport(input), columns = 4, cellWidth = 360, gap = 20, margin = 24, drawScale = cellWidth / view.width, diagramHeight = view.height * drawScale;
    var notes = states.map(function (_, i) { return wrap(i === 0 ? '起始姿态：确认四个接触点。' : names[(moves[i - 1] || {}).limb] + ' → ' + String((moves[i - 1] || {}).to || '') + '。' + String((moves[i - 1] || {}).reason || '到点后再整理身体。'), 20); });
    var maxNoteLines = Math.max.apply(null, [2].concat(notes.map(function (lines) { return lines.length; }))), cellHeight = diagramHeight + 55 + Math.min(6, maxNoteLines) * 23, rows = Math.max(1, Math.ceil(states.length / columns));
    var width = margin * 2 + columns * cellWidth + (columns - 1) * gap, height = 120 + rows * cellHeight + (rows - 1) * gap + 65, out = '<rect width="' + width + '" height="' + n(height) + '" fill="#f7f3fb"/>';
    out += text(margin, 39, 'Climbing Guide / 候选解法分镜', { size: 27, bold: true });
    out += text(margin, 70, '墙面 ' + input.width + ' × ' + input.height + ' m · 身高 ' + n(input.bodyHeight) + ' m · 臂展 ' + n(input.armSpan) + ' m', { size: 17, color: C.muted });
    out += text(margin, 96, '基于二维位置与可达范围的候选顺序；请结合岩点朝向、墙角、摩擦与现场指导判断。', { size: 17, color: C.muted });
    states.forEach(function (state, i) {
      var x = margin + (i % columns) * (cellWidth + gap), y = 120 + Math.floor(i / columns) * (cellHeight + gap);
      out += '<g transform="translate(' + x + ' ' + n(y) + ')"><rect width="' + cellWidth + '" height="' + n(cellHeight) + '" rx="10" fill="#fff" stroke="' + C.line + '"/>';
      out += text(16, 29, i === 0 ? '起始姿态' : '第 ' + i + ' 步 · ' + names[(moves[i - 1] || {}).limb], { size: 19, bold: true, color: C.purple });
      var frame = frameAt(input, state, {}), draw = grid(input, view, { heading: '', footnote: '' }) + holds(input, view, { interactive: false, showLabels: true, showStarts: false }) + person(input, frame, view, { limbLabels: false, bodyLabels: false });
      out += '<g transform="translate(0 40) scale(' + drawScale.toFixed(6) + ')">' + draw + '</g>';
      notes[i].slice(0, 6).forEach(function (line, j) { out += text(16, 40 + diagramHeight + 22 + j * 23, line + (j === 5 && notes[i].length > 6 ? '…' : ''), { size: 16 }); });
      out += '</g>';
    });
    out += text(margin, height - 29, '原创教学示意 · MIT · https://scott1743.github.io/climbing-guide/', { size: 16, color: C.muted });
    return shell({ viewBox: '0 0 ' + width + ' ' + n(height), width: width, height: height }, 'Climbing Guide 候选攀岩解法分镜', '包含起始姿态与每一步手脚移动后的状态。候选顺序不等于真实最佳解法或安全认证。', out, ' width="' + width + '" height="' + n(height) + '"');
  }
  return { viewport: viewport, wallSvg: wallSvg, poseSvg: poseSvg, storyboardSvg: storyboardSvg, frameAt: frameAt };
});
