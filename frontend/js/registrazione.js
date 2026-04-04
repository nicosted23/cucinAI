document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("registerForm");
  const messageBox = document.getElementById("registerMessage");
  const passwordInput = document.getElementById("password");
  const confirmPasswordInput = document.getElementById("confirmPassword");
  const togglePasswordBtn = document.getElementById("togglePassword");
  const toggleConfirmBtn = document.getElementById("toggleConfirmPassword");

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

  if (toggleConfirmBtn && confirmPasswordInput) {
    toggleConfirmBtn.addEventListener("click", function () {
      const isPassword = confirmPasswordInput.type === "password";
      confirmPasswordInput.type = isPassword ? "text" : "password";
      toggleConfirmBtn.textContent = isPassword ? "Nascondi" : "Mostra";
    });
  }

  if (!form) return;

  form.addEventListener("submit", async function (event) {
    event.preventDefault();

    const name = document.getElementById("name")?.value?.trim() || "";
    const email = document.getElementById("email")?.value?.trim() || "";
    const password = passwordInput?.value || "";
    const confirmPassword = confirmPasswordInput?.value || "";

    if (!name || !email || !password || !confirmPassword) {
      setMessage("Compila tutti i campi.", "error");
      return;
    }

    if (password.length < 6) {
      setMessage("La password deve contenere almeno 6 caratteri.", "error");
      return;
    }

    if (password !== confirmPassword) {
      setMessage("Le password non coincidono.", "error");
      return;
    }

    setMessage("Creazione account in corso...", "");

    try {
      const response = await fetch("http://localhost:3001/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ name, email, password })
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.token || !data.user) {
        setMessage(data.message || "Errore durante la registrazione.", "error");
        return;
      }

      localStorage.setItem("cucinai_auth_token", data.token);
      localStorage.setItem("cucinai_current_user", JSON.stringify(data.user));

      setMessage("Account creato con successo. Reindirizzamento...", "success");

      setTimeout(function () {
        window.location.replace("account.html");
      }, 300);
    } catch (error) {
      console.error(error);
      setMessage("Errore di connessione al server.", "error");
    }
  });
});