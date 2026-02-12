async function updateMessage(response, messageEl, method) {
    messageEl.classList.remove('bg-info', 'bg-success', 'bg-error');

    if (response.ok) {
        const result = await response.json();
        const className = result.status ? `bg-${result.status}` : 'bg-info';
        messageEl.textContent = result.message;
        messageEl.classList.add(className);
    } else {
        messageEl.textContent = `Failed to ${method} user`;
        messageEl.classList.add('bg-error');
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
