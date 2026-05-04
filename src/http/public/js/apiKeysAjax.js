(function () {
    var listEl = document.getElementById('api-key-list');
    var createSection = document.getElementById('api-key-create-section');
    var createForm = document.getElementById('api-key-create-form');
    var nameInput = document.getElementById('api-key-name');
    var justCreatedBox = document.getElementById('api-key-just-created');
    var justCreatedValue = document.getElementById('api-key-just-created-value');
    var copyBtn = document.getElementById('api-key-copy-btn');
    var usageEl = document.getElementById('api-key-usage');

    function escapeHtml(s) {
        return String(s == null ? '' : s)
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
    }

    function fmtDate(iso) {
        if (!iso) return '—';
        var d = new Date(iso);
        return d.toLocaleString();
    }

    function loadUsage() {
        fetch('/api/v1/api-keys/usage', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (body) {
                if (!body.success) {
                    usageEl.querySelector('div').textContent = body.error || 'Failed to load usage';
                    return;
                }
                var d = body.data;
                var pct = d.perDayLimit ? Math.min(100, Math.round((d.todayCount / d.perDayLimit) * 100)) : 0;
                var bars = (d.history || []).map(function (h) {
                    var hPct = d.perDayLimit ? Math.min(100, Math.round((h.count / d.perDayLimit) * 100)) : 0;
                    return '<div title="' + escapeHtml(h.day) + ': ' + h.count + '" '
                        + 'class="inline-block align-bottom bg-teal-500 mr-px" '
                        + 'style="width:8px;height:' + Math.max(2, hPct * 0.6) + 'px"></div>';
                }).join('');
                usageEl.innerHTML = '<h3 class="page-subtitle">Today\'s Usage</h3>'
                    + '<div class="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">'
                    + '<div><div class="text-xs text-gray-500">Tier</div>'
                    + '<div class="text-xl font-semibold capitalize">' + escapeHtml(d.tier) + '</div></div>'
                    + '<div><div class="text-xs text-gray-500">Today</div>'
                    + '<div class="text-xl font-semibold">' + d.todayCount + ' / ' + d.perDayLimit
                    + '</div><div class="text-xs text-gray-500">' + d.remainingToday + ' remaining</div></div>'
                    + '<div><div class="text-xs text-gray-500">Burst</div>'
                    + '<div class="text-xl font-semibold">' + d.perMinuteLimit + '/min</div></div>'
                    + '</div>'
                    + '<div class="mt-4"><div class="text-xs text-gray-500 mb-1">Last 30 days</div>'
                    + '<div class="flex items-end h-16">' + (bars || '<span class="text-xs text-gray-500">No requests yet</span>') + '</div></div>';
                if (pct >= 80) {
                    usageEl.insertAdjacentHTML('beforeend',
                        '<p class="mt-3 text-sm text-amber-700 dark:text-amber-400">You\'ve used ' + pct
                        + '% of today\'s quota. <a class="text-link" href="/developer/pricing">Upgrade for more.</a></p>');
                }
            })
            .catch(function () {
                usageEl.querySelector('div').textContent = 'Failed to load usage';
            });
    }

    function renderKeys(keys) {
        var hasActive = keys.some(function (k) { return !k.revokedAt; });
        if (!keys.length) {
            listEl.innerHTML = '<p class="text-sm text-gray-500 dark:text-gray-400">'
                + 'You don\'t have any API keys yet.</p>';
        } else {
            var rows = keys.map(function (k) {
                var status = k.revokedAt
                    ? '<span class="text-xs text-gray-500">Revoked ' + fmtDate(k.revokedAt) + '</span>'
                    : '<button class="btn btn-danger btn-sm" data-revoke-id="' + k.id + '">Revoke</button>';
                return '<tr>'
                    + '<td class="py-2 pr-4 font-medium">' + escapeHtml(k.name) + '</td>'
                    + '<td class="py-2 pr-4"><code class="text-xs">' + escapeHtml(k.keyPrefix) + '…</code></td>'
                    + '<td class="py-2 pr-4 text-xs text-gray-500">' + fmtDate(k.lastUsedAt) + '</td>'
                    + '<td class="py-2 pr-4 text-xs text-gray-500">' + fmtDate(k.createdAt) + '</td>'
                    + '<td class="py-2 text-right">' + status + '</td>'
                    + '</tr>';
            }).join('');
            listEl.innerHTML = '<table class="w-full text-sm"><thead>'
                + '<tr class="text-left text-xs text-gray-500 uppercase">'
                + '<th class="py-2 pr-4">Name</th>'
                + '<th class="py-2 pr-4">Prefix</th>'
                + '<th class="py-2 pr-4">Last used</th>'
                + '<th class="py-2 pr-4">Created</th>'
                + '<th></th>'
                + '</tr></thead><tbody>' + rows + '</tbody></table>';
        }
        createSection.classList.toggle('hidden', hasActive);
    }

    function loadKeys() {
        return fetch('/api/v1/api-keys', { credentials: 'same-origin' })
            .then(function (r) { return r.json(); })
            .then(function (body) {
                if (!body.success) {
                    listEl.innerHTML = '<p class="text-sm text-red-600">'
                        + escapeHtml(body.error || 'Failed to load keys') + '</p>';
                    return;
                }
                renderKeys(body.data || []);
            });
    }

    function showCreatedKey(rawKey) {
        justCreatedValue.textContent = rawKey;
        justCreatedBox.classList.remove('hidden');
    }

    createForm.addEventListener('submit', function (e) {
        e.preventDefault();
        var name = nameInput.value.trim();
        if (!name) return;
        fetch('/api/v1/api-keys', {
            method: 'POST',
            credentials: 'same-origin',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: name }),
        })
            .then(function (r) { return r.json().then(function (b) { return { status: r.status, body: b }; }); })
            .then(function (res) {
                if (!res.body.success) {
                    if (window.showToast) window.showToast(res.body.error || 'Failed to create key', 'error');
                    return;
                }
                showCreatedKey(res.body.data.rawKey);
                nameInput.value = '';
                return loadKeys();
            })
            .catch(function () {
                if (window.showToast) window.showToast('Failed to create key', 'error');
            });
    });

    listEl.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-revoke-id]');
        if (!btn) return;
        if (!confirm('Revoke this API key? Any clients using it will stop working immediately.')) return;
        var id = btn.getAttribute('data-revoke-id');
        fetch('/api/v1/api-keys/' + encodeURIComponent(id), {
            method: 'DELETE',
            credentials: 'same-origin',
        })
            .then(function (r) {
                if (r.status !== 204) {
                    if (window.showToast) window.showToast('Failed to revoke key', 'error');
                    return;
                }
                justCreatedBox.classList.add('hidden');
                return loadKeys();
            });
    });

    if (copyBtn) {
        copyBtn.addEventListener('click', function () {
            var v = justCreatedValue.textContent;
            if (!v) return;
            navigator.clipboard.writeText(v).then(function () {
                copyBtn.textContent = 'Copied';
                setTimeout(function () { copyBtn.textContent = 'Copy'; }, 1500);
            });
        });
    }

    loadKeys();
    loadUsage();
})();
