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

        // Preserve baseOnly parameter from current URL
        const currentParams = new URLSearchParams(window.location.search);
        if (currentParams.has('baseOnly')) {
            params.set('baseOnly', currentParams.get('baseOnly'));
        }

        const url = form.action + '?' + params.toString();
        console.log('Fetching URL:', url);
        fetch(url)
            .then((response) => response.text())
            .then((html) => {
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const newTable = doc.querySelector('table');
                const newPagination = doc.querySelector('.pagination-container');

                if (newTable) {
                    document.querySelector('table').replaceWith(newTable);
                }
                if (newPagination) {
                    const existingPagination = document.querySelector('.pagination-container');
                    if (existingPagination) {
                        existingPagination.replaceWith(newPagination);
                    }
                }
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
