const SAVED_RECIPES_KEYS = [
  "cucinai_saved_recipes",
  "savedRecipes",
  "cucinai_savedRecipes"
];

const PREMIUM_LIST_KEY = "cucinai_lista_spesa_premium";
const WEEKLY_MENU_KEY = "cucinai_menu_settimana";

const savedSearchInput = document.getElementById("savedSearchInput");
const savedFilterButtons = document.querySelectorAll(".saved-filter-btn");
const savedRecipesGrid = document.getElementById("savedRecipesGrid");
const savedEmptyState = document.getElementById("savedEmptyState");
const savedLoadMoreBtn = document.getElementById("savedLoadMoreBtn");

const savedTotalCount = document.getElementById("savedTotalCount");
const savedVisibleCount = document.getElementById("savedVisibleCount");
const savedCurrentFilter = document.getElementById("savedCurrentFilter");

let allRecipes = loadSavedRecipes();
let currentFilter = "Tutte";
let currentSearch = "";
let visibleLimit = 6;

renderSavedRecipes();

savedSearchInput.addEventListener("input", function () {
  currentSearch = savedSearchInput.value.trim().toLowerCase();
  visibleLimit = 6;
  renderSavedRecipes();
});

savedFilterButtons.forEach(button => {
  button.addEventListener("click", function () {
    currentFilter = button.dataset.filter;
    visibleLimit = 6;

    savedFilterButtons.forEach(btn => btn.classList.remove("active"));
    button.classList.add("active");

    renderSavedRecipes();
  });
});

savedLoadMoreBtn.addEventListener("click", function () {
  const filteredRecipes = getFilteredRecipes();

  if (visibleLimit >= filteredRecipes.length) {
    visibleLimit = 6;
  } else {
    visibleLimit += 6;
  }

  renderSavedRecipes();
});

function loadSavedRecipes() {
  for (const key of SAVED_RECIPES_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed.map((recipe, index) => normalizeRecipe(recipe, index));
        }
      }
    } catch (error) {
      console.error(`Errore lettura ricette salvate da ${key}:`, error);
    }
  }

  return [];
}

function saveSavedRecipes(recipes) {
  const normalized = recipes.map((recipe, index) => normalizeRecipe(recipe, index));
  SAVED_RECIPES_KEYS.forEach(key => {
    localStorage.setItem(key, JSON.stringify(normalized));
  });
}

function normalizeRecipe(recipe, index = 0) {
  const title =
    recipe?.title ||
    recipe?.name ||
    recipe?.recipeName ||
    `Ricetta ${index + 1}`;

  const category = normalizeCategory(
    recipe?.category ||
    recipe?.type ||
    recipe?.course ||
    inferCategoryFromTitle(title)
  );

  const tags = Array.isArray(recipe?.tags)
    ? recipe.tags
    : buildDefaultTags(recipe || {}, category);

  const ingredients = normalizeIngredients(recipe?.ingredients || []);

  return {
    id: recipe?.id || `saved-${Date.now()}-${index}-${title.replace(/\s+/g, "-").toLowerCase()}`,
    title,
    description:
      recipe?.description ||
      recipe?.summary ||
      `Una ricetta ${category.toLowerCase()} salvata nella tua raccolta CucinAI.`,
    category,
    time: recipe?.time || recipe?.readyInMinutes || recipe?.duration || "30 min",
    difficulty: recipe?.difficulty || "Facile",
    servings: recipe?.servings || recipe?.people || 2,
    image: recipe?.image || "",
    tags,
    ingredients,
    procedure: normalizeProcedure(
      recipe?.procedure ||
      recipe?.instructions ||
      recipe?.steps ||
      recipe?.method ||
      recipe?.preparation
    )
  };
}

function normalizeIngredients(ingredients) {
  if (!Array.isArray(ingredients) || ingredients.length === 0) {
    return [
      { name: "Ingrediente principale", quantity: "q.b.", category: "Altro" }
    ];
  }

  return ingredients.map(item => {
    if (typeof item === "string") {
      return {
        name: item,
        quantity: "q.b.",
        category: inferIngredientCategory(item)
      };
    }

    return {
      name: item?.name || item?.ingredient || "Ingrediente",
      quantity: item?.quantity || item?.amount || "q.b.",
      category: item?.category || inferIngredientCategory(item?.name || item?.ingredient || "")
    };
  });
}

