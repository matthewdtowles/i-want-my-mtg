/**
 * Public deck building: the build/import form is reachable without auth, but
 * saving needs an account. When an anonymous user submits, stash their list in
 * localStorage and send them to login/signup (returnUrl brings them back). On
 * return - now authenticated - repopulate the fields and auto-save. The stash
 * survives a login or signup round-trip, so their work is never lost.
 */
(function () {
    var STORAGE_KEY = 'pendingDeckImport';
    var RETURN_URL = '/decks/import';

    document.addEventListener('DOMContentLoaded', function () {
        var form = document.getElementById('deck-import-form');
        if (!form) return;

        var authenticated = form.getAttribute('data-authenticated') === 'true';
        var nameInput = document.getElementById('deck-name');
        var formatInput = document.getElementById('deck-format');
        var textInput = document.getElementById('deck-text');

        var stored = readStored();

        if (stored) {
            // Bring back whatever they typed before being sent to login.
            if (nameInput && stored.name) nameInput.value = stored.name;
            if (formatInput && stored.format) formatInput.value = stored.format;
            if (textInput && stored.text) textInput.value = stored.text;

            // If they came back logged in, finish the save automatically.
            if (authenticated) {
                clearStored();
                form.submit();
                return;
            }
        }

        if (!authenticated) {
            form.addEventListener('submit', function (e) {
                e.preventDefault();
                writeStored({
                    name: nameInput ? nameInput.value : '',
                    format: formatInput ? formatInput.value : '',
                    text: textInput ? textInput.value : '',
                });
                window.location.href =
                    '/auth/login?returnUrl=' + encodeURIComponent(RETURN_URL);
            });
        }
    });

    function readStored() {
        try {
            var raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch (e) {
            return null;
        }
    }

    function writeStored(payload) {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
        } catch (e) {
            /* storage unavailable - fall through, the POST will just 401 */
        }
    }

    function clearStored() {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (e) {
            /* ignore */
        }
    }
})();
