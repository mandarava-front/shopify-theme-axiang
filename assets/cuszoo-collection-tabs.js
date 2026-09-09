class CuszooCollectionTabs extends HTMLElement {
  connectedCallback() {
    this.tabs = Array.from(this.querySelectorAll('[role="tab"]'));
    this.panels = Array.from(this.querySelectorAll('[role="tabpanel"]'));
    this.seeAllLink = this.querySelector('[data-cuszoo-tabs-see-all]');
    this.productSliders = this.panels.map((panel) => this.initProductSlider(panel));

    this.tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => this.selectTab(index));
      tab.addEventListener('keydown', (event) => this.onKeydown(event, index));
    });
  }

  selectTab(index, focus = false) {
    this.tabs.forEach((tab, tabIndex) => {
      const selected = tabIndex === index;
      tab.setAttribute('aria-selected', selected.toString());
      tab.tabIndex = selected ? 0 : -1;
      this.panels[tabIndex].hidden = !selected;
    });

    if (focus) this.tabs[index].focus();

    if (this.seeAllLink) {
      this.seeAllLink.href = this.tabs[index].dataset.collectionUrl;
    }

    requestAnimationFrame(() => this.productSliders[index]?.update());
  }

  initProductSlider(panel) {
    const shell = panel.querySelector('[data-cuszoo-products-slider]');
    const track = shell?.querySelector('[data-cuszoo-tabs-track]');
    const controls = shell?.querySelector('.cuszoo-tabs__slider-controls');
    const previous = shell?.querySelector('[data-cuszoo-tabs-previous]');
    const next = shell?.querySelector('[data-cuszoo-tabs-next]');

    if (!track || !controls || !previous || !next) return null;

    const getStep = () => {
      const offsets = Array.from(track.children)
        .filter((item) => item.offsetParent !== null)
        .map((item) => item.offsetLeft)
        .filter((offset, index, values) => index === 0 || Math.abs(offset - values[index - 1]) > 1);

      return offsets.length > 1 ? Math.abs(offsets[1] - offsets[0]) : track.clientWidth;
    };

    const update = () => {
      const desktop = window.matchMedia('(min-width: 750px)').matches;
      const layout = desktop ? panel.dataset.desktopLayout : panel.dataset.mobileLayout;
      const hasOverflow = layout === 'slider' && track.scrollWidth > track.clientWidth + 2;

      controls.hidden = !hasOverflow;
      previous.disabled = !hasOverflow || track.scrollLeft <= 2;
      next.disabled = !hasOverflow || track.scrollLeft + track.clientWidth >= track.scrollWidth - 2;
    };

    previous.addEventListener('click', () => track.scrollBy({ left: -getStep(), behavior: 'smooth' }));
    next.addEventListener('click', () => track.scrollBy({ left: getStep(), behavior: 'smooth' }));
    track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });

    const resizeObserver = new ResizeObserver(update);
    resizeObserver.observe(track);
    requestAnimationFrame(update);

    return { update };
  }

  onKeydown(event, index) {
    let nextIndex;

    if (event.key === 'ArrowRight') nextIndex = (index + 1) % this.tabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + this.tabs.length) % this.tabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = this.tabs.length - 1;

    if (nextIndex === undefined) return;

    event.preventDefault();
    this.selectTab(nextIndex, true);
  }
}

if (!customElements.get('cuszoo-collection-tabs')) {
  customElements.define('cuszoo-collection-tabs', CuszooCollectionTabs);
}
