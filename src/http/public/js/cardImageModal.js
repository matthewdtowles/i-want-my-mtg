/**
 * Card image modal - fullscreen overlay showing a large card image.
 *
 * Triggered by clicking/tapping any `.card-image-wrapper` element.
 * Derives the Scryfall LARGE URL from the existing NORMAL/SMALL URL.
 * Closes on backdrop click, close button, or Escape key.
 */
(function () {
    var modal = null;
    var modalImg = null;
    var closeBtn = null;
    var previousFocus = null;
    var initialized = false;

    function createModal() {
        modal = document.createElement('div');
        modal.className = 'card-modal-overlay';
        modal.setAttribute('role', 'dialog');
        modal.setAttribute('aria-modal', 'true');
        modal.setAttribute('aria-label', 'Enlarged card image');
        modal.setAttribute('aria-hidden', 'true');

        closeBtn = document.createElement('button');
        closeBtn.className = 'card-modal-close';
        closeBtn.setAttribute('aria-label', 'Close');
        closeBtn.textContent = '\u00d7';
        closeBtn.addEventListener('click', close);

        modalImg = document.createElement('img');
        modalImg.className = 'card-modal-img';

        modal.appendChild(closeBtn);
        modal.appendChild(modalImg);
        document.body.appendChild(modal);

        modal.addEventListener('click', function (e) {
            if (e.target === modal) close();
        });
    }

    function toLargeUrl(url) {
        return url.replace('/normal/', '/large/').replace('/small/', '/large/');
    }

    function trapFocus(e) {
        if (e.key !== 'Tab') return;
        // Only two focusable elements: closeBtn and modalImg (if it had tabindex)
        // Keep focus on close button since it's the only interactive element
        e.preventDefault();
        closeBtn.focus();
    }

    function open(imgSrc, alt) {
        if (!modal) return;
        previousFocus = document.activeElement;
        modalImg.src = toLargeUrl(imgSrc);
        modalImg.alt = alt || '';
        modal.classList.add('active');
        modal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
        closeBtn.focus();
    }

    function close() {
        if (!modal) return;
        modal.classList.remove('active');
        modal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
        if (previousFocus && typeof previousFocus.focus === 'function') {
            previousFocus.focus();
        }
        previousFocus = null;
        // Clear src after transition completes to avoid flash on next open
        setTimeout(function () {
            if (!modal.classList.contains('active')) {
                modalImg.src = '';
            }
        }, 300);
    }

    function openFromWrapper(wrapper) {
        var img = wrapper.querySelector('.card-image');
        if (!img) return;
        open(img.src, img.alt);
    }

    function init() {
        if (initialized) return;
        createModal();

        document.addEventListener('keydown', function (e) {
            if (!modal.classList.contains('active')) return;
            if (e.key === 'Escape') {
                close();
            } else {
                trapFocus(e);
            }
        });

        document.addEventListener('click', function (e) {
            var target = e.target;
            if (!(target instanceof Element)) return;
            var wrapper = target.closest('.card-image-wrapper');
            if (!wrapper) return;
            e.preventDefault();
            openFromWrapper(wrapper);
        });

        document.addEventListener('keydown', function (e) {
            if (modal.classList.contains('active')) return;
            if (e.key !== 'Enter' && e.key !== ' ') return;
            var target = e.target;
            if (!(target instanceof Element)) return;
            var wrapper = target.closest('.card-image-wrapper');
            if (!wrapper) return;
            e.preventDefault();
            openFromWrapper(wrapper);
        });

        initialized = true;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
