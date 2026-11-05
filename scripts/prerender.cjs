// Keep the first HTML response readable without JavaScript.
// Run after editing content.js, reasons.js, app.js or movement-lab.html.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const elements = new Map();
const context = {
  window: {}, matchMedia: () => ({matches:false}),
  document: {querySelector(selector) {if (!elements.has(selector)) elements.set(selector, {}); return elements.get(selector);}}
};
vm.createContext(context);
for (const file of ['content.js', 'reasons.js']) vm.runInContext(read(file), context, {filename:file});
const app = read('app.js');
const end = app.indexOf(" document.querySelectorAll('[data-animation]')");
if (end < 0) throw new Error('The app rendering boundary changed; update this script.');
vm.runInContext(app.slice(0, end) + '\n})();', context, {filename:'app-static-render.js'});
let index = read('index.html');
for (const id of ['chapters','mechanics-list','lesson-list','sources-list']) {
  const start = `<!-- prerender:${id} -->`, finish = `<!-- /prerender:${id} -->`;
  const content = elements.get('#'+id)?.innerHTML;
  if (!content) throw new Error('No rendered content for '+id);
  if (index.includes(start)) {
    const from = index.indexOf(start), to = index.indexOf(finish, from);
    if (to < 0) throw new Error('Missing closing marker for '+id);
    index = index.slice(0, from) + start + content + index.slice(to);
  } else {
    const empty = new RegExp(`(<div id="${id}"[^>]*>)</div>`);
    if (!empty.test(index)) throw new Error('Missing empty container for '+id);
    index = index.replace(empty, (_, open) => open + start + content + finish + '</div>');
  }
}
fs.writeFileSync(path.join(root, 'index.html'), index);

let movement = read('movement-lab.html');
const script = movement.match(/<script>([\s\S]*?)<\/script>/)?.[1];
const boundary = script?.indexOf('function holdMarkup');
if (!(boundary > 0)) throw new Error('Movement model boundary changed.');
const model = {document:{getElementById:()=>({})},window:{matchMedia:()=>({matches:false})}};
vm.runInNewContext(script.slice(0,boundary)+'\n;globalThis.sceneData=scenes;})();',model);
const items = model.sceneData.map(scene => `<article><h3><a href="#${esc(scene.id)}" data-open-scene="${esc(scene.id)}">${esc(scene.name)}</a></h3><p>${esc(scene.description)}</p><p class="scene-order">${scene.phases.map(esc).join(' → ')}</p></article>`).join('\n');
const directory = `<details class="scene-directory"><summary>13 个攀岩场景：什么时候用，怎样接起来</summary><p>先读场景条件，再点名称观看动画。左右方向只是一个条件，还要结合脚点、身体位置和下一次出手。</p><div class="scene-directory-grid">${items}</div></details>`;
const marker = '<!-- scene-directory -->', close = '<!-- /scene-directory -->';
if (movement.includes(marker)) {
  const from=movement.indexOf(marker), to=movement.indexOf(close,from);
  if(to<0) throw new Error('Missing scene directory closing marker.');
  movement=movement.slice(0,from)+marker+directory+movement.slice(to);
} else {
  if(!movement.includes('<details class="tech-explainer">')) throw new Error('Missing directory insertion point.');
  movement=movement.replace('<details class="tech-explainer">',marker+directory+close+'\n<details class="tech-explainer">');
}
fs.writeFileSync(path.join(root,'movement-lab.html'),movement);
console.log('Prerendered 8 lessons, 3 principles, sources, chapters and 13 movement summaries.');
