const SAVED_RECIPES_KEYS = ["cucinai_saved_recipes", "savedRecipes", "cucinai_savedRecipes"];
const MENU_PENDING_KEY = "cucinai_menu_pending_recipe";
const PREMIUM_LIST_KEY = "cucinai_lista_spesa_premium";

const dayLabels = {
  lunedi: "Lunedì",
  martedi: "Martedì",
  mercoledi: "Mercoledì",
  giovedi: "Giovedì",
  venerdi: "Venerdì",
  sabato: "Sabato",
  domenica: "Domenica"
};

let recipeLibrary = loadRecipeLibrary();
let customWeek = createEmptyWeek();

const menuRecipeLibrary = document.getElementById("menuRecipeLibrary");
const menuCreateWeek = document.getElementById("menuCreateWeek");
const saveManualMenuToShoppingList = document.getElementById("saveManualMenuToShoppingList");
const menuCreateMessage = document.getElementById("menuCreateMessage");

renderRecipeLibrary();
renderWeek();

saveManualMenuToShoppingList.addEventListener("click", function () {
  const current = JSON.parse(localStorage.getItem(PREMIUM_LIST_KEY) || "[]");
  const items = [];

  Object.values(customWeek).forEach(day => {
    ["pranzo", "cena"].forEach(meal => {
      const recipe = day[meal];
      if (recipe && Array.isArray(recipe.ingredients)) {
        recipe.ingredients.forEach(item => {
          items.push({
            id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
            name: item.name,
            quantity: item.quantity || "q.b.",
            category: item.category || "Altro",
            checked: false
          });
        });
      }
    });
  });

  localStorage.setItem(PREMIUM_LIST_KEY, JSON.stringify([...current, ...items]));
  showMessage("✅ Ingredienti del menu personalizzato inviati alla Lista Spesa Premium.");
});

function loadRecipeLibrary() {
  let recipes = [];

  for (const key of SAVED_RECIPES_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
          recipes = [...recipes, ...parsed];
        }
      }
    } catch (error) {}
  }

  try {
    const pendingRaw = localStorage.getItem(MENU_PENDING_KEY);
    if (pendingRaw) {
      const pendingRecipe = JSON.parse(pendingRaw);
      recipes.unshift(pendingRecipe);
    }
  } catch (error) {}

  const unique = [];
  const seen = new Set();

  recipes.forEach(recipe => {
    const id = recipe.id || recipe.title;
    if (!seen.has(id)) {
      seen.add(id);
      unique.push(recipe);
    }
  });

  return unique;
}

function createEmptyWeek() {
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

function renderRecipeLibrary() {
  if (!recipeLibrary.length) {
    menuRecipeLibrary.innerHTML = `<p>Nessuna ricetta disponibile. Salva prima una ricetta o aggiungila dalla ricerca.</p>`;
    return;
  }

  menuRecipeLibrary.innerHTML = recipeLibrary.map((recipe, index) => `
    <article class="menu-library-card">
      <h4>${recipe.title}</h4>
      <div class="menu-library-meta">${recipe.category || "Ricetta"} • ${recipe.time || recipe.time_minutes || "30 min"}</div>
      <p>${recipe.description || "Ricetta disponibile per il tuo menu personalizzato."}</p>
      <div class="menu-library-actions">
        <button type="button" class="menu-create-secondary-btn add-to-meal-btn" data-index="${index}" data-day="lunedi" data-meal="pranzo">
          Aggiungi a un pasto
        </button>
      </div>
    </article>
  `).join("");

  document.querySelectorAll(".add-to-meal-btn").forEach(button => {
    button.addEventListener("click", function () {
      const recipe = recipeLibrary[Number(button.dataset.index)];
      openMealChoice(recipe);
    });
  });
}

function openMealChoice(recipe) {
  const day = prompt("In quale giorno vuoi inserirla? Scrivi: lunedi, martedi, mercoledi, giovedi, venerdi, sabato, domenica");
  if (!day || !customWeek[day]) return;

  const meal = prompt("In quale pasto? Scrivi: pranzo oppure cena");
  if (!meal || !["pranzo", "cena"].includes(meal)) return;

  customWeek[day][meal] = recipe;
  renderWeek();
  showMessage(`📌 "${recipe.title}" aggiunta a ${dayLabels[day]} - ${meal}.`);
}

function renderWeek() {
  menuCreateWeek.innerHTML = Object.keys(customWeek).map(day => `
    <article class="menu-create-day-card">
      <h4>${dayLabels[day]}</h4>

      <div class="menu-slot-box">
        <span class="meal-label">Pranzo</span>
        <p>${customWeek[day].pranzo ? customWeek[day].pranzo.title : "Nessuna ricetta selezionata"}</p>
      </div>

      <div class="menu-slot-box">
        <span class="meal-label">Cena</span>
        <p>${customWeek[day].cena ? customWeek[day].cena.title : "Nessuna ricetta selezionata"}</p>
      </div>
    </article>
  `).join("");
}

function showMessage(text) {
  menuCreateMessage.textContent = text;
  menuCreateMessage.style.display = "block";
  setTimeout(() => {
    menuCreateMessage.style.display = "none";
  }, 2600);
}