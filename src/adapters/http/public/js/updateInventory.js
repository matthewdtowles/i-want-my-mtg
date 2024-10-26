document.addEventListener('DOMContentLoaded', function() {
  console.log(`updateInventory.js loaded`);
  const removeButtons = document.querySelectorAll(".remove-card-btn");
  const addButtons = document.querySelectorAll(".add-card-btn");
  removeButtons.forEach(button => {
    // TODO: this should be a defined function we can call in multiple buttons, both - and +.
    button.addEventListener("click", function(event) {
      const quantitySpan = this.closest(".quantity-owned-controller").querySelector(".quantity-owned");
      console.log(`quantitySpan = ${quantitySpan}`);
      let quantity = parseInt(quantitySpan.textContent);
      if (quantity > 0) {
        quantitySpan.textContent = --quantity;
      }
    });
  });
  addButtons.forEach(button => {
    button.addEventListener("click", function(event) {
      const quantitySpan = this.closest(".quantity-owned-controller").querySelector(".quantity-owned");
      console.log(`quantitySpan = ${quantitySpan}`);
      let quantity = parseInt(quantitySpan.textContent);
      quantitySpan.textContent = ++quantity;
    });
  });
});
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

