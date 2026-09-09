/*
 * Keep Teeinblue V1 intact and arrange theme-owned blocks around its async form.
 * The intended order is title, rating, Teeinblue price, volume offer, Teeinblue
 * options/quantity/POD/buy button, delivery, description, shipping, guarantee, share.
 */
const configureTeeinblueDrawerAction = () => {
  const campaign = window.teeinblueCampaign || window.TeeInBlueCampaign;
  if (!campaign) return false;

  let isTeeinblueProduct = campaign.isTeeInBlueProduct;
  let isPlatformProduct = campaign.isPlatformProduct;
  if (typeof isTeeinblueProduct === 'function') isTeeinblueProduct = isTeeinblueProduct.call(campaign);
  if (typeof isPlatformProduct === 'function') isPlatformProduct = isPlatformProduct.call(campaign);
  if (!isTeeinblueProduct || isPlatformProduct) return false;

  // Teeinblue's own config defaults to a full /cart redirect. Override only
  // Campaign by Teeinblue before its Vue component copies the config.
  if (campaign.config && typeof campaign.config === 'object') {
    campaign.config.atc_action = 'drawer';
    campaign.config.gotoCart = false;
  }

  const options = window.teeinblue || window.TeeInBlue;
  if (options && typeof options === 'object') {
    options.gotoCart = false;
  } else {
    window.teeinblue = { gotoCart: false };
  }

  return true;
};

class TeeInBlueThemeLayout {
  constructor() {
    this.pending = false;
    this.arrange = this.arrange.bind(this);
    this.schedule = this.schedule.bind(this);
    this.observer = new MutationObserver(this.schedule);
    this.observer.observe(document.documentElement, { childList: true, subtree: true });
    this.bindTeeinblueCartDrawer();
    this.arrange();
  }

  schedule() {
    if (this.pending) return;
    this.pending = true;
    window.requestAnimationFrame(() => {
      this.pending = false;
      this.arrange();
    });
  }

