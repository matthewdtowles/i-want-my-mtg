document.addEventListener("DOMContentLoaded", function () {
    console.log(`updateInventory.js loaded`);
    document.querySelectorAll(".quantity-form").forEach((form) => {
        const quantityOwned = form.querySelector("input[name='quantity-owned']");
        const cardId = quantityOwned.dataset.id;
        console.log(`quantityOwned.dataset.id = cardId = ${cardId}`);
        form
            .querySelector(".increment-quantity")
            .addEventListener("click", async () => {
                console.log(`quantityOwned.value = ${quantityOwned.value}`);
                quantityOwned.value = await addInventoryItem(quantityOwned.value, cardId);
            });
        form
            .querySelector(".decrement-quantity")
            .addEventListener("click", async () => {
                quantityOwned.value = await removeInventoryItem(quantityOwned.value, cardId);
            });

        async function addInventoryItem(_quantity, _cardId) {
            let updatedQuantity = _quantity;
            console.log(`Add inventory => ${_quantity} + 1`);
            try {
                const qtyInt = parseInt(_quantity);
                const cardIdInt = parseInt(_cardId);
                const method = qtyInt === 0 ? 'POST' : 'PATCH';
                const updatedInventory = await updateInventory(qtyInt + 1, cardIdInt, method);
                console.log(`updatedInventory = ${JSON.stringify(updatedInventory)}`);
                updatedQuantity = updatedInventory ? updatedInventory.quantity : _quantity;
            } catch (error) {
                console.error(`Error in addInventoryItem => ${error}`);
            }
            return updatedQuantity;
        }

        async function removeInventoryItem(_quantity, _cardId) {
            let updatedQuantity = _quantity;
            console.log(`Remove inventory item => ${_quantity}`);
            try {
                const qtyInt = parseInt(_quantity);
                const cardIdInt = parseInt(_cardId);
                if (qtyInt > 0) {
                    const updatedInventory = await updateInventory((qtyInt - 1), cardIdInt, 'PATCH') ?? 0;
                    console.log(`updatedInventory = ${JSON.stringify(updatedInventory)}`);
                    updatedQuantity = updatedInventory ? updatedInventory.quantity : _quantity;
                } else {
                    console.log(`Quantity is already 0`);
                    updatedQuantity = 0;
                }
            } catch (error) {
                console.error(`Error in removeInventoryItem => ${error}`);
            }
            updatedQuantity
            return updatedQuantity;
        }

        async function updateInventory(_quantity, _cardId, _method) {
            console.log(`Update quantity => ${_quantity}`);
            try {
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
                const data = await response.json();
                console.log(`Update inventory response data => ${JSON.stringify(data)}`);
                return data && data.inventory && data.inventory[0] ? data.inventory[0] : null;
            } catch (error) {
                console.error(`Error in updateInventory => ${error}`);
            }
        }
    });
});




/* // TODO: REMOVE OLD CODE BELOW
 const removeButtons = document.querySelectorAll(".remove-card-btn");
 const addButtons = document.querySelectorAll(".add-card-btn");
 removeButtons.forEach((button) => {
   // TODO: this should be a defined function we can call in multiple buttons, both - and +.
   button.addEventListener("click", function(event) {
     const quantitySpan = this.closest(
       ".quantity-owned-controller",
     ).querySelector(".quantity-owned");
     console.log(`quantitySpan = ${quantitySpan}`);
     let quantity = parseInt(quantitySpan.textContent);
     if (quantity > 0) {
       quantitySpan.textContent = --quantity;
     }
   });
 });
 addButtons.forEach((button) => {
   button.addEventListener("click", function(event) {
     const quantitySpan = this.closest(
       ".quantity-owned-controller",
     ).querySelector(".quantity-owned");
     console.log(`quantitySpan = ${quantitySpan}`);
     let quantity = parseInt(quantitySpan.textContent);
     quantitySpan.textContent = ++quantity;
   });
 });
});
*/
/* TODO INCORPORATE INVENTORY VERSION FOR PATCH OF THE FOLLOWING:
const accessToken = response.access_token;
const messageEl = document.getElementById('response-message');
document.getElementById('user-update-form').addEventListener('submit', async (event) => {
   event.preventDefault();
   const formData = new FormData(event.target);
   const data = Object.fromEntries(formData.entries());
   data.id = parseInt(data.id, 10);
   console.log(`data.id = ${data.id}`);
   const response = await fetch('/user/update', {
       method: 'PATCH',
       headers: {
           'Content-Type': 'application/json',
       },
       body: JSON.stringify(data),
   });
   if (response.ok) {
       messageEl.textContent = 'User updated successfully';
   } else {
       messageEl.textContent = 'Failed to update user';
*/
