(function () {
    'use strict';

    var VALID_PHASES = ['idle', 'loading', 'rendering'];

    var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

    function create(initialState) {
        var state = {};
        var phase = 'idle';

        for (var key in initialState) {
            if (initialState.hasOwnProperty(key)) {
                state[key] = initialState[key];
            }
        }

        return {
            get: function () {
                var copy = {};
                for (var k in state) {
                    if (state.hasOwnProperty(k)) {
                        copy[k] = state[k];
                    }
                }
                return Object.freeze(copy);
            },

            set: function (patch) {
                for (var k in patch) {
                    if (patch.hasOwnProperty(k)) {
                        state[k] = patch[k];
                    }
                }
            },

            getPhase: function () {
                return phase;
            },

            setPhase: function (newPhase) {
                if (VALID_PHASES.indexOf(newPhase) === -1) {
                    throw new Error(
                        'Invalid phase: ' +
                            newPhase +
                            '. Must be one of: ' +
                            VALID_PHASES.join(', ')
                    );
                }
                phase = newPhase;
            },
        };
    }

    function emit(eventName, detail) {
        document.dispatchEvent(new CustomEvent(eventName, { detail: detail }));
    }

    function on(eventName, handler) {
        document.addEventListener(eventName, handler);
        return function () {
            document.removeEventListener(eventName, handler);
        };
    }

    function renderInto(el, html, options) {
        options = options || {};
        var height = options.pinnedHeight || el.offsetHeight;
        if (height > 0) {
            el.style.minHeight = height + 'px';
        }

        el.innerHTML = html;

        if (options.onSettled) {
            requestAnimationFrame(function () {
                requestAnimationFrame(function () {
                    options.onSettled();
                });
            });
        }
    }

    function escapeHtml(str) {
        if (str == null) return '';
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    function toDollar(val) {
        var num = parseFloat(val) || 0;
        return '$' + num.toFixed(2);
    }

    function smoothScroll(el, block) {
        el.scrollIntoView({
            behavior: prefersReducedMotion.matches ? 'auto' : 'smooth',
            block: block || 'start',
        });
    }

    function announce(message) {
        var el = document.getElementById('aria-live-announcer');
        if (!el) return;
        el.textContent = '';
        setTimeout(function () {
            el.textContent = message;
        }, 100);
    }

    window.AppState = {
        create: create,
        emit: emit,
        on: on,
        renderInto: renderInto,
        escapeHtml: escapeHtml,
        toDollar: toDollar,
        smoothScroll: smoothScroll,
        announce: announce,
    };
})();
