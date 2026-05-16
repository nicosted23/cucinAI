document.addEventListener("DOMContentLoaded", async function () {
  const Auth = window.CucinAIAuth;
  const token = localStorage.getItem("cucinai_auth_token");

  if (!token) {
    window.location.replace("login.html");
    return;
  }

  const accountWelcome = document.getElementById("accountWelcome");
  const accountEmail = document.getElementById("accountEmail");
  const accountPlanBadge = document.getElementById("accountPlanBadge");
  const accountStatusText = document.getElementById("accountStatusText");
  const upgradeBtnHero = document.getElementById("upgradeBtnHero");
  const savedRecipesCount = document.getElementById("savedRecipesCount");
  const shoppingListsCount = document.getElementById("shoppingListsCount");
  const weeklyMenusCount = document.getElementById("weeklyMenusCount");
  const profileName = document.getElementById("profileName");
  const profileEmail = document.getElementById("profileEmail");
  const profilePlan = document.getElementById("profilePlan");
  const profileRole = document.getElementById("profileRole");
  const profileCreatedAt = document.getElementById("profileCreatedAt");
  const accountMessage = document.getElementById("accountMessage");
  const logoutBtnTop = document.getElementById("logoutBtnTop");
  const logoutBtnCard = document.getElementById("logoutBtnCard");

  function setMessage(text) {
    if (accountMessage) {
      accountMessage.textContent = text || "";
    }
  }

  function parseSafe(value) {
    try {
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  }

  function toArray(value) {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  }

  function getLocalSavedRecipes() {
    const savedA = toArray(parseSafe(localStorage.getItem("cucinai_saved_recipes")));
    const savedB = toArray(parseSafe(localStorage.getItem("savedRecipes")));
    const savedC = toArray(parseSafe(localStorage.getItem("cucinai_savedRecipes")));

    return [...savedA, ...savedB, ...savedC];
  }

  function getLocalShoppingLists() {
    const shoppingFree = toArray(parseSafe(localStorage.getItem("cucinai_lista_spesa_free")));
    const shoppingPremium = toArray(parseSafe(localStorage.getItem("cucinai_lista_spesa_premium")));
    const shoppingPremiumAi = toArray(parseSafe(localStorage.getItem("cucinai_lista_spesa_premium_ai")));

    return [...shoppingFree, ...shoppingPremium, ...shoppingPremiumAi];
  }

  function getLocalWeeklyMenus() {
    const weeklyMenu = toArray(parseSafe(localStorage.getItem("cucinai_menu_settimana")));
    const pendingRecipe = toArray(parseSafe(localStorage.getItem("cucinai_menu_pending_recipe")));

    return [...weeklyMenu, ...pendingRecipe];
  }

  function getBestCount(backendCount, localCount) {
    const safeBackendCount = Number(backendCount || 0);
    const safeLocalCount = Number(localCount || 0);

    return Math.max(safeBackendCount, safeLocalCount);
  }

  function formatDate(isoString) {
    if (Auth && typeof Auth.formatDate === "function") {
      return Auth.formatDate(isoString);
    }

    if (!isoString) return "-";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("it-IT");
  }

  function renderUser(user) {
    const planLabel = user.plan === "premium" ? "Premium" : "Free";
    const roleLabel = user.role === "creator" ? "Creator" : "User";

    const localSavedRecipesCount = getLocalSavedRecipes().length;
    const localShoppingListsCount = getLocalShoppingLists().length;
    const localWeeklyMenusCount = getLocalWeeklyMenus().length;

    const finalSavedRecipesCount = getBestCount(
      user.stats?.savedRecipesCount,
      localSavedRecipesCount
    );

    const finalShoppingListsCount = getBestCount(
      user.stats?.shoppingListsCount,
      localShoppingListsCount
    );

    const finalWeeklyMenusCount = getBestCount(
      user.stats?.weeklyMenusCount,
      localWeeklyMenusCount
    );

    if (accountWelcome) accountWelcome.textContent = `Ciao, ${user.name || "utente"}`;
    if (accountEmail) accountEmail.textContent = user.email || "";
    if (accountPlanBadge) accountPlanBadge.textContent = `Piano ${planLabel}`;

    if (accountStatusText) {
      accountStatusText.textContent =
        user.plan === "premium"
          ? "Hai accesso alle funzioni Premium di CucinAI."
          : "Stai usando il piano Free. Puoi passare al Premium per sbloccare tutte le funzioni avanzate.";
    }

    if (upgradeBtnHero) {
      upgradeBtnHero.textContent =
        user.plan === "premium" ? "Vai agli abbonamenti" : "Passa a Premium";
    }

    if (savedRecipesCount) savedRecipesCount.textContent = String(finalSavedRecipesCount);
    if (shoppingListsCount) shoppingListsCount.textContent = String(finalShoppingListsCount);
    if (weeklyMenusCount) weeklyMenusCount.textContent = String(finalWeeklyMenusCount);

    if (profileName) profileName.textContent = user.name || "-";
    if (profileEmail) profileEmail.textContent = user.email || "-";
    if (profilePlan) profilePlan.textContent = planLabel;
    if (profileRole) profileRole.textContent = roleLabel;
    if (profileCreatedAt) profileCreatedAt.textContent = formatDate(user.createdAt);
  }

  async function loadAccount() {
    setMessage("Caricamento account...");

    try {
      let result = null;

      if (Auth && typeof Auth.apiFetch === "function") {
        result = await Auth.apiFetch("/api/account", {
          method: "GET"
        });
      } else {
        const response = await fetch("https://cucinai-login.onrender.com/api/account", {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        const data = await response.json().catch(() => ({}));

        result = {
          ok: response.ok,
          status: response.status,
          data
        };
      }

      if (!result.ok || !result.data || !result.data.account) {
        setMessage("Sessione non valida.");
        return;
      }

      localStorage.setItem("cucinai_current_user", JSON.stringify(result.data.account));
      renderUser(result.data.account);
      setMessage("");
    } catch (error) {
      console.error(error);
      setMessage("Errore durante il caricamento del profilo.");
    }
  }

  async function doLogout() {
    if (Auth && typeof Auth.logout === "function") {
      await Auth.logout();
      return;
    }

    try {
      await fetch("https://cucinai-login.onrender.com/api/auth/logout", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
    } catch (error) {
      console.error(error);
    }

    localStorage.removeItem("cucinai_auth_token");
    localStorage.removeItem("cucinai_current_user");
    window.location.replace("login.html");
  }

  if (logoutBtnTop) {
    logoutBtnTop.addEventListener("click", doLogout);
  }

  if (logoutBtnCard) {
    logoutBtnCard.addEventListener("click", doLogout);
  }

  await loadAccount();
});