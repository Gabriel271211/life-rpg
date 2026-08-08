// ============================================
// LIFE RPG — nav.js
// Navigation basse : marque l'onglet actif, neutralise
// les liens vides, et MASQUE les onglets dont la
// fonctionnalité n'est pas encore débloquée (chantier 2).
// La barre grandit à mesure que le jeu s'ouvre.
// ============================================

var Nav = (function () {

  // Onglet -> feature qui le débloque. L'accueil n'a pas d'entrée : il
  // est toujours présent (seul onglet au tout premier lancement).
  var ONGLET_FEATURE = {
    personnage: "fichePerso",
    collection: "collection",
    quete: "quetePrincipale"
  };

  // Affiche/masque chaque onglet selon la carte de déblocage. Un onglet
  // masqué disparaît de la barre (les autres se répartissent l'espace) ;
  // rien de verrouillé n'est montré (pas de cadenas). Rappelable à chaud
  // quand une feature se débloque en cours de session.
  function appliquer(debloque) {
    debloque = debloque || (typeof Deblocage !== "undefined" ? Deblocage.lire() : null);
    document.querySelectorAll(".nav-bas .nav-lien").forEach(function (lien) {
      var feature = ONGLET_FEATURE[lien.dataset.nav];
      if (!feature) return; // accueil : toujours visible
      var ouvert = !debloque || debloque[feature] !== false;
      lien.style.display = ouvert ? "" : "none";
    });
  }

  var page = document.body.dataset.page;
  document.querySelectorAll(".nav-bas .nav-lien").forEach(function (lien) {
    lien.classList.toggle("actif", lien.dataset.nav === page);
    if (lien.getAttribute("href") === "#") {
      lien.addEventListener("click", function (e) { e.preventDefault(); });
    }
  });
  appliquer();

  return { appliquer: appliquer };
})();
