/* Keep native variant controls in sync with the availability rules used by
   the previous live theme: unavailable values are hidden and an option group
   with only one available value is hidden as well. */
(function () {
  'use strict';

  function apply(root) {
    if (!root) return;
    root.querySelectorAll('variant-selects .product-form__input').forEach((group) => {
      const radios = Array.from(group.querySelectorAll('input[type="radio"]'));
      if (radios.length) {
        const available = radios.filter((radio) => !radio.disabled && !radio.classList.contains('disabled'));
        radios.forEach((radio) => {
          const label = group.querySelector(`label[for="${CSS.escape(radio.id)}"]`);
          if (label) label.hidden = radio.disabled || radio.classList.contains('disabled');
        });
        group.hidden = available.length <= 1;
        return;
      }

      const select = group.querySelector('select');
      if (!select) return;
      const available = Array.from(select.options).filter((option) => !option.disabled);
      group.hidden = available.length <= 1;
    });
  }

  function init() {
    const product = document.querySelector('[data-template="product"]');
    if (!product) return;
    apply(product);
    new MutationObserver(() => apply(product)).observe(product, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
