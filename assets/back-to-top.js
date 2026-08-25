const backToTopButton = document.querySelector('[data-back-to-top]');

if (backToTopButton) {
  const syncVisibility = () => {
    backToTopButton.hidden = window.scrollY < Math.max(500, window.innerHeight * 0.75);
  };

  backToTopButton.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
    });
  });

  window.addEventListener('scroll', syncVisibility, { passive: true });
  syncVisibility();
}
