// ============================================
// LIFE RPG — collection.js
// Rendu de la galerie de cartes à partir
// de l'état et des définitions de cartes.
// ============================================

(function () {

  var etat = Etat.charger();
  var debloquees = etat.cartesDebloquees;

  var SVG_CADENAS =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="5.5" y="10.5" width="13" height="9" rx="2"/>' +
    '<path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';

  function creerCarte(carte) {
    var ouverte = debloquees.indexOf(carte.id) !== -1;

    var el = document.createElement("article");
    var nom, texte, rarete, ornement;

    if (ouverte) {
      el.className = "carte debloquee " + carte.rarete;
      nom = carte.nom;
      texte = carte.description;
      rarete = Cartes.NOMS_RARETES[carte.rarete];
      ornement = carte.embleme || Cartes.EMBLEME_DEFAUT;
    } else if (carte.cachee) {
      el.className = "carte verrouillee cachee";
      nom = "???";
      texte = "";
      rarete = "";
      ornement = SVG_CADENAS;
    } else {
      el.className = "carte verrouillee";
      nom = carte.nom;
      texte = carte.objectif;
      rarete = "";
      ornement = SVG_CADENAS;
    }

    el.innerHTML =
      '<span class="carte-rarete"></span>' +
      '<div class="carte-ornement">' + ornement + "</div>" +
      '<h2 class="carte-nom"></h2>' +
      '<p class="carte-texte"></p>';

    el.querySelector(".carte-rarete").textContent = rarete;
    el.querySelector(".carte-nom").textContent = nom;
    el.querySelector(".carte-texte").textContent = texte;

    return el;
  }

  var grille = document.getElementById("grille");
  Cartes.liste().forEach(function (carte, i) {
    var el = creerCarte(carte);
    // apparition en cascade
    el.classList.add("entree");
    el.style.animationDelay = (i * 50) + "ms";
    grille.appendChild(el);
  });

  document.getElementById("compte-debloquees").textContent = debloquees.length;
  document.getElementById("compte-total").textContent = Cartes.liste().length;

})();
