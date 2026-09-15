/* Keep layout attributes on app roots even when an app replaces the native gallery. */
(() => {
  if (window.productGalleryLayoutInstalled) return;
  window.productGalleryLayoutInstalled = true;
  let pending = false;
  const desktop = matchMedia('(min-width: 750px)');
  const sizes = new WeakMap();
  const resize = new ResizeObserver((entries) => {
    let changed = false;
    entries.forEach(({ target, contentRect }) => {
      const width = Math.round(contentRect.width);
      if (width > 0 && sizes.get(target) !== width) {
        sizes.set(target, width);
        changed = true;
      }
      const slider = target.querySelector('.tee-slider');
      if (slider && slider.offsetWidth) {
        target.style.setProperty('--product-gallery-scale', Math.min(1, contentRect.width / slider.offsetWidth));
      }
    });
    // Personalization apps measure their canvas on window resize.
    if (changed) window.dispatchEvent(new Event('resize'));
  });
  const observed = new Set();
  const sync = () => {
    pending = false;
    const section = document.querySelector('product-info[id^="MainProduct-"]');
    if (!section) return;
    const position = section.dataset.thumbnailPosition || 'bottom';
    const roots = section.querySelectorAll('#tee-gallery, #customily-gallery, #artwork-preview');
    roots.forEach((root) => {
      if (root.dataset.productThumbnailPosition !== position) root.dataset.productThumbnailPosition = position;
      const stage = root.querySelector('.tee-gallery__stage, .customily_gallery_media, .main-carousel');
      if (stage && !observed.has(stage)) { observed.add(stage); resize.observe(stage); }
      if (!desktop.matches || position !== 'left') return;
      const active = root.querySelector('.tee-thumbnail--active, .customily_gallery_thumbnail.active, .embla__slide--thumb.is-selected');
      const rail = root.querySelector('.tee-thumbnails__track, .customily_gallery_thumbnails_container, .thumb-carousel .embla__viewport');
      if (!active || !rail) return;
      const item = active.getBoundingClientRect();
      const bounds = rail.getBoundingClientRect();
      if (item.top < bounds.top) rail.scrollTop += item.top - bounds.top;
      else if (item.bottom > bounds.bottom) rail.scrollTop += item.bottom - bounds.bottom;
    });
    observed.forEach((stage) => {
      if (!stage.isConnected) { resize.unobserve(stage); observed.delete(stage); }
    });
  };
  const schedule = () => { if (!pending) { pending = true; requestAnimationFrame(sync); } };
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  document.addEventListener('shopify:section:load', schedule);
  desktop.addEventListener('change', schedule);
  schedule();
})();
