document.addEventListener("DOMContentLoaded", async function () {
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

  function formatDate(isoString) {
    if (!isoString) return "-";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("it-IT");
  }

  function renderUser(user) {
    const planLabel = user.plan === "premium" ? "Premium" : "Free";
    const roleLabel = user.role === "creator" ? "Creator" : "User";

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

    if (savedRecipesCount) savedRecipesCount.textContent = String(user.stats?.savedRecipesCount || 0);
    if (shoppingListsCount) shoppingListsCount.textContent = String(user.stats?.shoppingListsCount || 0);
    if (weeklyMenusCount) weeklyMenusCount.textContent = String(user.stats?.weeklyMenusCount || 0);

    if (profileName) profileName.textContent = user.name || "-";
    if (profileEmail) profileEmail.textContent = user.email || "-";
    if (profilePlan) profilePlan.textContent = planLabel;
    if (profileRole) profileRole.textContent = roleLabel;
    if (profileCreatedAt) profileCreatedAt.textContent = formatDate(user.createdAt);
  }

  async function loadAccount() {
    setMessage("Caricamento account...");

    try {
      const response = await fetch("https://cucinai-login.onrender.com/api/account", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.account) {
        setMessage("Sessione non valida.");
        return;
      }

      localStorage.setItem("cucinai_current_user", JSON.stringify(data.account));
      renderUser(data.account);
      setMessage("");
    } catch (error) {
      console.error(error);
      setMessage("Errore durante il caricamento del profilo.");
    }
  }

  async function doLogout() {
    try {
      await fetch("http://localhost:3001/api/auth/logout", {
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