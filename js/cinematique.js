// ============================================
// LIFE RPG — cinematique.js
// Machine à états AUTONOME des moments de déblocage.
// Propriétaire unique de la cinématique : un seul
// calque (.cine) au-dessus de tout, qui possède le
// tap et le scroll ; l'app dessous est inerte.
//
// Découplé du rendu : les écrans ne font que POSER
// etat.revelationEnAttente (via les déclencheurs de
// deblocage.js) ; c'est ici que le moment se joue,
// puis la main revient à l'app.
//
// Phases : idle -> cercles -> arrivee-nav -> intro
// plein écran (frappe) -> visite guidée (spotlight)
// -> fin. Chaque transition est déclenchée par un tap
// ou la fin d'une animation, jamais par le rendu.
//
// Piloté par les données : CONFIGS décrit chaque
// feature (icône, cible nav, intro, étapes). Ajouter
// une future feature = ajouter une config.
// ============================================

var Cinematique = (function () {

  var SANS_MOUV = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Icônes des features sans bouton de nav (sections d'accueil).
  var ICONE_HEBDO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="3.4"/></svg>';
  var ICONE_SECONDAIRES =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 3l2.1 6.1 6.4.1-5.1 3.9 1.9 6.2L12 15.6 6.8 19.4l1.9-6.2L3.6 9.2l6.4-.1z"/></svg>';

  // Config par feature. `intensite` complete|courte ; `navData` = onglet
  // rejoint + page de destination (features multi-écrans) ; `overlay`
  // pour le chat (sur l'accueil, après l'aura). Une future feature =
  // une entrée ici, la machine ne change pas.
  var CONFIGS = {
    fichePerso: {
      intensite: "complete", navData: "personnage",
      phrase: "Ta fiche s'ouvre.",
      intro: "C'est ici que tu te mesures.\nTa progression, gravée.",
      etapes: [
        { sel: ".rang", texte: "Ton rang. Il s'élève avec ton niveau." },
        { sel: ".niveau", texte: "Ton niveau, et l'XP jusqu'au suivant." },
        { sel: ".stats", texte: "Tes trois forces montent avec tes quêtes." },
        { sel: ".historique", texte: "Ta constance, jour après jour." }
      ]
    },
    collection: {
      intensite: "complete", navData: "collection",
      phrase: "Une première carte t'attend.",
      intro: "Chaque exploit laisse une trace.\nVoici ta collection.",
      etapes: [
        { sel: ".collection-compte", texte: "Les cartes obtenues, sur le total." },
        { sel: "#sections", texte: "Elles se dévoilent à chaque palier franchi." }
      ]
    },
    quetePrincipale: {
      intensite: "complete", navData: "quete",
      phrase: "Ta quête principale se révèle.",
      intro: "Ton grand objectif.\nUn chemin fait de jalons.",
      etapes: [
        { sel: ".qp-titre", texte: "Ta quête, telle que tu l'as choisie." },
        { sel: "#etapes", texte: "Ses jalons : déclare-les atteints, un à un." }
      ]
    },
    chat: {
      intensite: "complete", overlay: true, boutonSel: "#ouvrir-chat",
      phrase: "Le Système ouvre la voix.",
      intro: "Désormais, le Système te répond.\nDemande. Ajuste. Comprends.",
      etapes: [
        { sel: "#ouvrir-chat", texte: "Tape ici quand tu veux lui parler." }
      ]
    },
    hebdo: {
      intensite: "courte", icone: ICONE_HEBDO,
      phrase: "Une quête de la semaine apparaît.",
      etapes: [
        { sel: ".hebdo", texte: "Chaque semaine, un défi plus large. Avance-le pas à pas." }
      ]
    },
    secondaires: {
      intensite: "courte", icone: ICONE_SECONDAIRES,
      phrase: "Le Système peut te lancer des défis.",
      etapes: [
        { sel: ".secondaires", texte: "Des quêtes courtes, à la demande. Du bonus, sans pression." }
      ]
    }
  };

  // État courant de la machine (null = idle). Un seul à la fois.
  var cine = null;

  function iconeDe(config) {
    if (config.icone) return config.icone;
    var sel = config.navData
      ? '.nav-lien[data-nav="' + config.navData + '"] svg'
      : (config.boutonSel ? config.boutonSel + " svg" : null);
    var svg = sel && document.querySelector(sel);
    return svg ? svg.outerHTML : "";
  }

  function echapper(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // Vide le calque et pose un nouveau gestionnaire de tap. Chaque phase
  // repart d'un calque propre ; le tap n'appartient qu'à la phase active.
  function ecran(html, surTap) {
    cine.racine.innerHTML = html;
    cine.racine.onclick = surTap || null;
  }

  // ---------- Phases ----------

  // Cercles concentriques + icône + phrase. Tap -> phase suivante.
  function phaseCercles(next) {
    // LA fanfare de déblocage : le son le plus marquant du jeu, joué une
    // seule fois à l'ouverture du moment (les écrans de destination
    // reprennent à phaseIntro, sans la rejouer). Vibration nette aussi.
    if (window.Son) Son.jouer("deblocage");
    if (window.Juice) Juice.vibrer([0, 40, 40, 90]);
    ecran(
      '<div class="cine-ecran cine-motif">' +
        '<div class="cine-scene">' +
          '<div class="cine-cercles"><span></span><span></span><span></span></div>' +
          '<div class="cine-icone">' + iconeDe(cine.config) + "</div>" +
        "</div>" +
        '<p class="cine-phrase">' + echapper(cine.config.phrase) + "</p>" +
        '<p class="cine-indice">touche pour continuer</p>' +
      "</div>",
      once(next)
    );
  }

  // Arrivée dans la nav : le nouvel onglet s'illumine (cercles) et une
  // zone tapable — POSSÉDÉE par la cinématique — recouvre l'onglet réel.
  // Tap -> on entre dans l'écran de la feature (navigation). La phase B
  // (intro + visite) reprend sur la page de destination.
  function phaseArriveeNav(next) {
    var lien = document.querySelector('.nav-lien[data-nav="' + cine.config.navData + '"]');
    if (!lien) { next(); return; } // filet : pas d'onglet -> on saute
    var r = lien.getBoundingClientRect();

    ecran(
      '<div class="cine-nav">' +
        '<div class="cine-voile"></div>' +
        '<div class="cine-cible-nav">' + iconeDe(cine.config) + "</div>" +
        '<div class="cine-etiquette">Entre pour découvrir</div>' +
        '<button class="cine-entrer" type="button" aria-label="Entrer"></button>' +
      "</div>",
      null
    );

    var cible = cine.racine.querySelector(".cine-cible-nav");
    cible.style.left = r.left + "px";
    cible.style.top = r.top + "px";
    cible.style.width = r.width + "px";
    cible.style.height = r.height + "px";

    var etiq = cine.racine.querySelector(".cine-etiquette");
    etiq.style.left = (r.left + r.width / 2) + "px";
    etiq.style.top = (r.top - 46) + "px";

    // Zone tapable large, centrée sur l'onglet (facile à viser au doigt).
    var bouton = cine.racine.querySelector(".cine-entrer");
    var l = Math.max(0, r.left - 10);
    bouton.style.left = l + "px";
    bouton.style.top = (r.top - 8) + "px";
    bouton.style.width = Math.min(window.innerWidth - l, r.width + 20) + "px";
    bouton.style.height = (r.height + 16) + "px";
    bouton.addEventListener("click", function () {
      // On garde revelationEnAttente : la destination reprend la
      // cinématique (intro + visite) et clôt le moment.
      location.href = cine.config.navData + ".html";
    });
  }

  // Intro plein écran écrite lettre par lettre (frappe). Tap : révèle
  // tout, puis tap -> phase suivante. reduced-motion : d'un coup.
  function phaseIntro(next) {
    ecran(
      '<div class="cine-ecran cine-intro">' +
        '<p class="cine-intro-texte"></p>' +
        '<p class="cine-indice">touche pour continuer</p>' +
      "</div>",
      null
    );
    var cible = cine.racine.querySelector(".cine-intro-texte");
    var texte = cine.config.intro || "";
    var i = 0, fini = false, timer = null;

    function rendre() {
      cible.innerHTML = echapper(texte.slice(0, i)).replace(/\n/g, "<br>") +
        (fini ? "" : '<span class="cine-curseur">&nbsp;</span>');
    }
    function finir() {
      fini = true;
      if (timer) { clearTimeout(timer); timer = null; }
      i = texte.length;
      rendre();
    }
    function tick() {
      i += 1;
      rendre();
      if (i >= texte.length) { finir(); return; }
      timer = setTimeout(tick, texte.charAt(i - 1) === "\n" ? 260 : 42);
    }

    if (SANS_MOUV) finir(); else { rendre(); timer = setTimeout(tick, 320); }

    cine.racine.querySelector(".cine-ecran").addEventListener("click", function () {
      if (!fini) { finir(); return; }
      next();
    });
  }

  // Visite guidée : spotlight + bulle, robuste. Attend que l'élément
  // existe ET soit positionné (rAF) ; s'il reste introuvable, la phase
  // saute PROPREMENT à l'étape suivante — jamais de blocage. Un jeton de
  // génération ignore les placements périmés (taps rapides).
  function phaseVisite(next) {
    var etapes = cine.config.etapes || [];
    if (etapes.length === 0) { next(); return; }

    ecran(
      '<div class="cine-tour">' +
        '<div class="cine-spot"></div>' +
        '<div class="cine-bulle">' +
          '<p class="cine-bulle-texte"></p>' +
          '<div class="cine-bulle-bas">' +
            '<span class="cine-bulle-points"></span>' +
            '<span class="cine-bulle-suite"></span>' +
          "</div>" +
        "</div>" +
      "</div>",
      null
    );
    var spot = cine.racine.querySelector(".cine-spot");
    var bulle = cine.racine.querySelector(".cine-bulle");
    var texteEl = cine.racine.querySelector(".cine-bulle-texte");
    var pointsEl = cine.racine.querySelector(".cine-bulle-points");
    var suiteEl = cine.racine.querySelector(".cine-bulle-suite");
    // Bulle/spot cachés tant qu'aucun placement valide.
    spot.style.opacity = "0";
    bulle.style.opacity = "0";

    var index = -1;
    var gen = 0;
    var pret = true; // faux pendant qu'une étape se place : un tap ne peut
                     // PAS sauter une étape avant que sa bulle soit posée.

    function points(k) {
      pointsEl.innerHTML = "";
      if (etapes.length < 2) return;
      for (var j = 0; j < etapes.length; j++) {
        var pt = document.createElement("i");
        if (j === k) pt.className = "actif";
        pointsEl.appendChild(pt);
      }
    }

    // Attend l'élément (existe + a une hauteur), le fait défiler au
    // centre, puis rend la main après deux frames pour un layout stable.
    function attendre(sel, cb) {
      var essais = 0;
      (function tick() {
        if (cine === null) return; // cinématique quittée entre-temps
        var el = document.querySelector(sel);
        if (el && el.getBoundingClientRect().height > 0) {
          // Défilement INSTANTANÉ (pas "smooth") : la position finale est
          // disponible dès la frame suivante, donc la mesure est fiable.
          // Le glissement visuel du spot vient de sa transition CSS.
          el.scrollIntoView({ block: "center", behavior: "auto" });
          requestAnimationFrame(function () {
            requestAnimationFrame(function () { cb(el); });
          });
          return;
        }
        if (essais++ > 40) { cb(null); return; } // ~introuvable
        requestAnimationFrame(tick);
      })();
    }

    function placer(el, etape) {
      var pad = 8;
      var r = el.getBoundingClientRect();
      spot.style.top = (r.top - pad) + "px";
      spot.style.left = (r.left - pad) + "px";
      spot.style.width = (r.width + pad * 2) + "px";
      spot.style.height = (r.height + pad * 2) + "px";
      spot.style.opacity = "1";

      texteEl.textContent = etape.texte; // texte AVANT de mesurer la bulle
      var dessous = r.bottom + 130 < window.innerHeight;
      var top = dessous ? (r.bottom + pad + 12)
        : Math.max(12, r.top - pad - 12 - bulle.offsetHeight);
      bulle.style.top = top + "px";
      var bw = bulle.offsetWidth;
      var left = Math.min(
        Math.max(12, r.left + r.width / 2 - bw / 2),
        window.innerWidth - bw - 12
      );
      bulle.style.left = left + "px";
      bulle.style.opacity = "1";
    }

    function etapeSuivante() {
      if (!pret) return; // placement en cours : le tap est ignoré (pas de saut)
      pret = false;
      index += 1;
      if (index >= etapes.length) { next(); return; }
      var monGen = ++gen;
      points(index);
      suiteEl.textContent = index === etapes.length - 1 ? "À toi." : "suivant";
      attendre(etapes[index].sel, function (el) {
        if (monGen !== gen || cine === null) return; // placement périmé
        if (!el) { pret = true; etapeSuivante(); return; } // introuvable -> on saute
        placer(el, etapes[index]);
        pret = true; // étape posée : on peut avancer au prochain tap
      });
    }

    cine.racine.onclick = etapeSuivante;
    etapeSuivante();
  }

  // Fin : marque vue, vide l'attente, quitte le mode, rend la main.
  function phaseFin() {
    var etat = cine.etat, id = cine.id;
    if (!Array.isArray(etat.revelationsVues)) etat.revelationsVues = [];
    if (etat.revelationsVues.indexOf(id) === -1) etat.revelationsVues.push(id);
    etat.revelationEnAttente = null;
    Etat.sauvegarder(etat);
    quitter();
  }

  // ---------- Infrastructure ----------

  // Enveloppe un gestionnaire pour qu'il ne se déclenche qu'une fois.
  function once(fn) {
    var fait = false;
    return function () { if (fait) return; fait = true; fn(); };
  }

  function verrouillerScroll() {
    cine.scrollY = window.scrollY;
    document.body.classList.add("cine-actif");
    cine.bloquer = function (e) { e.preventDefault(); };
    window.addEventListener("touchmove", cine.bloquer, { passive: false });
    window.addEventListener("wheel", cine.bloquer, { passive: false });
  }

  function quitter() {
    if (!cine) return;
    document.body.classList.remove("cine-actif");
    if (cine.bloquer) {
      window.removeEventListener("touchmove", cine.bloquer, { passive: false });
      window.removeEventListener("wheel", cine.bloquer, { passive: false });
    }
    if (typeof cine.scrollY === "number") window.scrollTo(0, cine.scrollY);
    if (cine.racine) cine.racine.remove();
    cine = null;
  }

  // Enchaîne les phases : chacune appelle son argument pour passer à la
  // suivante. La dernière (phaseFin) ne prend pas d'argument.
  function lancer(phases) {
    var i = -1;
    (function suite() {
      i += 1;
      if (!cine || i >= phases.length) return;
      phases[i](suite);
    })();
  }

  // Séquence de phases selon la page et l'intensité.
  function sequence(page, config) {
    if (config.intensite === "courte") {
      return page === "accueil" ? [phaseCercles, phaseVisite, phaseFin] : null;
    }
    if (config.overlay) { // chat
      return page === "accueil" ? [phaseCercles, phaseIntro, phaseVisite, phaseFin] : null;
    }
    // complète multi-écrans
    if (page === "accueil") return [phaseCercles, phaseArriveeNav]; // navigue à la fin
    if (page === config.navData) return [phaseIntro, phaseVisite, phaseFin];
    return null;
  }

  // Attend la fin de la cérémonie d'aura (montée de rang) avant de jouer
  // (le chat s'enchaîne APRÈS le rang D). Sans cérémonie -> après un
  // court délai (rechargement).
  function apresAura(cb) {
    var t0 = Date.now();
    (function check() {
      if (document.querySelector(".aura-overlay")) {
        var suivi = setInterval(function () {
          if (!document.querySelector(".aura-overlay")) { clearInterval(suivi); cb(); }
        }, 200);
      } else if (Date.now() - t0 < 1100) {
        setTimeout(check, 120);
      } else { cb(); }
    })();
  }

  // ---------- Entrée unique ----------
  // À appeler après le rendu d'un écran (avec l'état de la page). Prend
  // la main SI une révélation valide est en attente pour cette page.
  function demarrer(etat) {
    if (cine || !etat) return;
    var id = etat.revelationEnAttente;
    if (!id || !CONFIGS[id]) return;
    if (Array.isArray(etat.revelationsVues) && etat.revelationsVues.indexOf(id) !== -1) {
      etat.revelationEnAttente = null; // déjà vue (filet) : on nettoie
      Etat.sauvegarder(etat);
      return;
    }
    var config = CONFIGS[id];
    var phases = sequence(document.body.dataset.page, config);
    if (!phases) return; // pas concerné sur cette page

    var racine = document.createElement("div");
    racine.className = "cine";
    document.body.appendChild(racine);
    cine = { id: id, config: config, etat: etat, racine: racine };
    verrouillerScroll();

    if (config.overlay) apresAura(function () { if (cine) lancer(phases); });
    else lancer(phases);
  }

  function estActive() { return cine !== null; }

  return {
    CONFIGS: CONFIGS,
    demarrer: demarrer,
    estActive: estActive
  };
})();
