// ============================================
// LIFE RPG — collection.js
// Galerie de cartes en sections : les trophées
// (cartes fixes, à paliers et parfois brillantes)
// et les cartes d'objectif obtenues via les quêtes
// secondaires, regroupées par aventure. Compteur
// global + par section.
// ============================================

(function () {

  var etat = Etat.charger();

  var SVG_CADENAS =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="5.5" y="10.5" width="13" height="9" rx="2"/>' +
    '<path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';

  // --- Carte trophée (fixe) : verrouillée, ou débloquée avec niveau ---
  function creerCarteTrophee(carte) {
    var vue = Cartes.vueDebloquee(etat, carte);
    var el = document.createElement("article");

    if (vue) {
      el.className = "carte debloquee " + carte.rarete +
        " niveau-" + vue.niveau + (vue.brillante ? " brillante" : "");
      el.innerHTML =
        '<span class="carte-rarete"></span>' +
        '<div class="carte-ornement">' + (carte.embleme || Cartes.EMBLEME_DEFAUT) + "</div>" +
        '<h2 class="carte-nom"></h2>' +
        '<div class="carte-niveaux">' + Cartes.losanges(vue.niveau, Cartes.nbPaliers(carte)) + "</div>" +
        '<p class="carte-texte"></p>' +
        (vue.brillante ? '<div class="carte-holo" aria-hidden="true"></div>' : "");
      el.querySelector(".carte-rarete").textContent = Cartes.NOMS_RARETES[carte.rarete];
      el.querySelector(".carte-nom").textContent = carte.nom;
      el.querySelector(".carte-texte").textContent = carte.description;
      return el;
    }

    // Verrouillée : cachée (aucun indice) ou le prochain objectif visible.
    if (carte.cachee) {
      el.className = "carte verrouillee cachee";
      el.innerHTML =
        '<span class="carte-rarete"></span>' +
        '<div class="carte-ornement">' + SVG_CADENAS + "</div>" +
        '<h2 class="carte-nom">???</h2>' +
        '<p class="carte-texte"></p>';
      return el;
    }

    el.className = "carte verrouillee";
    el.innerHTML =
      '<span class="carte-rarete"></span>' +
      '<div class="carte-ornement">' + SVG_CADENAS + "</div>" +
      '<h2 class="carte-nom"></h2>' +
      '<p class="carte-texte"></p>';
    el.querySelector(".carte-nom").textContent = carte.nom;
    // Le premier palier non encore atteint est l'objectif à viser.
    el.querySelector(".carte-texte").textContent = carte.paliers[0].objectif;
    return el;
  }

  // --- Carte d'objectif : toujours obtenue, sans niveau ni condition ---
  function creerCarteObjectif(carte) {
    var el = document.createElement("article");
    el.className = "carte debloquee " + carte.rarete;
    el.innerHTML =
      '<span class="carte-rarete"></span>' +
      '<div class="carte-ornement">' + Cartes.EMBLEME_DEFAUT + "</div>" +
      '<h2 class="carte-nom"></h2>' +
      '<p class="carte-texte"></p>';
    el.querySelector(".carte-rarete").textContent = Cartes.NOMS_RARETES[carte.rarete] || "";
    el.querySelector(".carte-nom").textContent = carte.nom;
    el.querySelector(".carte-texte").textContent = carte.description;
    return el;
  }

  // Construit une section (titre + compteur + grille de cartes).
  function ajouterSection(titre, compte, cartesEls) {
    var section = document.createElement("section");
    section.className = "collection-section";
    section.innerHTML =
      '<div class="collection-section-tete">' +
        '<p class="etiquette"></p>' +
        '<span class="collection-section-compte"></span>' +
      "</div>" +
      '<div class="grille"></div>';
    section.querySelector(".etiquette").textContent = titre;
    section.querySelector(".collection-section-compte").textContent = compte;
    var grille = section.querySelector(".grille");
    cartesEls.forEach(function (el, i) {
      el.classList.add("entree");
      el.style.animationDelay = (i * 50) + "ms";
      grille.appendChild(el);
    });
    document.getElementById("sections").appendChild(section);
  }

  // --- Section des trophées ---
  var trophees = Cartes.liste().map(creerCarteTrophee);
  var trophesDebloques = etat.cartesDebloquees.length;
  ajouterSection("Trophées", trophesDebloques + " / " + Cartes.liste().length, trophees);

  // --- Sections des cartes d'objectif, groupées par aventure ---
  // Ordre des groupes : apparition ; dans un groupe, les plus récentes
  // en tête (une saga qui s'écrit).
  var groupes = [];
  var index = {};
  (etat.cartesObjectif || []).forEach(function (carte) {
    var titre = carte.origineTitre || "Ton aventure";
    if (!(titre in index)) {
      index[titre] = groupes.length;
      groupes.push({ titre: titre, cartes: [] });
    }
    groupes[index[titre]].cartes.push(carte);
  });

  groupes.forEach(function (groupe) {
    var els = groupe.cartes.slice().reverse().map(creerCarteObjectif);
    ajouterSection("Cartes de " + groupe.titre, String(groupe.cartes.length), els);
  });

  // --- Compteur global ---
  var objectifCount = (etat.cartesObjectif || []).length;
  document.getElementById("compte-debloquees").textContent =
    trophesDebloques + objectifCount;
  document.getElementById("compte-total").textContent =
    Cartes.liste().length + objectifCount;

})();