function normalizeProcedure(procedure) {
  if (!procedure) {
    return [
      "Procedimento non disponibile per questa ricetta salvata."
    ];
  }

  if (Array.isArray(procedure)) {
    const cleanedArray = procedure
      .map(step => {
        if (typeof step === "string") {
          return step.trim();
        }

        return (
          step?.text ||
          step?.description ||
          step?.step ||
          "Passaggio non disponibile."
        ).trim();
      })
      .filter(Boolean);

    return cleanedArray.length > 0
      ? cleanedArray
      : ["Procedimento non disponibile per questa ricetta salvata."];
  }

  if (typeof procedure === "string") {
    const cleaned = procedure
      .split(/\n|\.\s+/)
      .map(step => step.trim())
      .filter(Boolean);

    return cleaned.length > 0
      ? cleaned
      : ["Procedimento non disponibile per questa ricetta salvata."];
  }

  return ["Procedimento non disponibile per questa ricetta salvata."];
}

function buildDefaultTags(recipe, category) {
  return [
    category,
    recipe?.difficulty || "Facile",
    recipe?.time || recipe?.readyInMinutes || "30 min"
  ];
}

function normalizeCategory(value) {
  const text = String(value || "").toLowerCase();

  if (
    text.includes("primo") ||
    text.includes("pasta") ||
    text.includes("riso") ||
    text.includes("risotto") ||
    text.includes("gnocchi") ||
    text.includes("lasagna")
  ) {
    return "Primi";
  }

  if (
    text.includes("second") ||
    text.includes("pollo") ||
    text.includes("carne") ||
    text.includes("pesce") ||
    text.includes("bistecca") ||
    text.includes("cotoletta")
  ) {
    return "Secondi";
  }

  if (
    text.includes("antipast") ||
    text.includes("dolc") ||
    text.includes("dessert") ||
    text.includes("torta") ||
    text.includes("tiramis") ||
    text.includes("cheesecake") ||
    text.includes("bruschetta")
  ) {
    return "Antipasti / Dolci";
  }

  return "Primi";
}

function inferCategoryFromTitle(title) {
  return normalizeCategory(title);
}

function inferIngredientCategory(name) {
  const text = String(name || "").toLowerCase();

  if (
    text.includes("pomodor") ||
    text.includes("insalata") ||
    text.includes("zucchin") ||
    text.includes("melanz") ||
    text.includes("patat") ||
    text.includes("cipoll") ||
    text.includes("carot") ||
    text.includes("broccoli") ||
    text.includes("spinaci") ||
    text.includes("frutta")
  ) {
    return "Verdura e frutta";
  }

  if (
    text.includes("pollo") ||
    text.includes("manzo") ||
    text.includes("pesce") ||
    text.includes("salmone")
  ) {
    return "Carne e pesce";
  }

  if (
    text.includes("latte") ||
    text.includes("parmig") ||
    text.includes("mozzarella") ||
    text.includes("yogurt") ||
    text.includes("burro") ||
    text.includes("ricotta")
  ) {
    return "Latticini";
  }

  if (
    text.includes("pasta") ||
    text.includes("riso") ||
    text.includes("pane") ||
    text.includes("passata") ||
    text.includes("ceci") ||
    text.includes("lenticchie") ||
    text.includes("farina") ||
    text.includes("zucchero")
  ) {
    return "Dispensa";
  }

  if (
    text.includes("tonno") ||
    text.includes("uova")
  ) {
    return "Proteine";
  }

  return "Altro";
}

function getFilteredRecipes() {
  return allRecipes.filter(recipe => {
    const matchFilter =
      currentFilter === "Tutte" || recipe.category === currentFilter;

    const searchableText = [
      recipe.title,
      recipe.description,
      recipe.category,
      ...(recipe.tags || []),
      ...(recipe.ingredients || []).map(item => item.name),
      ...(recipe.procedure || [])
    ]
      .join(" ")
      .toLowerCase();

    const matchSearch =
      currentSearch === "" || searchableText.includes(currentSearch);

    return matchFilter && matchSearch;
  });
}

function renderSavedRecipes() {
  savedRecipesGrid.innerHTML = "";

  const filteredRecipes = getFilteredRecipes();
  const visibleRecipes = filteredRecipes.slice(0, visibleLimit);

  savedTotalCount.textContent = allRecipes.length;
  savedVisibleCount.textContent = visibleRecipes.length;
  savedCurrentFilter.textContent = currentFilter;

  if (allRecipes.length === 0) {
    savedEmptyState.style.display = "block";
    savedEmptyState.innerHTML = `
      <h3>🧑‍🍳 Non hai ancora salvato ricette</h3>
      <p>
        Cerca nuove idee e salva quelle che vuoi riutilizzare per organizzare menu e spesa.
      </p>
      <div class="saved-empty-actions">
        <a href="ricerca-ricette.html" class="saved-primary-btn">Vai a Ricerca Ricette</a>
        <a href="index.html" class="saved-secondary-btn">Torna alla Home</a>
      </div>
    `;
    savedRecipesGrid.style.display = "none";
    savedLoadMoreBtn.hidden = true;
    return;
  }

  if (filteredRecipes.length === 0) {
    savedEmptyState.style.display = "block";
    savedEmptyState.innerHTML = `
      <h3>🔎 Nessun risultato trovato</h3>
      <p>Prova a cambiare filtro oppure cerca una ricetta con un altro termine.</p>
      <div class="saved-empty-actions">
        <button type="button" class="saved-secondary-btn" id="resetSavedFiltersBtn">Mostra tutto</button>
      </div>
    `;
    savedRecipesGrid.style.display = "none";
    savedLoadMoreBtn.hidden = true;

    const resetButton = document.getElementById("resetSavedFiltersBtn");
    if (resetButton) {
      resetButton.addEventListener("click", resetSavedFilters);
    }

    return;
  }

  savedEmptyState.style.display = "none";
  savedRecipesGrid.style.display = "grid";

  visibleRecipes.forEach(recipe => {
    savedRecipesGrid.appendChild(createRecipeCard(recipe));
  });

  if (filteredRecipes.length > 6) {
    savedLoadMoreBtn.hidden = false;
    savedLoadMoreBtn.textContent =
      visibleLimit >= filteredRecipes.length ? "Mostra meno" : "Mostra altre";
  } else {
    savedLoadMoreBtn.hidden = true;
  }
}

