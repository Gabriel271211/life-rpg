// ============================================
// LIFE RPG — rail.js
// Menu : un rail vertical d'icônes qui glisse depuis le
// bord droit (façon tiroir), la page assombrie derrière.
// Ouvert par le hamburger.
//
// La navigation entre pages reste la NAV BASSE : le rail
// ne porte PAS de raccourci de page. Il n'a que deux boutons
// réels + les entrées « À venir » :
//   - 👤 Profil     -> panneau d'édition (nom, objectif, jours)
//   - ⚙️ Paramètres -> panneau réglages/données (son, vibr,
//                      notif, export/import/recommencer, aide)
//   - Boutique · Compétences · Stats avancées -> « À venir »,
//     message sobre, aucune ouverture.
//
// Les deux boutons réels ferment le rail puis ouvrent leur
// panneau (module Parametres, même langage visuel).
//
// Fermeture : tap sur le voile, swipe vers la droite, ou Échap.
// ============================================

var Rail = (function () {

  var ctx = null; // { etat, surParametres, couche }

  // ----- Icônes (même trait que la nav basse / l'app) -----

  var SVG = {
    profil:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="7.5" r="3.5"/>' +
      '<path d="M4.5 20c1.2-3.8 4.2-5.5 7.5-5.5s6.3 1.7 7.5 5.5"/></svg>',
    parametres:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<circle cx="12" cy="12" r="3.2"/>' +
      '<path d="M12 2.6v2.7M12 18.7v2.7M21.4 12h-2.7M5.3 12H2.6M18.6 5.4l-1.9 1.9M7.3 16.7l-1.9 1.9' +
      'M18.6 18.6l-1.9-1.9M7.3 7.3 5.4 5.4"/></svg>',
    boutique:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M5 8h14l-1 11.5H6z"/><path d="M8.5 8a3.5 3.5 0 0 1 7 0"/></svg>',
    competences:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M12 3.5l2.6 5.3 5.8.9-4.2 4.1 1 5.8-5.2-2.8-5.2 2.8 1-5.8L3.6 9.7l5.8-.9z"/></svg>',
    stats:
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<path d="M5 20V11M12 20V4M19 20v-6"/></svg>'
  };

  // Boutons réels : ouvrent un panneau du module Parametres.
  var REELS = [
    { cle: "profil", label: "Profil", vue: "profil" },
    { cle: "parametres", label: "Paramètres", vue: "reglages" }
  ];

  // Entrées futures : toujours visibles, jamais de navigation.
  var AVENIR = [
    { cle: "boutique", label: "Boutique" },
    { cle: "competences", label: "Compétences" },
    { cle: "stats", label: "Stats avancées" }
  ];

  function reduitAnimations() {
    return window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function itemHtml(cle, label, avenir) {
    return '<button class="rail-item' + (avenir ? " avenir" : "") + '" type="button" ' +
      'data-item="' + cle + '" aria-label="' + label + '">' + SVG[cle] + "</button>";
  }

  // ----- Construction -----

  function construire() {
    var haut = "";
    REELS.forEach(function (r) { haut += itemHtml(r.cle, r.label, false); });
    haut += '<div class="rail-sep" aria-hidden="true"></div>';
    AVENIR.forEach(function (a) { haut += itemHtml(a.cle, a.label, true); });

    var couche = document.createElement("div");
    couche.className = "rail-couche";
    couche.innerHTML =
      '<div class="rail-scrim" data-role="scrim"></div>' +
      '<nav class="rail" aria-label="Menu">' + haut + "</nav>";
    return couche;
  }

  // ----- Actions -----

  function surClicItem(cle) {
    // Boutons réels : fermer le rail puis ouvrir le panneau correspondant.
    for (var i = 0; i < REELS.length; i++) {
      if (REELS[i].cle === cle) {
        ouvrirPanneau(REELS[i].vue);
        return;
      }
    }
    // Entrées futures : message sobre, aucune ouverture.
    Juice.bandeau("Le Système le prépare. Bientôt.", "");
    Juice.vibrer(15);
  }

  function ouvrirPanneau(vue) {
    var etat = ctx.etat;
    var surParametres = ctx.surParametres;
    fermer(function () {
      if (typeof Parametres !== "undefined") Parametres.ouvrir(etat, surParametres, vue);
    });
  }

  // ----- Gestes de fermeture -----

  function brancherGestes(couche) {
    var rail = couche.querySelector(".rail");

    couche.querySelector('[data-role="scrim"]').addEventListener("click", function () {
      fermer();
    });

    couche.addEventListener("click", function (e) {
      var bouton = e.target.closest("[data-item]");
      if (bouton) surClicItem(bouton.getAttribute("data-item"));
    });

    // Swipe vers la droite sur le rail = fermeture.
    var xDepart = null, yDepart = null;
    rail.addEventListener("touchstart", function (e) {
      var t = e.touches[0];
      xDepart = t.clientX; yDepart = t.clientY;
    }, { passive: true });
    rail.addEventListener("touchend", function (e) {
      if (xDepart === null) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - xDepart;
      var dy = t.clientY - yDepart;
      if (dx > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) fermer();
      xDepart = null; yDepart = null;
    }, { passive: true });

    couche._surTouche = function (e) { if (e.key === "Escape") fermer(); };
    document.addEventListener("keydown", couche._surTouche);
  }

  // ----- Ouverture / fermeture -----

  function fermer(apres) {
    if (!ctx) return;
    var couche = ctx.couche;
    ctx = null;
    if (couche._surTouche) document.removeEventListener("keydown", couche._surTouche);

    function retirer() {
      if (couche.parentNode) couche.parentNode.removeChild(couche);
      if (typeof apres === "function") apres();
    }
    couche.classList.remove("ouvert");
    if (reduitAnimations()) { retirer(); return; }
    var fini = false;
    var termine = function () { if (fini) return; fini = true; retirer(); };
    couche.querySelector(".rail").addEventListener("transitionend", termine, { once: true });
    setTimeout(termine, 360);
  }

  function ouvrir(etat, surParametres) {
    if (ctx) return;
    ctx = { etat: etat, surParametres: surParametres || null, couche: null };

    var couche = construire();
    document.body.appendChild(couche);
    ctx.couche = couche;
    brancherGestes(couche);

    if (reduitAnimations()) {
      couche.classList.add("ouvert");
    } else {
      void couche.offsetWidth;
      requestAnimationFrame(function () { couche.classList.add("ouvert"); });
    }
  }

  return {
    ouvrir: ouvrir
  };
})();
