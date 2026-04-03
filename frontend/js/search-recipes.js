const searchForm = document.getElementById("searchRecipeForm");
const searchResults = document.getElementById("searchResults");
const searchRegenerateBtn = document.getElementById("searchRegenerateBtn");

let lastSearchPayload = null;

const SAVED_RECIPE_KEYS = [
  "cucinai_saved_recipes",
  "savedRecipes",
  "cucinai_savedRecipes"
];

const CUSTOM_MENU_PENDING_KEY = "cucinai_menu_pending_recipe";

function getSavedRecipes() {
  for (const key of SAVED_RECIPE_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          return parsed;
        }
      }
    } catch (error) {
      console.error(`Errore lettura ricette salvate da ${key}:`, error);
    }
  }

  return [];
}

function setSavedRecipes(recipes) {
  SAVED_RECIPE_KEYS.forEach((key) => {
    localStorage.setItem(key, JSON.stringify(recipes));
  });
}

function normalizeCategory(recipe) {
  const text = `${recipe.title || ""} ${recipe.query || ""}`.toLowerCase();

  if (
    text.includes("pasta") ||
    text.includes("riso") ||
    text.includes("risotto") ||
    text.includes("lasagna") ||
    text.includes("gnocchi")
  ) {
    return "Primi";
  }

  if (
    text.includes("pollo") ||
    text.includes("carne") ||
    text.includes("pesce") ||
    text.includes("bistecca") ||
    text.includes("cotoletta")
  ) {
    return "Secondi";
  }

  if (
    text.includes("dolce") ||
    text.includes("torta") ||
    text.includes("tiramis") ||
    text.includes("cheesecake") ||
    text.includes("antipasto") ||
    text.includes("bruschetta")
  ) {
    return "Antipasti / Dolci";
  }

  return "Primi";
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

function normalizeIngredients(recipe) {
  if (!Array.isArray(recipe.ingredients)) {
    return [];
  }

  return recipe.ingredients.map((item) => {
    if (typeof item === "string") {
      return {
        name: item,
        quantity: "q.b.",
        category: inferIngredientCategory(item)
      };
    }

    return {
      name: item.name || item.ingredient || "Ingrediente",
      quantity: item.quantity || item.amount || "q.b.",
      category: item.category || inferIngredientCategory(item.name || item.ingredient || "")
    };
  });
}

function normalizeProcedure(recipe) {
  const source = recipe.procedure || recipe.instructions || recipe.steps || recipe.method || recipe.preparation;

  if (!source) {
    return ["Procedimento non disponibile."];
  }

  if (Array.isArray(source)) {
    return source.map((step) => {
      if (typeof step === "string") return step;
      return step.text || step.description || step.step || "Passaggio non disponibile.";
    });
  }

  if (typeof source === "string") {
    const cleaned = source
      .split(/\n|\.\s+/)
      .map((step) => step.trim())
      .filter(Boolean);

    return cleaned.length ? cleaned : ["Procedimento non disponibile."];
  }

  return ["Procedimento non disponibile."];
}

function normalizeRecipeForSave(recipe) {
  return {
    id: makeRecipeId(recipe),
    title: recipe.title || "Ricetta senza titolo",
    description: recipe.description || `Ricetta trovata con Ricerca Ricette di CucinAI.`,
    category: recipe.category || normalizeCategory(recipe),
    time: recipe.time || `${recipe.time_minutes || 30} min`,
    difficulty: recipe.difficulty || "Facile",
    servings: recipe.servings || 2,
    image: recipe.image || "",
    tags: Array.isArray(recipe.tags) ? recipe.tags : [
      recipe.mode || "Ricerca",
      recipe.difficulty || "Facile",
      `${recipe.time_minutes || 30} min`
    ],
    ingredients: normalizeIngredients(recipe),
    procedure: normalizeProcedure(recipe)
  };
}

function makeRecipeId(recipe) {
  return `${recipe.title}-${recipe.time_minutes || recipe.time}-${recipe.difficulty}`.toLowerCase();
}

function isRecipeSaved(recipe) {
  const saved = getSavedRecipes();
  const recipeId = makeRecipeId(recipe);
  return saved.some((item) => (item.id || makeRecipeId(item)) === recipeId);
}

function toggleSaveRecipe(recipe, button, messageElement) {
  const saved = getSavedRecipes();
  const normalizedRecipe = normalizeRecipeForSave(recipe);
  const recipeId = normalizedRecipe.id;

  const existingIndex = saved.findIndex((item) => (item.id || makeRecipeId(item)) === recipeId);

  if (existingIndex >= 0) {
    saved.splice(existingIndex, 1);
    setSavedRecipes(saved);
    button.textContent = "☆";
    button.classList.remove("saved");
    showCardMessage(messageElement, "Ricetta rimossa dalle salvate.");
  } else {
    saved.push(normalizedRecipe);
    setSavedRecipes(saved);
    button.textContent = "★";
    button.classList.add("saved");
    showCardMessage(messageElement, "Ricetta salvata con successo.");
  }
}

function addRecipeToCustomMenu(recipe, messageElement) {
  const normalizedRecipe = normalizeRecipeForSave(recipe);
  localStorage.setItem(CUSTOM_MENU_PENDING_KEY, JSON.stringify(normalizedRecipe));
  showCardMessage(messageElement, "📌 Ricetta aggiunta al menu personalizzato.");
}

function showCardMessage(element, text) {
  if (!element) return;

  element.textContent = text;
  element.style.display = "block";

  clearTimeout(element._messageTimeout);
  element._messageTimeout = setTimeout(() => {
    element.style.display = "none";
  }, 2600);
}

async function generateRecipeImage(recipe, button, imageContainer) {
  button.disabled = true;
  button.textContent = "Genero foto...";

  try {
    const response = await fetch("/api/generate-recipe-image", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ recipe })
    });

    const data = await response.json();

    if (!response.ok) {
      imageContainer.innerHTML = `<div class="recipe-error">Errore nella generazione dell'immagine.</div>`;
      button.disabled = false;
      button.textContent = "Genera foto";
      return;
    }

    imageContainer.innerHTML = `
      <img src="${data.imageUrl}" alt="Immagine della ricetta" class="recipe-generated-image" />
    `;

    button.disabled = false;
    button.textContent = "Rigenera foto";
  } catch (error) {
    console.error(error);
    imageContainer.innerHTML = `<div class="recipe-error">Errore di connessione durante la generazione immagine.</div>`;
    button.disabled = false;
    button.textContent = "Genera foto";
  }
}

