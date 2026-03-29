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

    // Event delegation for new stepper controls
    var busySteppers = {};
    document.body.addEventListener('click', async function (event) {
        const incBtn = event.target.closest('.inv-stepper-btn--inc');
        const decBtn = event.target.closest('.inv-stepper-btn--dec');
        const btn = incBtn || decBtn;
        if (!btn) return;
        if (btn.hasAttribute('disabled')) return;

        event.stopImmediatePropagation();
        const stepper = btn.closest('.inv-stepper');
        const cardId = stepper.getAttribute('data-card-id');
        const isFoil = stepper.getAttribute('data-foil') === 'true';
        const busyKey = cardId + ':' + isFoil;

        // Prevent concurrent requests for the same card+variant
        if (busySteppers[busyKey]) return;
        busySteppers[busyKey] = true;

        const qtyEl = stepper.querySelector('.inv-stepper-qty');
        const currentQty = parseInt(qtyEl.textContent) || 0;

        try {
            let newQty;
            if (incBtn) {
                newQty = await addInventoryItem(currentQty.toString(), cardId, isFoil);
            } else {
                newQty = await removeInventoryItem(currentQty.toString(), cardId, isFoil);
            }

            const qty = parseInt(newQty) || 0;

            // Update ALL steppers for this card+variant across the page
            var allSteppers = document.querySelectorAll(
                '.inv-stepper[data-card-id="' + cardId + '"][data-foil="' + isFoil + '"]'
            );
            for (var i = 0; i < allSteppers.length; i++) {
                var el = allSteppers[i].querySelector('.inv-stepper-qty');
                if (el) {
                    el.textContent = qty;
                    el.classList.toggle('inv-stepper-qty--zero', qty === 0);
                    // Pop animation
                    el.classList.remove('inv-stepper-qty--pop');
                    void el.offsetWidth;
                    el.classList.add('inv-stepper-qty--pop');
                }
                var dec = allSteppers[i].querySelector('.inv-stepper-btn--dec');
                if (dec) {
                    if (qty <= 0) {
                        dec.setAttribute('disabled', '');
                    } else {
                        dec.removeAttribute('disabled');
                    }
                }
            }

            // Update binder card owned/unowned state if inside a binder with showOwnedState
            var binderCard = stepper.closest('.binder-card');
            if (binderCard) {
                var binderWrapper = binderCard.closest('[data-show-owned-state]');
                if (binderWrapper) {
                    var totalOwned = 0;
                    var cardSteppers = binderCard.querySelectorAll('.inv-stepper-qty');
                    for (var j = 0; j < cardSteppers.length; j++) {
                        totalOwned += parseInt(cardSteppers[j].textContent) || 0;
                    }
                    binderCard.classList.toggle('binder-card-owned', totalOwned > 0);
                    binderCard.classList.toggle('binder-card-unowned', totalOwned === 0);
                }
            }

            // Show transaction prompt AFTER DOM updates (guarded — AjaxUtils may not be loaded)
            showTransactionPrompt(incBtn ? 'BUY' : 'SELL', isFoil);

            // Notify binder state machine to sync cache
            if (typeof AppState !== 'undefined' && AppState.emit) {
                AppState.emit('inventory:updated', {
                    cardId: cardId,
                    isFoil: isFoil,
                    quantity: qty,
                });
            }
        } finally {
            busySteppers[busyKey] = false;
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
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
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
            if (typeof AjaxUtils !== 'undefined' && AjaxUtils.smoothScroll) {
                AjaxUtils.smoothScroll(section, 'nearest');
            } else {
                section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
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
            const errorData = await response.json().catch(() => null);
            throw new Error(errorData?.error || `HTTP ${response.status}: ${response.statusText}`);
        }
        const responseData = await response.json();
        console.log('Response data:', responseData);
        if (responseData.success && responseData.data && responseData.data.length > 0) {
            return responseData.data[0];
        }
        return null;
    }
});
