const menuAiForm = document.getElementById("menuAiForm");
const menuAiMeta = document.getElementById("menuAiMeta");
const menuAiOutput = document.getElementById("menuAiOutput");
const saveAiMenuToShoppingList = document.getElementById("saveAiMenuToShoppingList");
const menuAiMessage = document.getElementById("menuAiMessage");

let generatedMenuWeek = null;

const aiDayLabels = ["Lunedì", "Martedì", "Mercoledì", "Giovedì", "Venerdì", "Sabato", "Domenica"];

menuAiForm.addEventListener("submit", async function (event) {
  event.preventDefault();

  const submitButton = menuAiForm.querySelector('button[type="submit"]');
  submitButton.disabled = true;
  submitButton.textContent = "Generazione in corso...";

  const payload = {
    people: document.getElementById("menuAiPeople").value,
    days: document.getElementById("menuAiDays").value,
    style: document.getElementById("menuAiStyle").value,
    budget: document.getElementById("menuAiBudget").value,
    meals: document.getElementById("menuAiMeals").value,
    preferences: document.getElementById("menuAiPreferences").value.trim(),
    calories: document.getElementById("menuAiCalories").value.trim(),
    proteinPriority: document.getElementById("menuAiProtein").value,
    cookingTime: document.getElementById("menuAiCookingTime").value
  };

  try {
    const response = await fetch("/api/genera-menu-settimanale-ai", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || "Errore nella generazione AI del menu.");
    }

    generatedMenuWeek = result.data.week;
    menuAiMeta.textContent = result.data.meta;
    renderGeneratedWeek(generatedMenuWeek);
    saveAiMenuToShoppingList.disabled = false;
  } catch (error) {
    console.error(error);
    menuAiOutput.innerHTML = `<p>Errore durante la generazione del menu AI.</p>`;
    saveAiMenuToShoppingList.disabled = true;
  } finally {
    submitButton.disabled = false;
    submitButton.textContent = "Genera menu con AI";
  }
});

saveAiMenuToShoppingList.addEventListener("click", function () {
  if (!generatedMenuWeek) return;

  const current = JSON.parse(localStorage.getItem("cucinai_lista_spesa_premium") || "[]");
  const items = [];

  generatedMenuWeek.forEach(day => {
    [day.pranzo, day.cena].forEach(meal => {
      if (meal && Array.isArray(meal.ingredients)) {
        meal.ingredients.forEach(item => {
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

  localStorage.setItem("cucinai_lista_spesa_premium", JSON.stringify([...current, ...items]));
  menuAiMessage.textContent = "✅ Ingredienti del menu AI inviati alla Lista Spesa Premium.";
  menuAiMessage.style.display = "block";
  setTimeout(() => {
    menuAiMessage.style.display = "none";
  }, 2600);
});

function renderGeneratedWeek(week) {
  menuAiOutput.innerHTML = week.map(day => `
    <article class="menu-ai-day-card">
      <h4>${day.day}</h4>
      <p><strong>Pranzo:</strong> ${day.pranzo.title}</p>
      <p><strong>Cena:</strong> ${day.cena.title}</p>
    </article>
  `).join("");
}