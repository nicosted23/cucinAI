const PREMIUM_STORAGE_KEY = "cucinai_lista_spesa_premium";
const PREMIUM_AI_STORAGE_KEY = "cucinai_lista_spesa_premium_ai";

const premiumForm = document.getElementById("shoppingPremiumForm");
const premiumNameInput = document.getElementById("premium-product-name");
const premiumQtyInput = document.getElementById("premium-product-qty");
const premiumCategoryInput = document.getElementById("premium-product-category");

const premiumListContainer = document.getElementById("premiumListContainer");
const premiumEmptyState = document.getElementById("premiumEmptyState");

const premiumSummaryTotal = document.getElementById("premiumSummaryTotal");
const premiumSummaryPending = document.getElementById("premiumSummaryPending");
const premiumSummaryDone = document.getElementById("premiumSummaryDone");

const toggleAiGeneratorButton = document.getElementById("toggleAiGenerator");
const aiGeneratorSection = document.getElementById("aiGeneratorSection");
const premiumAiForm = document.getElementById("premiumAiForm");
const aiOutputMeta = document.getElementById("aiOutputMeta");
const aiOutputContainer = document.getElementById("aiOutputContainer");
const addAiListToPremiumButton = document.getElementById("addAiListToPremium");
const resetAiListButton = document.getElementById("resetAiList");

const premiumCategoryIcons = {
  "Verdura e frutta": "🥬",
  "Carne e pesce": "🥩",
  "Latticini": "🧀",
  "Dispensa": "🍝",
  "Surgelati": "❄️",
  "Bevande": "🥤",
  "Proteine": "💪",
  "Altro": "🛒"
};

let premiumItems = loadPremiumItems();
let generatedAiItems = loadAiGeneratedItems();

aiGeneratorSection.style.display = "none";

renderPremiumList();
updatePremiumSummary();
renderAiOutput();

toggleAiGeneratorButton.addEventListener("click", function () {
  const isHidden = aiGeneratorSection.style.display === "none";
  aiGeneratorSection.style.display = isHidden ? "block" : "none";
  toggleAiGeneratorButton.textContent = isHidden ? "Chiudi generatore AI" : "Apri generatore AI";
});

premiumForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const name = premiumNameInput.value.trim();
  const quantity = premiumQtyInput.value.trim();
  const category = premiumCategoryInput.value || "Altro";

  if (!name) {
    alert("Inserisci il nome del prodotto.");
    premiumNameInput.focus();
    return;
  }

  premiumItems.push({
    id: Date.now().toString(),
    name,
    quantity: quantity || "-",
    category,
    checked: false
  });

  savePremiumItems();
  renderPremiumList();
  updatePremiumSummary();

  premiumForm.reset();
  premiumCategoryInput.value = "Altro";
  premiumNameInput.focus();
});

premiumAiForm.addEventListener("submit", function (event) {
  event.preventDefault();

  const people = document.getElementById("ai-people").value;
  const days = document.getElementById("ai-days").value;
  const style = document.getElementById("ai-style").value;
  const budget = document.getElementById("ai-budget").value;
  const meals = document.getElementById("ai-meals").value;
  const preferences = document.getElementById("ai-preferences").value.trim();

  generatedAiItems = generateAiShoppingList({
    people,
    days,
    style,
    budget,
    meals,
    preferences
  });

  aiOutputMeta.textContent = `Lista generata per ${people}, ${days}, stile ${style}, budget ${budget}, pasti: ${meals}.`;
  saveAiGeneratedItems();
  renderAiOutput();
});

addAiListToPremiumButton.addEventListener("click", function () {
  if (generatedAiItems.length === 0) {
    return;
  }

  const itemsToAdd = generatedAiItems.map(item => ({
    ...item,
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    checked: false
  }));

  premiumItems = [...premiumItems, ...itemsToAdd];
  savePremiumItems();
  renderPremiumList();
  updatePremiumSummary();
});

resetAiListButton.addEventListener("click", function () {
  generatedAiItems = [];
  aiOutputMeta.textContent = "Qui comparirà la tua proposta generata.";
  saveAiGeneratedItems();
  renderAiOutput();
});

