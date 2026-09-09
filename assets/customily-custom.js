(function () {
  'use strict';

  let pending = false;
  let canvasPending = false;

  function insertOptionsTitle() {
    const optionsApp = document.querySelector('#cl_optionsapp');
    if (!optionsApp || optionsApp.querySelector(':scope > .customily-option-title')) return;

    const title = document.createElement('div');
    title.className = 'customily-option-title';
    title.textContent = 'Personalized options';
    title.setAttribute('role', 'heading');
    title.setAttribute('aria-level', '2');
    optionsApp.prepend(title);
  }

  function scheduleInsert() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(() => {
      pending = false;
      insertOptionsTitle();
    });
  }

  function showCanvasAfterPreview() {
    if (canvasPending) return;
    canvasPending = true;
    window.requestAnimationFrame(() => {
      canvasPending = false;
      const canvas = document.querySelector('.cl-canvas-container');
      if (!canvas || !canvas.querySelector('canvas, img')) return;
      if (getComputedStyle(canvas).display !== 'none') return;

      // Customily keeps the canvas hidden until its gallery emits the show
      // event. Re-dispatching the supported event after the preview is ready
      // restores the initial live preview without touching Customily's DOM.
      window.dispatchEvent(new CustomEvent('customily-live-preview-show-canvas'));
    });
  }

  function init() {
    insertOptionsTitle();
    window.addEventListener('customily-options-loaded', scheduleInsert);
    window.addEventListener('customily-options-changed', scheduleInsert);
    window.addEventListener('customily-preview-load-finished', showCanvasAfterPreview);
    window.addEventListener('customily-canvas-rendered', showCanvasAfterPreview);
    new MutationObserver(scheduleInsert).observe(document.body, { childList: true, subtree: true });
    new MutationObserver(showCanvasAfterPreview).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
