/**
 * Card image preview - hover on desktop, long-press on mobile.
 *
 * Desktop: mouseover/mouseout on a .card-name-link shows a floating preview
 *          near the link: the card art for links carrying data-card-img, or
 *          the card's rules text for links carrying data-card-text (used by
 *          the deck pages, where a deck entry is a card name, not a printing).
 *
 * Mobile:  Touch-and-hold (500 ms) shows the preview while the finger is
 *          down.  Lifting the finger dismisses the preview and suppresses
 *          the synthetic click so the browser does not navigate.  A normal
 *          (short) tap navigates immediately - no gestures are intercepted.
 */
(function () {
    var preview = null;
    var previewImg = null;
    var previewText = null;
    var activeLink = null;
    var isTouchDevice = false;
    var initialized = false;

    // Long-press state
    var LONG_PRESS_MS = 500;
    var MOVE_THRESHOLD = 10;
    var longPressTimer = null;
    var isLongPress = false;
    var touchStartX = 0;
    var touchStartY = 0;

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
        previewText = document.createElement('div');
        previewText.className = 'card-preview-text';
        preview.appendChild(previewText);
        document.body.appendChild(preview);
    }

    function showPreview(link) {
        if (!preview) return;
        var imgUrl = link.getAttribute('data-card-img');
        var text = link.getAttribute('data-card-text');
        if (imgUrl) {
            previewImg.src = imgUrl;
            previewImg.alt = link.textContent || '';
            previewImg.style.display = '';
            previewText.style.display = 'none';
        } else if (text) {
            previewText.textContent = text;
            previewText.style.display = '';
            previewImg.style.display = 'none';
        } else {
            return;
        }
        activeLink = link;
        preview.style.display = 'block';
        positionPreview(link);
    }

    function hidePreview() {
        if (!preview) return;
        preview.style.display = 'none';
        previewImg.src = '';
        previewText.textContent = '';
        activeLink = null;
    }

    function positionPreview(link) {
        var rect = link.getBoundingClientRect();
        var width = preview.offsetWidth || 256;
        var height = preview.offsetHeight || 357;
        var top;
        if (rect.top >= height + 8) {
            top = rect.top - height - 8;
        } else {
            top = rect.bottom + 8;
        }
        var left = rect.left;
        if (left + width > window.innerWidth) {
            left = window.innerWidth - width - 8;
        }
        if (left < 8) left = 8;
        preview.style.top = top + 'px';
        preview.style.left = left + 'px';
    }

    function closestCardLink(event) {
        var el = event.target;
        if (el && el.nodeType !== 1) el = el.parentElement;
        return el ? el.closest('.card-name-link[data-card-img], .card-name-link[data-card-text]') : null;
    }

    // ── Desktop: hover ──────────────────────────────────────────────

    function handleMouseOver(event) {
        if (isTouchDevice) return;
        var link = closestCardLink(event);
        if (!link) return;
        showPreview(link);
    }

    function handleMouseOut(event) {
        if (isTouchDevice) return;
        var link = closestCardLink(event);
        if (!link) return;
        hidePreview();
    }

    // ── Mobile: long-press ──────────────────────────────────────────

    function cancelLongPress() {
        if (longPressTimer) {
            clearTimeout(longPressTimer);
            longPressTimer = null;
        }
    }

    function handleTouchStart(event) {
        isTouchDevice = true;
        var link = closestCardLink(event);
        if (!link) {
            cancelLongPress();
            return;
        }
        var touch = event.touches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        isLongPress = false;
        cancelLongPress();
        longPressTimer = setTimeout(function () {
            isLongPress = true;
            showPreview(link);
        }, LONG_PRESS_MS);
    }

    function handleTouchMove(event) {
        if (!longPressTimer && !isLongPress) return;
        var touch = event.touches[0];
        var dx = touch.clientX - touchStartX;
        var dy = touch.clientY - touchStartY;
        if (Math.abs(dx) > MOVE_THRESHOLD || Math.abs(dy) > MOVE_THRESHOLD) {
            cancelLongPress();
            if (isLongPress) {
                hidePreview();
                isLongPress = false;
            }
        }
    }

    function handleTouchEnd() {
        cancelLongPress();
        if (isLongPress) {
            hidePreview();
            // isLongPress stays true so the click handler can suppress navigation
        }
    }

    function handleClick(event) {
        if (!isLongPress) return;
        var link = closestCardLink(event);
        if (link) {
            event.preventDefault();
        }
        isLongPress = false;
    }

    function handleContextMenu(event) {
        if (isLongPress || longPressTimer) {
            event.preventDefault();
        }
    }

    // ── Keyboard: focus ─────────────────────────────────────────────

    function handleFocusIn(event) {
        var link = closestCardLink(event);
        if (!link) return;
        showPreview(link);
    }

    function handleFocusOut(event) {
        var link = closestCardLink(event);
        if (!link) return;
        hidePreview();
    }

    // ── Shared ──────────────────────────────────────────────────────

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
        // Desktop
        document.body.addEventListener('mouseover', handleMouseOver);
        document.body.addEventListener('mouseout', handleMouseOut);
        // Keyboard
        document.body.addEventListener('focusin', handleFocusIn);
        document.body.addEventListener('focusout', handleFocusOut);
        // Mobile - all touch listeners are passive (no preventDefault on touch)
        document.body.addEventListener('touchstart', handleTouchStart, { passive: true });
        document.body.addEventListener('touchmove', handleTouchMove, { passive: true });
        document.body.addEventListener('touchend', handleTouchEnd);
        // Suppress navigation and context menu after long-press
        document.body.addEventListener('click', handleClick);
        document.body.addEventListener('contextmenu', handleContextMenu);
        window.addEventListener('scroll', handleScroll, { passive: true });
        initialized = true;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
