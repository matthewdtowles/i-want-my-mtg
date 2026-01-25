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
            const _cardId = form.querySelector("input[name='card-id']").value;
            const _isFoil = form.querySelector("input[name='isFoil']").value === "true";

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
                console.log(`Response from deleteInventory:`, data);
                if (data.success) {
                    const tableRow = form.closest("tr");
                    if (tableRow) {
                        tableRow.remove();
                        console.log(`Card ${_cardId} successfully deleted from inventory`);
                    } else {
                        console.warn(`Could not find table row for card ${_cardId}`);
                    }
                } else {
                    console.error(`Error in deleteInventory: ${data.error || 'Unknown error'}`);
                }
            } catch (error) {
                console.error(`Error in deleteInventory => ${error}`);
            }
        }
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
            if (isNaN(currentQty) || currentQty <= 0) {
                return "0";
            }

            const qtyInt = currentQty - 1;
            console.log(`Updating quantity to ${qtyInt} for card ${_cardId}`);

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
                    return _quantity;
                }

                console.log("Item successfully deleted from inventory");
                return "0";
            } else {
                const updatedInventory = await updateInventory(qtyInt, _cardId, isFoil, 'PATCH');
                console.log("Response from update:", updatedInventory);

                if (updatedInventory && typeof updatedInventory.quantity !== 'undefined') {
                    return updatedInventory.quantity.toString();
                } else {
                    return qtyInt.toString();
                }
            }
        } catch (error) {
            console.error(`Error in removeInventoryItem => ${error}`);
            return _quantity;
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
            const responseData = await response.json();
            console.log("Response data:", responseData);
            if (responseData.success && responseData.data && responseData.data.length > 0) {
                return responseData.data[0];
            }
            return null;
        } catch (error) {
            console.error(`Error in updateInventory => ${error}`);
        }
        return null;
    }

    // Use event delegation for card hover
    let currentImgLink = null;

    document.body.addEventListener("mouseover", function (event) {
        const cardNameLink = event.target.closest(".card-name-link");
        if (!cardNameLink) return;

        const imgLink = cardNameLink.querySelector(".card-img-link");
        const imgPreview = imgLink?.querySelector(".card-img-preview");

        if (!imgLink || !imgPreview) return;

        if (currentImgLink && currentImgLink !== imgLink) {
            currentImgLink.style.display = "none";
        }
        currentImgLink = imgLink;
        imgLink.style.display = "block";
        imgPreview.style.display = "block";
        const rect = cardNameLink.getBoundingClientRect();
        const imgWidth = imgLink.offsetWidth;
        imgLink.style.top = `${rect.bottom + window.scrollY}px`;
        imgLink.style.left = `${rect.left + window.scrollX + imgWidth / 4}px`;
    });

    document.body.addEventListener("mouseout", function (event) {
        const cardNameLink = event.target.closest(".card-name-link");
        if (!cardNameLink) return;

        const imgLink = cardNameLink.querySelector(".card-img-link");
        const imgPreview = imgLink?.querySelector(".card-img-preview");

        if (!imgLink || !imgPreview) return;

        imgLink.style.display = "none";
        imgPreview.style.display = "none";
    });
});