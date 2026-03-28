/**
 * @jest-environment jsdom
 */

// jsdom does not implement matchMedia
if (!window.matchMedia) {
    window.matchMedia = function () {
        return { matches: false, addEventListener: function () {}, removeEventListener: function () {} };
    };
}

// appState.js attaches to window.AppState
beforeEach(function () {
    delete window.AppState;
    jest.resetModules();
});

function loadAppState() {
    require('../../src/http/public/js/appState.js');
    return window.AppState;
}

describe('AppState', function () {

    describe('create', function () {
        it('should create a state container with initial state', function () {
            var AppState = loadAppState();
            var store = AppState.create({ page: 1, name: 'test' });
            expect(store.get()).toEqual({ page: 1, name: 'test' });
        });

        it('should return a frozen copy from get()', function () {
            var AppState = loadAppState();
            var store = AppState.create({ page: 1 });
            var state = store.get();
            state.page = 99;
            expect(store.get().page).toBe(1);
        });

        it('should merge partial updates via set()', function () {
            var AppState = loadAppState();
            var store = AppState.create({ page: 1, limit: 9 });
            store.set({ page: 2 });
            expect(store.get()).toEqual({ page: 2, limit: 9 });
        });

        it('should track phase separately from state', function () {
            var AppState = loadAppState();
            var store = AppState.create({ page: 1 });
            expect(store.getPhase()).toBe('idle');
            store.setPhase('loading');
            expect(store.getPhase()).toBe('loading');
        });

        it('should reject invalid phase values', function () {
            var AppState = loadAppState();
            var store = AppState.create({ page: 1 });
            expect(function () {
                store.setPhase('flying');
            }).toThrow();
        });

        it('should accept valid phases: idle, loading, rendering', function () {
            var AppState = loadAppState();
            var store = AppState.create({});
            store.setPhase('loading');
            expect(store.getPhase()).toBe('loading');
            store.setPhase('rendering');
            expect(store.getPhase()).toBe('rendering');
            store.setPhase('idle');
            expect(store.getPhase()).toBe('idle');
        });
    });

    describe('emit and on', function () {
        it('should dispatch and listen for custom events', function () {
            var AppState = loadAppState();
            var received = null;
            AppState.on('test:event', function (e) {
                received = e.detail;
            });
            AppState.emit('test:event', { foo: 'bar' });
            expect(received).toEqual({ foo: 'bar' });
        });

        it('should return a cleanup function from on()', function () {
            var AppState = loadAppState();
            var count = 0;
            var off = AppState.on('test:event', function () {
                count++;
            });
            AppState.emit('test:event', {});
            expect(count).toBe(1);
            off();
            AppState.emit('test:event', {});
            expect(count).toBe(1);
        });
    });

    describe('renderInto', function () {
        it('should swap innerHTML of target element', function () {
            var AppState = loadAppState();
            var el = document.createElement('div');
            document.body.appendChild(el);
            AppState.renderInto(el, '<p>hello</p>');
            expect(el.innerHTML).toBe('<p>hello</p>');
            document.body.removeChild(el);
        });

        it('should pin minHeight during swap to prevent layout shift', function () {
            var AppState = loadAppState();
            var el = document.createElement('div');
            document.body.appendChild(el);
            // Simulate existing content height
            Object.defineProperty(el, 'offsetHeight', { value: 500, configurable: true });
            AppState.renderInto(el, '<p>new</p>');
            expect(el.style.minHeight).toBe('500px');
            document.body.removeChild(el);
        });

        it('should call onSettled callback after double-rAF', function (done) {
            var AppState = loadAppState();
            var el = document.createElement('div');
            document.body.appendChild(el);
            AppState.renderInto(el, '<p>test</p>', {
                onSettled: function () {
                    expect(el.innerHTML).toBe('<p>test</p>');
                    document.body.removeChild(el);
                    done();
                },
            });
        });

        it('should preserve pinned height from options', function () {
            var AppState = loadAppState();
            var el = document.createElement('div');
            document.body.appendChild(el);
            AppState.renderInto(el, '<p>test</p>', { pinnedHeight: 800 });
            expect(el.style.minHeight).toBe('800px');
            document.body.removeChild(el);
        });
    });

    describe('escapeHtml', function () {
        it('should escape HTML special characters', function () {
            var AppState = loadAppState();
            expect(AppState.escapeHtml('<script>"test" & \'val\'</script>')).toBe(
                '&lt;script&gt;&quot;test&quot; &amp; &#039;val&#039;&lt;/script&gt;'
            );
        });

        it('should handle empty string', function () {
            var AppState = loadAppState();
            expect(AppState.escapeHtml('')).toBe('');
        });

        it('should handle null/undefined gracefully', function () {
            var AppState = loadAppState();
            expect(AppState.escapeHtml(null)).toBe('');
            expect(AppState.escapeHtml(undefined)).toBe('');
        });
    });

    describe('toDollar', function () {
        it('should format number as USD currency', function () {
            var AppState = loadAppState();
            expect(AppState.toDollar(10.5)).toBe('$10.50');
        });

        it('should handle zero', function () {
            var AppState = loadAppState();
            expect(AppState.toDollar(0)).toBe('$0.00');
        });

        it('should handle null/undefined', function () {
            var AppState = loadAppState();
            expect(AppState.toDollar(null)).toBe('$0.00');
            expect(AppState.toDollar(undefined)).toBe('$0.00');
        });
    });

    describe('announce', function () {
        it('should update aria-live-announcer element', function (done) {
            var AppState = loadAppState();
            var el = document.createElement('div');
            el.id = 'aria-live-announcer';
            document.body.appendChild(el);
            AppState.announce('Page 2 of 5');
            // announce uses setTimeout for screen reader compatibility
            setTimeout(function () {
                expect(el.textContent).toBe('Page 2 of 5');
                document.body.removeChild(el);
                done();
            }, 150);
        });

        it('should not throw when announcer element is missing', function () {
            var AppState = loadAppState();
            expect(function () {
                AppState.announce('test');
            }).not.toThrow();
        });
    });
});
