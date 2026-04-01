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

function removeRecipe(recipeToRemove) {
  const saved = getSavedRecipes();
  const recipeId = makeRecipeId(recipeToRemove);
  const updated = saved.filter((item) => makeRecipeId(item) !== recipeId);
  setSavedRecipes(updated);
  renderSavedRecipes();
}

function renderSavedRecipes() {
  const container = document.getElementById("savedRecipesContainer");
  const recipes = getSavedRecipes();

  if (!recipes.length) {
    container.innerHTML = `
      <div class="recipe-empty">
        Non hai ancora salvato nessuna ricetta.
      </div>
    `;
    return;
  }

  container.innerHTML = recipes.map((recipe, index) => {
    return `
      <article class="recipe-card">
        <div class="recipe-header">
          <h3 class="recipe-title">${recipe.title}</h3>
          <button
            class="save-star saved"
            data-index="${index}"
            aria-label="Rimuovi ricetta salvata"
            title="Rimuovi ricetta salvata"
          >
            ★
          </button>
        </div>

        <div class="recipe-meta">
          <span class="recipe-pill">⏱ ${recipe.time_minutes} min</span>
          <span class="recipe-pill">🔥 ${recipe.difficulty}</span>
          <span class="recipe-pill">🍽 ${recipe.servings} porzioni</span>
        </div>

        <div class="recipe-section">
          <h4>Ingredienti principali</h4>
          <ul class="recipe-list">
            ${recipe.ingredients_used.map((item) => `<li>${item}</li>`).join("")}
          </ul>
        </div>

        <div class="recipe-section">
          <h4>Extra dispensa</h4>
          <ul class="recipe-list">
            ${recipe.extra_pantry.map((item) => `<li>${item}</li>`).join("")}
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
  }).join("");

  const removeButtons = container.querySelectorAll(".save-star");

  removeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const index = Number(button.dataset.index);
      const recipes = getSavedRecipes();
      removeRecipe(recipes[index]);
    });
  });
}

renderSavedRecipes();