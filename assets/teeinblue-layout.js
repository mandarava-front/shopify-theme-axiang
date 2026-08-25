class TeeInBlueThemeLayout {
  constructor() {
    this.arrange = this.arrange.bind(this);
    this.observer = new MutationObserver(this.arrange);
    this.observer.observe(document.documentElement, { childList: true, subtree: true });
    this.arrange();
  }

  arrange() {
    const teeForm = document.querySelector('.tee-artwork-form');
    const container = teeForm?.closest('.product__info-container');
    if (!teeForm || !container || container.dataset.teeLayoutReady === 'true') return;

    let teeHost = teeForm;
    while (teeHost.parentElement && teeHost.parentElement !== container) {
      teeHost = teeHost.parentElement;
    }
    if (teeHost.parentElement !== container) return;

    const salesProof = container.querySelector(':scope > .cuszoo-sales-proof');
    const delivery = container.querySelector(':scope > .cuszoo-delivery-estimate');
    const purchase = container.querySelector(':scope > .cuszoo-product-purchase');

    [salesProof, delivery].forEach((block) => {
      if (block) container.insertBefore(block, teeHost);
    });
    if (purchase) teeHost.insertAdjacentElement('afterend', purchase);

    container.dataset.teeLayoutReady = 'true';
    document.body.classList.add('teeinblue-active');
    this.observer.disconnect();
  }
}

if (document.querySelector("main[data-template='product']")) {
  new TeeInBlueThemeLayout();
}