function renderSearchRecipes(recipes) {
  if (!recipes || !recipes.length) {
    searchResults.innerHTML = `<div class="recipe-empty">Nessuna ricetta trovata.</div>`;
    return;
  }

  searchResults.innerHTML = recipes.map((recipe, index) => {
    const saved = isRecipeSaved(recipe);

    return `
      <article class="recipe-card">
        <div class="recipe-header">
          <h3 class="recipe-title">${recipe.title}</h3>
          <button class="save-star ${saved ? "saved" : ""}" data-index="${index}">
            ${saved ? "★" : "☆"}
          </button>
        </div>

        <div class="recipe-meta">
          <span class="recipe-pill">⏱ ${recipe.time_minutes} min</span>
          <span class="recipe-pill">🔥 ${recipe.difficulty}</span>
          <span class="recipe-pill">🍽 ${recipe.servings} porzioni</span>
        </div>

        <div class="recipe-section">
          <h4>Ingredienti</h4>
          <ul class="recipe-list">
            ${recipe.ingredients.map((item) => `<li>${typeof item === "string" ? item : `${item.name} — ${item.quantity || "q.b."}`}</li>`).join("")}
          </ul>
        </div>

        <div class="recipe-section">
          <h4>Procedimento</h4>
          <ol class="recipe-steps">
            ${recipe.steps.map((step) => `<li>${step}</li>`).join("")}
          </ol>
        </div>

        <div class="form-actions">
          <button type="button" class="search-image-btn generate-image-btn" data-index="${index}">
            Genera foto
          </button>
          <button type="button" class="search-menu-btn add-menu-btn" data-index="${index}">
            Aggiungi a menu personalizzato
          </button>
        </div>

        <div class="recipe-image-container" id="recipe-image-${index}"></div>
        <div class="search-recipe-message" id="recipe-message-${index}" style="display:none;"></div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".save-star").forEach((button) => {
    button.addEventListener("click", () => {
      const recipe = recipes[Number(button.dataset.index)];
      const messageElement = document.getElementById(`recipe-message-${button.dataset.index}`);
      toggleSaveRecipe(recipe, button, messageElement);
    });
  });

  document.querySelectorAll(".generate-image-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      const recipe = recipes[index];
      const imageContainer = document.getElementById(`recipe-image-${index}`);
      generateRecipeImage(recipe, button, imageContainer);
    });
  });

  document.querySelectorAll(".add-menu-btn").forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      const recipe = recipes[index];
      const messageElement = document.getElementById(`recipe-message-${index}`);
      addRecipeToCustomMenu(recipe, messageElement);
    });
  });
}

async function searchRecipes(payload) {
  searchResults.innerHTML = `<div class="recipe-loading">Sto cercando le ricette...</div>`;

  try {
    const response = await fetch("/api/search-recipes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      searchResults.innerHTML = `<div class="recipe-error">Errore: ${data.error || "Qualcosa è andato storto."}</div>`;
      return;
    }

    renderSearchRecipes(data.recipes || []);
  } catch (error) {
    console.error(error);
    searchResults.innerHTML = `<div class="recipe-error">Errore di connessione al server.</div>`;
  }
}

if (searchForm) {
  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const query = document.getElementById("recipeQuery").value.trim();
    const maxTime = document.getElementById("searchMaxTime").value;
    const difficulty = document.getElementById("searchDifficulty").value;
    const mode = document.getElementById("searchMode").value;

    if (!query) {
      searchResults.innerHTML = `<div class="recipe-error">Inserisci cosa vuoi cucinare.</div>`;
      return;
    }

    lastSearchPayload = { query, maxTime, difficulty, mode };
    await searchRecipes(lastSearchPayload);
  });
}

if (searchRegenerateBtn) {
  searchRegenerateBtn.addEventListener("click", async () => {
    if (!lastSearchPayload) {
      searchResults.innerHTML = `<div class="recipe-error">Fai prima una ricerca.</div>`;
      return;
    }

    await searchRecipes(lastSearchPayload);
  });
}