function loadPremiumItems() {
  try {
    const raw = localStorage.getItem(PREMIUM_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function savePremiumItems() {
  localStorage.setItem(PREMIUM_STORAGE_KEY, JSON.stringify(premiumItems));
}

function loadAiGeneratedItems() {
  try {
    const raw = localStorage.getItem(PREMIUM_AI_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function saveAiGeneratedItems() {
  localStorage.setItem(PREMIUM_AI_STORAGE_KEY, JSON.stringify(generatedAiItems));
}

function updatePremiumSummary() {
  const total = premiumItems.length;
  const done = premiumItems.filter(item => item.checked).length;
  const pending = total - done;

  premiumSummaryTotal.textContent = total;
  premiumSummaryPending.textContent = pending;
  premiumSummaryDone.textContent = done;
}

function renderPremiumList() {
  premiumListContainer.innerHTML = "";

  if (premiumItems.length === 0) {
    premiumEmptyState.style.display = "block";
    return;
  }

  premiumEmptyState.style.display = "none";

  const groupedItems = groupItemsByCategory(premiumItems);

  Object.keys(groupedItems).forEach(category => {
    const categoryBlock = document.createElement("div");
    categoryBlock.className = "shopping-premium-category-block";

    const categoryTitle = document.createElement("h4");
    const icon = premiumCategoryIcons[category] || "🛒";
    categoryTitle.textContent = `${icon} ${category}`;
    categoryBlock.appendChild(categoryTitle);

    groupedItems[category].forEach(item => {
      const itemRow = document.createElement("div");
      itemRow.className = `shopping-premium-item-row${item.checked ? " checked" : ""}`;

      const label = document.createElement("label");

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = item.checked;
      checkbox.addEventListener("change", function () {
        togglePremiumItem(item.id);
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
        deletePremiumItem(item.id);
      });

      itemRow.appendChild(label);
      itemRow.appendChild(quantity);
      itemRow.appendChild(deleteButton);

      categoryBlock.appendChild(itemRow);
    });

    premiumListContainer.appendChild(categoryBlock);
  });
}

function renderAiOutput() {
  aiOutputContainer.innerHTML = "";

  if (generatedAiItems.length === 0) {
    aiOutputContainer.innerHTML = `
      <div class="shopping-ai-empty">
        <h4>Nessuna lista generata</h4>
        <p>Compila il mini questionario qui sopra per ottenere una proposta smart.</p>
      </div>
    `;
    addAiListToPremiumButton.disabled = true;
    resetAiListButton.disabled = true;
    return;
  }

  addAiListToPremiumButton.disabled = false;
  resetAiListButton.disabled = false;

  const groupedItems = groupItemsByCategory(generatedAiItems);

  Object.keys(groupedItems).forEach(category => {
    const categoryBlock = document.createElement("div");
    categoryBlock.className = "shopping-ai-category-block";

    const categoryTitle = document.createElement("h4");
    const icon = premiumCategoryIcons[category] || "🛒";
    categoryTitle.textContent = `${icon} ${category}`;
    categoryBlock.appendChild(categoryTitle);

    const list = document.createElement("ul");

    groupedItems[category].forEach(item => {
      const listItem = document.createElement("li");
      listItem.textContent = `${item.name} — ${item.quantity}`;
      list.appendChild(listItem);
    });

    categoryBlock.appendChild(list);
    aiOutputContainer.appendChild(categoryBlock);
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

function togglePremiumItem(itemId) {
  premiumItems = premiumItems.map(item => {
    if (item.id === itemId) {
      return { ...item, checked: !item.checked };
    }
    return item;
  });

  savePremiumItems();
  renderPremiumList();
  updatePremiumSummary();
}

function deletePremiumItem(itemId) {
  premiumItems = premiumItems.filter(item => item.id !== itemId);
  savePremiumItems();
  renderPremiumList();
  updatePremiumSummary();
}

function generateAiShoppingList(config) {
  const stylePresets = {
    Classico: [
      { name: "Pomodori", quantity: "1 kg", category: "Verdura e frutta" },
      { name: "Insalata", quantity: "2 confezioni", category: "Verdura e frutta" },
      { name: "Pasta", quantity: "2 confezioni", category: "Dispensa" },
      { name: "Passata di pomodoro", quantity: "2 bottiglie", category: "Dispensa" },
      { name: "Parmigiano", quantity: "250 g", category: "Latticini" },
      { name: "Petto di pollo", quantity: "700 g", category: "Carne e pesce" }
    ],
    Fitness: [
      { name: "Zucchine", quantity: "1 kg", category: "Verdura e frutta" },
      { name: "Spinaci", quantity: "500 g", category: "Verdura e frutta" },
      { name: "Petto di pollo", quantity: "1 kg", category: "Proteine" },
      { name: "Uova", quantity: "10", category: "Proteine" },
      { name: "Riso basmati", quantity: "1 kg", category: "Dispensa" },
      { name: "Yogurt greco", quantity: "4 vasetti", category: "Latticini" }
    ],
    Equilibrato: [
      { name: "Pomodori", quantity: "1 kg", category: "Verdura e frutta" },
      { name: "Zucchine", quantity: "1 kg", category: "Verdura e frutta" },
      { name: "Uova", quantity: "8", category: "Proteine" },
      { name: "Tonno", quantity: "3 scatolette", category: "Proteine" },
      { name: "Pasta", quantity: "2 confezioni", category: "Dispensa" },
      { name: "Latte", quantity: "2 bottiglie", category: "Latticini" }
    ],
    Economico: [
      { name: "Patate", quantity: "2 kg", category: "Verdura e frutta" },
      { name: "Cipolle", quantity: "1 kg", category: "Verdura e frutta" },
      { name: "Pasta", quantity: "3 confezioni", category: "Dispensa" },
      { name: "Riso", quantity: "1 kg", category: "Dispensa" },
      { name: "Uova", quantity: "10", category: "Proteine" },
      { name: "Passata di pomodoro", quantity: "2 bottiglie", category: "Dispensa" }
    ],
    Vegetariano: [
      { name: "Zucchine", quantity: "1 kg", category: "Verdura e frutta" },
      { name: "Melanzane", quantity: "800 g", category: "Verdura e frutta" },
      { name: "Ceci", quantity: "3 barattoli", category: "Dispensa" },
      { name: "Lenticchie", quantity: "500 g", category: "Dispensa" },
      { name: "Uova", quantity: "8", category: "Proteine" },
      { name: "Mozzarella", quantity: "3 confezioni", category: "Latticini" }
    ],
    Veloce: [
      { name: "Insalata", quantity: "3 confezioni", category: "Verdura e frutta" },
      { name: "Tonno", quantity: "4 scatolette", category: "Proteine" },
      { name: "Pane in cassetta", quantity: "2 confezioni", category: "Dispensa" },
      { name: "Pasta", quantity: "2 confezioni", category: "Dispensa" },
      { name: "Yogurt", quantity: "6 vasetti", category: "Latticini" },
      { name: "Frutta mista", quantity: "1.5 kg", category: "Verdura e frutta" }
    ]
  };

  const budgetExtras = {
    Risparmio: [
      { name: "Carote", quantity: "1 kg", category: "Verdura e frutta" }
    ],
    Equilibrato: [
      { name: "Pane", quantity: "2 confezioni", category: "Dispensa" }
    ],
    "Più completo": [
      { name: "Avocado", quantity: "3", category: "Verdura e frutta" },
      { name: "Salmone", quantity: "400 g", category: "Carne e pesce" }
    ]
  };

  const mealExtras = {
    "Solo cene": [
      { name: "Insalata mista", quantity: "2 confezioni", category: "Verdura e frutta" }
    ],
    "Pranzi e cene": [
      { name: "Pane", quantity: "1 confezione", category: "Dispensa" },
      { name: "Frutta mista", quantity: "1 kg", category: "Verdura e frutta" }
    ],
    "Giornata completa": [
      { name: "Latte", quantity: "2 bottiglie", category: "Latticini" },
      { name: "Fette biscottate", quantity: "2 confezioni", category: "Dispensa" }
    ]
  };

  const baseItems = stylePresets[config.style] || stylePresets.Equilibrato;
  const budgetItems = budgetExtras[config.budget] || [];
  const mealItems = mealExtras[config.meals] || [];

  let result = [...baseItems, ...budgetItems, ...mealItems];

  if (config.days === "7 giorni") {
    result.push({ name: "Acqua", quantity: "2 casse", category: "Bevande" });
  }

  if (config.people === "3-4 persone" || config.people === "5+ persone") {
    result = result.map(item => ({
      ...item,
      quantity: increaseQuantity(item.quantity)
    }));
  }

  if (config.preferences.toLowerCase().includes("poco lattic")) {
    result = result.filter(item => item.category !== "Latticini");
  }

  if (config.preferences.toLowerCase().includes("no pesce")) {
    result = result.filter(item => item.name.toLowerCase() !== "salmone" && item.name.toLowerCase() !== "tonno");
  }

  if (config.preferences.toLowerCase().includes("più verdure")) {
    result.push({ name: "Broccoli", quantity: "700 g", category: "Verdura e frutta" });
  }

  return deduplicateItems(result);
}

function increaseQuantity(quantity) {
  if (quantity.includes("kg")) {
    const value = parseFloat(quantity.replace(",", "."));
    if (!Number.isNaN(value)) {
      return `${(value * 1.5).toFixed(1).replace(".0", "")} kg`;
    }
  }

  if (quantity.includes("g")) {
    const value = parseInt(quantity, 10);
    if (!Number.isNaN(value)) {
      return `${Math.round(value * 1.5)} g`;
    }
  }

  if (quantity.includes("confezioni")) {
    const value = parseInt(quantity, 10);
    if (!Number.isNaN(value)) {
      return `${value + 1} confezioni`;
    }
  }

  if (quantity.includes("bottiglie")) {
    const value = parseInt(quantity, 10);
    if (!Number.isNaN(value)) {
      return `${value + 1} bottiglie`;
    }
  }

  if (quantity.includes("vasetti")) {
    const value = parseInt(quantity, 10);
    if (!Number.isNaN(value)) {
      return `${value + 2} vasetti`;
    }
  }

  if (quantity.includes("scatolette")) {
    const value = parseInt(quantity, 10);
    if (!Number.isNaN(value)) {
      return `${value + 1} scatolette`;
    }
  }

  const numericValue = parseInt(quantity, 10);
  if (!Number.isNaN(numericValue)) {
    return String(Math.round(numericValue * 1.5));
  }

  return quantity;
}

function deduplicateItems(items) {
  const map = new Map();

  items.forEach(item => {
    const key = `${item.category}-${item.name}`.toLowerCase();

    if (!map.has(key)) {
      map.set(key, item);
    }
  });

  return Array.from(map.values());
}