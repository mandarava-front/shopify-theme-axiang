if (!customElements.get('share-button')) {
  customElements.define(
    'share-button',
    class ShareButton extends DetailsDisclosure {
      constructor() {
        super();

        this.elements = {
          shareButton: this.querySelector('button'),
          shareSummary: this.querySelector('summary'),
          closeButton: this.querySelector('.share-button__close'),
          successMessage: this.querySelector('[id^="ShareMessage"]'),
          urlInput: this.querySelector('input'),
        };
        this.urlToShare = this.elements.urlInput ? this.elements.urlInput.value : document.location.href;

        this.mainDetailsToggle.addEventListener('toggle', this.toggleDetails.bind(this));
        this.mainDetailsToggle
          .querySelector('.share-button__copy')
          .addEventListener('click', this.copyToClipboard.bind(this));
        this.mainDetailsToggle.querySelector('.share-button__close').addEventListener('click', this.close.bind(this));
        this.querySelectorAll('[data-native-share]').forEach((button) => {
          button.addEventListener('click', () => this.shareToApp(button.dataset.nativeShare));
        });
      }

      toggleDetails() {
        if (!this.mainDetailsToggle.open) {
          this.elements.successMessage.classList.add('hidden');
          this.elements.successMessage.textContent = '';
          this.elements.closeButton.classList.add('hidden');
          this.elements.shareSummary.focus();
        }
      }

      copyToClipboard() {
        navigator.clipboard.writeText(this.elements.urlInput.value).then(() => {
          this.elements.successMessage.classList.remove('hidden');
          this.elements.successMessage.textContent = window.accessibilityStrings.shareSuccess;
          this.elements.closeButton.classList.remove('hidden');
          this.elements.closeButton.focus();
        });
      }

      async shareToApp(platform) {
        if (navigator.share) {
          await navigator.share({ url: this.urlToShare, title: document.title });
          return;
        }

        await navigator.clipboard.writeText(this.urlToShare);
        window.open(platform === 'tiktok' ? 'https://www.tiktok.com/' : 'https://www.instagram.com/', '_blank', 'noopener');
      }

      updateUrl(url) {
        this.urlToShare = url;
        this.elements.urlInput.value = url;
        const encodedUrl = encodeURIComponent(url);
        const encodedTitle = encodeURIComponent(document.title);
        const shareUrls = {
          facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`,
          x: `https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`,
          pinterest: `https://pinterest.com/pin/create/button/?url=${encodedUrl}&description=${encodedTitle}`,
          email: `mailto:?subject=${encodedTitle}&body=${encodedUrl}`,
        };

        this.querySelectorAll('[data-share-platform]').forEach((link) => {
          link.href = shareUrls[link.dataset.sharePlatform];
        });
      }
    }
  );
}
