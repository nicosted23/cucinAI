(function () {
  const API_BASE = "https://cucinai-login.onrender.com";
  const TOKEN_KEY = "cucinai_auth_token";
  const USER_KEY = "cucinai_current_user";

  function getToken() {
    return localStorage.getItem(TOKEN_KEY) || "";
  }

  function setToken(token) {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    }
  }

  function removeToken() {
    localStorage.removeItem(TOKEN_KEY);
  }

  function getCurrentUser() {
    try {
      const raw = localStorage.getItem(USER_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  }

  function setCurrentUser(user) {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    }
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
  }

  function isAuthenticated() {
    return !!getToken();
  }

  function isPremium() {
    const user = getCurrentUser();
    return !!user && user.plan === "premium";
  }

  function getAuthHeaders() {
    const token = getToken();
    return token
      ? {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        }
      : {
          "Content-Type": "application/json"
        };
  }

  async function apiFetch(url, options = {}) {
    const finalOptions = {
      ...options,
      headers: {
        ...(options.headers || {}),
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {})
      }
    };

    const response = await fetch(`${API_BASE}${url}`, finalOptions);
    const data = await response.json().catch(() => ({}));

    return {
      ok: response.ok,
      status: response.status,
      data
    };
  }

  function setPostLoginRedirect(url) {
    if (url) {
      sessionStorage.setItem("cucinai_post_login_redirect", url);
    }
  }

  function getPostLoginRedirect() {
    return sessionStorage.getItem("cucinai_post_login_redirect") || "";
  }

  function consumePostLoginRedirect() {
    const url = getPostLoginRedirect();
    sessionStorage.removeItem("cucinai_post_login_redirect");
    return url;
  }

  function redirectAfterLogin(defaultUrl = "account.html") {
    const redirectUrl = consumePostLoginRedirect();
    window.location.href = redirectUrl || defaultUrl;
  }

  function formatDate(isoString) {
    if (!isoString) return "-";
    const date = new Date(isoString);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("it-IT");
  }

  function collectLocalData() {
  const parseSafe = (value) => {
    try {
      return value ? JSON.parse(value) : null;
    } catch (error) {
      return null;
    }
  };

  const toArray = (value) => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    return [value];
  };

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
      }
    } catch (error) {
      console.error("Errore import local data:", error);
    }
  }

  async function fetchMe() {
    const result = await apiFetch("/api/auth/me", {
      method: "GET"
    });

    if (result.ok && result.data && result.data.user) {
      setCurrentUser(result.data.user);
      return result.data.user;
    }

    if (result.status === 401) {
      clearAuth();
    }

    return null;
  }

  async function logout() {
    try {
      await apiFetch("/api/auth/logout", {
        method: "POST"
      });
    } catch (error) {
      console.error("Errore logout:", error);
    } finally {
      clearAuth();
      window.location.href = "login.html";
    }
  }

  function requireAuthPage() {
    if (!isAuthenticated()) {
      setPostLoginRedirect(window.location.pathname.split("/").pop() || "account.html");
      window.location.href = "login.html";
      return false;
    }
    return true;
  }

  window.CucinAIAuth = {
    getToken,
    getCurrentUser,
    setCurrentUser,
    saveAuth,
    clearAuth,
    isAuthenticated,
    isPremium,
    getAuthHeaders,
    apiFetch,
    setPostLoginRedirect,
    getPostLoginRedirect,
    consumePostLoginRedirect,
    redirectAfterLogin,
    formatDate,
    collectLocalData,
    importLocalDataIfAuthenticated,
    fetchMe,
    logout,
    requireAuthPage
  };
})();