const form = document.getElementById("recipeForm");

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
      alert("Devi inserire esattamente 3 ingredienti.");
      return;
    }

    let resultsBox = document.getElementById("results");

    if (!resultsBox) {
      resultsBox = document.createElement("div");
      resultsBox.id = "results";
      resultsBox.className = "card";
      resultsBox.style.marginTop = "24px";
      form.parentElement.appendChild(resultsBox);
    }

    resultsBox.innerHTML = "<p>Sto generando le ricette...</p>";

    try {
      const response = await fetch("/api/recipe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          ingredients,
          maxTime,
          difficulty
        })
      });

      const data = await response.json();

      if (!response.ok) {
        resultsBox.innerHTML = `<p>Errore: ${data.error || "Qualcosa è andato storto."}</p>`;
        return;
      }

      const recipes = data.recipes || [];

      if (!recipes.length) {
        resultsBox.innerHTML = "<p>Nessuna ricetta trovata.</p>";
        return;
      }

      resultsBox.innerHTML = recipes.map((recipe) => {
        return `
          <div class="recipe-block" style="margin-bottom:24px; padding-bottom:24px; border-bottom:1px solid rgba(255,255,255,0.08);">
            <h3 style="margin-bottom:10px;">${recipe.title}</h3>
            <p><strong>Tempo:</strong> ${recipe.time_minutes} min</p>
            <p><strong>Difficoltà:</strong> ${recipe.difficulty}</p>
            <p><strong>Porzioni:</strong> ${recipe.servings}</p>
            <p><strong>Ingredienti principali:</strong> ${recipe.ingredients_used.join(", ")}</p>
            <p><strong>Extra dispensa:</strong> ${recipe.extra_pantry.join(", ")}</p>
            <div>
              <strong>Procedimento:</strong>
              <ol>
                ${recipe.steps.map(step => `<li>${step}</li>`).join("")}
              </ol>
            </div>
          </div>
        `;
      }).join("");
    } catch (error) {
      resultsBox.innerHTML = `<p>Errore di connessione al server.</p>`;
      console.error(error);
    }
  });
}