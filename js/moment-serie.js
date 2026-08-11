// ============================================
// LIFE RPG — moment-serie.js
// Le grand moment plein écran (~4 s) joué UNE fois à la réouverture
// d'un nouveau jour, selon l'issue de la série. L'accueil appelle
// MomentSerie.jouer(issue, streak) après avoir lu puis effacé le
// drapeau etat.transitionSerie.
//
// Direction : le NOMBRE est le héros (continuée), texte minimal.
// Overlay au-dessus de tout, non bloquant : disparaît au tap ou
// automatiquement après ~4 s. Animations + version statique
// (prefers-reduced-motion) dans css/moment-serie.css. Les vibrations
// sont un bonus (Android) ; l'animation se suffit à elle-même.
// ============================================

var MomentSerie = (function () {

  var DUREE = 4200;   // ms avant disparition automatique
  var ISSUES = { continuee: true, gelee: true, rompue: true };

  // Flamme en calques à dégradés : corps + cœur. Les couleurs (stops)
  // viennent des variables CSS selon l'état. La lueur épouse la flamme
  // via un drop-shadow (CSS), pas un calque d'orbe.
  var SVG_FLAMME =
    '<svg class="fl-svg" viewBox="0 0 100 140" aria-hidden="true">' +
      '<defs>' +
        '<linearGradient id="ms-body" x1="0" y1="0" x2="0" y2="1">' +
          '<stop offset="0" stop-color="var(--fl-body-1)"/>' +
          '<stop offset="0.55" stop-color="var(--fl-body-2)"/>' +
          '<stop offset="1" stop-color="var(--fl-body-3)"/>' +
        '</linearGradient>' +
        '<radialGradient id="ms-core" cx="0.5" cy="0.72" r="0.62">' +
          '<stop offset="0" stop-color="var(--fl-core-1)"/>' +
          '<stop offset="0.5" stop-color="var(--fl-core-2)"/>' +
          '<stop offset="1" stop-color="var(--fl-core-2)" stop-opacity="0"/>' +
        '</radialGradient>' +
      '</defs>' +
      '<path class="fl-layer fl-body" fill="url(#ms-body)" d="M50 8 ' +
        'C58 36 86 52 86 88 C86 117 70 134 50 134 C30 134 14 117 14 88 ' +
        'C14 60 32 52 39 33 C41 49 37 62 50 70 C62 62 59 41 50 8 Z"/>' +
      '<path class="fl-layer fl-core" fill="url(#ms-core)" d="M50 60 ' +
        'C55 74 70 82 70 100 C70 117 61 128 50 128 C39 128 30 117 30 100 ' +
        'C30 86 41 80 45 66 C47 78 45 86 50 90 C56 86 54 74 50 60 Z"/>' +
    '</svg>';

  // Contenu texte, court et hiérarchisé (façon Duolingo, voix du Système).
  function contenu(issue, streak) {
    if (issue === "continuee") {
      var n = (typeof streak === "number" && streak > 0) ? streak : 1;
      return '<div class="moment-nombre">' + n +
        '<span class="moment-unite">' + (n > 1 ? "jours de série" : "jour de série") + '</span></div>';
    }
    if (issue === "gelee") {
      return '<div class="moment-texte-bloc">' +
        '<div class="moment-titre">Série gelée</div>' +
        '<div class="moment-sous">La chaîne tient.</div></div>';
    }
    return '<div class="moment-texte-bloc">' +
      '<div class="moment-titre">Série rompue</div>' +
      '<div class="moment-sous">Reforge-la aujourd\'hui.</div></div>';
  }

  var VIBRATIONS = {
    continuee: { motif: [0, 80, 40, 80], delai: 550 }, // positive, au pic
    gelee: { motif: [0, 30, 30, 30], delai: 500 },      // cristalline
    rompue: { motif: [0, 140], delai: 1000 }            // brève et mate, à la rupture
  };

  // Son par issue, joué au MÊME instant que la vibration (au pic de
  // l'animation) : continuée chaleureuse montante, gelée cristalline,
  // rompue mate descendante.
  var SONS = {
    continuee: "flamme-continuee",
    gelee: "flamme-gelee",
    rompue: "flamme-rompue"
  };

  function reduit() {
    return window.matchMedia &&
           window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function alea(min, max) { return min + Math.random() * (max - min); }

  function vibrer(issue) {
    var v = VIBRATIONS[issue];
    if (!v) return;
    setTimeout(function () {
      if (window.Juice && Juice.vibrer) Juice.vibrer(v.motif);
      else if (navigator.vibrate) navigator.vibrate(v.motif);
      if (window.Son && SONS[issue]) Son.jouer(SONS[issue]);
    }, v.delai);
  }

  // Particules : braises (continuée), givre (gelée), cendres + fumée (rompue).
  function semerParticules(scene, issue) {
    var boite = scene.querySelector(".moment-particules");
    if (!boite) return;

    if (issue === "continuee") {
      for (var i = 0; i < 16; i++) {
        var e = document.createElement("span");
        e.className = "particule p-ember";
        e.style.setProperty("--x", alea(38, 62) + "%");
        e.style.setProperty("--size", alea(3, 6).toFixed(1) + "px");
        e.style.setProperty("--tx", alea(-42, 42).toFixed(0) + "px");
        e.style.setProperty("--ty", alea(-150, -240).toFixed(0) + "px");
        e.style.setProperty("--dur", alea(1.7, 3).toFixed(2) + "s");
        e.style.setProperty("--delay", alea(0, 2.4).toFixed(2) + "s");
        boite.appendChild(e);
      }
    } else if (issue === "gelee") {
      for (var j = 0; j < 15; j++) {
        var f = document.createElement("span");
        f.className = "particule p-frost";
        f.style.setProperty("--x", alea(18, 82) + "%");
        f.style.setProperty("--y", alea(22, 78) + "%");
        f.style.setProperty("--size", alea(2, 4).toFixed(1) + "px");
        f.style.setProperty("--tx", alea(-18, 18).toFixed(0) + "px");
        f.style.setProperty("--ty", alea(-14, 14).toFixed(0) + "px");
        f.style.setProperty("--dur", alea(3, 5).toFixed(2) + "s");
        f.style.setProperty("--delay", alea(0.8, 3).toFixed(2) + "s");
        boite.appendChild(f);
      }
    } else if (issue === "rompue") {
      for (var k = 0; k < 10; k++) {
        var a = document.createElement("span");
        a.className = "particule p-ash";
        a.style.setProperty("--x", alea(38, 62) + "%");
        a.style.setProperty("--size", alea(2, 4).toFixed(1) + "px");
        a.style.setProperty("--tx", alea(-30, 30).toFixed(0) + "px");
        a.style.setProperty("--ty", alea(40, 90).toFixed(0) + "px");
        a.style.setProperty("--dur", alea(2.2, 3.6).toFixed(2) + "s");
        a.style.setProperty("--delay", alea(1.4, 2.4).toFixed(2) + "s");
        boite.appendChild(a);
      }
      var fumee = scene.querySelector(".moment-fumee");
      if (fumee) {
        for (var m = 0; m < 4; m++) {
          var v = document.createElement("span");
          v.className = "volute";
          v.style.setProperty("--x", alea(40, 60) + "%");
          v.style.setProperty("--size", alea(26, 40).toFixed(0) + "px");
          v.style.setProperty("--tx", alea(-24, 24).toFixed(0) + "px");
          v.style.setProperty("--dur", alea(1.8, 2.6).toFixed(2) + "s");
          v.style.setProperty("--delay", (1.5 + alea(0, 0.5)).toFixed(2) + "s");
          fumee.appendChild(v);
        }
      }
    }
  }

  function fermer(overlay) {
    if (!overlay || overlay.dataset.sortie === "1") return;
    overlay.dataset.sortie = "1";
    overlay.classList.add("sortie");
    setTimeout(function () {
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }, 520);
  }

  function jouer(issue, streak) {
    if (!ISSUES[issue] || !document.body) return;

    var existant = document.querySelector(".moment-serie");
    if (existant && existant.parentNode) existant.parentNode.removeChild(existant);

    var overlay = document.createElement("div");
    overlay.className = "moment-serie " + issue;
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-label", "Issue de ta série");

    overlay.innerHTML =
      '<div class="moment-scene">' +
        '<div class="moment-glow"></div>' +
        '<div class="moment-flamme">' + SVG_FLAMME + '</div>' +
        '<div class="moment-givre"></div>' +
        '<div class="moment-fumee"></div>' +
        '<div class="moment-particules"></div>' +
      '</div>' +
      contenu(issue, streak);

    document.body.appendChild(overlay);

    if (!reduit()) semerParticules(overlay.querySelector(".moment-scene"), issue);
    vibrer(issue);

    var minuteur = setTimeout(function () { fermer(overlay); }, DUREE);
    overlay.addEventListener("click", function () {
      clearTimeout(minuteur);
      fermer(overlay);
    });
  }

  return { jouer: jouer };
})();
