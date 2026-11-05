/* Climbing Guide: one local-only photo background. No network requests. See LICENSE. */
(function (root, factory) {
  'use strict';
  var api = factory(root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.ClimbingPhoto = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (root) {
  'use strict';
  var DATABASE = 'climbing-guide-photo-v1', STORE = 'background', KEY = 'current';
  var MAX_BYTES = 20 * 1024 * 1024, MAX_SIDE = 2048, MAX_PIXELS = 60000000;
  var TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
  var DEFAULTS = { scale: 1, stretchX: 1, stretchY: 1, offsetX: 0, offsetY: 0, opacity: .65, visible: true };
  function clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function number(value, fallback, lo, hi) {
    var chosen = typeof value === 'number' && Number.isFinite(value) ? value : fallback;
    return clamp(chosen, lo, hi);
  }
  function sanitize(patch, previous) {
    patch = patch && typeof patch === 'object' ? patch : {};
    previous = previous || DEFAULTS;
    var oldCrop = previous.crop || { x: 0, y: 0, width: 1, height: 1 };
    var crop = patch.crop && typeof patch.crop === 'object' ? patch.crop : {};
    var width = number(crop.width, oldCrop.width, .01, 1), height = number(crop.height, oldCrop.height, .01, 1);
    return {
      crop: { x: number(crop.x, oldCrop.x, 0, 1 - width), y: number(crop.y, oldCrop.y, 0, 1 - height), width: width, height: height },
      scale: number(patch.scale, previous.scale, .25, 5),
      stretchX: number(patch.stretchX, previous.stretchX, .25, 4),
      stretchY: number(patch.stretchY, previous.stretchY, .25, 4),
      offsetX: number(patch.offsetX, previous.offsetX, -2, 2),
      offsetY: number(patch.offsetY, previous.offsetY, -2, 2),
      opacity: number(patch.opacity, previous.opacity, .1, 1),
      visible: typeof patch.visible === 'boolean' ? patch.visible : previous.visible
    };
  }
  function imageType(bytes) {
    var ascii = function (start, count) { return String.fromCharCode.apply(null, bytes.slice(start, start + count)); };
    if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every(function (n, i) { return bytes[i] === n; })) return 'image/png';
    if (bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255) return 'image/jpeg';
    if (ascii(0, 6) === 'GIF87a' || ascii(0, 6) === 'GIF89a') return 'image/gif';
    if (ascii(0, 4) === 'RIFF' && ascii(8, 4) === 'WEBP') return 'image/webp';
    if (ascii(4, 4) === 'ftyp') {
      for (var i = 8; i + 4 <= bytes.length; i += 4) if (['avif', 'avis'].indexOf(ascii(i, 4)) >= 0) return 'image/avif';
    }
    return null;
  }
  function create(options) {
    options = options || {};
    var current = null, href = null, destroyed = false, generation = 0, revision = 0;
    var timer = null, dirty = false, queue = Promise.resolve(), opened = null, storageError = false;
    function status(text, error) { if (!destroyed && typeof options.onStatus === 'function') { try { options.onStatus(text, Boolean(error)); } catch (_) {} } }
    function get() {
      if (!current || !href) return null;
      return Object.assign({ href: href, width: current.width, height: current.height }, sanitize(current));
    }
    function emit() { if (!destroyed && typeof options.onChange === 'function') { try { options.onChange(get()); } catch (_) {} } }
    function install(record) {
      var nextHref = root.URL.createObjectURL(record.blob), oldHref = href;
      current = record; href = nextHref; revision++;
      emit();
      if (oldHref) root.URL.revokeObjectURL(oldHref);
    }
    function openDatabase() {
      return new Promise(function (resolve, reject) {
        if (!root.indexedDB) { reject(new Error('IndexedDB unavailable')); return; }
        var request, settled = false;
        var timeout = root.setTimeout(function () { finish(new Error('Storage open timeout')); }, 4000);
        function finish(error, db) {
          if (settled) { if (db) db.close(); return; }
          settled = true; root.clearTimeout(timeout);
          if (error) reject(error); else { opened = db; db.onversionchange = function () { db.close(); }; resolve(db); }
        }
        try {
          request = root.indexedDB.open(DATABASE, 1);
          request.onupgradeneeded = function () { if (!request.result.objectStoreNames.contains(STORE)) request.result.createObjectStore(STORE); };
          request.onsuccess = function () { finish(null, request.result); };
          request.onerror = function () { finish(request.error || new Error('Storage open failed')); };
          request.onblocked = function () { finish(new Error('Storage blocked')); };
        } catch (error) { finish(error); }
      });
    }
    var database = openDatabase().catch(function () {
      storageError = true;
      status('当前浏览器无法使用照片缓存；仍可在本页使用底图，但关闭或刷新后不会保留。', true);
      return null;
    });
    function transaction(db, mode, value) {
      return new Promise(function (resolve, reject) {
        var tx, request, result;
        try {
          tx = db.transaction(STORE, mode);
          var store = tx.objectStore(STORE);
          request = mode === 'readonly' ? store.get(KEY) : store.put(value, KEY);
          request.onsuccess = function () { result = request.result; };
          tx.oncomplete = function () { resolve(result); };
          tx.onerror = tx.onabort = function () { reject(tx.error || request.error || new Error('Photo storage failed')); };
        } catch (error) { reject(error); }
      });
    }
    function recordForStorage(record) {
      return Object.assign({ blob: record.blob, width: record.width, height: record.height }, sanitize(record));
    }
    function writeRecord(db, record, atRevision) {
      if (atRevision !== revision || current !== record) return Promise.resolve({ stale: true });
      if (!db) return Promise.resolve({ saved: false });
      if (!dirty) return Promise.resolve({ saved: true });
      // Open the transaction now, before returning to a pagehide/visibilitychange handler.
      // IndexedDB serializes writes to this store in transaction creation order.
      return transaction(db, 'readwrite', recordForStorage(record)).then(function () {
          if (atRevision === revision) {
            dirty = false; storageError = false;
            status('照片与调整已保存在当前浏览器；选择新照片会替换这一张。');
          }
          return { saved: true };
        }, function () {
          if (atRevision === revision) {
            storageError = true;
            status('浏览器保存失败；本次照片仅在当前页面使用，刷新后可能回到上次保存的照片。', true);
          }
          return { saved: false };
      });
    }
    function persist(record, atRevision) {
      var previous = queue;
      // A ready connection must not wait for Promise callbacks when the page is leaving.
      // Queued work from before the connection opened still checks its revision before writing.
      var task = opened ? writeRecord(opened, record, atRevision) : previous.then(function () {
        return database;
      }).then(function (db) { return writeRecord(db, record, atRevision); });
      queue = Promise.all([previous, task]).then(function () {});
      return task;
    }
    function cancelTimer() { if (timer !== null) { root.clearTimeout(timer); timer = null; } }
    function flush() {
      cancelTimer();
      if (!current || !dirty) return queue;
      return persist(current, revision);
    }
    function schedule() {
      dirty = true; cancelTimer();
      status(storageError ? '照片调整尚未保存；当前浏览器无法可靠缓存，关闭或刷新可能丢失调整。' : '正在保存照片调整…', storageError);
      timer = root.setTimeout(function () { timer = null; void flush(); }, 180);
    }
    var ready = (async function () {
      var db = await database;
      if (!db || destroyed) return;
      try {
        var record = await transaction(db, 'readonly');
        if (!record || destroyed || current) return;
        if (!(record.blob instanceof root.Blob) || record.blob.type !== 'image/jpeg' || !record.blob.size || record.blob.size > MAX_BYTES ||
            !Number.isInteger(record.width) || !Number.isInteger(record.height) || record.width < 1 || record.height < 1 || record.width > MAX_SIDE || record.height > MAX_SIDE) return;
        install(Object.assign({ blob: record.blob, width: record.width, height: record.height }, sanitize(record)));
        if (generation === 0) status('已恢复此浏览器保存的照片底图。');
      } catch (_) {
        storageError = true;
        status('未能读取照片缓存；你仍可以选择照片，在当前页面使用。', true);
      }
    })();
    async function decode(file) {
      if (root.createImageBitmap) {
        try { return await root.createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (_) {}
      }
      var url = root.URL.createObjectURL(file);
      try {
        return await new Promise(function (resolve, reject) {
          var image = new root.Image();
          image.onload = function () { resolve(image); };
          image.onerror = function () { reject(new Error('这张图片无法解码。请换成 JPG、PNG 或 WebP 后重试。')); };
          image.src = url;
        });
      } finally { root.URL.revokeObjectURL(url); }
    }
    async function process(file) {
      if (!file || typeof file.size !== 'number' || !file.slice || file.size <= 0) throw new Error('请选择一张有效的照片。');
      if (file.size > MAX_BYTES) throw new Error('图片超过 20 MB。请先缩小图片再选择；原底图保持不变。');
      var type = String(file.type || '').toLowerCase();
      if (type && TYPES.indexOf(type) < 0) throw new Error('支持 JPG、PNG、WebP、AVIF 和 GIF；请将 HEIC 等格式转成 JPG。');
      var detected = imageType(new Uint8Array(await file.slice(0, 64).arrayBuffer()));
      if (!detected) throw new Error('文件不是支持的照片格式。请使用 JPG、PNG、WebP、AVIF 或 GIF；不接受 SVG。');
      var image = await decode(file);
      try {
        var width = image.width || image.naturalWidth, height = image.height || image.naturalHeight;
        if (!(width > 0 && height > 0) || width * height > MAX_PIXELS) throw new Error('图片像素过大或尺寸无效，请缩小后重试；原底图保持不变。');
        var ratio = Math.min(1, MAX_SIDE / Math.max(width, height));
        var canvas = root.document.createElement('canvas');
        canvas.width = Math.max(1, Math.round(width * ratio)); canvas.height = Math.max(1, Math.round(height * ratio));
        var context = canvas.getContext('2d');
        if (!context) throw new Error('浏览器无法处理这张图片，请换一张后重试。');
        context.fillStyle = '#ffffff'; context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        var blob = await new Promise(function (resolve, reject) { canvas.toBlob(function (output) { if (output && output.type === 'image/jpeg' && output.size > 0) resolve(output); else reject(new Error('图片处理失败，原底图保持不变。')); }, 'image/jpeg', .85); });
        return { blob: blob, width: canvas.width, height: canvas.height };
      } finally { if (image.close) image.close(); }
    }
    async function replace(file) {
      if (destroyed) return false;
      var token = ++generation;
      status('正在本机处理照片…');
      try {
        var image = await process(file);
        if (destroyed || token !== generation) return false;
        cancelTimer(); install(Object.assign(image, sanitize({}))); dirty = true;
        status(storageError ? '照片已显示；当前浏览器无法可靠保存，请勿关闭本页。' : '照片已显示，正在保存到当前浏览器…', storageError);
        await persist(current, revision);
        return !destroyed && token === generation;
      } catch (error) {
        if (!destroyed && token === generation) status(error && error.message || '图片处理失败，原底图保持不变。', true);
        return false;
      }
    }
    function update(patch) {
      if (!current || destroyed) return false;
      current = Object.assign({ blob: current.blob, width: current.width, height: current.height }, sanitize(patch, current));
      revision++; emit(); schedule(); return true;
    }
    function reset() { return update(Object.assign({}, DEFAULTS, { crop: { x: 0, y: 0, width: 1, height: 1 } })); }
    function pageHide() { void flush(); }
    function visibilityChange() { if (root.document && root.document.visibilityState === 'hidden') void flush(); }
    if (root.addEventListener) root.addEventListener('pagehide', pageHide);
    if (root.document && root.document.addEventListener) root.document.addEventListener('visibilitychange', visibilityChange);
    function destroy() {
      if (destroyed) return queue;
      var pending = flush(); destroyed = true; generation++;
      if (href) { root.URL.revokeObjectURL(href); href = null; }
      if (root.removeEventListener) root.removeEventListener('pagehide', pageHide);
      if (root.document && root.document.removeEventListener) root.document.removeEventListener('visibilitychange', visibilityChange);
      return Promise.resolve(pending).finally(function () { current = null; if (opened) opened.close(); else database.then(function (db) { if (db) db.close(); }); });
    }
    return { ready: ready, get: get, replace: replace, update: update, reset: reset, flush: flush, destroy: destroy };
  }
  return { create: create, sanitize: sanitize, imageType: imageType, maxBytes: MAX_BYTES, maxSide: MAX_SIDE };
});
