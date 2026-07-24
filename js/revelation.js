// ============================================
// LIFE RPG — revelation.js
// Révélation plein écran d'une carte débloquée :
// la carte apparaît face cachée puis se retourne.
// Plusieurs déblocages s'enchaînent en file.
// ============================================

var Revelation = (function () {

  var file = [];
  var overlay = null;

  function construireCarte(carte) {
    var el = document.createElement("article");
    el.className = "carte debloquee " + carte.rarete +
      (carte.niveau ? " niveau-" + carte.niveau : "") +
      (carte.brillante ? " brillante" : "");
    // Crans de niveau (cartes-trophées à paliers) ; les cartes d'objectif
    // n'en ont pas. Overlay holographique seulement si brillante.
    var crans = (carte.paliers && carte.niveau)
      ? '<div class="carte-niveaux">' + Cartes.losanges(carte.niveau, carte.paliers) + "</div>"
      : "";
    el.innerHTML =
      '<span class="carte-rarete"></span>' +
      '<div class="carte-ornement">' + (carte.embleme || Cartes.EMBLEME_DEFAUT) + "</div>" +
      '<h2 class="carte-nom"></h2>' +
      crans +
      '<p class="carte-texte"></p>' +
      (carte.brillante ? '<div class="carte-holo" aria-hidden="true"></div>' : "");
    el.querySelector(".carte-rarete").textContent = Cartes.NOMS_RARETES[carte.rarete];
    el.querySelector(".carte-nom").textContent = carte.nom;
    el.querySelector(".carte-texte").textContent = carte.description;
    return el;
  }

  function afficher(carte) {
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.addEventListener("click", suivante); // toucher = carte suivante ou fermeture
      document.body.appendChild(overlay);
    }

    overlay.className = "revelation " + carte.rarete + (carte.brillante ? " brillante" : "");
    overlay.innerHTML =
      '<p class="etiquette revelation-etiquette">' +
        (carte.brillante ? "Carte brillante" : "Carte débloquée") + "</p>" +
      '<div class="revelation-scene">' +
        '<div class="revelation-carte">' +
          '<div class="revelation-dos">' + Cartes.EMBLEME_DEFAUT + "</div>" +
          '<div class="revelation-face"></div>' +
        "</div>" +
      "</div>" +
      '<p class="revelation-indice">Touche pour continuer</p>';

    overlay.querySelector(".revelation-face").appendChild(construireCarte(carte));

    // la carte se retourne après un court temps face cachée
    setTimeout(function () {
      if (!overlay) return;
      var el = overlay.querySelector(".revelation-carte");
      if (el) el.classList.add("retournee");
      Juice.vibrer(40);
    }, 380);
  }

  function suivante() {
    var carte = file.shift();
    if (carte) {
      afficher(carte);
    } else if (overlay) {
      overlay.remove();
      overlay = null;
    }
  }

  // Point d'entrée : met les cartes en file et lance la première.
  function montrer(cartes) {
    (cartes || []).forEach(function (carte) {
      file.push(carte);
    });
    if (!overlay && file.length > 0) suivante();
  }

  return { montrer: montrer };
})();
