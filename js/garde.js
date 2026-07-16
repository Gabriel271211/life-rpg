// ============================================
// LIFE RPG — garde.js
// Garde d'onboarding : chargé dans le <head> de
// chaque écran, redirige vers onboarding.html
// tant qu'aucun personnage n'existe. Un état
// SANS la propriété onboardingFait est un état
// d'avant l'onboarding : il passe (la migration
// le marquera comme fait) ; seul false explicite
// relance le parcours (LifeRpgDebug).
// ============================================

(function () {
  try {
    var brut = localStorage.getItem("life-rpg-etat-v1");
    if (!brut) {
      location.replace("onboarding.html");
      return;
    }
    var etat = JSON.parse(brut);
    if (etat && etat.onboardingFait === false) {
      location.replace("onboarding.html");
    }
  } catch (e) {
    // Stockage indisponible ou corrompu : on laisse l'écran
    // vivre sur l'état de secours plutôt que de boucler.
  }
})();
