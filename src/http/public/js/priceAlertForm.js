document.addEventListener('DOMContentLoaded', function () {
    var form = document.getElementById('price-alert-form');
    if (!form) return;

    var messageEl = document.getElementById('price-alert-form-message');
    var toggleBtn = document.getElementById('price-alert-toggle-btn');
    var deleteBtn = document.getElementById('price-alert-delete-btn');
    var mode = form.getAttribute('data-mode');
    var alertId = form.getAttribute('data-alert-id');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        hideMessage();

        var cardId = form.querySelector('input[name="cardId"]').value;
        var increasePctVal = form.querySelector('input[name="increasePct"]').value;
        var decreasePctVal = form.querySelector('input[name="decreasePct"]').value;

        var increasePct = increasePctVal !== '' ? parseFloat(increasePctVal) : null;
        var decreasePct = decreasePctVal !== '' ? parseFloat(decreasePctVal) : null;

        if (increasePct == null && decreasePct == null) {
            showMessage('At least one threshold (increase or decrease) is required.', 'error');
            return;
        }

        if (mode === 'edit') {
            await updateAlert(alertId, increasePct, decreasePct);
        } else {
            await createAlert(cardId, increasePct, decreasePct);
        }
    });

    if (toggleBtn) {
        toggleBtn.addEventListener('click', async function () {
            hideMessage();
            try {
                var icon = toggleBtn.querySelector('i');
                var isPaused = icon && icon.classList.contains('fa-play');
                var response = await fetch('/api/v1/price-alerts/' + alertId, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isActive: isPaused }),
                });
                var data = await response.json().catch(function () { return null; });

                if (response.ok && data && data.success) {
                    var newState = isPaused ? 'active' : 'paused';
                    showMessage('Alert ' + newState + '.', 'success');
                    updateToggleButton(isPaused);
                    updateStatusBadge(isPaused);
                } else {
                    showMessage((data && data.error) || 'Failed to update alert.', 'error');
                }
            } catch (error) {
                showMessage(error.message || 'Error updating alert.', 'error');
            }
        });
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', async function () {
            hideMessage();
            if (!confirm('Delete this price alert?')) return;

            try {
                var response = await fetch('/api/v1/price-alerts/' + alertId, {
                    method: 'DELETE',
                });
                var data = await response.json().catch(function () { return null; });

                if (response.ok && data && data.success) {
                    showDeletedState();
                } else {
                    showMessage((data && data.error) || 'Failed to delete alert.', 'error');
                }
            } catch (error) {
                showMessage(error.message || 'Error deleting alert.', 'error');
            }
        });
    }

    async function createAlert(cardId, increasePct, decreasePct) {
        var body = { cardId: cardId };
        if (increasePct != null) body.increasePct = increasePct;
        if (decreasePct != null) body.decreasePct = decreasePct;

        try {
            var response = await fetch('/api/v1/price-alerts', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            var data = await response.json().catch(function () { return null; });

            if (response.ok && data && data.success) {
                showSuccessWithLink('Price alert created! ', '/price-alerts', 'View alerts');
                alertId = data.data && data.data.id;
                mode = 'edit';
                form.setAttribute('data-mode', 'edit');
                form.setAttribute('data-alert-id', alertId);
                switchToEditButtons();
                updateStatusBadge(true);
            } else {
                var msg = (data && data.error) || 'Failed to create price alert.';
                showMessage(msg, 'error');
            }
        } catch (error) {
            showMessage(error.message || 'Error creating price alert.', 'error');
        }
    }

    async function updateAlert(id, increasePct, decreasePct) {
        var body = {};
        body.increasePct = increasePct;
        body.decreasePct = decreasePct;

        try {
            var response = await fetch('/api/v1/price-alerts/' + id, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            var data = await response.json().catch(function () { return null; });

            if (response.ok && data && data.success) {
                showMessage('Alert updated.', 'success');
            } else {
                showMessage((data && data.error) || 'Failed to update alert.', 'error');
            }
        } catch (error) {
            showMessage(error.message || 'Error updating alert.', 'error');
        }
    }

    function switchToEditButtons() {
        var submitBtn = form.querySelector('button[type="submit"]');
        if (!submitBtn) return;

        submitBtn.textContent = 'Update Alert';
        submitBtn.classList.remove('w-full');
        submitBtn.classList.add('flex-1');

        var btnContainer = document.createElement('div');
        btnContainer.className = 'flex gap-2';

        submitBtn.parentNode.insertBefore(btnContainer, submitBtn);
        btnContainer.appendChild(submitBtn);

        var newToggleBtn = document.createElement('button');
        newToggleBtn.type = 'button';
        newToggleBtn.id = 'price-alert-toggle-btn';
        newToggleBtn.className = 'btn btn-secondary text-sm py-1.5 px-3';
        newToggleBtn.title = 'Pause alert';
        newToggleBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
        btnContainer.appendChild(newToggleBtn);

        var newDeleteBtn = document.createElement('button');
        newDeleteBtn.type = 'button';
        newDeleteBtn.id = 'price-alert-delete-btn';
        newDeleteBtn.className = 'btn text-sm py-1.5 px-3 text-red-500 hover:text-red-600 border border-red-300 dark:border-red-700 hover:bg-red-50 dark:hover:bg-red-950 rounded';
        newDeleteBtn.title = 'Delete alert';
        newDeleteBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        btnContainer.appendChild(newDeleteBtn);

        toggleBtn = newToggleBtn;
        deleteBtn = newDeleteBtn;
        bindToggle();
        bindDelete();
    }

    function bindToggle() {
        if (!toggleBtn) return;
        toggleBtn.addEventListener('click', async function () {
            hideMessage();
            try {
                var icon = toggleBtn.querySelector('i');
                var isPaused = icon && icon.classList.contains('fa-play');
                var response = await fetch('/api/v1/price-alerts/' + alertId, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isActive: isPaused }),
                });
                var data = await response.json().catch(function () { return null; });

                if (response.ok && data && data.success) {
                    var newState = isPaused ? 'active' : 'paused';
                    showMessage('Alert ' + newState + '.', 'success');
                    updateToggleButton(isPaused);
                    updateStatusBadge(isPaused);
                } else {
                    showMessage((data && data.error) || 'Failed to update alert.', 'error');
                }
            } catch (error) {
                showMessage(error.message || 'Error updating alert.', 'error');
            }
        });
    }

    function bindDelete() {
        if (!deleteBtn) return;
        deleteBtn.addEventListener('click', async function () {
            hideMessage();
            if (!confirm('Delete this price alert?')) return;
            try {
                var response = await fetch('/api/v1/price-alerts/' + alertId, {
                    method: 'DELETE',
                });
                var data = await response.json().catch(function () { return null; });

                if (response.ok && data && data.success) {
                    showDeletedState();
                } else {
                    showMessage((data && data.error) || 'Failed to delete alert.', 'error');
                }
            } catch (error) {
                showMessage(error.message || 'Error deleting alert.', 'error');
            }
        });
    }

    function updateToggleButton(isActive) {
        if (!toggleBtn) return;
        var icon = toggleBtn.querySelector('i');
        if (isActive) {
            icon.classList.remove('fa-play');
            icon.classList.add('fa-pause');
            toggleBtn.title = 'Pause alert';
        } else {
            icon.classList.remove('fa-pause');
            icon.classList.add('fa-play');
            toggleBtn.title = 'Resume alert';
        }
    }

    function updateStatusBadge(isActive) {
        var heading = form.closest('#price-alert-form-section').querySelector('h4');
        if (!heading) return;
        var badge = heading.querySelector('span');
        if (badge) {
            badge.remove();
        }
        var newBadge = document.createElement('span');
        newBadge.className = 'inline-block ml-1.5 px-1.5 py-0.5 text-[0.6rem] font-medium rounded-full';
        if (isActive) {
            newBadge.className += ' bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300';
            newBadge.textContent = 'Active';
        } else {
            newBadge.className += ' bg-gray-100 text-gray-500 dark:bg-midnight-700 dark:text-gray-400';
            newBadge.textContent = 'Paused';
        }
        heading.appendChild(newBadge);
    }

    function showDeletedState() {
        var section = document.getElementById('price-alert-form-section');
        if (!section) return;

        form.remove();
        var heading = section.querySelector('h4');
        if (heading) {
            var badge = heading.querySelector('span');
            if (badge) badge.remove();
        }

        var msg = document.createElement('p');
        msg.className = 'text-sm text-gray-500 dark:text-gray-400 py-2';
        msg.textContent = 'Price alert deleted.';
        section.appendChild(msg);
    }

    function showMessage(text, type) {
        if (!messageEl) return;
        messageEl.classList.remove('hidden', 'text-teal-600', 'dark:text-teal-400', 'text-red-500', 'dark:text-red-400');
        if (type === 'success') {
            messageEl.classList.add('text-teal-600', 'dark:text-teal-400');
        } else {
            messageEl.classList.add('text-red-500', 'dark:text-red-400');
        }
        messageEl.textContent = text;
    }

    function showSuccessWithLink(text, href, linkText) {
        showMessage('', 'success');
        messageEl.textContent = '';
        messageEl.appendChild(document.createTextNode(text));
        var a = document.createElement('a');
        a.href = href;
        a.className = 'underline';
        a.textContent = linkText;
        messageEl.appendChild(a);
    }

    function hideMessage() {
        if (!messageEl) return;
        messageEl.classList.add('hidden');
        messageEl.innerHTML = '';
    }
});