function resetSavedFilters() {
  currentFilter = "Tutte";
  currentSearch = "";
  visibleLimit = 6;
  savedSearchInput.value = "";

  savedFilterButtons.forEach(btn => {
    btn.classList.toggle("active", btn.dataset.filter === "Tutte");
  });

  renderSavedRecipes();
}

function createRecipeCard(recipe) {
  const card = document.createElement("article");
  card.className = "saved-recipe-card";

  const imageBlock = document.createElement("div");
  imageBlock.className = "saved-recipe-image";
  imageBlock.textContent = getRecipeEmoji(recipe.category);

  const body = document.createElement("div");
  body.className = "saved-recipe-body";

  const header = document.createElement("div");
  header.className = "saved-recipe-header";

  const title = document.createElement("h3");
  title.textContent = recipe.title;

  const categoryBadge = document.createElement("span");
  categoryBadge.className = "saved-category-badge";
  categoryBadge.textContent = recipe.category;

  header.appendChild(title);
  header.appendChild(categoryBadge);

  const description = document.createElement("p");
  description.className = "saved-recipe-description";
  description.textContent = recipe.description;

  const meta = document.createElement("div");
  meta.className = "saved-recipe-meta";
  meta.innerHTML = `
    <span><strong>⏱</strong> ${recipe.time}</span>
    <span><strong>👨‍🍳</strong> ${recipe.difficulty}</span>
    <span><strong>🍽</strong> ${recipe.servings} porzioni</span>
  `;

  const tagsWrap = document.createElement("div");
  tagsWrap.className = "saved-tags";

  recipe.tags.slice(0, 4).forEach(tag => {
    const pill = document.createElement("span");
    pill.className = "saved-tag-pill";
    pill.textContent = tag;
    tagsWrap.appendChild(pill);
  });

  const actions = document.createElement("div");
  actions.className = "saved-actions-grid";

  const viewButton = document.createElement("button");
  viewButton.type = "button";
  viewButton.className = "saved-primary-btn";
  viewButton.textContent = "Vedi ricetta";

  const addMenuButton = document.createElement("button");
  addMenuButton.type = "button";
  addMenuButton.className = "saved-secondary-btn";
  addMenuButton.textContent = "Aggiungi al menu";

  const addToListButton = document.createElement("button");
  addToListButton.type = "button";
  addToListButton.className = "saved-secondary-btn";
  addToListButton.textContent = "Lista spesa";

  const removeButton = document.createElement("button");
  removeButton.type = "button";
  removeButton.className = "saved-danger-btn";
  removeButton.textContent = "Rimuovi";

  actions.appendChild(viewButton);
  actions.appendChild(addMenuButton);
  actions.appendChild(addToListButton);
  actions.appendChild(removeButton);

  const recipeView = document.createElement("div");
  recipeView.className = "saved-recipe-view hidden";
  recipeView.innerHTML = `
    <h4>Ingredienti</h4>
    <ul>
      ${recipe.ingredients
        .map(item => `<li>${escapeHtml(item.name)} — ${escapeHtml(item.quantity)}</li>`)
        .join("")}
    </ul>

    <h4 class="saved-procedure-title">Procedimento</h4>
    <ol class="saved-procedure-list">
      ${recipe.procedure
        .map(step => `<li>${escapeHtml(step)}</li>`)
        .join("")}
    </ol>
  `;

  const menuBox = document.createElement("div");
  menuBox.className = "saved-menu-box";
  menuBox.innerHTML = `
    <h4>📅 Aggiungi al menu settimana</h4>
    <p>Scegli giorno e momento del pasto.</p>
    <div class="saved-menu-controls">
      <select class="saved-day-select">
        <option value="lunedi">Lunedì</option>
        <option value="martedi">Martedì</option>
        <option value="mercoledi">Mercoledì</option>
        <option value="giovedi">Giovedì</option>
        <option value="venerdi">Venerdì</option>
        <option value="sabato">Sabato</option>
        <option value="domenica">Domenica</option>
      </select>

      <select class="saved-meal-select">
        <option value="pranzo">Pranzo</option>
        <option value="cena">Cena</option>
      </select>

      <button type="button" class="saved-primary-btn saved-confirm-menu-btn">Salva</button>
    </div>
  `;

  const messageBox = document.createElement("div");
  messageBox.className = "saved-card-message";
  messageBox.style.display = "none";

  viewButton.addEventListener("click", function () {
    recipeView.classList.toggle("hidden");
  });

  addMenuButton.addEventListener("click", function () {
    menuBox.classList.toggle("active");
  });

  addToListButton.addEventListener("click", function () {
    addRecipeIngredientsToPremiumList(recipe);
    showCardMessage(messageBox, "✅ Ingredienti aggiunti alla Lista Spesa Premium.");
  });

  removeButton.addEventListener("click", function () {
    const confirmed = confirm(`Vuoi rimuovere "${recipe.title}" dalle ricette salvate?`);
    if (!confirmed) return;

    allRecipes = allRecipes.filter(item => item.id !== recipe.id);
    saveSavedRecipes(allRecipes);
    renderSavedRecipes();
  });

  const confirmMenuButton = menuBox.querySelector(".saved-confirm-menu-btn");
  const daySelect = menuBox.querySelector(".saved-day-select");
  const mealSelect = menuBox.querySelector(".saved-meal-select");

  confirmMenuButton.addEventListener("click", function () {
    addRecipeToWeeklyMenu(recipe, daySelect.value, mealSelect.value);
    showCardMessage(
      messageBox,
      `📌 "${recipe.title}" aggiunta a ${formatDay(daySelect.value)} - ${mealSelect.value}.`
    );
    menuBox.classList.remove("active");
  });

  body.appendChild(header);
  body.appendChild(description);
  body.appendChild(meta);
  body.appendChild(tagsWrap);
  body.appendChild(actions);
  body.appendChild(recipeView);
  body.appendChild(menuBox);
  body.appendChild(messageBox);

  card.appendChild(imageBlock);
  card.appendChild(body);

  return card;
}

