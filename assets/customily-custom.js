(function () {
  'use strict';

  let pending = false;

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

  // Customily overlays its preview canvas on the first gallery slide instead of
  // giving it a slide of its own, and it does not follow the theme slider. Track
  // whether the shopper wants the preview or the product photos ourselves: the
  // preview shows on load and after an option change, and any gallery
  // interaction (including picking the first image) switches to the photos.
  const HIDDEN_CLASS = 'customily-canvas-away';
  const SHOW_EVENT = 'customily-live-preview-show-canvas';
  const HIDE_EVENT = 'customily-live-preview-hide-canvas';
  let syncPending = false;
  let previewMode = true;
  let canvasAllowed = true;
  let dispatchingShow = false;

  function getGalleryList() {
    return document.querySelector('media-gallery .product__media-list');
  }

  function isOnPreviewSlide() {
    const list = getGalleryList();
    const previewSlide = list && list.querySelector('.product__media-item');
    if (!previewSlide) return true;

    // Mobile slider: the preview is only in place while the first slide is
    // scrolled into view. Desktop layouts switch slides via `is-active`.
    if (getComputedStyle(list).overflowX !== 'visible') {
      return Math.abs(list.scrollLeft - previewSlide.offsetLeft) < 2;
    }
    return previewSlide.classList.contains('is-active');
  }

  function requestShowCanvas() {
    dispatchingShow = true;
    window.dispatchEvent(new CustomEvent(SHOW_EVENT));
    dispatchingShow = false;
  }

  function syncCanvas() {
    if (syncPending) return;
    syncPending = true;
    window.requestAnimationFrame(() => {
      syncPending = false;
      const canvas = document.querySelector('.cl-canvas-container');
      if (!canvas) return;

      // Hide with a class rather than Customily's hide event: its hide clears
      // the min-height it set on the gallery, which fires its resize observer
      // and immediately shows the canvas again.
      const allowed = previewMode && isOnPreviewSlide();
      const becameAllowed = allowed && !canvasAllowed;
      canvasAllowed = allowed;
      document.documentElement.classList.toggle(HIDDEN_CLASS, !allowed);

      if (!allowed || !canvas.querySelector('canvas, img')) return;
      // Customily may have shown (and positioned) the canvas while the first
      // slide was scrolled away or hidden, leaving it off screen. Showing it
      // again here makes Customily measure the slide where it now is.
      if (becameAllowed || canvas.style.display === 'none') requestShowCanvas();
    });
  }

  function showPreviewSlide() {
    const gallery = document.querySelector('media-gallery');
    const list = getGalleryList();
    const previewSlide = list && list.querySelector('.product__media-item');
    if (!gallery || !previewSlide || isOnPreviewSlide()) return;

    // Mirror MediaGallery#setActiveMedia without its window scroll, so the
    // page does not jump away from the option the shopper is editing.
    list.querySelectorAll('.product__media-item').forEach((slide) => {
      slide.classList.toggle('is-active', slide === previewSlide);
    });
    list.scrollTo({ left: previewSlide.offsetLeft });
    const thumbnail = gallery.querySelector(`[data-target="${previewSlide.dataset.mediaId}"]`);
    if (thumbnail && typeof gallery.setActiveThumbnail === 'function') gallery.setActiveThumbnail(thumbnail);
  }

  function setPreviewMode(enabled) {
    previewMode = enabled;
    syncCanvas();
  }

  function handleOptionsChanged() {
    scheduleInsert();
    previewMode = true;
    showPreviewSlide();
    syncCanvas();
  }

  function handleMutations() {
    scheduleInsert();
    syncCanvas();
  }

  function init() {
    insertOptionsTitle();
    window.addEventListener('customily-options-loaded', scheduleInsert);
    window.addEventListener('customily-options-changed', handleOptionsChanged);
    window.addEventListener('customily-preview-load-finished', syncCanvas);
    window.addEventListener('customily-canvas-rendered', syncCanvas);
    window.addEventListener('customily-live-preview-shown', syncCanvas);
    window.addEventListener('customily-live-preview-hidden', syncCanvas);
    // Customily requests these itself, e.g. when optional personalization is
    // expanded or collapsed. Its resize-driven re-shows bypass the events, so
    // they never switch the gallery back to the preview.
    window.addEventListener(SHOW_EVENT, () => {
      if (!dispatchingShow) setPreviewMode(true);
    });
    window.addEventListener(HIDE_EVENT, () => setPreviewMode(false));
    window.addEventListener('resize', syncCanvas);
    // Element scroll events do not bubble, so listen in the capture phase to
    // follow the gallery slider even after it is re-rendered on variant change.
    document.addEventListener(
      'scroll',
      (event) => {
        if (event.target instanceof Element && event.target.matches('.product__media-list')) syncCanvas();
      },
      { capture: true, passive: true }
    );
    document.addEventListener(
      'pointerdown',
      (event) => {
        if (event.target instanceof Element && event.target.closest('media-gallery')) setPreviewMode(false);
      },
      { capture: true, passive: true }
    );
    new MutationObserver(handleMutations).observe(document.body, {
      attributeFilter: ['class'],
      attributes: true,
      childList: true,
      subtree: true,
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
