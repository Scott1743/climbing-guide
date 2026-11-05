(() => {
  'use strict';
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const cards = [...document.querySelectorAll('[data-clip]')].map(figure => ({
    figure,
    button: figure.querySelector('[data-gif-toggle]'),
    image: figure.querySelector('[data-gif]'),
    label: figure.querySelector('.gif-state'),
    visible: false,
    playing: false,
    choice: null,
    failed: false,
  }));

  function render(card) {
    const play = card.visible && !document.hidden && !card.failed &&
      (card.choice === true || (card.choice === null && !motion.matches));
    if (card.playing !== play) {
      card.playing = play;
      card.image.src = play ? card.image.dataset.gif : card.image.dataset.poster;
    }
    card.button.setAttribute('aria-pressed', String(play));
    const action = play ? '停止 · 回到首帧' : '播放 GIF';
    card.label.textContent = card.failed ? '加载失败 · 点击重试' : action;
    card.button.setAttribute('aria-label', `${card.failed ? '重新加载 GIF' : action}：${card.image.alt}`);
  }

  cards.forEach(card => {
    card.button.disabled = false;
    render(card);
    card.button.addEventListener('click', () => {
      card.choice = !card.playing;
      card.failed = false;
      card.visible = true;
      render(card);
    });
    card.image.addEventListener('error', () => {
      if (!card.playing) return;
      card.failed = true;
      render(card);
    });
  });

  if ('IntersectionObserver' in window) {
    const byElement = new Map(cards.map(card => [card.button, card]));
    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const card = byElement.get(entry.target);
        card.visible = entry.isIntersecting && entry.intersectionRatio >= 0.15;
        render(card);
      });
    }, {threshold: [0, 0.15]});
    cards.forEach(card => observer.observe(card.button));
  }
  // Without IntersectionObserver, keep posters until the reader presses play.
  document.addEventListener('visibilitychange', () => cards.forEach(render));
  motion.addEventListener('change', () => {
    cards.forEach(card => { card.choice = null; render(card); });
  });
})();
