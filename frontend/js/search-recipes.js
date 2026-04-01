const searchForm = document.getElementById("searchRecipeForm");
const searchResults = document.getElementById("searchResults");
const searchRegenerateBtn = document.getElementById("searchRegenerateBtn");

let lastSearchPayload = null;

function getSavedRecipes() {
  try {
    return JSON.parse(localStorage.getItem("savedRecipes")) || [];
  } catch {
    return [];
  }
}

function setSavedRecipes(recipes) {
  localStorage.setItem("savedRecipes", JSON.stringify(recipes));
}

function makeRecipeId(recipe) {
  return `${recipe.title}-${recipe.time_minutes}-${recipe.difficulty}`.toLowerCase();
}

function isRecipeSaved(recipe) {
  const saved = getSavedRecipes();
  const recipeId = makeRecipeId(recipe);
  return saved.some((item) => makeRecipeId(item) === recipeId);
}

function toggleSaveRecipe(recipe, button) {
  const saved = getSavedRecipes();
  const recipeId = makeRecipeId(recipe);
  const existingIndex = saved.findIndex((item) => makeRecipeId(item) === recipeId);

  if (existingIndex >= 0) {
    saved.splice(existingIndex, 1);
    setSavedRecipes(saved);
    button.textContent = "☆";
    button.classList.remove("saved");
  } else {
    saved.push(recipe);
    setSavedRecipes(saved);
    button.textContent = "★";
    button.classList.add("saved");
  }
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
            ${recipe.ingredients.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </div>

        <div class="recipe-section">
          <h4>Procedimento</h4>
          <ol class="recipe-steps">
            ${recipe.steps.map((step) => `<li>${step}</li>`).join("")}
          </ol>
        </div>

        <div class="form-actions">
          <button type="button" class="secondary-btn generate-image-btn" data-index="${index}">
            Genera foto
          </button>
        </div>

        <div class="recipe-image-container" id="recipe-image-${index}"></div>
      </article>
    `;
  }).join("");

  document.querySelectorAll(".save-star").forEach((button) => {
    button.addEventListener("click", () => {
      const recipe = recipes[Number(button.dataset.index)];
      toggleSaveRecipe(recipe, button);
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