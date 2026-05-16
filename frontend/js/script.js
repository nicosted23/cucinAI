const form = document.getElementById("recipeForm");
const resultsBox = document.getElementById("results");
const regenerateBtn = document.getElementById("regenerateBtn");
const randomGenerateBtn = document.getElementById("randomGenerateBtn");

let lastRequestPayload = null;

const AUTH_API_BASE = "https://cucinai-login.onrender.com";

const SAVED_RECIPE_KEYS = [
  "cucinai_saved_recipes",
  "savedRecipes",
  "cucinai_savedRecipes"
];

const randomIngredientsPool = [
  "uova",
  "zucchine",
  "parmigiano",
  "patate",
  "cipolla",
  "pomodori",
  "mozzarella",
  "riso",
  "pollo",
  "tonno",
  "pane",
  "spinaci",
  "funghi",
  "carote",
  "piselli",
  "prosciutto cotto",
  "ricotta",
  "melanzane",
  "peperoni",
  "pasta",
  "ceci",
  "fagioli",
  "salmone",
  "avocado",
  "limone",
  "broccoli",
  "cavolfiore",
  "olive",
  "mais",
  "latte"
];

const randomTimes = ["15", "20", "30", "45", "qualsiasi"];
const randomDifficulties = ["facile", "media", "difficile", "qualsiasi"];

function getAuthToken() {
  return localStorage.getItem("cucinai_auth_token") || "";
}

function isUserLoggedIn() {
  return Boolean(getAuthToken());
}

