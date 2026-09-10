/* Keep native variant controls in sync with the availability rules used by the
   previous live theme: unavailable values are hidden, and an option group left
   with a single available value is hidden as well.

   The script also repairs selections that stopped resolving to a variant.
   Switching one option (Product type: T-shirt -> Hat) leaves the other groups
   pointing at values the new combination does not carry, so Shopify returns no
   variant and product-info.js empties input[name="id"]. Customily reads that
   input to pick the template it renders, which freezes the live preview until
   the shopper picks another value by hand. Re-selecting the first available
   value restores a resolvable variant right away. */
(function () {
  'use strict';

  const HIDDEN_CLASS = 'cuszoo-option-hidden';
  const MAX_REPAIRS = 10;

  let repairs = 0;
  let pending = false;

  /* HTMLUpdateUtility.viewTransition double-buffers: it inserts the incoming
     node before the outgoing one, hides the outgoing one and only removes it
     500ms later. So two variant-selects coexist for half a second, the stale
     one still carrying the previous combination's availability — repairing
     against it would re-submit the old options and undo the shopper's pick.
     Scope everything to the main product's live node, which also keeps
     related-products and quick-add pickers out of reach. */
  function getVariantSelects() {
    const main = document.querySelector('main[data-template="product"]');
    const productInfo = main?.querySelector('product-info');
    if (!productInfo) return null;

    return (
      Array.from(productInfo.querySelectorAll('variant-selects')).find(
        (element) => element.style.display !== 'none' && element.isConnected
      ) ?? null
    );
  }

  /* Each picker type marks unavailable values differently: dropdown options get
     the real attribute, pills get a `disabled` class, and swatches get
     `visually-disabled` while staying enabled so they keep their focus ring. */
  function isUnavailable(input) {
    return (
      input.disabled || input.classList.contains('disabled') || input.classList.contains('visually-disabled')
    );
  }

  /* `[hidden]` loses to the pill/swatch rules that set an explicit display, so
     the class in cuszoo-product.css does the actual hiding. */
  function setHidden(element, hidden) {
    element.hidden = hidden;
    element.classList.toggle(HIDDEN_CLASS, hidden);
  }

  /* Returns a repair to run when nothing selectable is currently selected,
     otherwise null. */
  function syncRadioGroup(group) {
    const radios = Array.from(group.querySelectorAll('input[type="radio"]'));
    const available = radios.filter((radio) => !isUnavailable(radio));

    radios.forEach((radio) => {
      const label = group.querySelector(`label[for="${CSS.escape(radio.id)}"]`);
      if (label) setHidden(label, isUnavailable(radio));
    });
    setHidden(group, available.length <= 1);

    if (available.length && !available.some((radio) => radio.checked)) {
      return () => available[0].click();
    }
    return null;
  }

  function syncSelectGroup(group) {
    const select = group.querySelector('select');
    if (!select) return null;

    const available = Array.from(select.options).filter((option) => !isUnavailable(option));
    setHidden(group, available.length <= 1);

    if (available.length && !available.some((option) => option.selected)) {
      return () => {
        select.value = available[0].value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
      };
    }
    return null;
  }

  /* Every group is synced first so the markup settles in one pass, then at most
     one repair runs: it re-renders the section, and the observer picks the next
     group up from the server's fresh availability. */
  function apply() {
    const variantSelects = getVariantSelects();
    if (!variantSelects) return;

    let repair = null;
    variantSelects.querySelectorAll('.product-form__input').forEach((group) => {
      const pendingRepair = group.querySelector('input[type="radio"]')
        ? syncRadioGroup(group)
        : syncSelectGroup(group);
      if (pendingRepair && !repair) repair = pendingRepair;
    });

    if (!repair) return;

    /* Repairing exists for exactly one situation: Shopify resolved no variant,
       which product-info.js records by blanking this input. Whenever an id is
       present the shopper's combination is valid and must be left alone. */
    const variantId = variantSelects.closest('product-info')?.querySelector('input[name="id"]');
    if (variantId && variantId.value) return;

    if (repairs >= MAX_REPAIRS) {
      console.warn(`cuszoo-variant-availability: no resolvable variant after ${repairs} repairs, giving up`);
      return;
    }
    repairs += 1;
    repair();
  }

  function schedule() {
    if (pending) return;
    pending = true;
    window.requestAnimationFrame(() => {
      pending = false;
      apply();
    });
  }

  function init() {
    if (!document.querySelector('main[data-template="product"]')) return;

    /* A deliberate pick means the shopper is back in control, so the repair
       budget starts over for the combination they are moving to. Repairs go
       through .click() and dispatchEvent, which stay untrusted. */
    document.addEventListener(
      'change',
      (event) => {
        if (event.isTrusted) repairs = 0;
      },
      true
    );

    apply();
    /* product-info.js swaps whole nodes rather than their contents — the
       variant-selects element on every option change, and <main> itself when a
       combined listing switches product — so the observer sits on body and the
       root is looked up again on each pass. */
    new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
