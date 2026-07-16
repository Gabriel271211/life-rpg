// ============================================
// LIFE RPG — objectif.js
// Choix d'objectif : la grille de cartes des six
// templates + la carte "objectif personnalisé".
// Utilisé par l'onboarding (étape 2) et par le
// changement d'objectif sur l'écran Quête.
// ============================================

var ChoixObjectif = (function () {

  var MAX_OBJECTIF = 80;

  // Rend la grille dans `conteneur`. `surChangement` est appelé à
  // chaque sélection ou frappe, pour activer/désactiver le bouton
  // de validation de l'écran hôte. Retourne { lire } : lire() donne
  // le template choisi (copie personnalisée comprise), ou null tant
  // que le choix n'est pas valide.
  function rendre(conteneur, surChangement) {
    conteneur.innerHTML = "";
    conteneur.classList.add("objectif-grille");

    var selection = null; // id du template, ou "personnalise"
    var cartes = {};

    function notifier() {
      if (surChangement) surChangement();
    }

    function selectionner(id) {
      selection = id;
      Object.keys(cartes).forEach(function (cle) {
        cartes[cle].classList.toggle("actif", cle === id);
      });
      champPerso.hidden = id !== "personnalise";
      if (id === "personnalise") {
        champPerso.querySelector("input").focus();
      }
      notifier();
    }

    function carte(id, nom, classe, description) {
      var el = document.createElement("article");
      el.className = "objectif-carte";
      el.setAttribute("role", "button");
      el.setAttribute("tabindex", "0");
      el.innerHTML =
        '<p class="objectif-nom"></p>' +
        '<p class="objectif-classe"></p>' +
        '<p class="objectif-description"></p>';
      el.querySelector(".objectif-nom").textContent = nom;
      el.querySelector(".objectif-classe").textContent = classe;
      el.querySelector(".objectif-description").textContent = description;
      el.addEventListener("click", function () { selectionner(id); });
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          selectionner(id);
        }
      });
      cartes[id] = el;
      return el;
    }

    Templates.liste().forEach(function (template) {
      conteneur.appendChild(
        carte(template.id, template.nom, template.classe, template.description)
      );
    });

    // Carte personnalisée : révèle un champ texte quand elle est choisie.
    var cartePerso = carte(
      "personnalise",
      "Écrire mon propre objectif",
      "Aventurier",
      "Ta voie, tracée par toi seul."
    );
    var champPerso = document.createElement("div");
    champPerso.className = "objectif-perso-champ";
    champPerso.hidden = true;
    champPerso.innerHTML =
      '<input class="editeur-entree" type="text" maxlength="' + MAX_OBJECTIF + '" ' +
      'autocomplete="off" placeholder="Ton objectif (ex. Apprendre le piano)" ' +
      'aria-label="Ton objectif">';
    // Taper dans le champ ne doit pas re-déclencher la sélection.
    champPerso.addEventListener("click", function (e) { e.stopPropagation(); });
    champPerso.querySelector("input").addEventListener("input", notifier);
    cartePerso.appendChild(champPerso);
    conteneur.appendChild(cartePerso);

    function lire() {
      if (!selection) return null;
      if (selection === "personnalise") {
        var texte = champPerso.querySelector("input").value.trim();
        if (!texte) return null;
        return Templates.personnalise(texte);
      }
      return Templates.parId(selection);
    }

    return { lire: lire };
  }

  return {
    rendre: rendre
  };
})();
