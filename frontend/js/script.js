const form = document.getElementById("recipeForm");
const resultsBox = document.getElementById("results");
const regenerateBtn = document.getElementById("regenerateBtn");

let lastRequestPayload = null;

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
    button.setAttribute("aria-label", "Salva ricetta");
  } else {
    saved.push(recipe);
    setSavedRecipes(saved);
    button.textContent = "★";
    button.classList.add("saved");
    button.setAttribute("aria-label", "Ricetta salvata");
  }
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
    ${recipe.ingredients.map((item) => `<li>${item}</li>`).join("")}
  </ul>
</div>
          <div class="recipe-section">
            <h4>Procedimento</h4>
            <ol class="recipe-steps">
              ${recipe.steps.map((step) => `<li>${step}</li>`).join("")}
            </ol>
          </div>
        </article>
      `;
    })
    .join("");

  const starButtons = resultsBox.querySelectorAll(".save-star");

  starButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      const recipe = recipes[index];
      toggleSaveRecipe(recipe, button);
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