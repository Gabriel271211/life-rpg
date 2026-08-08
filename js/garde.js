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
      return;
    }
    // Garde douce des écrans verrouillés (chantier 2) : un écran dont la
    // feature n'est pas encore débloquée renvoie à l'accueil si on force
    // l'URL. Un état sans `debloque` (joueur existant) a tout d'ouvert :
    // seul un false explicite redirige. Chargé dans le <head>, avant tout
    // rendu : aucun flash de l'écran verrouillé.
    var PAGE_FEATURE = {
      personnage: "fichePerso",
      collection: "collection",
      quete: "quetePrincipale"
    };
    // Nom d'écran sans extension : robuste aux URLs « propres »
    // (/collection) comme aux URLs .html (/collection.html).
    var page = (location.pathname.split("/").pop() || "index").replace(/\.html$/, "");
    var feature = PAGE_FEATURE[page];
    if (feature && etat && etat.debloque && etat.debloque[feature] === false) {
      location.replace("index.html");
    }
  } catch (e) {
    // Stockage indisponible ou corrompu : on laisse l'écran
    // vivre sur l'état de secours plutôt que de boucler.
  }
})();