  arrange() {
    configureTeeinblueDrawerAction();
    this.discoverTeeinblueProducts();
    this.bindTeeinblueCartDrawer();

    document.querySelectorAll('[data-teeinblue-product="true"]').forEach((container) => {
      const teeForm = container.querySelector('.tee-artwork-form, #tee-artwork-form');
      if (!teeForm) return;

      const teeHost = this.findDirectHost(teeForm, container);
      if (!teeHost) return;

      const titleBlock = container.querySelector('[data-cuszoo-product-block="title"]');
      const ratingBlock = container.querySelector('[data-cuszoo-product-block="rating"]');
      const priceBlock = container.querySelector('[id^="price-"]');
      const volumeBlock = container.querySelector('[data-cuszoo-product-block="volume"]');
      const salesBlock = container.querySelector('[data-cuszoo-product-block="sales"]');
      const variantBlock = container.querySelector('[data-cuszoo-product-block="variant"]');
      const quantityBlock = container.querySelector('[data-cuszoo-product-block="quantity"]');
      const purchaseBlock = container.querySelector('[data-cuszoo-product-block="buy"]');
      const deliveryBlock = container.querySelector('[data-cuszoo-product-block="delivery"]');
      const descriptionBlock = container.querySelector('[data-cuszoo-product-block="description"]');
      const shippingBlock = container.querySelector('[data-cuszoo-product-block="shipping"]');
      const satisfactionBlock = container.querySelector('[data-cuszoo-product-block="satisfaction"]');
      const shareBlock = container.querySelector('[data-cuszoo-product-block="share"]');
      const apparelSizeBlock = container.querySelector('[data-cuszoo-product-block="apparel-size"]');
      const sizeChartBlock = container.querySelector('[data-cuszoo-product-block="size-chart"]');
      const priceHook = teeForm.querySelector('.tee-price-hook--after');
      const teePrice = teeForm.querySelector('.tee-product-price');
      const teeDescription = teeForm.querySelector('[class*="description" i], [id*="description" i]');
      const isPlatformProduct = container.dataset.teeinbluePlatformProduct === 'true';

      if (isPlatformProduct) {
        this.preparePlatformArtwork(container);

        // Campaign by Shopify keeps Shopify's price, variants, quantity and ATC.
        // Teeinblue validates the POD fields and intercepts the native ATC click.
        this.moveSequenceBefore(
          [titleBlock, ratingBlock, priceBlock, volumeBlock, salesBlock, variantBlock, apparelSizeBlock, sizeChartBlock],
          teeHost
        );

        let afterPurchase = teeHost;
        [quantityBlock, purchaseBlock, deliveryBlock, descriptionBlock, shippingBlock, satisfactionBlock, shareBlock].forEach(
          (block) => {
            if (!block || block === afterPurchase) return;
            this.moveAfter(block, afterPurchase);
            afterPurchase = block;
          }
        );
      } else {
        // Campaign by Teeinblue owns price, variants, quantity and purchase.
        this.moveSequenceBefore([titleBlock, ratingBlock], teeHost);

        if (priceHook) {
          this.moveInto(volumeBlock, priceHook);
          this.moveInto(salesBlock, priceHook);
        } else if (teePrice) {
          this.moveAfter(volumeBlock, teePrice);
          this.moveAfter(salesBlock, volumeBlock || teePrice);
        }

        // Everything after purchase follows the same order as the native product page.
        // If Teeinblue has no internal description, keep delivery directly after
        // the purchase form instead of letting it fall below the share block.
        let afterTee = teeHost;
        const afterPurchaseBlocks = [apparelSizeBlock, sizeChartBlock];
        if (!teeDescription) afterPurchaseBlocks.push(deliveryBlock);
        afterPurchaseBlocks.push(descriptionBlock, shippingBlock, satisfactionBlock, shareBlock);
        afterPurchaseBlocks.forEach((block) => {
          if (!block || block === afterTee) return;
          this.moveAfter(block, afterTee);
          afterTee = block;
        });

        // Teeinblue renders its own description inside the async form. Place the
        // theme delivery estimate immediately before that description when found.
        if (deliveryBlock && teeDescription && teeDescription !== deliveryBlock && teeDescription.parentElement) {
          teeDescription.parentElement.insertBefore(deliveryBlock, teeDescription);
        }
      }

      // Size Chart is owned by the theme, but its trigger belongs beside
      // Teeinblue's Size option when that option is available.
      container.querySelectorAll('size-chart-popup').forEach((popup) => {
        if (typeof popup.relocateTrigger === 'function') popup.relocateTrigger();
      });

      container.classList.add('cuszoo-teeinblue-product');
      document.body.classList.add('teeinblue-active');
      container.dataset.teeLayoutReady = 'true';
    });

    this.syncApparelSize();
  }

  discoverTeeinblueProducts() {
    const campaign = window.teeinblueCampaign;
    let isTeeinblueCampaign = campaign && campaign.isTeeInBlueProduct;
    let isPlatformProduct = campaign && campaign.isPlatformProduct;
    if (typeof isTeeinblueCampaign === 'function') {
      isTeeinblueCampaign = isTeeinblueCampaign.call(campaign);
    }
    if (typeof isPlatformProduct === 'function') {
      isPlatformProduct = isPlatformProduct.call(campaign);
    }

    if (isTeeinblueCampaign) {
      document.querySelectorAll('.product__info-container').forEach((container) => {
        container.dataset.teeinblueProduct = 'true';
        container.dataset.teeinbluePlatformProduct = String(Boolean(isPlatformProduct));
        container.classList.toggle('cuszoo-teeinblue-platform-product', Boolean(isPlatformProduct));
      });
    }

    document.querySelectorAll('.tee-artwork-form, #tee-artwork-form').forEach((teeForm) => {
      const container = teeForm.closest('.product__info-container');
      if (!container) return;
      container.classList.add('cuszoo-teeinblue-product');
      container.dataset.teeinblueProduct = 'true';
    });
  }

