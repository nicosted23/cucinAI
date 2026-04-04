const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");
const authNavLinks = document.getElementById("authNavLinks");

if (menuToggle && navLinks) {
  menuToggle.addEventListener("click", () => {
    navLinks.classList.toggle("open");
  });
}

function getCurrentUser() {
  try {
    const raw = localStorage.getItem("cucinai_current_user");
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function getAuthToken() {
  return localStorage.getItem("cucinai_auth_token") || "";
}

function renderAuthLinks() {
  if (!authNavLinks) return;

  const token = getAuthToken();
  const user = getCurrentUser();

  if (token && user) {
    authNavLinks.innerHTML = `
      <a href="account.html" class="nav-auth-link nav-auth-account">Account</a>
      <button type="button" id="navLogoutBtn" class="nav-auth-btn">Logout</button>
    `;

    const logoutBtn = document.getElementById("navLogoutBtn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", async () => {
        try {
          await fetch("http://localhost:3001/api/auth/logout", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`
            }
          });
        } catch (error) {
          console.error("Errore logout menu:", error);
        }

        localStorage.removeItem("cucinai_auth_token");
        localStorage.removeItem("cucinai_current_user");
        window.location.href = "login.html";
      });
    }

    return;
  }

  authNavLinks.innerHTML = `
    <a href="login.html" class="nav-auth-link">Accedi</a>
    <a href="registrazione.html" class="nav-auth-link nav-auth-register">Registrati</a>
  `;
}

document.addEventListener("DOMContentLoaded", () => {
  renderAuthLinks();
});