// ============================================
// LIFE RPG — moment-serie.js
// Le grand moment plein écran (~4 s) joué UNE fois à la réouverture
// d'un nouveau jour, selon l'issue de la série. L'accueil appelle
// MomentSerie.jouer(issue, streak) après avoir lu puis effacé le
// drapeau etat.transitionSerie.
//
// Overlay au-dessus de tout, non bloquant : disparaît au tap ou
// automatiquement après ~4 s. Le style (animations + version statique
// pour prefers-reduced-motion) vit dans css/moment-serie.css.
// Les vibrations sont un bonus (Android) ; l'animation se suffit.
// ============================================

var MomentSerie = (function () {

  var DUREE = 4000;   // ms avant disparition automatique
  var ISSUES = { continuee: true, gelee: true, rompue: true };

  // Flamme : silhouette + cœur (les couleurs viennent du CSS selon l'état).
  var SVG_FLAMME =
    '<svg class="flamme-svg" viewBox="0 0 100 130" aria-hidden="true">' +
    '<path class="flamme-corps" d="M50 4 C58 30 84 44 84 78 C84 108 66 126 50 126 ' +
    'C34 126 16 108 16 78 C16 52 34 44 40 26 C44 40 40 54 52 60 C60 52 58 36 50 4 Z"/>' +
    '<path class="flamme-coeur" d="M50 58 C56 70 68 78 68 94 C68 110 60 120 50 120 ' +
    'C40 120 32 110 32 94 C32 80 42 74 46 62 C48 72 46 80 52 84 C58 80 56 70 50 58 Z"/>' +
    '</svg>';

  var TEXTES = {
    continuee: "La chaîne grandit.",
    gelee: "Un jour a été gelé. La chaîne tient.",
    rompue: "La chaîne s'est rompue. Elle se reforge dès aujourd'hui."
  };

  // Motifs de vibration (ignorés là où navigator.vibrate n'existe pas, ex. iOS).
  var VIBRATIONS = {
    continuee: { motif: [0, 80, 40, 80], delai: 550 }, // positive, au pic
    gelee: { motif: [0, 30, 30, 30], delai: 450 },      // cristalline
    rompue: { motif: [0, 140], delai: 1000 }            // brève et mate, à la rupture
  };

  function vibrer(issue) {
    var v = VIBRATIONS[issue];
    if (!v) return;
    setTimeout(function () {
      if (window.Juice && Juice.vibrer) Juice.vibrer(v.motif);
      else if (navigator.vibrate) navigator.vibrate(v.motif);
    }, v.delai);
  }

  function fermer(overlay) {
    if (!overlay || overlay.dataset.sortie === "1") return;
    overlay.dataset.sortie = "1";
    overlay.classList.add("sortie");
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 420);
  }

  function jouer(issue, streak) {
    if (!ISSUES[issue] || !document.body) return;

    // Un seul moment à la fois.
    var existant = document.querySelector(".moment-serie");
    if (existant && existant.parentNode) existant.parentNode.removeChild(existant);

    var overlay = document.createElement("div");
    overlay.className = "moment-serie " + issue;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Issue de ta série");

    var nombre = "";
    if (issue === "continuee") {
      var n = (typeof streak === "number" && streak > 0) ? streak : 1;
      nombre = '<div class="moment-nombre">' + n +
        '<span class="moment-unite">' + (n > 1 ? "jours" : "jour") + '</span></div>';
    }

    overlay.innerHTML =
      '<div class="moment-flamme">' + SVG_FLAMME +
      '<span class="moment-givre"></span><span class="moment-fissure"></span></div>' +
      nombre +
      '<p class="moment-texte">' + TEXTES[issue] + '</p>';

    document.body.appendChild(overlay);
    vibrer(issue);

    var minuteur = setTimeout(function () { fermer(overlay); }, DUREE);
    overlay.addEventListener("click", function () {
      clearTimeout(minuteur);
      fermer(overlay);
    });
  }

  return { jouer: jouer };
})();
