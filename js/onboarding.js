// ============================================
// LIFE RPG — onboarding.js
// Création de personnage : identité, choix de
// l'objectif, révélation. À la fin : création
// de l'état neuf (Templates.etatNeuf) et
// entrée dans le jeu.
// ============================================

(function () {

  var etapes = document.querySelectorAll(".onb-etape");
  var traits = document.querySelectorAll(".onb-trait");

  var nom = "";
  var choix = null; // contrôleur ChoixObjectif
  var templateChoisi = null;

  function montrerEtape(n) {
    etapes.forEach(function (etape) {
      var visible = etape.getAttribute("data-etape") === String(n);
      etape.hidden = !visible;
    });
    traits.forEach(function (trait, i) {
      trait.classList.toggle("actif", i < n);
    });
    window.scrollTo(0, 0);
  }

  // --- Étape 1 : identité ---

  var formNom = document.getElementById("onb-form-nom");
  var champPrenom = document.getElementById("onb-prenom");
  var erreurNom = document.getElementById("onb-erreur-nom");

  formNom.addEventListener("submit", function (e) {
    e.preventDefault();
    nom = champPrenom.value.trim().slice(0, 20);
    if (!nom) {
      erreurNom.hidden = false;
      return;
    }
    erreurNom.hidden = true;
    montrerEtape(2);
  });

  champPrenom.addEventListener("input", function () {
    erreurNom.hidden = true;
  });

  // --- Étape 2 : objectif ---

  var boutonObjectif = document.getElementById("onb-valider-objectif");

  choix = ChoixObjectif.rendre(document.getElementById("onb-objectifs"), function () {
    boutonObjectif.disabled = choix.lire() === null;
  });

  boutonObjectif.addEventListener("click", function () {
    templateChoisi = choix.lire();
    if (!templateChoisi) return;
    preparerRevelation();
    montrerEtape(3);
  });

  // --- Étape 3 : révélation ---

  function preparerRevelation() {
    document.getElementById("rev-classe").textContent = templateChoisi.classe;
    document.getElementById("rev-quete-nom").textContent =
      templateChoisi.quetePrincipale.titre;
  }

  document.getElementById("onb-commencer").addEventListener("click", function () {
    if (!templateChoisi) return;
    // L'état neuf remplace tout ce qui pouvait exister : niveau 1,
    // rang E, stats à 1, aucun historique — la vie commence ici.
    Etat.sauvegarder(Templates.etatNeuf(nom, templateChoisi));
    location.replace("index.html");
  });

  montrerEtape(1);

})();
