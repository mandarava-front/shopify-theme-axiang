class CuszooVisualLinks extends HTMLElement {
  connectedCallback() {
    this.sliderComponent = this.querySelector('slider-component');
    this.slider = this.sliderComponent?.querySelector('[id^="Slider-"]');
    this.scrollMode = this.dataset.scrollMode;
    this.speed = Number(this.dataset.scrollSpeed) || 30;

    if (this.scrollMode !== 'continuous' || !this.slider) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.classList.add('is-reduced-motion');
      return;
    }

    this.originalItems = [...this.slider.children];
    if (this.originalItems.length < 2) return;

    this.originalItems.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.removeAttribute('id');
      clone.removeAttribute('data-shopify-editor-block');
      clone.setAttribute('aria-hidden', 'true');
      clone.inert = true;
      clone.querySelectorAll('[id]').forEach((element) => element.removeAttribute('id'));
      clone.querySelectorAll('a, button, input, select, textarea').forEach((element) => {
        element.setAttribute('tabindex', '-1');
      });
      this.slider.appendChild(clone);
    });

    this.handleMouseEnter = () => this.stop();
    this.handleMouseLeave = () => this.start();
    this.handleFocusIn = () => this.stop();
    this.handleFocusOut = () => this.start();
    this.handleVisibilityChange = () => (document.hidden ? this.stop() : this.start());

    this.addEventListener('mouseenter', this.handleMouseEnter);
    this.addEventListener('mouseleave', this.handleMouseLeave);
    this.addEventListener('focusin', this.handleFocusIn);
    this.addEventListener('focusout', this.handleFocusOut);
    document.addEventListener('visibilitychange', this.handleVisibilityChange);
    this.start();
  }

  disconnectedCallback() {
    this.stop();
    this.removeEventListener('mouseenter', this.handleMouseEnter);
    this.removeEventListener('mouseleave', this.handleMouseLeave);
    this.removeEventListener('focusin', this.handleFocusIn);
    this.removeEventListener('focusout', this.handleFocusOut);
    document.removeEventListener('visibilitychange', this.handleVisibilityChange);
  }

  start() {
    if (document.hidden || this.animationFrame) return;
    this.lastFrameTime = performance.now();
    this.scrollPosition = this.slider.scrollLeft;

    const step = (currentTime) => {
      const elapsed = Math.min(currentTime - this.lastFrameTime, 50);
      const firstClone = this.slider.children[this.originalItems.length];
      const loopWidth = firstClone ? firstClone.offsetLeft - this.slider.children[0].offsetLeft : 0;

      if (loopWidth > 0) {
        this.scrollPosition += (this.speed * elapsed) / 1000;
        if (this.scrollPosition >= loopWidth) this.scrollPosition -= loopWidth;
        this.slider.scrollLeft = this.scrollPosition;
      }

      this.lastFrameTime = currentTime;
      this.animationFrame = window.requestAnimationFrame(step);
    };

    this.animationFrame = window.requestAnimationFrame(step);
  }

  stop() {
    window.cancelAnimationFrame(this.animationFrame);
    this.animationFrame = null;
  }
}

if (!customElements.get('cuszoo-visual-links')) {
  customElements.define('cuszoo-visual-links', CuszooVisualLinks);
}
