class JudgeMeReviewLayout extends HTMLElement {
  connectedCallback() {
    this.layout = this.dataset.layout || 'grid';
    this.columns = Number(this.dataset.columns) || 4;
    this.rows = Number(this.dataset.rows) || 2;
    this.applyLayout = this.applyLayout.bind(this);

    this.observer = new MutationObserver(this.applyLayout);
    this.observer.observe(this, { childList: true, subtree: true });
    this.applyLayout();
    window.setTimeout(this.applyLayout, 500);
    window.setTimeout(this.applyLayout, 1500);
  }

  disconnectedCallback() {
    this.observer?.disconnect();
    window.clearInterval(this.autoplayTimer);
  }

  applyLayout() {
    const container = this.querySelector('.jdgm-carousel__item-container');
    const wrapper = this.querySelector('.jdgm-carousel__item-wrapper');
    if (!container || !wrapper) return;

    const items = [...wrapper.querySelectorAll('.jdgm-carousel-item')].filter(
      (item) => !item.classList.contains('cloned')
    );

    items.forEach((item, index) => {
      item.dataset.jdgmCustomHidden = this.layout === 'grid' && index >= this.columns * this.rows;
    });

    if (this.layout !== 'grid') this.setupControls(container);
    this.setupAutoplay(container);
  }

  setupControls(container) {
    const step = () => Math.max(container.clientWidth * 0.8, 280);
    const left = this.querySelector('.jdgm-carousel__left-arrow');
    const right = this.querySelector('.jdgm-carousel__right-arrow');

    if (left && !left.dataset.jdgmCustomControl) {
      left.dataset.jdgmCustomControl = 'true';
      left.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        container.scrollBy({ left: -step(), behavior: 'smooth' });
      }, true);
    }

    if (right && !right.dataset.jdgmCustomControl) {
      right.dataset.jdgmCustomControl = 'true';
      right.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        this.scrollNext(container, step());
      }, true);
    }
  }

  setupAutoplay(container) {
    window.clearInterval(this.autoplayTimer);
    if (this.layout !== 'carousel' || this.dataset.autoplay !== 'true') return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const interval = (Number(this.dataset.autoplaySeconds) || 5) * 1000;
    this.autoplayTimer = window.setInterval(() => {
      this.scrollNext(container, Math.max(container.clientWidth * 0.8, 280));
    }, interval);
  }

  scrollNext(container, distance) {
    const atEnd = container.scrollLeft + container.clientWidth >= container.scrollWidth - 8;
    container.scrollTo({ left: atEnd ? 0 : container.scrollLeft + distance, behavior: 'smooth' });
  }
}

if (!customElements.get('judge-me-review-layout')) {
  customElements.define('judge-me-review-layout', JudgeMeReviewLayout);
}
