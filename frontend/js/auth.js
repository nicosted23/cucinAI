(function () {
  const API_BASE = "https://cucinai-login.onrender.com";

  const TOKEN_KEY = "cucinai_auth_token";
  const USER_KEY = "cucinai_current_user";
  const POST_LOGIN_REDIRECT_KEY = "cucinai_post_login_redirect";

  // ==================================================
  // TOKEN
  // ==================================================

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function setToken(token) {
    if (!token) return;
    localStorage.setItem(TOKEN_KEY, token);
  }

  function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  // ==================================================
  // USER
  // ==================================================

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      console.error("Errore lettura current user:", error);
      return null;
    }
  }

  function setCurrentUser(user) {
    if (!user) return;
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  }

  function removeCurrentUser() {
    localStorage.removeItem(USER_KEY);
  }

  function saveAuth(token, user) {
    setToken(token);
    setCurrentUser(user);
  }

  function clearAuth() {
    removeToken();
    removeCurrentUser();
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
  }

  // ==================================================
  // AUTH STATUS
  // ==================================================

  function isAuthenticated() {
    return !!getToken();
  }

  function getUserPlan() {
    const user = getCurrentUser();
    return user && user.plan ? user.plan : "free";
  }

  function isFree() {
    return getUserPlan() === "free";
  }

  function isPremium() {
    return getUserPlan() === "premium";
  }

  function getUserDisplayName() {
    const user = getCurrentUser();

    if (!user) return "";

    return (
      user.name ||
      user.nome ||
      user.username ||
      user.email ||
      "Account"
    );
  }

  // ==================================================
  // API
  // ==================================================

  function getAuthHeaders() {
    const token = getToken();

    const headers = {
      "Content-Type": "application/json"
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return headers;
  }

  async function apiFetch(url, options = {}) {
    const token = getToken();

    const finalOptions = {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    };

    try {
      const response = await fetch(`${API_BASE}${url}`, finalOptions);
      const data = await response.json().catch(() => ({}));

      return {
        ok: response.ok,
        status: response.status,
        data
      };
    } catch (error) {
      console.error("Errore apiFetch:", error);

      return {
        ok: false,
        status: 0,
        data: {
          message: "Errore di connessione al server."
        }
      };
    }
  }

  async function fetchMe() {
    if (!isAuthenticated()) {
      removeCurrentUser();
      updateAuthUI();
      return null;
    }

    const result = await apiFetch("/api/auth/me", {
      method: "GET"
    });

    if (result.ok && result.data && result.data.user) {
      setCurrentUser(result.data.user);
      updateAuthUI();
      return result.data.user;
    }

    if (result.status === 401 || result.status === 403) {
      clearAuth();
      updateAuthUI();
    }

    return null;
  }

  // ==================================================
  // REDIRECT LOGIN
  // ==================================================

  function setPostLoginRedirect(url) {
    if (!url) return;

    sessionStorage.setItem(POST_LOGIN_REDIRECT_KEY, url);
  }

  function getPostLoginRedirect() {
    return sessionStorage.getItem(POST_LOGIN_REDIRECT_KEY) || "";
  }

  function consumePostLoginRedirect() {
    const url = getPostLoginRedirect();
    sessionStorage.removeItem(POST_LOGIN_REDIRECT_KEY);
    return url;
  }

  function getCurrentPageFile() {
    const path = window.location.pathname;
    return path.split("/").pop() || "index.html";
  }

  function redirectAfterLogin(defaultUrl = "account.html") {
    const redirectUrl = consumePostLoginRedirect();
    window.location.href = redirectUrl || defaultUrl;
  }

  function goToLogin(redirectUrl) {
    setPostLoginRedirect(redirectUrl || getCurrentPageFile());
    window.location.href = "login.html";
  }

  function goToAccount() {
    window.location.href = "account.html";
  }

  function goToAbbonamenti() {
    window.location.href = "abbonamenti.html";
  }

  // ==================================================
  // PROTEZIONE PAGINE / FUNZIONI
  // ==================================================

  function requireAuthPage() {
    if (!isAuthenticated()) {
      goToLogin(getCurrentPageFile());
      return false;
    }

    return true;
  }

  function requireLogin() {
    return requireAuthPage();
  }

  function requirePremium(options = {}) {
    const redirect = options.redirect !== false;

    if (!isAuthenticated()) {
      if (redirect) {
        goToLogin(getCurrentPageFile());
      }

      return false;
    }

    if (!isPremium()) {
      if (redirect) {
        goToAbbonamenti();
      }

      return false;
    }

    return true;
  }

  function canUsePremium() {
    return isAuthenticated() && isPremium();
  }

  // ==================================================
  // LOCAL DATA IMPORT
  // ==================================================

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

  function collectLocalData() {
    const savedA = toArray(parseSafe(localStorage.getItem("cucinai_saved_recipes")));
    const savedB = toArray(parseSafe(localStorage.getItem("savedRecipes")));
    const savedC = toArray(parseSafe(localStorage.getItem("cucinai_savedRecipes")));

    const shoppingFree = toArray(parseSafe(localStorage.getItem("cucinai_lista_spesa_free")));
    const shoppingPremium = toArray(parseSafe(localStorage.getItem("cucinai_lista_spesa_premium")));
    const shoppingPremiumAi = toArray(parseSafe(localStorage.getItem("cucinai_lista_spesa_premium_ai")));

    const weeklyMenu = toArray(parseSafe(localStorage.getItem("cucinai_menu_settimana")));
    const pendingRecipe = toArray(parseSafe(localStorage.getItem("cucinai_menu_pending_recipe")));

    return {
      savedRecipes: [...savedA, ...savedB, ...savedC],
      shoppingLists: [...shoppingFree, ...shoppingPremium, ...shoppingPremiumAi],
      weeklyMenus: [...weeklyMenu, ...pendingRecipe]
    };
  }

  async function importLocalDataIfAuthenticated() {
    if (!isAuthenticated()) return;

    const payload = collectLocalData();

    const hasData =
      (payload.savedRecipes && payload.savedRecipes.length) ||
      (payload.shoppingLists && payload.shoppingLists.length) ||
      (payload.weeklyMenus && payload.weeklyMenus.length);

    if (!hasData) return;

    try {
      const result = await apiFetch("/api/account/import-local-data", {
        method: "POST",
        body: JSON.stringify(payload)
      });

      if (result.ok && result.data && result.data.user) {
        setCurrentUser(result.data.user);
        updateAuthUI();
      }
    } catch (error) {
      console.error("Errore import local data:", error);
    }
  }

  // ==================================================
  // LOGOUT
  // ==================================================

  async function logout() {
    try {
      if (isAuthenticated()) {
        await apiFetch("/api/auth/logout", {
          method: "POST"
        });
      }
    } catch (error) {
      console.error("Errore logout:", error);
    } finally {
      clearAuth();
      updateAuthUI();
      window.location.href = "login.html";
    }
  }

  // ==================================================
  // UTILS
  // ==================================================

  function formatDate(isoString) {
    if (!isoString) return "-";

    const date = new Date(isoString);

    if (Number.isNaN(date.getTime())) return "-";

    return date.toLocaleDateString("it-IT");
  }

  function normalizePlanLabel(plan) {
    if (plan === "premium") return "Premium";
    return "Free";
  }

  // ==================================================
  // UI ACCOUNT / NAVBAR
  // ==================================================
  // Questa funzione prova ad aggiornare elementi comuni se esistono.
  // Non rompe le pagine che non hanno questi elementi.

  function updateAuthUI() {
    const user = getCurrentUser();
    const logged = isAuthenticated() && !!user;
    const displayName = getUserDisplayName();
    const plan = getUserPlan();

    const authButtons = document.querySelectorAll("[data-auth-button]");
    const accountLinks = document.querySelectorAll("[data-account-link]");
    const logoutButtons = document.querySelectorAll("[data-logout-button]");
    const userNameElements = document.querySelectorAll("[data-user-name]");
    const userEmailElements = document.querySelectorAll("[data-user-email]");
    const userPlanElements = document.querySelectorAll("[data-user-plan]");
    const guestOnlyElements = document.querySelectorAll("[data-guest-only]");
    const authOnlyElements = document.querySelectorAll("[data-auth-only]");
    const premiumOnlyElements = document.querySelectorAll("[data-premium-only]");
    const freeOnlyElements = document.querySelectorAll("[data-free-only]");

    authButtons.forEach((button) => {
      if (logged) {
        button.textContent = displayName || "Account";
        button.setAttribute("href", "account.html");
      } else {
        button.textContent = "Accedi";
        button.setAttribute("href", "login.html");
      }
    });

    accountLinks.forEach((link) => {
      link.style.display = logged ? "" : "none";
    });

    logoutButtons.forEach((button) => {
      button.style.display = logged ? "" : "none";

      if (!button.dataset.logoutReady) {
        button.dataset.logoutReady = "true";
        button.addEventListener("click", function (event) {
          event.preventDefault();
          logout();
        });
      }
    });

    userNameElements.forEach((element) => {
      element.textContent = logged ? displayName : "Ospite";
    });

    userEmailElements.forEach((element) => {
      element.textContent = logged && user && user.email ? user.email : "";
    });

    userPlanElements.forEach((element) => {
      element.textContent = logged ? normalizePlanLabel(plan) : "Free";
    });

    guestOnlyElements.forEach((element) => {
      element.style.display = logged ? "none" : "";
    });

    authOnlyElements.forEach((element) => {
      element.style.display = logged ? "" : "none";
    });

    premiumOnlyElements.forEach((element) => {
      element.style.display = logged && isPremium() ? "" : "none";
    });

    freeOnlyElements.forEach((element) => {
      element.style.display = !logged || isFree() ? "" : "none";
    });
  }

  function initAuthUI(options = {}) {
    updateAuthUI();

    if (options.refresh !== false && isAuthenticated()) {
      fetchMe();
    }

    if (options.importLocalData === true && isAuthenticated()) {
      importLocalDataIfAuthenticated();
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    initAuthUI({
      refresh: true,
      importLocalData: false
    });
  });

  // ==================================================
  // EXPORT GLOBALE
  // ==================================================

  window.CucinAIAuth = {
    API_BASE,

    TOKEN_KEY,
    USER_KEY,

    getToken,
    setToken,
    removeToken,

    getCurrentUser,
    setCurrentUser,
    removeCurrentUser,

    saveAuth,
    clearAuth,

    isAuthenticated,
    isFree,
    isPremium,
    getUserPlan,
    getUserDisplayName,

    getAuthHeaders,
    apiFetch,
    fetchMe,

    setPostLoginRedirect,
    getPostLoginRedirect,
    consumePostLoginRedirect,
    redirectAfterLogin,
    goToLogin,
    goToAccount,
    goToAbbonamenti,

    requireAuthPage,
    requireLogin,
    requirePremium,
    canUsePremium,

    collectLocalData,
    importLocalDataIfAuthenticated,

    logout,

    formatDate,
    normalizePlanLabel,

    updateAuthUI,
    initAuthUI
  };
})();