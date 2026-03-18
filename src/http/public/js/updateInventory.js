document.addEventListener('DOMContentLoaded', function () {
    // Use event delegation for quantity forms
    document.body.addEventListener('click', async function (event) {
        const incrementButton = event.target.closest('.increment-quantity');
        const decrementButton = event.target.closest('.decrement-quantity');
        if (incrementButton) {
            event.stopImmediatePropagation();
            const form = incrementButton.closest('.quantity-form');
            const quantityOwned = form.querySelector("input[name='quantity-owned']");
            const cardId = form.querySelector("input[name='cardId']").value;
            const isFoil = form.querySelector("input[name='isFoil']").value === 'true';
            console.log(`Incrementing quantity from ${quantityOwned.value} for card ${cardId}`);
            const updatedQuantity = await addInventoryItem(quantityOwned.value, cardId, isFoil);
            quantityOwned.value = updatedQuantity;
            showTransactionPrompt('BUY', isFoil);
        }
        if (decrementButton) {
            event.stopImmediatePropagation();
            const form = decrementButton.closest('.quantity-form');
            const quantityOwned = form.querySelector("input[name='quantity-owned']");
            const cardId = form.querySelector("input[name='cardId']").value;
            const isFoil = form.querySelector("input[name='isFoil']").value === 'true';
            console.log(`Decrementing quantity from ${quantityOwned.value} for card ${cardId}`);
            const updatedQuantity = await removeInventoryItem(quantityOwned.value, cardId, isFoil);
            quantityOwned.value = updatedQuantity;
            showTransactionPrompt('SELL', isFoil);
        }
    });

    // Use event delegation for delete buttons
    document.body.addEventListener('click', async function (event) {
        const deleteButton = event.target.closest('.delete-inventory-button');
        if (deleteButton) {
            event.stopImmediatePropagation();
            const form = deleteButton.closest('.delete-inventory-form');
            const cardId = form.querySelector("input[name='card-id']").value;
            const isFoil = form.querySelector("input[name='isFoil']").value === 'true';
            console.log(`Deleting card ${cardId} from inventory`);
            try {
                await deleteInventoryItem(cardId, isFoil);
                const tableRow = form.closest('tr');
                if (tableRow) {
                    tableRow.remove();
                    console.log(`Card ${cardId} successfully deleted from inventory`);
                } else {
                    console.warn(`Could not find table row for card ${cardId}`);
                }
            } catch (error) {
                console.error(`Error deleting card ${cardId}:`, error.message);
                if (typeof window.showToast === 'function')
                    window.showToast(error.message, 'error');
            }
        }
    });

    async function addInventoryItem(quantity, cardId, isFoil) {
        try {
            const qtyInt = parseInt(quantity);
            const method = qtyInt === 0 ? 'POST' : 'PATCH';
            const updatedInventory = await updateInventory(qtyInt + 1, cardId, isFoil, method);
            return updatedInventory ? updatedInventory.quantity : quantity;
        } catch (error) {
            console.error(`Error in addInventoryItem => ${error}`);
            if (typeof window.showToast === 'function') window.showToast(error.message, 'error');
            return quantity;
        }
    }

    async function removeInventoryItem(quantity, cardId, isFoil) {
        try {
            const currentQty = parseInt(quantity);
            if (isNaN(currentQty) || currentQty <= 0) {
                return '0';
            }
            const qtyInt = currentQty - 1;
            console.log(`Updating quantity to ${qtyInt} for card ${cardId}`);
            if (qtyInt === 0) {
                await deleteInventoryItem(cardId, isFoil);
                return '0';
            } else {
                const updatedInventory = await updateInventory(qtyInt, cardId, isFoil, 'PATCH');
                console.log('Response from update:', updatedInventory);
                if (updatedInventory && typeof updatedInventory.quantity !== 'undefined') {
                    return updatedInventory.quantity.toString();
                } else {
                    return qtyInt.toString();
                }
            }
        } catch (error) {
            console.error(`Error in removeInventoryItem => ${error}`);
            if (typeof window.showToast === 'function') window.showToast(error.message, 'error');
            return quantity;
        }
    }

    async function deleteInventoryItem(cardId, isFoil) {
        const response = await fetch('/inventory', {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                cardId: cardId,
                isFoil: isFoil,
            }),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const data = await response.json();
        console.log(`Response from deleteInventory:`, data);
        if (!data.success) {
            throw new Error(data.error || 'Unknown error');
        }
        return data;
    }

    function showTransactionPrompt(type, isFoil) {
        var txForm = document.getElementById('transaction-form');
        if (!txForm) return;
        var typeSelect = txForm.querySelector('select[name="type"]');
        if (typeSelect) typeSelect.value = type;
        var foilSelect = txForm.querySelector('select[name="isFoil"]');
        if (foilSelect) foilSelect.value = String(isFoil);
        // Update price based on foil selection
        var priceInput = txForm.querySelector('input[name="pricePerUnit"]');
        if (priceInput) {
            var price = isFoil ? priceInput.dataset.foilPrice : priceInput.dataset.normalPrice;
            if (price) priceInput.value = price;
        }
        var section = document.getElementById('transaction-form-section');
        if (section) {
            section.classList.add(
                'ring-2',
                'ring-teal-400',
                'dark:ring-teal-500',
                'rounded-lg',
                'p-2'
            );
            AjaxUtils.smoothScroll(section, 'nearest');
            setTimeout(function () {
                section.classList.remove(
                    'ring-2',
                    'ring-teal-400',
                    'dark:ring-teal-500',
                    'rounded-lg',
                    'p-2'
                );
            }, 3000);
        }
    }

    async function updateInventory(quantity, cardId, isFoil, method) {
        const response = await fetch('/inventory', {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([
                {
                    cardId: cardId,
                    isFoil: isFoil,
                    quantity: quantity,
                },
            ]),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const responseData = await response.json();
        console.log('Response data:', responseData);
        if (responseData.success && responseData.data && responseData.data.length > 0) {
            return responseData.data[0];
        }
        return null;
    }
});
