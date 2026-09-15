/* Teeinblue's automatic loader skips non-Teeinblue product pages. A cart on
 * those pages can still contain designs that need its native editing dialog. */
(() => {
  if (window.__cuszooTeeCartEdit) return;
  window.__cuszooTeeCartEdit = true;

  const selector = '.tee-edit-customization[data-customization-id]';
  const requested = new WeakMap();
  let loading;
  let scheduled = false;
  let retryAfter = 0;

  const sdkScripts = () => [...document.scripts].filter((script) => {
    try {
      const url = new URL(script.src);
      return url.hostname === 'sdk.teeinblue.com' && /^\/shopify\/app-v\d+\.js$/.test(url.pathname);
    } catch { return false; }
  });

  function loadSDK() {
    if (window.TEEINBLUE_LOADED) return Promise.resolve();
    if (loading) return loading;
    let script = sdkScripts()[0];
    let owned = false;
    if (!script) {
      const source = [...document.scripts].find((entry) => {
        try {
          const url = new URL(entry.src);
          return url.hostname === 'sdk.teeinblue.com' && url.pathname === '/async.js';
        } catch { return false; }
      });
      if (!source) return Promise.reject(new Error('Teeinblue loader is not available yet'));
      const params = new URL(source.src).searchParams;
      if (params.get('platform') !== 'shopify' || !/^\d+$/.test(params.get('v') || '') ||
          !params.get('token') || !params.get('shop')) {
        return Promise.reject(new Error('Invalid Teeinblue loader configuration'));
      }
      const url = new URL(`/shopify/app-v${params.get('v')}.js`, 'https://sdk.teeinblue.com');
      url.searchParams.set('token', params.get('token'));
      url.searchParams.set('shop', params.get('shop'));
      script = document.createElement('script');
      script.src = url.href;
      // The app loader recognises an existing deferred script and reuses it.
      script.defer = true;
      owned = true;
    }
    loading = new Promise((resolve, reject) => {
      const finish = (error) => {
        clearTimeout(timeout);
        clearInterval(poll);
        script.removeEventListener('load', onLoad);
        script.removeEventListener('error', onError);
        if (error) {
          if (owned) script.remove();
          reject(error);
        } else resolve();
      };
      const onLoad = () => { if (window.TEEINBLUE_LOADED) finish(); };
      const onError = () => finish(new Error('Unable to load Teeinblue cart editor'));
      const timeout = setTimeout(onError, 15000);
      const poll = setInterval(onLoad, 100);
      script.addEventListener('load', onLoad);
      script.addEventListener('error', onError);
      if (owned) document.head.append(script);
    }).finally(() => { loading = null; });
    return loading;
  }

  async function sync() {
    scheduled = false;
    if (Date.now() < retryAfter) return;
    const hosts = [...document.querySelectorAll(selector)].filter((host) => {
      const id = host.dataset.customizationId?.trim();
      return id && !host.querySelector('.tee-edit-button') && requested.get(host) !== id;
    });
    if (!hosts.length) return;
    hosts.forEach((host) => requested.set(host, host.dataset.customizationId.trim()));
    try {
      await loadSDK();
      if (!hosts.some((host) => host.isConnected)) return;
      // These are the SDK's cart-service events, not theme add-to-cart events.
      document.dispatchEvent(new CustomEvent('shopify-event-cart-modified'));
      document.dispatchEvent(new CustomEvent('shopify-event-cart-ajax'));
    } catch (error) {
      hosts.forEach((host) => requested.delete(host));
      retryAfter = Date.now() + 2000;
      console.warn('[Cart editor]', error.message);
    }
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(sync);
  }

  new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'attributes') {
        if (record.target.matches('cart-drawer.active')) {
          document.querySelectorAll(selector).forEach((host) => requested.delete(host));
          retryAfter = 0;
          schedule();
        } else if (record.attributeName === 'data-customization-id') schedule();
      } else if ([...record.addedNodes].some((node) => node instanceof Element &&
        (node.matches(`${selector}, script[src]`) || node.querySelector(selector)))) schedule();
    }
  }).observe(document.body, {
    childList: true, subtree: true, attributes: true,
    attributeFilter: ['class', 'data-customization-id'],
  });
  document.addEventListener('shopify:section:load', schedule);
  schedule();
})();
