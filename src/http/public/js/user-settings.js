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
    const messageEl = document.getElementById('response-message');

    document.getElementById('user-update-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());
        const response = await fetch('/user', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        updateMessage(response, messageEl, 'update');
    });

    document.getElementById('password-update-form').addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(event.target);
        const data = Object.fromEntries(formData.entries());
        const response = await fetch('/user/password', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
        });
        updateMessage(response, messageEl, 'update');
    });

    document.getElementById('delete-user-btn').addEventListener('click', async (event) => {
        event.preventDefault();
        const response = await fetch('/user', {
            method: 'DELETE',
        });
        updateMessage(response, messageEl, 'delete');
    });
});
