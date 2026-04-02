const STORAGE_KEY = "cucinai_lista_spesa_free";

const form = document.getElementById("shoppingFreeForm");
const productNameInput = document.getElementById("free-product-name");
const productQtyInput = document.getElementById("free-product-qty");
const productCategoryInput = document.getElementById("free-product-category");
const shoppingListContainer = document.getElementById("shoppingListContainer");
const shoppingEmptyState = document.getElementById("shoppingEmptyState");

const summaryTotal = document.getElementById("summaryTotal");
const summaryPending = document.getElementById("summaryPending");
const summaryDone = document.getElementById("summaryDone");

const categoryIcons = {
  "Verdura e frutta": "🥬",
  "Carne e pesce": "🥩",
  "Latticini": "🧀",
  "Dispensa": "🍝",
  "Surgelati": "❄️",
  "Bevande": "🥤",
  "Altro": "🛒"
};

let shoppingItems = loadItems();

renderShoppingList();
updateSummary();

form.addEventListener("submit", function (event) {
  event.preventDefault();

  const name = productNameInput.value.trim();
  const quantity = productQtyInput.value.trim();
  const category = productCategoryInput.value || "Altro";

  if (!name) {
    alert("Inserisci il nome del prodotto.");
    productNameInput.focus();
    return;
  }

  const newItem = {
    id: Date.now().toString(),
    name,
    quantity: quantity || "-",
    category,
    checked: false
  };

  shoppingItems.push(newItem);
  saveItems();
  renderShoppingList();
  updateSummary();

  form.reset();
  productCategoryInput.value = "Altro";
  productNameInput.focus();
});

function loadItems() {
  try {
    const rawItems = localStorage.getItem(STORAGE_KEY);
    return rawItems ? JSON.parse(rawItems) : [];
  } catch (error) {
    return [];
  }
}

function saveItems() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(shoppingItems));
}

function updateSummary() {
  const total = shoppingItems.length;
  const done = shoppingItems.filter(item => item.checked).length;
  const pending = total - done;

  summaryTotal.textContent = total;
  summaryPending.textContent = pending;
  summaryDone.textContent = done;
}

function renderShoppingList() {
  shoppingListContainer.innerHTML = "";

  if (shoppingItems.length === 0) {
    shoppingEmptyState.style.display = "block";
    return;
  }

  shoppingEmptyState.style.display = "none";

  const groupedItems = groupItemsByCategory(shoppingItems);

  Object.keys(groupedItems).forEach(category => {
    const categoryBlock = document.createElement("div");
    categoryBlock.className = "shopping-category-block";

    const categoryTitle = document.createElement("h4");
    const icon = categoryIcons[category] || "🛒";
    categoryTitle.textContent = `${icon} ${category}`;
    categoryBlock.appendChild(categoryTitle);

    groupedItems[category].forEach(item => {
      const itemRow = document.createElement("div");
      itemRow.className = `shopping-item-row${item.checked ? " checked" : ""}`;

      const label = document.createElement("label");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.checked;
      checkbox.addEventListener("change", function () {
        toggleItem(item.id);
      });

      const nameText = document.createElement("span");
      nameText.textContent = item.name;

      label.appendChild(checkbox);
      label.appendChild(nameText);

      const quantity = document.createElement("span");
      quantity.textContent = item.quantity;

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "item-delete";
      deleteButton.textContent = "×";
      deleteButton.setAttribute("aria-label", `Elimina ${item.name}`);
      deleteButton.addEventListener("click", function () {
        deleteItem(item.id);
      });

      itemRow.appendChild(label);
      itemRow.appendChild(quantity);
      itemRow.appendChild(deleteButton);

      categoryBlock.appendChild(itemRow);
    });

    shoppingListContainer.appendChild(categoryBlock);
  });
}

function groupItemsByCategory(items) {
  return items.reduce((groups, item) => {
    if (!groups[item.category]) {
      groups[item.category] = [];
    }

    groups[item.category].push(item);
    return groups;
  }, {});
}

function toggleItem(itemId) {
  shoppingItems = shoppingItems.map(item => {
    if (item.id === itemId) {
      return { ...item, checked: !item.checked };
    }
    return item;
  });

  saveItems();
  renderShoppingList();
  updateSummary();
}

function deleteItem(itemId) {
  shoppingItems = shoppingItems.filter(item => item.id !== itemId);
  saveItems();
  renderShoppingList();
  updateSummary();
}