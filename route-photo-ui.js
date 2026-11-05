/* Browser-local photo controls for Climbing Guide. No upload endpoint. */
(function (global) {
  'use strict';
  let serial = 0;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const copyCrop = crop => ({ x: crop.x, y: crop.y, width: crop.width, height: crop.height });

  function mount(options) {
    const root = options.root, board = options.board;
    const id = 'cg-photo-' + (++serial), listeners = [];
    let controller, editing = false, loading = false, destroyed = false, pan = null;
    let cropDraft = null, cropSource = null, cropDrag = null, cropReturnFocus = null, cropFieldEdge = null;
    const query = selector => root.querySelector(selector);
    const listen = (target, type, callback, config) => {
      target.addEventListener(type, callback, config);
      listeners.push(() => target.removeEventListener(type, callback, config));
    };
    root.classList.add('photo-panel');
    root.innerHTML = `
      <div class="photo-heading"><div><b>对着照片摆点</b><span>一张背景 · 只存当前浏览器</span></div>
        <div class="photo-source-actions"><button type="button" data-photo-action="choose">选择本地照片</button><button type="button" data-photo-action="camera">拍照</button></div>
        <input class="photo-file-input" id="${id}-file" data-photo-file tabindex="-1" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif" aria-label="选择或替换本地照片">
        <input class="photo-file-input" id="${id}-camera" data-photo-camera tabindex="-1" type="file" accept="image/*" capture="environment" aria-label="拍摄岩壁照片">
      </div>
      <p class="photo-intro">先选择岩壁照片，再按真实墙宽、墙高校准标尺。照片不会自动测量距离。</p>
      <p class="photo-camera-note">手机和平板可拍照，具体入口取决于浏览器。</p>
      <p class="photo-status" role="status" aria-live="polite" data-photo-status>支持 JPG、PNG、WebP、AVIF 和 GIF，最大 20 MB。新照片替换旧照片。</p>
      <div data-photo-settings hidden>
        <div class="photo-actions"><button type="button" data-photo-action="edit" aria-pressed="false">调整照片位置</button><button type="button" data-photo-action="crop">裁切照片</button><button type="button" data-photo-action="visible" aria-pressed="true">隐藏照片</button></div>
        <p class="photo-mode-note" data-photo-mode hidden>现在拖动画布会移动照片；已有岩点不会跟随。调整好后点击“完成，回到摆点”。</p>
        <details class="photo-adjustments"><summary>透明度、缩放与拉伸</summary>
          <div class="photo-range-grid">
            <label for="${id}-opacity">照片不透明度 <output data-photo-value="opacity"></output><input id="${id}-opacity" data-photo-field="opacity" type="range" min="0.1" max="1" step="0.01"></label>
            <label for="${id}-scale">整体缩放 <output data-photo-value="scale"></output><input id="${id}-scale" data-photo-field="scale" type="range" min="0.25" max="5" step="0.01"></label>
            <label for="${id}-stretch-x">横向拉伸 <output data-photo-value="stretchX"></output><input id="${id}-stretch-x" data-photo-field="stretchX" type="range" min="0.25" max="4" step="0.01"></label>
            <label for="${id}-stretch-y">纵向拉伸 <output data-photo-value="stretchY"></output><input id="${id}-stretch-y" data-photo-field="stretchY" type="range" min="0.25" max="4" step="0.01"></label>
          </div>
          <div class="photo-reset-row"><span data-photo-offset></span><button type="button" data-photo-action="reset">重置裁切与定位</button></div>
          <p class="photo-help">拉伸只调整照片，不改变岩点坐标。摆点前先对齐；清除浏览器网站数据会丢失这张本地照片。</p>
        </details>
      </div>`;

    const dialog = document.createElement('dialog');
    dialog.className = 'photo-crop-dialog';
    dialog.setAttribute('aria-labelledby', id + '-crop-title');
    dialog.innerHTML = `
      <div class="photo-crop-header"><div><h2 id="${id}-crop-title">保留要摆点的岩壁区域</h2><p>拖动四角调整裁切框；框内拖动可平移，框外拖动可重新框选。</p></div><button type="button" data-crop-action="cancel" aria-label="取消裁切并关闭">×</button></div>
      <div class="photo-crop-viewport"><div class="photo-crop-stage" tabindex="0" role="group" aria-label="裁切预览，可用下方四边百分比调整"><img alt="本地照片裁切预览" draggable="false"><div class="photo-crop-box"><span data-crop-handle="nw"></span><span data-crop-handle="ne"></span><span data-crop-handle="sw"></span><span data-crop-handle="se"></span></div></div></div>
      <div class="photo-crop-fields">
        <label for="${id}-crop-left">左边 %<input id="${id}-crop-left" data-crop-edge="left" type="number" min="0" max="99" step="0.1" inputmode="decimal"></label>
        <label for="${id}-crop-top">上边 %<input id="${id}-crop-top" data-crop-edge="top" type="number" min="0" max="99" step="0.1" inputmode="decimal"></label>
        <label for="${id}-crop-right">右边 %<input id="${id}-crop-right" data-crop-edge="right" type="number" min="1" max="100" step="0.1" inputmode="decimal"></label>
        <label for="${id}-crop-bottom">下边 %<input id="${id}-crop-bottom" data-crop-edge="bottom" type="number" min="1" max="100" step="0.1" inputmode="decimal"></label>
      </div>
      <p class="photo-crop-help" data-crop-status aria-live="polite">裁切区域会适配到墙面；应用后可继续缩放、拉伸和移动照片。</p>
      <div class="photo-crop-footer"><button type="button" data-crop-action="full">选择整张照片</button><div><button type="button" data-crop-action="cancel">取消</button><button type="button" class="photo-apply" data-crop-action="apply">应用裁切</button></div></div>`;
    document.body.appendChild(dialog);
    const cropQuery = selector => dialog.querySelector(selector);
    const stage = cropQuery('.photo-crop-stage'), cropImage = stage.querySelector('img');
    const box = cropQuery('.photo-crop-box'), fileInput = query('[data-photo-file]'), cameraInput = query('[data-photo-camera]');

    function notify() {
      if (!destroyed && typeof options.onChange === 'function') options.onChange(controller && controller.get());
    }
    function status(text, error) {
      if (destroyed) return;
      const element = query('[data-photo-status]');
      element.textContent = text;
      element.classList.toggle('error', Boolean(error));
    }
    function saveNow() {
      if (!controller || !controller.flush || destroyed) return;
      const failed = () => status('照片保存遇到问题；当前调整可能无法在刷新后保留。', true);
      try { Promise.resolve(controller.flush()).catch(failed); }
      catch (_) { failed(); }
    }
    function refresh(photo) {
      if (destroyed) return;
      photo = photo || (controller && controller.get());
      const hasPhoto = Boolean(photo);
      query('[data-photo-settings]').hidden = !hasPhoto;
      const choose = query('[data-photo-action="choose"]');
      choose.textContent = loading ? '正在读取照片…' : hasPhoto ? '替换本地照片' : '选择本地照片';
      choose.disabled = loading;
      fileInput.disabled = loading;
      query('[data-photo-action="camera"]').disabled = loading;
      cameraInput.disabled = loading;
      root.querySelectorAll('[data-photo-settings] button, [data-photo-field]').forEach(element => { element.disabled = loading || !hasPhoto; });
      const editButton = query('[data-photo-action="edit"]');
      editButton.textContent = editing ? '完成，回到摆点' : '调整照片位置';
      editButton.setAttribute('aria-pressed', String(editing));
      query('[data-photo-mode]').hidden = !editing;
      board.classList.toggle('photo-adjusting', editing);
      if (!photo) return;
      const visibility = query('[data-photo-action="visible"]');
      visibility.textContent = photo.visible ? '隐藏照片' : '显示照片';
      visibility.setAttribute('aria-pressed', String(photo.visible));
      root.querySelectorAll('[data-photo-field]').forEach(element => {
        const key = element.dataset.photoField;
        element.value = photo[key];
        query('[data-photo-value="' + key + '"]').textContent = Math.round(photo[key] * 100) + '%';
      });
      query('[data-photo-offset]').textContent = '平移：横向 ' + Math.round(photo.offsetX * 100) + '% · 纵向 ' + Math.round(photo.offsetY * 100) + '%';
      if (dialog.open && cropSource !== photo.href) closeCrop();
    }
    function finishPan() {
      if (!pan) return;
      const pointerId = pan.pointerId;
      pan = null;
      board.classList.remove('photo-panning');
      if (board.hasPointerCapture && board.hasPointerCapture(pointerId)) board.releasePointerCapture(pointerId);
      saveNow();
    }
    function setEditing(value) {
      const photo = controller && controller.get();
      editing = Boolean(value && photo && !loading);
      if (!editing) { if (pan) finishPan(); else saveNow(); }
      if (editing && !photo.visible) { controller.update({ visible: true }); saveNow(); }
      refresh();
      notify();
    }

    controller = global.ClimbingPhoto.create({
      onChange(photo) {
        if (!photo) editing = false;
        refresh(photo);
        notify();
      },
      onStatus: status
    });
    Promise.resolve(controller.ready).then(() => refresh()).catch(error => status(error.message || '本地照片暂时无法恢复，可以重新选择照片。', true));

    listen(query('[data-photo-action="choose"]'), 'click', () => fileInput.click());
    listen(query('[data-photo-action="camera"]'), 'click', () => cameraInput.click());
    async function replaceFromInput(sourceInput) {
      const file = sourceInput.files && sourceInput.files[0];
      if (!file || loading) { sourceInput.value = ''; return; }
      setEditing(false);
      loading = true;
      refresh();
      status('正在本地处理照片，不会上传…');
      let replaced = false;
      try { replaced = await controller.replace(file) === true; }
      catch (error) { status(error.message || '照片读取失败，原照片已保留。', true); }
      finally {
        loading = false;
        sourceInput.value = '';
        refresh();
      }
      if (replaced && !destroyed) setEditing(true);
    }
    listen(fileInput, 'change', () => replaceFromInput(fileInput));
    listen(cameraInput, 'change', () => replaceFromInput(cameraInput));
    listen(query('[data-photo-action="edit"]'), 'click', () => setEditing(!editing));
    listen(query('[data-photo-action="visible"]'), 'click', () => {
      const photo = controller.get();
      if (!photo) return;
      if (photo.visible) setEditing(false);
      controller.update({ visible: !photo.visible });
      saveNow();
    });
    listen(query('[data-photo-action="reset"]'), 'click', () => {
      setEditing(false);
      controller.reset();
      saveNow();
    });
    root.querySelectorAll('[data-photo-field]').forEach(element => {
      listen(element, 'input', () => {
        const value = Number(element.value);
        if (Number.isFinite(value)) controller.update({ [element.dataset.photoField]: value });
      });
      for (const eventName of ['change', 'keyup', 'blur']) listen(element, eventName, saveNow);
    });

    function wallPoint(event) {
      const svg = board.querySelector('svg');
      if (!svg || !global.ClimbingRenderer) return null;
      const matrix = svg.getScreenCTM();
      if (!matrix) return null;
      const point = svg.createSVGPoint();
      point.x = event.clientX;
      point.y = event.clientY;
      const projected = point.matrixTransform(matrix.inverse());
      const view = global.ClimbingRenderer.viewport(options.getWall());
      return { x: (projected.x - view.wall.x) / view.wall.width, y: (projected.y - view.wall.y) / view.wall.height };
    }
    const intercept = event => { event.preventDefault(); event.stopImmediatePropagation(); };
    listen(board, 'pointerdown', event => {
      if (!editing || loading || event.button !== 0) return;
      intercept(event);
      if (pan) return;
      const point = wallPoint(event), photo = controller.get();
      if (!point || !photo) return;
      board.focus({ preventScroll: true });
      pan = { pointerId: event.pointerId, start: point, x: photo.offsetX, y: photo.offsetY };
      board.setPointerCapture(event.pointerId);
      board.classList.add('photo-panning');
    }, { capture: true, passive: false });
    listen(board, 'pointermove', event => {
      if (!pan || event.pointerId !== pan.pointerId) return;
      intercept(event);
      const point = wallPoint(event);
      if (point) controller.update({ offsetX: clamp(pan.x + point.x - pan.start.x, -2, 2), offsetY: clamp(pan.y + point.y - pan.start.y, -2, 2) });
    }, { capture: true, passive: false });
    for (const eventName of ['pointerup', 'pointercancel']) listen(board, eventName, event => {
      if (!pan || event.pointerId !== pan.pointerId) return;
      intercept(event);
      finishPan();
    }, { capture: true, passive: false });
    listen(board, 'lostpointercapture', event => { if (pan && event.pointerId === pan.pointerId) finishPan(); }, true);
    listen(board, 'keydown', event => {
      if (!editing || loading || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
      if (event.key === 'Delete' || event.key === 'Backspace') { intercept(event); return; }
      const amount = event.shiftKey ? .05 : .01;
      const delta = { ArrowLeft: [-amount, 0], ArrowRight: [amount, 0], ArrowUp: [0, -amount], ArrowDown: [0, amount] }[event.key];
      if (!delta) return;
      intercept(event);
      const photo = controller.get();
      if (photo) controller.update({ offsetX: clamp(photo.offsetX + delta[0], -2, 2), offsetY: clamp(photo.offsetY + delta[1], -2, 2) });
    }, true);
    listen(board, 'keyup', event => {
      if (!editing || loading || /^(INPUT|SELECT|TEXTAREA)$/.test(event.target.tagName)) return;
      if (!['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(event.key)) return;
      intercept(event);
      saveNow();
    }, true);

    function fitCropStage() {
      if (!dialog.open) return;
      const photo = controller.get();
      if (!photo) return;
      const available = cropQuery('.photo-crop-viewport').clientWidth;
      const maxHeight = Math.max(120, Math.min(420, global.innerHeight * .44));
      const width = Math.min(available, maxHeight * photo.width / photo.height);
      stage.style.width = width + 'px';
      stage.style.height = width * photo.height / photo.width + 'px';
    }
    function renderCrop(syncInputs = true) {
      if (!cropDraft) return;
      box.style.left = cropDraft.x * 100 + '%';
      box.style.top = cropDraft.y * 100 + '%';
      box.style.width = cropDraft.width * 100 + '%';
      box.style.height = cropDraft.height * 100 + '%';
      const edges = { left: cropDraft.x, top: cropDraft.y, right: cropDraft.x + cropDraft.width, bottom: cropDraft.y + cropDraft.height };
      if (syncInputs) dialog.querySelectorAll('[data-crop-edge]').forEach(element => { element.value = Math.round(edges[element.dataset.cropEdge] * 1000) / 10; });
      cropQuery('[data-crop-status]').textContent = '保留原图约 ' + Math.round(cropDraft.width * 100) + '% 宽 × ' + Math.round(cropDraft.height * 100) + '% 高；应用前不会改变当前背景。';
    }
    function openCrop() {
      const photo = controller.get();
      if (!photo || loading) return;
      setEditing(false);
      cropDraft = copyCrop(photo.crop);
      cropFieldEdge = null;
      cropSource = photo.href;
      cropReturnFocus = document.activeElement;
      cropImage.src = photo.href;
      dialog.showModal();
      fitCropStage();
      renderCrop();
    }
    function closeCrop() {
      cropDrag = null;
      if (dialog.open) dialog.close();
      cropImage.removeAttribute('src');
      cropSource = null;
      if (cropReturnFocus && cropReturnFocus.isConnected) cropReturnFocus.focus({ preventScroll: true });
      cropReturnFocus = null;
    }
    listen(query('[data-photo-action="crop"]'), 'click', openCrop);
    dialog.querySelectorAll('[data-crop-action="cancel"]').forEach(button => listen(button, 'click', closeCrop));
    listen(dialog, 'cancel', event => { event.preventDefault(); closeCrop(); });
    listen(cropQuery('[data-crop-action="full"]'), 'click', () => { cropDraft = { x: 0, y: 0, width: 1, height: 1 }; renderCrop(); });
    listen(cropQuery('[data-crop-action="apply"]'), 'click', () => {
      const photo = controller.get();
      if (!photo || photo.href !== cropSource || !cropDraft) return closeCrop();
      readCropFields();
      const crop = copyCrop(cropDraft);
      closeCrop();
      controller.update({ crop, scale: 1, stretchX: 1, stretchY: 1, offsetX: 0, offsetY: 0, visible: true });
      saveNow();
      setEditing(true);
    });
    listen(global, 'resize', fitCropStage);
    listen(cropImage, 'load', fitCropStage);
    function readCropFields(changedElement) {
      if (!cropDraft) return;
      if (changedElement) cropFieldEdge = changedElement.dataset.cropEdge;
      const edges = { left: cropDraft.x, top: cropDraft.y, right: cropDraft.x + cropDraft.width, bottom: cropDraft.y + cropDraft.height };
      dialog.querySelectorAll('[data-crop-edge]').forEach(element => {
        const raw = element.value.trim(), value = Number(raw) / 100;
        if (raw !== '' && Number.isFinite(value)) edges[element.dataset.cropEdge] = value;
      });
      let left = clamp(edges.left, 0, .99), right = clamp(edges.right, .01, 1);
      let top = clamp(edges.top, 0, .99), bottom = clamp(edges.bottom, .01, 1);
      if (right - left < .01) {
        if (cropFieldEdge === 'left') left = right - .01;
        else right = left + .01;
      }
      if (bottom - top < .01) {
        if (cropFieldEdge === 'top') top = bottom - .01;
        else bottom = top + .01;
      }
      cropDraft = { x: left, y: top, width: right - left, height: bottom - top };
    }
    dialog.querySelectorAll('[data-crop-edge]').forEach(element => {
      listen(element, 'input', () => { readCropFields(element); renderCrop(false); });
      listen(element, 'change', () => { readCropFields(element); renderCrop(); });
    });
    function cropPoint(event) {
      const rect = stage.getBoundingClientRect();
      return { x: clamp((event.clientX - rect.left) / rect.width, 0, 1), y: clamp((event.clientY - rect.top) / rect.height, 0, 1) };
    }
    listen(stage, 'pointerdown', event => {
      if (event.button !== 0 || !cropDraft) return;
      event.preventDefault();
      if (cropDrag) return;
      const point = cropPoint(event), handle = event.target.closest('[data-crop-handle]');
      const inside = point.x >= cropDraft.x && point.x <= cropDraft.x + cropDraft.width && point.y >= cropDraft.y && point.y <= cropDraft.y + cropDraft.height;
      cropDrag = { pointerId: event.pointerId, start: point, crop: copyCrop(cropDraft), mode: handle ? handle.dataset.cropHandle : inside ? 'move' : 'draw' };
      stage.setPointerCapture(event.pointerId);
    });
    listen(stage, 'pointermove', event => {
      if (!cropDrag || event.pointerId !== cropDrag.pointerId) return;
      event.preventDefault();
      const point = cropPoint(event), initial = cropDrag.crop, mode = cropDrag.mode;
      let { x, y, width, height } = initial;
      if (mode === 'move') {
        x = clamp(initial.x + point.x - cropDrag.start.x, 0, 1 - width);
        y = clamp(initial.y + point.y - cropDrag.start.y, 0, 1 - height);
      } else if (mode === 'draw') {
        x = Math.min(point.x, cropDrag.start.x); y = Math.min(point.y, cropDrag.start.y);
        width = Math.max(.01, Math.abs(point.x - cropDrag.start.x)); height = Math.max(.01, Math.abs(point.y - cropDrag.start.y));
        x = Math.min(x, 1 - width); y = Math.min(y, 1 - height);
      } else {
        const right = initial.x + initial.width, bottom = initial.y + initial.height;
        if (mode.includes('w')) { x = clamp(point.x, 0, right - .01); width = right - x; }
        else width = clamp(point.x, x + .01, 1) - x;
        if (mode.includes('n')) { y = clamp(point.y, 0, bottom - .01); height = bottom - y; }
        else height = clamp(point.y, y + .01, 1) - y;
      }
      cropDraft = { x, y, width, height };
      renderCrop();
    });
    for (const eventName of ['pointerup', 'pointercancel', 'lostpointercapture']) listen(stage, eventName, event => {
      if (cropDrag && event.pointerId === cropDrag.pointerId) cropDrag = null;
    });

    refresh();
    return {
      get: () => controller.get(),
      setEditing,
      ready: controller.ready,
      destroy() {
        if (destroyed) return;
        setEditing(false);
        closeCrop();
        destroyed = true;
        listeners.forEach(remove => remove());
        dialog.remove();
        Promise.resolve(controller.destroy()).catch(() => {});
        board.classList.remove('photo-adjusting', 'photo-panning');
        root.replaceChildren();
      }
    };
  }
  global.ClimbingPhotoUI = Object.freeze({ mount });
})(typeof window !== 'undefined' ? window : globalThis);
