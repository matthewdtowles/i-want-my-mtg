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
            console.log(`New quantity after increment: ${quantityOwned.value}`);
        });

        decrementButton.addEventListener("click", async (event) => {
            event.stopImmediatePropagation();
            console.log(`Decrementing quantity from ${quantityOwned.value} for card ${cardId}`);
            const updatedQuantity = await removeInventoryItem(quantityOwned.value, cardId);
            quantityOwned.value = updatedQuantity
            console.log(`New quantity after decrement: ${quantityOwned.value}`);
        });

        async function addInventoryItem(_quantity, _cardId) {
            let updatedQuantity = _quantity;
            console.log(`Add inventory => ${_quantity} + 1 for card ${_cardId}`);
            try {
                const qtyInt = parseInt(_quantity);
                const cardIdInt = parseInt(_cardId);
                const method = qtyInt === 0 ? 'POST' : 'PATCH';
                console.log(`Sending ${method} request to update inventory for cardId: ${cardIdInt}, new quantity: ${qtyInt + 1}`);
                const updatedInventory = await updateInventory(qtyInt + 1, cardIdInt, method);
                console.log(`Added inventory: ${JSON.stringify(updatedInventory)}`);
                updatedQuantity = updatedInventory ? updatedInventory.quantity : _quantity;
                console.log(`Updated quantity: ${updatedQuantity}`);
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
                console.log(`Sending PATCH request to update inventory for cardId: ${cardIdInt}, new quantity: ${qtyInt - 1}`);
                const updatedInventory = await updateInventory(qtyInt - 1, cardIdInt, 'PATCH');
                console.log(`Removed item from inventory: ${JSON.stringify(updatedInventory)}`);
                updatedQuantity = updatedInventory ? updatedInventory.quantity : _quantity;
                console.log(`Updated quantity: ${updatedQuantity}`);
            } catch (error) {
                console.error(`Error in removeInventoryItem => ${error}`);
            }
            return updatedQuantity;
        }

        async function updateInventory(_quantity, _cardId, _method) {
            console.log(`updateInventory called with quantity: ${_quantity}, cardId: ${_cardId}, method: ${_method}`);
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
                console.log(`Update inventory response data => ${JSON.stringify(data)}`);
                return data && data.inventory && data.inventory[0] ? data.inventory[0] : null;
            } catch (error) {
                console.error(`Error in updateInventory => ${error}`);
            }
            return null;
        }
    });
});