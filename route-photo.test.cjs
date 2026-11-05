'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require.resolve('./route-photo.js'), 'utf8');
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const pngHeader = [137, 80, 78, 71, 13, 10, 26, 10];
function photo(tag, extra = {}) {
  const file = new Blob([new Uint8Array(pngHeader)], { type: 'image/png' });
  return Object.assign(file, { tag, ...extra });
}
function stored(tag) {
  return { blob: Object.assign(new Blob([new Uint8Array([255, 216, 255, 217])], { type: 'image/jpeg' }), { tag }), width: 120, height: 80,
    crop: { x: .1, y: .2, width: .6, height: .7 }, scale: 1.2, stretchX: 1, stretchY: 1, offsetX: .1, offsetY: 0, opacity: .6, visible: true };
}
function environment(config = {}) {
  const saved = new Map(config.initial ? [['current', config.initial]] : []), activeUrls = new Map(), revoked = [], events = [], writes = [], startedWrites = [];
  const pageListeners = new Map(), documentListeners = new Map();
  function addListener(list, name, callback) { if (!list.has(name)) list.set(name, new Set()); list.get(name).add(callback); }
  function removeListener(list, name, callback) { list.get(name)?.delete(callback); }
  function dispatch(list, name) { for (const callback of list.get(name) || []) callback(); }
  const controls = { failWrite: false, decode: new Map() };
  let serial = 0;
  const db = {
    objectStoreNames: { contains: name => name === 'background' }, createObjectStore() {}, close() {},
    transaction(storeName, mode) {
      assert.equal(storeName, 'background');
      const tx = { objectStore() { return {
        get(key) {
          assert.equal(key, 'current');
          const request = {}, value = saved.get(key);
          setTimeout(() => { request.result = value; request.onsuccess?.(); tx.oncomplete?.(); }, config.readDelay || 0);
          return request;
        },
        put(value, key) {
          assert.equal(mode, 'readwrite'); assert.equal(key, 'current');
          startedWrites.push(value);
          const request = {};
          setTimeout(() => {
            if (controls.failWrite) { tx.error = new Error('QuotaExceededError'); tx.onerror?.(); return; }
            saved.set(key, value); writes.push(value); request.result = key; request.onsuccess?.(); tx.oncomplete?.();
          }, config.writeDelay || 0);
          return request;
        }
      }; } };
      return tx;
    }
  };
  const context = {
    Blob, Uint8Array, Math, Number, Object, Promise, String, Array, Error, Boolean,
    setTimeout, clearTimeout,
    URL: { createObjectURL(blob) { const url = 'blob:test-' + (++serial); activeUrls.set(url, blob); return url; }, revokeObjectURL(url) { revoked.push(url); activeUrls.delete(url); } },
    indexedDB: config.noStorage ? undefined : { open(name, version) {
      assert.equal(name, 'climbing-guide-photo-v1'); assert.equal(version, 1);
      const request = {};
      setTimeout(() => { request.result = db; request.onsuccess?.(); }, config.openDelay || 0);
      return request;
    } },
    async createImageBitmap(file) {
      const gate = controls.decode.get(file.tag); if (gate) await gate;
      return { width: file.pixelWidth || 4000, height: file.pixelHeight || 3000, tag: file.tag, close() {} };
    },
    document: { visibilityState: 'visible',
      addEventListener(name, callback) { addListener(documentListeners, name, callback); },
      removeEventListener(name, callback) { removeListener(documentListeners, name, callback); },
      createElement(name) {
      assert.equal(name, 'canvas');
      let image;
      return { width: 0, height: 0, getContext() { return { fillRect() {}, drawImage(value) { image = value; } }; },
        toBlob(callback, type, quality) { assert.equal(type, 'image/jpeg'); assert.equal(quality, .85); callback(Object.assign(new Blob([new Uint8Array([255, 216, 255, 217])], { type }), { tag: image.tag })); } };
    } },
    addEventListener(name, callback) { addListener(pageListeners, name, callback); },
    removeEventListener(name, callback) { removeListener(pageListeners, name, callback); }
  };
  vm.createContext(context); vm.runInContext(source, context);
  const controller = context.ClimbingPhoto.create({ onChange: value => events.push(value), onStatus: (text, error) => events.push({ text, error }) });
  return { controller, api: context.ClimbingPhoto, controls, saved, activeUrls, revoked, events, writes, startedWrites,
    pageHide() { dispatch(pageListeners, 'pagehide'); },
    hideDocument() { context.document.visibilityState = 'hidden'; dispatch(documentListeners, 'visibilitychange'); } };
}
(async () => {
  const a = environment(); await a.controller.ready;
  assert.equal(a.controller.get(), null);
  assert(await a.controller.replace(photo('first')));
  const first = a.controller.get();
  assert.equal(first.width, 2048); assert.equal(first.height, 1536);
  assert.equal(first.href.startsWith('blob:'), true); assert.equal('blob' in first, false);
  assert.equal(a.saved.size, 1); assert.equal(a.saved.get('current').blob.tag, 'first');
  assert.equal(a.saved.get('current').blob.type, 'image/jpeg');
  assert.equal(Object.keys(a.saved.get('current')).some(k => /name|path|url|href/i.test(k)), false);
  a.controller.update({ crop: { x: .5, y: .4, width: .4, height: .4 }, scale: 2, stretchX: 1.3, offsetX: .2 });
  a.controller.update({ crop: { width: 1, height: 1 }, opacity: .4 });
  await a.controller.flush();
  assert.equal(a.controller.get().crop.x, 0, 'widening crop must keep it inside source bounds');
  assert.equal(a.controller.get().crop.y, 0);
  assert.equal(a.saved.size, 1);
  assert.equal(a.saved.get('current').scale, 2);
  assert.equal(a.saved.get('current').opacity, .4);
  const beforeInvalid = a.controller.get().href;
  assert.equal(await a.controller.replace(new Blob(['<svg><image href="https://example.com/private"/></svg>'], { type: 'image/png' })), false);
  assert.equal(a.controller.get().href, beforeInvalid, 'invalid disguised SVG must preserve old photo');
  assert.equal(await a.controller.replace({ size: 21 * 1024 * 1024, type: 'image/jpeg', slice() {} }), false);
  assert.equal(a.controller.get().href, beforeInvalid);
  assert(await a.controller.replace(photo('replacement', { pixelWidth: 400, pixelHeight: 300 })));
  assert.equal(a.saved.size, 1, 'a replacement overwrites the sole cache record');
  assert.equal(a.saved.get('current').blob.tag, 'replacement');
  assert.equal(a.controller.get().scale, 1, 'a new image resets old crop/transform');
  assert(a.revoked.includes(first.href));
  a.controls.failWrite = true;
  assert(await a.controller.replace(photo('unsaved')));
  assert.equal(a.activeUrls.get(a.controller.get().href).tag, 'unsaved', 'quota failure must keep the new image usable this session');
  assert.equal(a.saved.get('current').blob.tag, 'replacement');
  assert(a.events.some(e => e.error && /刷新后可能回到上次/.test(e.text)));
  await a.controller.destroy(); assert.equal(a.activeUrls.size, 0);

  // An old restore result must never replace a new image already selected.
  const b = environment({ initial: stored('old-cache'), readDelay: 80 });
  await b.controller.replace(photo('new-before-restore'));
  await b.controller.ready;
  assert.equal(b.activeUrls.get(b.controller.get().href).tag, 'new-before-restore');
  await b.controller.destroy();

  // A rejected early upload must not suppress the existing cache restore.
  const c = environment({ initial: stored('recover-cache'), readDelay: 20 });
  await c.controller.replace(new Blob(['bad'], { type: 'image/svg+xml' }));
  await c.controller.ready;
  assert.equal(c.activeUrls.get(c.controller.get().href).tag, 'recover-cache');
  await c.controller.destroy();

  // Fast successive replacements resolve by user selection order, not decode speed.
  const d = environment({ writeDelay: 15 }); await d.controller.ready;
  let release; d.controls.decode.set('slow', new Promise(resolve => { release = resolve; }));
  const slow = d.controller.replace(photo('slow'));
  await d.controller.replace(photo('fast'));
  release(); assert.equal(await slow, false);
  assert.equal(d.saved.get('current').blob.tag, 'fast');
  const pending = d.controller.replace(photo('newest'));
  await pause(1); d.controller.update({ scale: 2.5 });
  await pending; await d.controller.flush();
  assert.equal(d.saved.get('current').blob.tag, 'newest');
  assert.equal(d.saved.get('current').scale, 2.5, 'an older in-flight write must not win over newer transform');
  await d.controller.destroy();

  const e = environment({ noStorage: true }); await e.controller.ready;
  assert(await e.controller.replace(photo('session-only')));
  assert(e.controller.get()); assert.equal(e.saved.size, 0);
  assert(e.events.some(value => value.error && /缓存/.test(value.text)));
  await e.controller.destroy();

  // Leaving the page cannot depend on another microtask to create the last write transaction.
  const f = environment({ initial: stored('lifecycle'), writeDelay: 15 }); await f.controller.ready;
  f.controller.update({ scale: 1.7, stretchX: 1.1, stretchY: 1.3, opacity: .72 });
  assert.match(f.events.at(-1).text, /正在保存照片调整/);
  assert.equal(f.startedWrites.length, 0, 'slider input remains debounced while the page is active');
  f.pageHide();
  assert.equal(f.startedWrites.length, 1, 'pagehide must synchronously put the latest snapshot before any Promise callbacks run');
  assert.equal(f.startedWrites[0].scale, 1.7);
  await f.controller.flush();
  assert.equal(f.saved.get('current').stretchX, 1.1);
  assert.equal(f.saved.get('current').stretchY, 1.3);
  assert.equal(f.saved.get('current').opacity, .72);

  // An older in-flight transaction may finish first, but never overwrite the lifecycle snapshot.
  f.controller.update({ scale: 2 });
  const olderWrite = f.controller.flush();
  f.controller.update({ scale: 2.8, offsetY: .25 });
  const beforeHidden = f.startedWrites.length;
  f.hideDocument();
  assert.equal(f.startedWrites.length, beforeHidden + 1, 'visibilitychange must also open its write synchronously');
  assert.equal(f.startedWrites.at(-1).scale, 2.8);
  await olderWrite; await f.controller.flush();
  assert.equal(f.saved.get('current').scale, 2.8);
  assert.equal(f.saved.get('current').offsetY, .25);
  assert(f.writes.findIndex(value => value.scale === 2) < f.writes.findIndex(value => value.scale === 2.8));

  // A failed last-moment write retains the previous cache and does not claim that it was saved.
  f.controls.failWrite = true;
  f.controller.update({ scale: 3.5 });
  f.pageHide(); await f.controller.flush();
  assert.equal(f.saved.get('current').scale, 2.8);
  assert.equal(f.controller.get().scale, 3.5);
  assert(f.events.at(-1).error && /保存失败/.test(f.events.at(-1).text));
  f.controls.failWrite = false;
  await f.controller.flush();
  assert.equal(f.saved.get('current').scale, 3.5, 'failed lifecycle writes remain retryable');
  await f.controller.destroy();
  const countAfterDestroy = f.startedWrites.length;
  f.pageHide(); f.hideDocument();
  assert.equal(f.startedWrites.length, countAfterDestroy, 'destroy removes lifecycle listeners');
  console.log('PASS: single-record replacement; raster-only validation; 2048px JPEG normalization; crop bounds; quota/session fallback; restore and replacement races; synchronous lifecycle writes and latest transform wins; blob URL cleanup.');
})().catch(error => { console.error(error); process.exitCode = 1; });
