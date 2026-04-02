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
renderAiOutput([]);

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

premiumAiForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const people = document.getElementById("ai-people").value;
  const days = document.getElementById("ai-days").value;
  const style = document.getElementById("ai-style").value;
  const budget = document.getElementById("ai-budget").value;
  const meals = document.getElementById("ai-meals").value;
  const preferences = document.getElementById("ai-preferences").value.trim();

  const submitButton = premiumAiForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Generazione in corso...";

  try {
    const response = await fetch("/api/genera-lista-spesa-ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        people,
        days,
        style,
        budget,
        meals,
        preferences
      })
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Errore nella risposta AI.");
    }

    const data = result.data;

    generatedAiItems = flattenAiCategories(data.categories);

    aiOutputMeta.textContent =
      `Lista generata per ${data.meta.people}, ${data.meta.days}, stile ${data.meta.style}, budget ${data.meta.budget}, pasti: ${data.meta.meals}.`;

    saveAiGeneratedItems();
    renderAiOutput(data.notes || []);
  } catch (error) {
    console.error(error);
    alert("Errore durante la generazione della lista spesa AI.");
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Genera lista intelligente";
  }
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
  renderAiOutput([]);
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

function renderAiOutput(notes = []) {
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

  if (notes.length > 0) {
    const notesBlock = document.createElement("div");
    notesBlock.className = "shopping-ai-category-block";

    const notesTitle = document.createElement("h4");
    notesTitle.textContent = "🧠 Note AI";
    notesBlock.appendChild(notesTitle);

    const notesList = document.createElement("ul");
    notes.forEach(note => {
      const li = document.createElement("li");
      li.textContent = note;
      notesList.appendChild(li);
    });

    notesBlock.appendChild(notesList);
    aiOutputContainer.appendChild(notesBlock);
  }

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

function flattenAiCategories(categories) {
  const result = [];

  categories.forEach(categoryBlock => {
    categoryBlock.items.forEach(item => {
      result.push({
        name: item.name,
        quantity: item.quantity,
        category: categoryBlock.category,
        checked: false
      });
    });
  });

  return result;
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