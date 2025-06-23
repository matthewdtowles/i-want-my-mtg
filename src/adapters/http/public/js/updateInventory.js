document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".quantity-form").forEach((form) => {
        const quantityOwned = form.querySelector("input[name='quantity-owned']");
        const cardId = form.querySelector("input[name='cardId']").value;
        const isFoil = form.querySelector("input[name='isFoil']").value === "true";
        const incrementButton = form.querySelector(".increment-quantity");
        const decrementButton = form.querySelector(".decrement-quantity");

        incrementButton.addEventListener("click", async (event) => {
            event.stopImmediatePropagation();
            console.log(`Incrementing quantity from ${quantityOwned.value} for card ${cardId}`);
            const updatedQuantity = await addInventoryItem(quantityOwned.value, cardId, isFoil);
            quantityOwned.value = updatedQuantity;
        });

        decrementButton.addEventListener("click", async (event) => {
            event.stopImmediatePropagation();
            console.log(`Decrementing quantity from ${quantityOwned.value} for card ${cardId}`);
            const updatedQuantity = await removeInventoryItem(quantityOwned.value, cardId, isFoil);
            quantityOwned.value = updatedQuantity;
        });

        async function addInventoryItem(_quantity, _cardId, isFoil) {
            let updatedQuantity = _quantity;
            try {
                const qtyInt = parseInt(updatedQuantity);
                const method = qtyInt === 0 ? 'POST' : 'PATCH';
                const updatedInventory = await updateInventory(qtyInt + 1, _cardId, isFoil, method);
                updatedQuantity = updatedInventory ? updatedInventory.quantity : _quantity;
            } catch (error) {
                console.error(`Error in addInventoryItem => ${error}`);
            }
            return updatedQuantity;
        }

        async function removeInventoryItem(_quantity, _cardId, isFoil) {
            try {
                const currentQty = parseInt(_quantity);
                // Don't process negative quantities
                if (isNaN(currentQty) || currentQty <= 0) {
                    return "0";
                }

                const qtyInt = currentQty - 1;
                console.log(`Updating quantity to ${qtyInt} for card ${_cardId}`);
                
                // If going to zero, use DELETE method instead
                if (qtyInt === 0) {
                    const response = await fetch('/inventory', {
                        method: 'DELETE',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            cardId: _cardId,
                            isFoil: isFoil,
                        }),
                    });
                    
                    if (!response.ok) {
                        console.error(`Error in deleteInventory: ${response.statusText}`);
                        return _quantity; // Return original on error
                    }
                    
                    console.log("Item successfully deleted from inventory");
                    return "0"; // Successfully deleted, so return 0
                } else {
                    // For non-zero quantities, use PATCH
                    const updatedInventory = await updateInventory(qtyInt, _cardId, isFoil, 'PATCH');
                    console.log("Response from update:", updatedInventory);
                    
                    // Handle various response scenarios
                    if (updatedInventory && typeof updatedInventory.quantity !== 'undefined') {
                        return updatedInventory.quantity.toString();
                    } else {
                        // If we got a response but no quantity, assume success with requested quantity
                        return qtyInt.toString();
                    }
                }
            } catch (error) {
                console.error(`Error in removeInventoryItem => ${error}`);
                return _quantity; // Return original on error
            }
        }

        async function updateInventory(_quantity, _cardId, _isFoil, _method) {
            const response = await fetch('/inventory', {
                method: _method,
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify([{
                    cardId: _cardId,
                    isFoil: _isFoil,
                    quantity: _quantity,
                }]),
            });
            try {
                if (!response.ok) {
                    console.error(`Error in updateInventory: ${response.statusText}`);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                if (!response.json) {
                    console.error(`Error in updateInventory: response.json is not a function`);
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                const data = await response.json();
                return data && data.inventory && data.inventory[0] ? data.inventory[0] : null;
            } catch (error) {
                console.error(`Error in updateInventory => ${error}`);
            }
            return null;
        }
    });

    let currentImgLink = null;

    document.querySelectorAll(".card-name-link").forEach(item => {
        const imgLink = item.querySelector(".card-img-link");
        const imgPreview = imgLink.querySelector(".card-img-preview");

        item.addEventListener("mouseover", () => {
            if (currentImgLink && currentImgLink !== imgLink) {
                currentImgLink.classList.add("hidden");
            }
            currentImgLink = imgLink;
            imgLink.style.display = "block";
            imgPreview.style.display = "block";
            const rect = item.getBoundingClientRect();
            const imgWidth = imgLink.offsetWidth;
            imgLink.style.top = `${rect.bottom + window.scrollY}px`;
            imgLink.style.left = `${rect.left + window.scrollX + imgWidth / 4}px`;
        });

        item.addEventListener("mouseout", () => {
            imgLink.style.display = "none";
            imgPreview.style.display = "none";
        });
    });

    document.querySelectorAll(".delete-inventory-form").forEach((form) => {
        const deleteButton = form.querySelector(".delete-inventory-button");
        const _cardId = form.querySelector("input[name='card-id']").value;
        const _isFoil = form.querySelector("input[name='isFoil']").value === "true";
        deleteButton.addEventListener("click", async (event) => {
            event.stopImmediatePropagation();
            console.log(`Deleting card ${_cardId} from inventory`);
            const response = await fetch('/inventory', {
                method: 'DELETE',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cardId: _cardId,
                    isFoil: _isFoil,
                }),
            });
            if (!response.ok) {
                console.error(`Error in deleteInventory: ${response.statusText}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            try {
                const data = await response.json();
                console.log(`Response from deleteInventory: ${JSON.stringify(data)}`);
                const tableRow = form.closest("tr");
                if (tableRow) {
                    tableRow.remove();
                    console.log(`Card ${_cardId} successfully deleted from inventory`);
                } else {
                    console.warn(`Could not find table row for card ${_cardId}`);
                }
            } catch (error) {
                console.error(`Error in deleteInventory => ${error}`);
            }
        });
    });
});