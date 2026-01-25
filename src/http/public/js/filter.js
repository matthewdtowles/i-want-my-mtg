document.addEventListener("DOMContentLoaded", function () {
    const filterInput = document.getElementById("filter");
    const form = document.getElementById("filter-form");
    const clearBtn = document.getElementById("clear-filter-btn");

    let debounceTimeout;

    function fetchFilteredSets(filter) {
        const params = new URLSearchParams();
        params.set("filter", filter);
        params.set("page", 1);
        params.set("limit", form.querySelector("input[name=\"limit\"]").value);
        url = form.action + "?" + params.toString();
        console.log("Fetching URL:", url);
        fetch(url)
            .then(response => response.text())
            .then(html => {
                // Replace the table and pagination with the new HTML
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, "text/html");
                const newTable = doc.querySelector("table");
                const newPagination = doc.querySelector(".pagination-container");
                document.querySelector("table").replaceWith(newTable);
                document.querySelector(".pagination-container").replaceWith(newPagination);

                // Re-initialize card hover functionality if it exists
                if (window.initCardHover && typeof window.initCardHover === 'function') {
                    window.initCardHover();
                }
            });
    }

    filterInput.addEventListener("input", function () {
        clearTimeout(debounceTimeout);
        clearBtn.style.display = this.value ? "inline" : "none";
        debounceTimeout = setTimeout(() => {
            fetchFilteredSets(this.value);
        }, 300);
    });

    clearBtn.addEventListener("click", function () {
        filterInput.value = "";
        clearBtn.style.display = "none";
        fetchFilteredSets("");
    });

    form.addEventListener("submit", function (e) {
        e.preventDefault();
    });
});