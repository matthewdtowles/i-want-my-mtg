document.addEventListener('DOMContentLoaded', () => {
    const toggle = document.getElementById('theme-toggle');
    if (!toggle) return;

    const sunIcon = document.getElementById('theme-icon-sun');
    const moonIcon = document.getElementById('theme-icon-moon');

    function updateIcons() {
        const isDark = document.documentElement.classList.contains('dark');
        if (sunIcon && moonIcon) {
            sunIcon.classList.toggle('hidden', !isDark);
            moonIcon.classList.toggle('hidden', isDark);
        }
    }

    toggle.addEventListener('click', () => {
        document.documentElement.classList.toggle('dark');
        const isDark = document.documentElement.classList.contains('dark');
        localStorage.setItem('theme', isDark ? 'dark' : 'light');
        updateIcons();
    });

    updateIcons();
});