function showCardMessage(element, text) {
  element.textContent = text;
  element.style.display = "block";

  clearTimeout(element._messageTimeout);
  element._messageTimeout = setTimeout(() => {
    element.style.display = "none";
  }, 2600);
}

function getRecipeEmoji(category) {
  if (category === "Primi") return "🍝";
  if (category === "Secondi") return "🍗";
  return "🍰";
}

function addRecipeIngredientsToPremiumList(recipe) {
  const currentList = loadPremiumList();

  const newItems = recipe.ingredients.map(item => ({
    id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    name: item.name,
    quantity: item.quantity || "q.b.",
    category: item.category || inferIngredientCategory(item.name),
    checked: false
  }));

  const updatedList = [...currentList, ...newItems];
  localStorage.setItem(PREMIUM_LIST_KEY, JSON.stringify(updatedList));
}

function loadPremiumList() {
  try {
    const raw = localStorage.getItem(PREMIUM_LIST_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (error) {
    return [];
  }
}

function addRecipeToWeeklyMenu(recipe, day, meal) {
  const menu = loadWeeklyMenu();

  if (!menu[day]) {
    menu[day] = { pranzo: null, cena: null };
  }

  menu[day][meal] = {
    id: recipe.id,
    title: recipe.title,
    category: recipe.category,
    time: recipe.time,
    difficulty: recipe.difficulty,
    servings: recipe.servings,
    ingredients: recipe.ingredients,
    procedure: recipe.procedure
  };

  localStorage.setItem(WEEKLY_MENU_KEY, JSON.stringify(menu));
}

function loadWeeklyMenu() {
  try {
    const raw = localStorage.getItem(WEEKLY_MENU_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (error) {
    console.error("Errore lettura menu settimana:", error);
  }

  return {
    lunedi: { pranzo: null, cena: null },
    martedi: { pranzo: null, cena: null },
    mercoledi: { pranzo: null, cena: null },
    giovedi: { pranzo: null, cena: null },
    venerdi: { pranzo: null, cena: null },
    sabato: { pranzo: null, cena: null },
    domenica: { pranzo: null, cena: null }
  };
}

function formatDay(dayKey) {
  const labels = {
    lunedi: "Lunedì",
    martedi: "Martedì",
    mercoledi: "Mercoledì",
    giovedi: "Giovedì",
    venerdi: "Venerdì",
    sabato: "Sabato",
    domenica: "Domenica"
  };

  return labels[dayKey] || dayKey;
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}