class GiftFinder extends HTMLElement {
  connectedCallback() {
    this.form = this.querySelector('[data-gift-finder-form]');
    this.submitButton = this.querySelector('[data-gift-finder-submit]');
    if (!this.form || !this.submitButton) return;

    this.form.addEventListener('change', () => this.update());
    this.form.addEventListener('reset', () => requestAnimationFrame(() => this.update()));
    this.form.addEventListener('submit', (event) => this.submit(event));
    this.update();
  }

  update() {
    const recipient = this.form.querySelector('[data-gift-finder-option="recipient"]:checked');
    const occasion = this.form.querySelector('[data-gift-finder-option="occasion"]:checked');
    this.submitButton.disabled = !recipient || !occasion;
  }

  submit(event) {
    event.preventDefault();
    if (this.submitButton.disabled) return;

    const recipient = this.form.querySelector('[data-gift-finder-option="recipient"]:checked');
    const occasion = this.form.querySelector('[data-gift-finder-option="occasion"]:checked');
    if (!recipient || !occasion) return;

    const query = `tag:${JSON.stringify(recipient.value)} AND tag:${JSON.stringify(occasion.value)}`;
    const params = new URLSearchParams({ q: query, type: 'product' });
    window.location.assign(`${this.dataset.searchUrl}?${params.toString()}`);
  }
}

if (!customElements.get('gift-finder')) {
  customElements.define('gift-finder', GiftFinder);
}
