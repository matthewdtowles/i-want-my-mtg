async function updateMessage(response, messageEl, method) {
    messageEl.classList.remove('bg-info', 'bg-success', 'bg-error');

    const result = await response.json().catch(() => null);

    if (result && result.success === false) {
        messageEl.textContent = result.error || result.message || `Failed to ${method} user.`;
        messageEl.classList.add('bg-error');
    } else if (result && result.success) {
        messageEl.textContent = result.message || `User ${method}d successfully.`;
        messageEl.classList.add('bg-success');
    } else if (!response.ok) {
        messageEl.textContent = result?.error || result?.message || `Failed to ${method} user.`;
        messageEl.classList.add('bg-error');
    } else {
        messageEl.textContent = result?.message || `User ${method}d successfully.`;
        messageEl.classList.add('bg-info');
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const FV = window.FormValidator;
    const messageEl = document.getElementById('response-message');
    if (!FV || !messageEl) return;

    const nameEl = document.getElementById('user-name');
    const emailEl = document.getElementById('user-email');
    const passwordEl = document.getElementById('new-password');

    const userUpdateForm = document.getElementById('user-update-form');
    if (userUpdateForm && nameEl && emailEl) {
        userUpdateForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            let valid = true;
            if (!FV.validateField(nameEl, FV.validateUsername)) valid = false;
            if (!FV.validateField(emailEl, FV.validateEmail)) valid = false;
            if (!valid) return;

            const formData = new FormData(event.target);
            const data = Object.fromEntries(formData.entries());
            const response = await fetch('/user', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            updateMessage(response, messageEl, 'update');
        });
    }

    const passwordUpdateForm = document.getElementById('password-update-form');
    if (passwordUpdateForm && passwordEl) {
        passwordUpdateForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            if (!FV.validateField(passwordEl, FV.validatePassword)) return;

            const formData = new FormData(event.target);
            const data = Object.fromEntries(formData.entries());
            const response = await fetch('/user/password', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });
            updateMessage(response, messageEl, 'update');
        });
    }

    const setTypeForm = document.getElementById('set-type-pref-form');
    const setTypeUseDefault = document.getElementById('set-type-use-default');
    const setTypeOptions = document.getElementById('set-type-options');
    if (setTypeForm && setTypeUseDefault && setTypeOptions) {
        const updateDisabledState = () => {
            const useDefault = setTypeUseDefault.checked;
            setTypeOptions.disabled = useDefault;
            setTypeOptions.classList.toggle('opacity-60', useDefault);
        };
        setTypeUseDefault.addEventListener('change', updateDisabledState);
        setTypeForm.addEventListener('submit', async (event) => {
            event.preventDefault();
            let body;
            if (setTypeUseDefault.checked) {
                body = JSON.stringify({ types: null });
            } else {
                const checkboxes = setTypeOptions.querySelectorAll(
                    'input.set-type-checkbox:checked'
                );
                const types = Array.from(checkboxes).map((cb) => cb.value);
                body = JSON.stringify({ types });
            }
            const response = await fetch('/api/v1/user/preferences/set-types', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body,
            });
            updateMessage(response, messageEl, 'update');
        });
    }

    const deleteUserBtn = document.getElementById('delete-user-btn');
    if (deleteUserBtn) {
        deleteUserBtn.addEventListener('click', async (event) => {
            event.preventDefault();
            const response = await fetch('/user', {
                method: 'DELETE',
            });
            updateMessage(response, messageEl, 'delete');
        });
    }

    if (nameEl) FV.attachBlurValidation(nameEl, FV.validateUsername);
    if (emailEl) FV.attachBlurValidation(emailEl, FV.validateEmail);
    if (passwordEl) FV.attachBlurValidation(passwordEl, FV.validatePassword);
});
