document.addEventListener("DOMContentLoaded", function () {
    const toggleBtn = document.getElementById("toggle-price-mode");
    const root = document.body;
    let showingFoil = false;

    function updateDisplay() {
        root.classList.toggle("foil-mode", showingFoil);
        toggleBtn.textContent = showingFoil ? "Normal" : "Foil";
    }

    if (toggleBtn) {
        toggleBtn.addEventListener("click", function () {
            showingFoil = !showingFoil;
            updateDisplay();
        });
        updateDisplay();
    }
});