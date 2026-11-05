(() => {
  'use strict';
  document.querySelectorAll('[data-share-page]').forEach(button => {
    button.hidden = false;
    button.addEventListener('click', async () => {
      const url = document.querySelector('link[rel="canonical"]')?.href || location.href;
      const title = document.title;
      const text = document.querySelector('meta[name="description"]')?.content || '';
      const status = button.parentElement.querySelector('[role="status"]');
      try {
        if (navigator.share) {
          await navigator.share({title,text,url});
          status.textContent = '已打开分享';
        } else if (navigator.clipboard && window.isSecureContext) {
          await navigator.clipboard.writeText(url);
          status.textContent = '链接已复制';
        } else {
          status.textContent = '分享链接：'+url;
        }
      } catch (error) {
        status.textContent = error.name === 'AbortError' ? '' : '分享链接：'+url;
      }
    });
  });
})();
