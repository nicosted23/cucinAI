document.addEventListener("DOMContentLoaded", function () {
  const form = document.getElementById("recoverForm");
  const messageBox = document.getElementById("recoverMessage");

  function setMessage(text, type) {
    messageBox.textContent = text || "";
    messageBox.className = "auth-message" + (type ? ` ${type}` : "");
  }

  if (!form) return;

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    const email = document.getElementById("email")?.value?.trim() || "";

    if (!email) {
      setMessage("Inserisci la tua email.", "error");
      return;
    }

    setMessage(
      "Schermata pronta. Il recupero password lato backend lo colleghiamo nel blocco successivo.",
      "success"
    );
  });
});