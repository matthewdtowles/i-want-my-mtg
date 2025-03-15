document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".quantity-form").forEach((form) => {
        const quantityOwned = form.querySelector("input[name='quantity-owned']");
        const cardId = quantityOwned.dataset.id;
        const incrementButton = form.querySelector(".increment-quantity");
        const decrementButton = form.querySelector(".decrement-quantity");

        incrementButton.addEventListener("click", async (event) => {
            event.stopImmediatePropagation();
            console.log(`Incrementing quantity from ${quantityOwned.value} for card ${cardId}`);
            const updatedQuantity = await addInventoryItem(quantityOwned.value, cardId);
            quantityOwned.value = updatedQuantity;
        });

        decrementButton.addEventListener("click", async (event) => {
            event.stopImmediatePropagation();
            console.log(`Decrementing quantity from ${quantityOwned.value} for card ${cardId}`);
            const updatedQuantity = await removeInventoryItem(quantityOwned.value, cardId);
            quantityOwned.value = updatedQuantity;
        });

        async function addInventoryItem(_quantity, _cardId) {
            let updatedQuantity = _quantity;
            try {
                const qtyInt = parseInt(updatedQuantity);
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
            try {
                const qtyInt = parseInt(updatedQuantity);
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

    let currentImgLink = null;

    document.querySelectorAll(".inventory-item").forEach(item => {
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
                }),
            });
            if (!response.ok) {
                console.error(`Error in deleteInventory: ${response.statusText}`);
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            try {
                console.log(`10: Deleted card ${_cardId} from inventory`);
                const data = await response.json();
                console.log(`12: deleteInventory`);
                console.log(`13: data => ${JSON.stringify(data)}`);
                console.log(`14: data.cardId => ${JSON.stringify(data.cardId)}`);
                if (data && data.cardId) {
                    console.log(`15: data.cardId => ${JSON.stringify(data.cardId)}`);
                    const cardId = data.cardId;
                    console.log(`30: Deleted card ${cardId} from inventory`);
                    const cardEl = document.querySelector(`.inventory-item[data-id='${cardId}']`);
                    if (cardEl) {
                        console.log(`40: Deleted card ${cardId} from inventory`);
                        cardEl.closest('tr').remove();
                        console.log(`50: Deleted card ${cardId} from inventory`);
                    }
                }
            } catch (error) {
                console.error(`Error in deleteInventory => ${error}`);
            }
        });
    });

});