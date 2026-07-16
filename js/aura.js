// ============================================
// LIFE RPG — aura.js
// L'aura : la couleur d'accent unique de l'app
// dépend du rang du joueur. Chargé dans le <head>
// AVANT le rendu : lit le niveau dans localStorage
// et pose la classe de rang sur <html> pour éviter
// tout flash de mauvaise couleur. Porte aussi
// l'animation de montée de rang.
// ============================================

var Aura = (function () {

  // Paliers dupliqués de regles.js, qui n'est pas encore
  // chargé au moment où le <head> s'exécute.
  var PALIERS = [
    { lettre: "E", niveauRequis: 1 },
    { lettre: "D", niveauRequis: 10 },
    { lettre: "C", niveauRequis: 20 },
    { lettre: "B", niveauRequis: 35 },
    { lettre: "A", niveauRequis: 55 },
    { lettre: "S", niveauRequis: 80 }
  ];

  // Mêmes valeurs que les classes rang-* de base.css.
  var AURAS = {
    E: { accent: "#7a7f88", rgb: [122, 127, 136], clair: "#c3c5c9" },
    D: { accent: "#6b8cae", rgb: [107, 140, 174], clair: "#b9c9da" },
    C: { accent: "#5da58c", rgb: [93, 165, 140], clair: "#b6d7cb" },
    B: { accent: "#c98f5a", rgb: [201, 143, 90], clair: "#e7cdb5" },
    A: { accent: "#c25f6e", rgb: [194, 95, 110], clair: "#e4b7be" },
    S: { accent: "#c9a86a", rgb: [201, 168, 106], clair: "#e7d8bc" }
  };

  function rangPour(niveau) {
    var lettre = PALIERS[0].lettre;
    for (var i = 0; i < PALIERS.length; i++) {
      if (niveau >= PALIERS[i].niveauRequis) lettre = PALIERS[i].lettre;
    }
    return lettre;
  }

  function lireNiveau() {
    try {
      var brut = localStorage.getItem("life-rpg-etat-v1");
      if (brut) {
        var niveau = JSON.parse(brut).niveau;
        if (typeof niveau === "number") return niveau;
      }
    } catch (e) {}
    return 1; // aucun état : aura grise du rang E, comme à l'onboarding
  }

  // theme-color : le fond très légèrement teinté par l'aura.
  function couleurTheme(lettre) {
    var rgb = AURAS[lettre].rgb;
    var fond = [10, 10, 15];
    var teinte = [];
    for (var i = 0; i < 3; i++) {
      teinte.push(Math.round(fond[i] + (rgb[i] - fond[i]) * 0.1));
    }
    return "rgb(" + teinte.join(", ") + ")";
  }

  function appliquer(lettre) {
    var html = document.documentElement;
    html.className = html.className.replace(/\brang-[a-z]\b/g, "").trim();
    html.classList.add("rang-" + lettre.toLowerCase());
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", couleurTheme(lettre));
  }

  function vibrer(motif) {
    if (navigator.vibrate) {
      try { navigator.vibrate(motif); } catch (e) {}
    }
  }

  // ----- Animation de montée de rang -----
  // La nouvelle lettre apparaît dans l'ANCIENNE couleur, puis
  // l'aura glisse vers la nouvelle (fondu croisé de deux scènes
  // identiques). Lumière et lenteur maîtrisée, rien d'autre.

  function scene(lettre, aura, nouvelle) {
    var el = document.createElement("div");
    el.className = "aura-scene" + (nouvelle ? " aura-scene-nouvelle" : "");
    el.innerHTML =
      '<div class="aura-halo"></div>' +
      '<div class="aura-anneau aura-anneau-un"></div>' +
      '<div class="aura-anneau aura-anneau-deux"></div>' +
      '<div class="aura-lettre"></div>';

    var rgb = aura.rgb.join(", ");
    el.querySelector(".aura-halo").style.background =
      "radial-gradient(circle, rgba(" + rgb + ", 0.16), rgba(" + rgb + ", 0.05) 45%, transparent 70%)";
    el.querySelector(".aura-anneau-un").style.borderColor = "rgba(" + rgb + ", 0.16)";
    el.querySelector(".aura-anneau-deux").style.borderColor = "rgba(" + rgb + ", 0.06)";

    var lettreEl = el.querySelector(".aura-lettre");
    lettreEl.textContent = lettre;
    lettreEl.style.backgroundImage =
      "linear-gradient(180deg, #eef2f7 0%, " + aura.clair + " 55%, " + aura.accent + " 135%)";
    lettreEl.style.filter =
      "drop-shadow(0 0 22px rgba(" + rgb + ", 0.35)) drop-shadow(0 0 70px rgba(" + rgb + ", 0.18))";
    return el;
  }

  function monterRang(ancienne, nouvelle) {
    if (document.querySelector(".aura-overlay")) return;

    var overlay = document.createElement("div");
    overlay.className = "aura-overlay";
    overlay.innerHTML =
      '<div class="aura-centre"></div>' +
      '<p class="aura-etiquette"></p>' +
      '<button class="aura-continuer" type="button">Continuer</button>';

    var centre = overlay.querySelector(".aura-centre");
    // La nouvelle lettre, deux fois : d'abord dans l'ancienne
    // couleur, puis la nouvelle qui prend le dessus en fondu.
    centre.appendChild(scene(nouvelle, AURAS[ancienne], false));
    centre.appendChild(scene(nouvelle, AURAS[nouvelle], true));

    overlay.querySelector(".aura-etiquette").textContent = "Rang " + nouvelle + " atteint";

    overlay.querySelector(".aura-continuer").addEventListener("click", function () {
      appliquer(nouvelle);
      overlay.classList.add("aura-sortie");
      setTimeout(function () { overlay.remove(); }, 350);
    });

    document.body.appendChild(overlay);

    // La couleur glisse vers la nouvelle aura après que la
    // lettre s'est posée dans l'ancienne.
    setTimeout(function () {
      overlay.classList.add("glisse");
      vibrer([100, 60, 100, 60, 160]);
    }, 900);
  }

  // Pose immédiate au chargement (script dans le <head>).
  appliquer(rangPour(lireNiveau()));

  return {
    rangPour: rangPour,
    appliquer: appliquer,
    monterRang: monterRang
  };
})();