function getAuthHeaders() {
  return {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${getAuthToken()}`
  };
}

function getRandomUniqueIngredients(pool, count = 3) {
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

function getRandomItem(array) {
  return array[Math.floor(Math.random() * array.length)];
}

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

function makeRecipeId(recipe) {
  return `${recipe.title}-${recipe.time_minutes || recipe.time}-${recipe.difficulty}`
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");
}

function inferCategoryFromRecipe(recipe) {
  const text = `${recipe.title || ""} ${(recipe.ingredients || []).join(" ")}`.toLowerCase();

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
    text.includes("salmone") ||
    text.includes("tonno") ||
    text.includes("bistecca")
  ) {
    return "Secondi";
  }

  if (
    text.includes("dolce") ||
    text.includes("torta") ||
    text.includes("tiramis") ||
    text.includes("dessert") ||
    text.includes("bruschetta") ||
    text.includes("antipasto")
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
    text.includes("peperoni")
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
    text.includes("parmigiano") ||
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
    text.includes("fagioli") ||
    text.includes("farina")
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

function normalizeRecipeForSave(recipe) {
  return {
    id: makeRecipeId(recipe),
    title: recipe.title || "Ricetta senza titolo",
    description: recipe.description || "Ricetta generata con 3 Ingredienti di CucinAI.",
    category: recipe.category || inferCategoryFromRecipe(recipe),
    time: recipe.time || `${recipe.time_minutes || 30} min`,
    difficulty: recipe.difficulty || "Facile",
    servings: recipe.servings || 2,
    image: recipe.image || "",
    tags: Array.isArray(recipe.tags) ? recipe.tags : [
      "3 Ingredienti",
      recipe.difficulty || "Facile",
      `${recipe.time_minutes || 30} min`
    ],
    ingredients: normalizeIngredients(recipe),
    procedure: Array.isArray(recipe.steps)
      ? recipe.steps
      : Array.isArray(recipe.procedure)
        ? recipe.procedure
        : ["Procedimento non disponibile."],
    savedAt: new Date().toISOString()
  };
}

function isRecipeSaved(recipe) {
  const saved = getSavedRecipes();
  const recipeId = makeRecipeId(recipe);

  return saved.some((item) => {
    const itemId = item.id || makeRecipeId(item);
    return itemId === recipeId;
  });
}

async function saveRecipeToAccount(recipe) {
  const response = await fetch(`${AUTH_API_BASE}/api/user/saved-recipes`, {
    method: "POST",
    headers: getAuthHeaders(),
    body: JSON.stringify({ recipe })
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Errore durante il salvataggio della ricetta sull'account.");
  }

  if (Array.isArray(data.recipes)) {
    setSavedRecipes(data.recipes);
  }

  return data;
}

async function deleteRecipeFromAccount(recipeId) {
  const response = await fetch(`${AUTH_API_BASE}/api/user/saved-recipes/${encodeURIComponent(recipeId)}`, {
    method: "DELETE",
    headers: getAuthHeaders()
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.success) {
    throw new Error(data.message || "Errore durante la rimozione della ricetta dall'account.");
  }

  if (Array.isArray(data.recipes)) {
    setSavedRecipes(data.recipes);
  }

  return data;
}

async function toggleSaveRecipe(recipe, button, messageElement) {
  const saved = getSavedRecipes();
  const normalizedRecipe = normalizeRecipeForSave(recipe);
  const recipeId = normalizedRecipe.id;

  const existingIndex = saved.findIndex((item) => {
    const itemId = item.id || makeRecipeId(item);
    return itemId === recipeId;
  });

  button.disabled = true;

  try {
    if (existingIndex >= 0) {
      if (isUserLoggedIn()) {
        await deleteRecipeFromAccount(recipeId);
      } else {
        saved.splice(existingIndex, 1);
        setSavedRecipes(saved);
      }

      button.textContent = "☆";
      button.classList.remove("saved");
      button.setAttribute("aria-label", "Salva ricetta");
      button.setAttribute("title", "Salva ricetta");
      showCardMessage(messageElement, "Ricetta rimossa dalle salvate.");
    } else {
      if (isUserLoggedIn()) {
        await saveRecipeToAccount(normalizedRecipe);
      } else {
        saved.push(normalizedRecipe);
        setSavedRecipes(saved);
      }

      button.textContent = "★";
      button.classList.add("saved");
      button.setAttribute("aria-label", "Ricetta salvata");
      button.setAttribute("title", "Ricetta salvata");
      showCardMessage(messageElement, "Ricetta salvata con successo.");
    }
  } catch (error) {
    console.error(error);
    showCardMessage(messageElement, "Errore durante il salvataggio della ricetta.");
  } finally {
    button.disabled = false;
  }
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

function renderRecipes(recipes) {
  if (!recipes || !recipes.length) {
    resultsBox.innerHTML = `<div class="recipe-empty">Nessuna ricetta trovata.</div>`;
    return;
  }

  resultsBox.innerHTML = recipes
    .map((recipe, index) => {
      const saved = isRecipeSaved(recipe);

      return `
        <article class="recipe-card">
          <div class="recipe-header">
            <h3 class="recipe-title">${recipe.title}</h3>
            <button
              class="save-star ${saved ? "saved" : ""}"
              data-index="${index}"
              aria-label="${saved ? "Ricetta salvata" : "Salva ricetta"}"
              title="${saved ? "Ricetta salvata" : "Salva ricetta"}"
            >
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

          <div class="three-ingredient-message" id="recipe-message-${index}" style="display:none;"></div>
        </article>
      `;
    })
    .join("");

  const starButtons = resultsBox.querySelectorAll(".save-star");

  starButtons.forEach((button) => {
    button.addEventListener("click", async () => {
      const index = Number(button.dataset.index);
      const recipe = recipes[index];
      const messageElement = document.getElementById(`recipe-message-${index}`);
      await toggleSaveRecipe(recipe, button, messageElement);
    });
  });
}

async function generateRecipes(payload) {
  resultsBox.innerHTML = `<div class="recipe-loading">Sto generando le ricette...</div>`;

  try {
    const response = await fetch("/api/recipe", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!response.ok) {
      resultsBox.innerHTML = `<div class="recipe-error">Errore: ${data.error || "Qualcosa è andato storto."}</div>`;
      return;
    }

    renderRecipes(data.recipes || []);
  } catch (error) {
    console.error(error);
    resultsBox.innerHTML = `<div class="recipe-error">Errore di connessione al server.</div>`;
  }
}

if (form) {
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const ingredient1 = document.getElementById("ingredient1").value.trim();
    const ingredient2 = document.getElementById("ingredient2").value.trim();
    const ingredient3 = document.getElementById("ingredient3").value.trim();
    const maxTime = document.getElementById("maxTime").value;
    const difficulty = document.getElementById("difficulty").value;

    const ingredients = [ingredient1, ingredient2, ingredient3].filter(Boolean);

    if (ingredients.length !== 3) {
      resultsBox.innerHTML = `<div class="recipe-error">Devi inserire esattamente 3 ingredienti.</div>`;
      return;
    }

    lastRequestPayload = {
      ingredients,
      maxTime,
      difficulty
    };

    await generateRecipes(lastRequestPayload);
  });
}

if (regenerateBtn) {
  regenerateBtn.addEventListener("click", async () => {
    if (!lastRequestPayload) {
      resultsBox.innerHTML = `<div class="recipe-error">Genera prima almeno una volta le ricette.</div>`;
      return;
    }

    await generateRecipes(lastRequestPayload);
  });
}

if (randomGenerateBtn) {
  randomGenerateBtn.addEventListener("click", async () => {
    const [ingredient1, ingredient2, ingredient3] = getRandomUniqueIngredients(randomIngredientsPool, 3);
    const maxTime = getRandomItem(randomTimes);
    const difficulty = getRandomItem(randomDifficulties);

    document.getElementById("ingredient1").value = ingredient1;
    document.getElementById("ingredient2").value = ingredient2;
    document.getElementById("ingredient3").value = ingredient3;
    document.getElementById("maxTime").value = maxTime;
    document.getElementById("difficulty").value = difficulty;

    lastRequestPayload = {
      ingredients: [ingredient1, ingredient2, ingredient3],
      maxTime,
      difficulty
    };

    await generateRecipes(lastRequestPayload);
  });
}