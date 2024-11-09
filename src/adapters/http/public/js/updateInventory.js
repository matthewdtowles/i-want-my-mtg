document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".quantity-form").forEach((form) => {
        const quantityOwned = form.querySelector("input[name='quantity-owned']");
        const cardId = quantityOwned.dataset.id;
        const incrementButton = form.querySelector(".increment-quantity");
        const decrementButton = form.querySelector(".decrement-quantity");

        incrementButton.addEventListener("click", async (event) => {
            event.stopImmediatePropagation();
            console.log(`Incrementing quantity from ${quantityOwned.value} for card ${cardId}`);
            const updatedQuantity  = await addInventoryItem(quantityOwned.value, cardId);
            quantityOwned.value = updatedQuantity;
        });

        decrementButton.addEventListener("click", async (event) => {
            event.stopImmediatePropagation();
            console.log(`Decrementing quantity from ${quantityOwned.value} for card ${cardId}`);
            const updatedQuantity = await removeInventoryItem(quantityOwned.value, cardId);
            quantityOwned.value = updatedQuantity
        });

        async function addInventoryItem(_quantity, _cardId) {
            let updatedQuantity = _quantity;
            console.log(`Add inventory => ${_quantity} + 1 for card ${_cardId}`);
            try {
                const qtyInt = parseInt(_quantity);
                const cardIdInt = parseInt(_cardId);
                const method = qtyInt === 0 ? 'POST' : 'PATCH';
                const updatedInventory = await updateInventory(qtyInt + 1, cardIdInt, method);
                updatedQuantity = updatedInventory ? updatedInventory.quantity : _quantity;
            } catch (error) {
                console.error(`Error in addInventoryItem => ${error}`);
            }
            return updatedQuantity;
        }

        async function removeInventoryItem(_quantity, _cardId) {
            let updatedQuantity = _quantity;
            console.log(`Remove inventory => ${_quantity} - 1 for card ${_cardId}`);
            try {
                const qtyInt = parseInt(_quantity);
                const cardIdInt = parseInt(_cardId);
                const updatedInventory = await updateInventory(qtyInt - 1, cardIdInt, 'PATCH');
                updatedQuantity = updatedInventory ? updatedInventory.quantity : _quantity;
            } catch (error) {
                console.error(`Error in removeInventoryItem => ${error}`);
            }
            return updatedQuantity;
        }

        async function updateInventory(_quantity, _cardId, _method) {
            const response = await fetch('/inventory', {
                method: _method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify([{
                    cardId: _cardId,
                    quantity: _quantity,
                }]),
            });
            if (!response.ok) {
                console.error(`Error in updateInventory: ${response.statusText}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            try {
                const data = await response.json();
                return data && data.inventory && data.inventory[0] ? data.inventory[0] : null;
            } catch (error) {
                console.error(`Error in updateInventory => ${error}`);
            }
            return null;
        }
    });
});