const footerDesktopQuery = window.matchMedia('(min-width: 750px)');

function syncFooterColumns(root = document) {
  root.querySelectorAll('.mc-footer [data-mc-footer-col]').forEach((column) => {
    column.open = footerDesktopQuery.matches;
  });
}

footerDesktopQuery.addEventListener('change', () => syncFooterColumns());
document.addEventListener('DOMContentLoaded', () => syncFooterColumns());
document.addEventListener('shopify:section:load', (event) => syncFooterColumns(event.target));
