document.addEventListener('DOMContentLoaded', function () {
    const filterInput = document.getElementById('filter');
    const form = document.getElementById('filter-form');
    const clearBtn = document.getElementById('clear-filter-btn');

    let debounceTimeout;

    function fetchFilteredResults(filter) {
        const params = new URLSearchParams();
        params.set('filter', filter);
        params.set('page', 1);
        params.set('limit', form.querySelector('input[name="limit"]').value);

        // Preserve all parameters from current URL
        const currentParams = new URLSearchParams(window.location.search);

        if (currentParams.has('baseOnly')) {
            params.set('baseOnly', currentParams.get('baseOnly'));
        }
        if (currentParams.has('sort')) {
            params.set('sort', currentParams.get('sort'));
        }
        if (currentParams.has('ascend')) {
            params.set('ascend', currentParams.get('ascend'));
        }

        const url = form.action + '?' + params.toString();
        console.log('Fetching URL:', url);
        fetch(url)
            .then((response) => response.text())
            .then((html) => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');

                // Replace the filter-results container (handles both table and empty state)
                const newResults = doc.querySelector('#filter-results');
                const existingResults = document.querySelector('#filter-results');
                if (newResults && existingResults) {
                    existingResults.replaceWith(newResults);
                }

                // Replace pagination
                const newPagination = doc.querySelector('.pagination-container');
                const existingPagination = document.querySelector('.pagination-container');
                if (newPagination && existingPagination) {
                    existingPagination.replaceWith(newPagination);
                }

                // Update the URL without reloading
                window.history.replaceState({}, '', url);
            })
            .catch((error) => {
                console.error('Error fetching filtered results:', error);
            });
    }

    filterInput.addEventListener('input', function () {
        clearTimeout(debounceTimeout);
        clearBtn.style.display = this.value ? 'inline' : 'none';
        debounceTimeout = setTimeout(() => {
            fetchFilteredResults(this.value);
        }, 300);
    });

    clearBtn.addEventListener('click', function () {
        filterInput.value = '';
        clearBtn.style.display = 'none';
        fetchFilteredResults('');
    });

    form.addEventListener('submit', function (e) {
        e.preventDefault();
    });
});
