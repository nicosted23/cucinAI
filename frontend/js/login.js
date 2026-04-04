document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("loginForm");
  const messageBox = document.getElementById("loginMessage");
  const togglePasswordBtn = document.getElementById("togglePassword");
  const passwordInput = document.getElementById("password");

  function setMessage(text, type) {
    if (!messageBox) return;
    messageBox.textContent = text || "";
    messageBox.className = "auth-message" + (type ? ` ${type}` : "");
  }

  if (togglePasswordBtn && passwordInput) {
    togglePasswordBtn.addEventListener("click", function () {
      const isPassword = passwordInput.type === "password";
      passwordInput.type = isPassword ? "text" : "password";
      togglePasswordBtn.textContent = isPassword ? "Nascondi" : "Mostra";
    });
  }

  if (!form) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const email = document.getElementById("email")?.value?.trim() || "";
    const password = document.getElementById("password")?.value || "";

    if (!email || !password) {
      setMessage("Inserisci email e password.", "error");
      return;
    }

    setMessage("Accesso in corso...", "");

    try {
      const response = await fetch("http://localhost:3001/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.token || !data.user) {
        setMessage(data.message || "Credenziali non valide.", "error");
        return;
      }

      localStorage.setItem("cucinai_auth_token", data.token);
      localStorage.setItem("cucinai_current_user", JSON.stringify(data.user));

      setMessage("Accesso effettuato. Reindirizzamento...", "success");

      setTimeout(function () {
        window.location.replace("account.html");
      }, 300);
    } catch (error) {
      console.error(error);
      setMessage("Errore di connessione al server.", "error");
    }
  });
});