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

  // SOURCE UNIQUE des seuils de rang. aura.js s'exécute dans le <head>
  // avant tout le reste (regles.js compris) : c'est donc lui qui porte
  // les paliers, et Regles.RANGS les réutilise via Aura.PALIERS. Les
  // classes .rang-* de css/base.css doivent rester alignées sur ces
  // `cle`. Si tu changes un seuil ici, il change partout.
  //
  // Échelle : un palier tous les 10 niveaux. E→A en lettres, puis le
  // rang S se creuse en ÉTOILES (une tous les 10 niveaux), et NATION
  // couronne le sommet. `cle` = suffixe de la classe .rang-* (couleur)
  // ET de l'aura ci-dessous ; `etoiles` = nombre d'étoiles affichées
  // (0 hors S étoilé). Structure extensible : ajouter des paliers
  // au-delà de Nation ne demande qu'une ligne ici + sa couleur.
  var PALIERS = [
    { lettre: "E",      niveauRequis: 1,   etoiles: 0, cle: "e" },
    { lettre: "D",      niveauRequis: 10,  etoiles: 0, cle: "d" },
    { lettre: "C",      niveauRequis: 20,  etoiles: 0, cle: "c" },
    { lettre: "B",      niveauRequis: 30,  etoiles: 0, cle: "b" },
    { lettre: "A",      niveauRequis: 40,  etoiles: 0, cle: "a" },
    { lettre: "S",      niveauRequis: 50,  etoiles: 0, cle: "s" },
    { lettre: "S",      niveauRequis: 60,  etoiles: 1, cle: "s1" },
    { lettre: "S",      niveauRequis: 70,  etoiles: 2, cle: "s2" },
    { lettre: "S",      niveauRequis: 80,  etoiles: 3, cle: "s3" },
    { lettre: "S",      niveauRequis: 90,  etoiles: 4, cle: "s4" },
    { lettre: "Nation", niveauRequis: 100, etoiles: 0, cle: "nation" }
  ];

  // Couleur d'accent par rang (clé = `cle` du palier). COUPLAGE : ces
  // valeurs doublent les classes .rang-* de css/base.css (--accent /
  // --accent-rgb / --accent-clair) — le CSS ne peut pas lire ce JS et
  // pose la couleur avant le rendu pour éviter tout flash. Modifier un
  // rang => modifier les DEUX endroits (ici et base.css). L'or de S
  // s'intensifie à chaque étoile ; Nation vire au platine irisé.
  var AURAS = {
    e:  { accent: "#7a7f88", rgb: [122, 127, 136], clair: "#c3c5c9" },
    d:  { accent: "#6b8cae", rgb: [107, 140, 174], clair: "#b9c9da" },
    c:  { accent: "#5da58c", rgb: [93, 165, 140],  clair: "#b6d7cb" },
    b:  { accent: "#c98f5a", rgb: [201, 143, 90],  clair: "#e7cdb5" },
    a:  { accent: "#c25f6e", rgb: [194, 95, 110],  clair: "#e4b7be" },
    s:  { accent: "#c9a86a", rgb: [201, 168, 106], clair: "#e7d8bc" },
    s1: { accent: "#d4af5e", rgb: [212, 175, 94],  clair: "#efdcae" },
    s2: { accent: "#e0b852", rgb: [224, 184, 82],  clair: "#f3e2a3" },
    s3: { accent: "#edc246", rgb: [237, 194, 70],  clair: "#f7e896" },
    s4: { accent: "#ffcf3a", rgb: [255, 207, 58],  clair: "#ffef9c" },
    nation: { accent: "#dfe7fb", rgb: [223, 231, 251], clair: "#ffffff" }
  };

  // Palier atteint à ce niveau : renvoie l'objet complet (cle, lettre,
  // etoiles) — le plus haut dont le seuil est franchi.
  function palierPour(niveau) {
    var p = PALIERS[0];
    for (var i = 0; i < PALIERS.length; i++) {
      if (niveau >= PALIERS[i].niveauRequis) p = PALIERS[i];
    }
    return p;
  }

  function palierParCle(cle) {
    for (var i = 0; i < PALIERS.length; i++) {
      if (PALIERS[i].cle === cle) return PALIERS[i];
    }
    return PALIERS[0];
  }

  // Clé de couleur (suffixe .rang-*) posée sur <html> pour le rang.
  function rangPour(niveau) {
    return palierPour(niveau).cle;
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
  function couleurTheme(cle) {
    var rgb = AURAS[cle].rgb;
    var fond = [10, 10, 15];
    var teinte = [];
    for (var i = 0; i < 3; i++) {
      teinte.push(Math.round(fond[i] + (rgb[i] - fond[i]) * 0.1));
    }
    return "rgb(" + teinte.join(", ") + ")";
  }

  // Pose la classe de couleur du rang sur <html>. `cle` peut contenir
  // un chiffre (s1..s4) ou plusieurs lettres (nation) : le regex de
  // nettoyage doit couvrir [a-z0-9]+, pas une lettre isolée.
  function appliquer(cle) {
    var html = document.documentElement;
    html.className = html.className.replace(/\brang-[a-z0-9]+\b/g, "").trim();
    html.classList.add("rang-" + cle);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", couleurTheme(cle));
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

  // Étiquette lisible d'un palier : "S", "S ★★", "Nation".
  function libelle(palier) {
    if (palier.lettre === "Nation") return "Nation";
    if (palier.etoiles > 0) return palier.lettre + " " + "★★★★".slice(0, palier.etoiles);
    return palier.lettre;
  }

  // Une scène = le GLYPHE du palier (lettre, ou "Nation", + ses étoiles)
  // baigné dans une aura donnée. Le crossfade en superpose deux : même
  // glyphe, ancienne aura puis nouvelle.
  function scene(palier, aura, nouvelle) {
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
    lettreEl.textContent = palier.lettre === "Nation" ? "Nation" : palier.lettre;
    if (palier.lettre === "Nation") lettreEl.classList.add("aura-lettre-nation");
    lettreEl.style.backgroundImage =
      "linear-gradient(180deg, #eef2f7 0%, " + aura.clair + " 42%, " + aura.accent + " 100%)";
    lettreEl.style.filter =
      "drop-shadow(0 0 22px rgba(" + rgb + ", 0.35)) drop-shadow(0 0 70px rgba(" + rgb + ", 0.18))";

    if (palier.etoiles > 0) {
      var etoilesEl = document.createElement("div");
      etoilesEl.className = "aura-etoiles";
      etoilesEl.textContent = "★★★★".slice(0, palier.etoiles);
      etoilesEl.style.color = aura.accent;
      etoilesEl.style.textShadow =
        "0 0 18px rgba(" + rgb + ", 0.6), 0 0 46px rgba(" + rgb + ", 0.3)";
      el.appendChild(etoilesEl);
    }
    return el;
  }

  // ancienneCle / nouvelleCle : `cle` des paliers (avant / après). Le
  // glyphe montré est celui du NOUVEAU palier, d'abord teinté de
  // l'ancienne aura puis de la nouvelle.
  function monterRang(ancienneCle, nouvelleCle) {
    if (document.querySelector(".aura-overlay")) return;

    var nouveauPalier = palierParCle(nouvelleCle);

    var overlay = document.createElement("div");
    overlay.className = "aura-overlay";
    overlay.innerHTML =
      '<div class="aura-centre"></div>' +
      '<p class="aura-etiquette"></p>' +
      '<button class="aura-continuer" type="button">Continuer</button>';

    var centre = overlay.querySelector(".aura-centre");
    // Le nouveau glyphe, deux fois : d'abord dans l'ancienne
    // couleur, puis la nouvelle qui prend le dessus en fondu.
    centre.appendChild(scene(nouveauPalier, AURAS[ancienneCle], false));
    centre.appendChild(scene(nouveauPalier, AURAS[nouvelleCle], true));

    overlay.querySelector(".aura-etiquette").textContent =
      (nouveauPalier.lettre === "Nation" ? "Nation atteinte" : "Rang " + libelle(nouveauPalier) + " atteint");

    overlay.querySelector(".aura-continuer").addEventListener("click", function () {
      appliquer(nouvelleCle);
      overlay.classList.add("aura-sortie");
      setTimeout(function () { overlay.remove(); }, 350);
    });

    document.body.appendChild(overlay);

    // Son épique de montée de rang : la nappe enfle dès l'ouverture de
    // la cérémonie (~1,8 s), pour accompagner le fondu d'aura.
    if (window.Son) Son.jouer("rang");

    // La couleur glisse vers la nouvelle aura après que le
    // glyphe s'est posé dans l'ancienne.
    setTimeout(function () {
      overlay.classList.add("glisse");
      vibrer([100, 60, 100, 60, 160]);
    }, 900);
  }

  // Pose immédiate au chargement (script dans le <head>).
  appliquer(rangPour(lireNiveau()));

  return {
    PALIERS: PALIERS,
    palierPour: palierPour,
    palierParCle: palierParCle,
    libelle: libelle,
    rangPour: rangPour,
    appliquer: appliquer,
    monterRang: monterRang
  };
})();
