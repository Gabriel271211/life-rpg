// ============================================
// LIFE RPG — pwa.js
// Enregistrement du service worker.
// Silencieux si non supporté ou refusé.
// ============================================

(function () {
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", function () {
    navigator.serviceWorker.register("sw.js").catch(function () {
      // Contexte non sécurisé ou enregistrement refusé :
      // l'app fonctionne normalement, juste sans mode hors-ligne.
    });
  });
})();
