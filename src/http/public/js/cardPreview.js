(function () {
    var preview = null;
    var previewImg = null;
    var activeLink = null;
    var tappedLink = null;
    var tapTimer = null;
    var isTouchDevice = false;
    var initialized = false;

    var TAP_TIMEOUT_MS = 3000;

    function createPreview() {
        preview = document.createElement('div');
        preview.className = 'card-preview-container';
        preview.setAttribute('aria-hidden', 'true');
        previewImg = document.createElement('img');
        previewImg.className = 'card-preview-img';
        previewImg.setAttribute('loading', 'lazy');
        previewImg.width = 256;
        previewImg.height = 357;
        preview.appendChild(previewImg);
        document.body.appendChild(preview);
    }

    function showPreview(link) {
        var imgUrl = link.getAttribute('data-card-img');
        if (!imgUrl || !preview) return;
        activeLink = link;
        previewImg.src = imgUrl;
        previewImg.alt = link.textContent || '';
        preview.style.display = 'block';
        positionPreview(link);
    }

    function hidePreview() {
        if (!preview) return;
        preview.style.display = 'none';
        previewImg.src = '';
        activeLink = null;
    }

    function positionPreview(link) {
        var rect = link.getBoundingClientRect();
        var imgWidth = 256;
        var imgHeight = 357;
        var top;
        if (rect.top >= imgHeight + 8) {
            top = rect.top - imgHeight - 8;
        } else {
            top = rect.bottom + 8;
        }
        var left = rect.left;
        if (left + imgWidth > window.innerWidth) {
            left = window.innerWidth - imgWidth - 8;
        }
        if (left < 8) left = 8;
        preview.style.top = top + 'px';
        preview.style.left = left + 'px';
    }

    function clearTapState() {
        tappedLink = null;
        if (tapTimer) {
            clearTimeout(tapTimer);
            tapTimer = null;
        }
    }

    function handleMouseOver(event) {
        if (isTouchDevice) return;
        var link = event.target.closest('.card-name-link[data-card-img]');
        if (!link) return;
        showPreview(link);
    }

    function handleMouseOut(event) {
        if (isTouchDevice) return;
        var link = event.target.closest('.card-name-link[data-card-img]');
        if (!link) return;
        hidePreview();
    }

    function handleTouchStart(event) {
        isTouchDevice = true;
        var link = event.target.closest('.card-name-link[data-card-img]');
        if (!link) {
            hidePreview();
            clearTapState();
            return;
        }
        if (tappedLink === link) {
            // Second tap — allow navigation
            hidePreview();
            clearTapState();
            return;
        }
        // First tap — show preview, prevent navigation
        event.preventDefault();
        hidePreview();
        tappedLink = link;
        showPreview(link);
        if (tapTimer) clearTimeout(tapTimer);
        tapTimer = setTimeout(function () {
            clearTapState();
            hidePreview();
        }, TAP_TIMEOUT_MS);
    }

    function handleScroll() {
        if (activeLink) {
            positionPreview(activeLink);
        }
    }

    function init() {
        if (initialized) return;
        var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        createPreview();
        if (prefersReducedMotion) {
            preview.style.transition = 'none';
        }
        document.body.addEventListener('mouseover', handleMouseOver);
        document.body.addEventListener('mouseout', handleMouseOut);
        document.body.addEventListener('touchstart', handleTouchStart, { passive: false });
        window.addEventListener('scroll', handleScroll, { passive: true });
        initialized = true;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