  preparePlatformArtwork(container) {
    if (container.dataset.teeArtworkPreparationScheduled === 'true') return;

    const eventBus = window.TeeinblueEventBus;
    if (!eventBus || typeof eventBus.$emit !== 'function') return;

    container.dataset.teeArtworkPreparationScheduled = 'true';
    // Preview sends the same Teeinblue event before opening its modal. Waiting
    // for Vue's mount cycle makes the hidden artwork available to direct ATC.
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => eventBus.$emit('load_artwork'));
    });
  }

  findDirectHost(node, container) {
    let host = node;
    while (host.parentElement && host.parentElement !== container) host = host.parentElement;
    return host.parentElement === container ? host : null;
  }

  moveInto(block, parent) {
    if (block && parent && block.parentElement !== parent) parent.appendChild(block);
  }

  moveAfter(block, reference) {
    if (!block || !reference || block === reference) return;
    if (block.parentElement !== reference.parentElement || block.previousElementSibling !== reference) {
      reference.insertAdjacentElement('afterend', block);
    }
  }

  moveSequenceBefore(blocks, reference) {
    if (!reference || !reference.parentElement) return;
    const orderedBlocks = blocks.filter((block) => block && block !== reference);
    if (!orderedBlocks.length) return;

    let previous = reference.previousElementSibling;
    let isAlreadyOrdered = true;
    for (let index = orderedBlocks.length - 1; index >= 0; index -= 1) {
      if (previous !== orderedBlocks[index]) {
        isAlreadyOrdered = false;
        break;
      }
      previous = previous && previous.previousElementSibling;
    }
    if (isAlreadyOrdered) return;

    orderedBlocks.forEach((block) => reference.parentElement.insertBefore(block, reference));
  }

  syncApparelSize() {
    document.querySelectorAll('[data-cuszoo-apparel-size]').forEach((select) => {
      if (select.dataset.sizeSyncReady === 'true') return;
      select.addEventListener('change', () => {
        const productInfo = select.closest('[data-teeinblue-product="true"], product-info');
        if (!productInfo) return;
        productInfo.querySelectorAll('form[action*="/cart/add"]').forEach((form) => {
          let input = form.querySelector('input[data-cuszoo-apparel-size-property]');
          if (!input) {
            input = document.createElement('input');
            input.type = 'hidden';
            input.name = select.name;
            input.dataset.cuszooApparelSizeProperty = 'true';
            form.appendChild(input);
          }
          input.value = select.value;
        });
      });
      select.dataset.sizeSyncReady = 'true';
    });
  }

  /* Teeinblue adds the customized item through its own API. After that API
     succeeds, refresh the theme sections and open the native cart drawer. */
  bindTeeinblueCartDrawer() {
    if (window.__cuszooTeeinblueDrawerReady) return;
    let teeinblueRefreshSequence = 0;

    const refreshTeeinblueCartDrawer = async () => {
      const drawer = document.querySelector('cart-drawer');
      if (!drawer || drawer.dataset.teeinblueRefreshing === 'true') return;
      drawer.dataset.teeinblueRefreshing = 'true';

      try {
        const sectionsUrl = new URL(window.Shopify?.routes?.root || '/', window.location.origin);
        sectionsUrl.searchParams.set('sections', 'cart-drawer,cart-icon-bubble');
        const response = await fetch(sectionsUrl.toString(), {
          headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
          cache: 'no-store',
        });
        const sections = await response.json();
        if (!response.ok || !sections['cart-drawer']) throw new Error('Unable to refresh cart drawer');
        drawer.classList.remove('is-empty');
        drawer.renderContents({ id: null, sections });
      } catch (error) {
        console.error('Teeinblue cart drawer refresh failed', error);
      } finally {
        delete drawer.dataset.teeinblueRefreshing;
      }
    };

    const scheduleTeeinblueDrawerRefresh = (initialDelay = 0) => {
      const sequence = ++teeinblueRefreshSequence;
      let lastCartSignature = '';

      [300, 1200, 2500].forEach((delay) => {
        window.setTimeout(async () => {
          if (sequence !== teeinblueRefreshSequence) return;

          try {
            const cartResponse = await fetch(`${window.routes?.cart_url || '/cart'}.js`, {
              headers: { Accept: 'application/json' },
              cache: 'no-store',
            });
            const cart = await cartResponse.json();
            if (!cartResponse.ok || !Array.isArray(cart.items)) throw new Error('Unable to read cart');

            const cartSignature = cart.items.map((item) => `${item.key}:${item.quantity}`).join('|');
            if (cartSignature === lastCartSignature) return;
            lastCartSignature = cartSignature;
            await refreshTeeinblueCartDrawer();
          } catch (error) {
            console.error('Teeinblue delayed cart refresh failed', error);
          }
        }, initialDelay + delay);
      });
    };

    /* Campaign by Teeinblue normally submits a real /cart/add form. Capture
       that submit before the app's default navigation and request the drawer
       sections in the same response as the add operation. */
    document.addEventListener(
      'submit',
      async (event) => {
        const form = event.target instanceof HTMLFormElement ? event.target : null;
        if (!form) return;
        const teeForm = form.closest('.tee-artwork-form, #tee-artwork-form');
        const productInfo = teeForm?.closest('.product__info-container');
        if (!teeForm || !productInfo || productInfo.classList.contains('cuszoo-teeinblue-platform-product')) return;
        if (form.dataset.cuszooDrawerSubmitting === 'true') return;

        event.preventDefault();
        event.stopImmediatePropagation();
        form.dataset.cuszooDrawerSubmitting = 'true';

        const drawer = document.querySelector('cart-drawer');
        const data = new FormData(form);
        data.append('sections', 'cart-drawer,cart-icon-bubble');
        data.append('sections_url', window.location.pathname);

        try {
          const response = await fetch(`${window.routes?.cart_add_url || '/cart/add'}.js`, {
            method: 'POST',
            headers: { 'X-Requested-With': 'XMLHttpRequest', Accept: 'application/json' },
            body: data,
          });
          const parsed = await response.json();
          if (!response.ok || parsed.status) throw new Error(parsed.description || 'Unable to add to cart');
          if (drawer && parsed.sections) {
            drawer.classList.remove('is-empty');
            drawer.renderContents(parsed);
            scheduleTeeinblueDrawerRefresh();
          } else if (drawer && typeof drawer.open === 'function') {
            drawer.open();
            scheduleTeeinblueDrawerRefresh();
          }
        } catch (error) {
          console.error('Teeinblue cart drawer add failed', error);
        } finally {
          delete form.dataset.cuszooDrawerSubmitting;
        }
      },
      true
    );

    const handlePlatformTeeinblueCartPending = () => {
      if (!document.querySelector('.cuszoo-teeinblue-platform-product')) return;

      // Platform campaigns add paid extras first, then hand the main item to
      // the theme. Start after that handoff so the drawer receives both lines.
      scheduleTeeinblueDrawerRefresh(350);
    };

    const handleTeeinblueCartAdded = () => {
      // The SDK has used both document and window as the event target across
      // versions. Product discovery may already have marked the page even if
      // the campaign object is unavailable for a moment, so accept either
      // runtime signal before opening the drawer.
      const hasTeeinblueProduct = document.querySelector('.cuszoo-teeinblue-product');
      if (!configureTeeinblueDrawerAction() && !hasTeeinblueProduct) return;
      scheduleTeeinblueDrawerRefresh();
    };

    document.addEventListener('teeinblue-event-before-cart-added', handlePlatformTeeinblueCartPending);
    document.addEventListener('teeinblue-event-after-cart-added', handleTeeinblueCartAdded);
    window.addEventListener('teeinblue-event-after-cart-added', handleTeeinblueCartAdded);
    window.__cuszooTeeinblueDrawerReady = true;
  }
}

const initializeTeeInBlueThemeLayout = () => {
  configureTeeinblueDrawerAction();
  if (document.querySelector("main[data-template='product']")) new TeeInBlueThemeLayout();
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeTeeInBlueThemeLayout, { once: true });
} else {
  initializeTeeInBlueThemeLayout();
}
