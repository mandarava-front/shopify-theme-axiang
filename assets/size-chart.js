/* Size Chart popup: open/close, garment tabs, inch/cm toggle. */
// Delegated fallback for themes/apps that replace the product option markup
// after page load. The trigger carries an explicit modal id, so opening does
// not depend on the custom element remaining its original DOM position.
if (!window.__cuszooSizeChartClickReady) {
  document.addEventListener('click', (event) => {
    const close = event.target.closest('[data-sc-close]');
    if (close) {
      const modal = close.closest('.size-chart__modal');
      if (modal) {
        modal.hidden = true;
        document.body.classList.remove('size-chart-open');
      }
      return;
    }
    const trigger = event.target.closest('[data-size-chart-trigger]');
    if (!trigger) return;
    const modal = document.getElementById(trigger.dataset.sizeChartTarget);
    if (!modal) return;
    event.preventDefault();
    event.stopPropagation();
    modal.hidden = false;
    document.body.classList.add('size-chart-open');
    modal.querySelector('.size-chart__close')?.focus();
  }, true);
  window.__cuszooSizeChartClickReady = true;
}

if (!customElements.get('size-chart-popup')) {
  customElements.define(
    'size-chart-popup',
    class SizeChartPopup extends HTMLElement {
      constructor() {
        super();
        this.onKeyDown = this.onKeyDown.bind(this);
      }

      connectedCallback() {
        this.trigger = this.querySelector('.size-chart__trigger');
        this.modal = this.querySelector('.size-chart__modal');
        if (!this.modal && this.trigger?.dataset.sizeChartTarget) {
          this.modal = document.getElementById(this.trigger.dataset.sizeChartTarget);
        }
        if (!this.trigger || !this.modal) return;
        this.lastFocus = null;
        this.relocateObserver = new MutationObserver(() => this.relocateTrigger());
        this.relocateObserver.observe(this.closest('product-info') || document.body, { childList: true, subtree: true });

        // Host the overlay at body level so sticky or transformed product-page
        // containers can never clip it or offset the fixed positioning.
        if (this.modal.parentElement !== document.body) {
          document.body.appendChild(this.modal);
        }

        this.relocateTrigger();

        this.trigger.addEventListener('click', (event) => {
          // The trigger lives inside a <label>/<legend> for the size pickers:
          // keep the click from being forwarded to the size control.
          event.preventDefault();
          event.stopPropagation();
          this.open();
        });
        this.modal.addEventListener('click', (event) => {
          if (event.target.closest('[data-sc-close]')) this.close();
          const tab = event.target.closest('.size-chart__tab');
          if (tab) this.selectTab(tab.dataset.tab);
          const unit = event.target.closest('.size-chart__unit');
          if (unit) this.selectUnit(unit.dataset.unit);
        });
        document.addEventListener('keydown', this.onKeyDown);
      }

      disconnectedCallback() {
        document.removeEventListener('keydown', this.onKeyDown);
        this.relocateObserver?.disconnect();
        document.body.classList.remove('size-chart-open');
      }

      /* Place the trigger at the right edge of the "Size" option row, like the
         reference layout: prefer Teeinblue's Size option, then the apparel_size
         select label, then the native variant picker's Size legend. */
      relocateTrigger() {
        const scope = this.closest('product-info') || document;
        let sizeLabel = this.findTeeinblueSizeTarget(scope);
        if (!sizeLabel) sizeLabel = scope.querySelector('.cuszoo-apparel-size .form__label');
        if (!sizeLabel) {
          const legends = scope.querySelectorAll(
            'variant-selects fieldset.product-form__input > legend.form__label'
          );
          for (const legend of legends) {
            if (/size/i.test(legend.textContent || '')) {
              sizeLabel = legend;
              break;
            }
          }
        }
        if (sizeLabel && !sizeLabel.contains(this)) {
          const originalHost = this.parentElement;
          sizeLabel.classList.add('has-size-chart');
          if (sizeLabel.matches('.tee-option')) sizeLabel.classList.add('has-size-chart--tee-option');
          // Move the whole custom element, not only the button. This keeps the
          // trigger and modal event wiring intact after it is placed beside Size.
          sizeLabel.appendChild(this);
          originalHost?.classList.add('cuszoo-size-chart--detached');
        }
      }

      findTeeinblueSizeTarget(scope) {
        const form = scope.querySelector('.tee-artwork-form, #tee-artwork-form');
        if (!form) return null;

        const titleSelectors = [
          '.tee-option-title',
          '.tee-option-label',
          '.tee-option-name',
          '[class*="option-title"]',
          '[class*="option-label"]',
          '[class*="option-name"]'
        ];
        const titleForOption = (option) => {
          if (!option) return null;
          for (const selector of titleSelectors) {
            const title = option.querySelector(selector);
            if (title) return title;
          }
          return option;
        };

        const explicitTarget = form.querySelector(
          '[data-option-name*="size" i], [data-option-label*="size" i], [aria-label*="size" i]'
        );
        if (explicitTarget) return titleForOption(explicitTarget.closest('.tee-option') || explicitTarget);

        for (const option of form.querySelectorAll('.tee-option')) {
          const label = titleForOption(option);
          const text = (label || option).textContent || '';
          const metadata = Array.from(option.attributes)
            .map((attribute) => `${attribute.name} ${attribute.value}`)
            .join(' ');
          if (/\bsize\b/i.test(`${text} ${metadata}`)) return label;
        }

        return null;
      }

      onKeyDown(event) {
        if (event.key === 'Escape' && !this.modal.hidden) this.close();
      }

      open() {
        if (!this.modal) return;
        this.lastFocus = document.activeElement;
        this.modal.hidden = false;
        document.body.classList.add('size-chart-open');
        this.modal.querySelector('.size-chart__close').focus();
      }

      close() {
        if (!this.modal) return;
        this.modal.hidden = true;
        document.body.classList.remove('size-chart-open');
        if (this.lastFocus && typeof this.lastFocus.focus === 'function') this.lastFocus.focus();
      }

      selectTab(key) {
        this.modal.querySelectorAll('.size-chart__tab').forEach((button) => {
          const active = button.dataset.tab === key;
          button.classList.toggle('is-active', active);
          button.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        this.modal.querySelectorAll('.size-chart__figure').forEach((figure) => {
          figure.hidden = figure.dataset.figure !== key;
        });
        this.modal.querySelectorAll('.size-chart__panel').forEach((panel) => {
          panel.hidden = panel.dataset.panel !== key;
        });
      }

      selectUnit(unit) {
        this.modal.dataset.unit = unit;
        this.modal.querySelectorAll('.size-chart__unit').forEach((button) => {
          button.classList.toggle('is-active', button.dataset.unit === unit);
        });
      }
    }
  );
}
