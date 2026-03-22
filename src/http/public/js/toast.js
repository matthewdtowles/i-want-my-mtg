(function () {
    'use strict';

    var statusDurations = {
        error: 10000,
        warning: 7000,
        info: 5000,
        success: 5000,
    };

    var statusIcons = {
        success:
            '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" /></svg>',
        error: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
        warning:
            '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>',
        info: '<svg fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
    };

    var dismissTimer = null;

    function getMessageEl() {
        return document.getElementById('response-message');
    }

    function dismissToast() {
        var message = getMessageEl();
        if (!message) return;
        clearTimeout(dismissTimer);
        message.classList.remove('toast-enter');
        message.classList.add('toast-exit');
        message.addEventListener(
            'animationend',
            function () {
                message.classList.add('hidden');
                message.classList.remove('toast-exit');
            },
            { once: true }
        );
    }

    function showToast(text, status) {
        var message = getMessageEl();
        if (!message) return;

        status = status || 'info';
        var duration = statusDurations[status] || 5000;

        // Swap bg- class
        var classes = message.className.split(' ');
        for (var i = classes.length - 1; i >= 0; i--) {
            if (classes[i].indexOf('bg-') === 0) {
                classes.splice(i, 1);
            }
        }
        classes.push('bg-' + status);
        message.className = classes.join(' ');

        // Update text
        var toastText = message.querySelector('.toast-text');
        if (toastText) toastText.textContent = text;

        // Update icon
        var toastIcon = message.querySelector('.toast-icon');
        if (toastIcon && statusIcons[status]) {
            toastIcon.innerHTML = statusIcons[status];
        }

        // Show with animation
        message.style.setProperty('--toast-duration', duration + 'ms');
        message.classList.remove('hidden', 'toast-exit');
        message.classList.add('toast-enter');
        clearTimeout(dismissTimer);
        dismissTimer = setTimeout(dismissToast, duration);
    }

    window.showToast = showToast;
    window.dismissToast = dismissToast;
})();
