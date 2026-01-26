document.addEventListener("DOMContentLoaded", function () {
    // Use event delegation for quantity forms
    document.body.addEventListener("click", async function (event) {
        const incrementButton = event.target.closest(".increment-quantity");
        const decrementButton = event.target.closest(".decrement-quantity");
        if (incrementButton) {
            event.stopImmediatePropagation();
            const form = incrementButton.closest(".quantity-form");
            const quantityOwned = form.querySelector("input[name='quantity-owned']");
            const cardId = form.querySelector("input[name='cardId']").value;
            const isFoil = form.querySelector("input[name='isFoil']").value === "true";
            console.log(`Incrementing quantity from ${quantityOwned.value} for card ${cardId}`);
            const updatedQuantity = await addInventoryItem(quantityOwned.value, cardId, isFoil);
            quantityOwned.value = updatedQuantity;
        }
        if (decrementButton) {
            event.stopImmediatePropagation();
            const form = decrementButton.closest(".quantity-form");
            const quantityOwned = form.querySelector("input[name='quantity-owned']");
            const cardId = form.querySelector("input[name='cardId']").value;
            const isFoil = form.querySelector("input[name='isFoil']").value === "true";
            console.log(`Decrementing quantity from ${quantityOwned.value} for card ${cardId}`);
            const updatedQuantity = await removeInventoryItem(quantityOwned.value, cardId, isFoil);
            quantityOwned.value = updatedQuantity;
        }
    });

    // Use event delegation for delete buttons
    document.body.addEventListener("click", async function (event) {
        const deleteButton = event.target.closest(".delete-inventory-button");
        if (deleteButton) {
            event.stopImmediatePropagation();
            const form = deleteButton.closest(".delete-inventory-form");
            const cardId = form.querySelector("input[name='card-id']").value;
            const isFoil = form.querySelector("input[name='isFoil']").value === "true";
            console.log(`Deleting card ${cardId} from inventory`);
            try {
                await deleteInventoryItem(cardId, isFoil);
                const tableRow = form.closest("tr");
                if (tableRow) {
                    tableRow.remove();
                    console.log(`Card ${cardId} successfully deleted from inventory`);
                } else {
                    console.warn(`Could not find table row for card ${cardId}`);
                }
            } catch (error) {
                console.error(`Error deleting card ${cardId}:`, error.message);
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
            return quantity;
        }
    }

    async function removeInventoryItem(quantity, cardId, isFoil) {
        try {
            const currentQty = parseInt(quantity);
            if (isNaN(currentQty) || currentQty <= 0) {
                return "0";
            }
            const qtyInt = currentQty - 1;
            console.log(`Updating quantity to ${qtyInt} for card ${cardId}`);
            if (qtyInt === 0) {
                await deleteInventoryItem(cardId, isFoil);
                return "0";
            } else {
                const updatedInventory = await updateInventory(qtyInt, cardId, isFoil, 'PATCH');
                console.log("Response from update:", updatedInventory);
                if (updatedInventory && typeof updatedInventory.quantity !== 'undefined') {
                    return updatedInventory.quantity.toString();
                } else {
                    return qtyInt.toString();
                }
            }
        } catch (error) {
            console.error(`Error in removeInventoryItem => ${error}`);
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

    async function updateInventory(quantity, cardId, isFoil, method) {
        const response = await fetch('/inventory', {
            method: method,
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify([{
                cardId: cardId,
                isFoil: isFoil,
                quantity: quantity,
            }]),
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        const responseData = await response.json();
        console.log("Response data:", responseData);
        if (responseData.success && responseData.data && responseData.data.length > 0) {
            return responseData.data[0];
        }
        return null;
    }
});