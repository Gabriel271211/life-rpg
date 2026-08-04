// ============================================
// LIFE RPG — pwa.js
// Enregistrement du service worker.
// Silencieux si non supporté ou refusé.
// ============================================

(function () {
  // Bruit inoffensif des transitions de navigation entre documents :
  // quand une navigation en interrompt une autre, le navigateur rejette
  // la transition en cours ("Transition was skipped"). Rien à corriger,
  // on tait juste ce rejet précis pour garder la console propre — sans
  // masquer les autres erreurs.
  window.addEventListener("unhandledrejection", function (e) {
    var r = e.reason;
    if (r && r.name === "AbortError" && /transition was skipped/i.test(r.message || "")) {
      e.preventDefault();
    }
  });

  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {
      // Contexte non sécurisé ou enregistrement refusé :
      // l'app fonctionne normalement, juste sans mode hors-ligne.
    });
  });
})();
