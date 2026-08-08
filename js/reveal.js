// ============================================
// LIFE RPG — reveal.js
// Moments de déblocage (chantier 3). Joue le MOMENT
// visuel quand une révélation est en attente
// (etat.revelationEnAttente, posé par le chantier 2),
// puis marque la feature comme vue et vide l'attente.
//
// Langage visuel repris de l'existant : overlay sombre
// (revelation.css), cercles (aura.css), frappe (chat).
// Deux intensités : cérémonie complète (cercles ->
// transition nav -> intro plein écran -> visite guidée)
// ou version courte (cercles -> 1 phrase -> 1-2 bulles).
// Une révélation à la fois, jamais rejouée une fois vue.
// ============================================

var Reveal = (function () {

  var SANS_MOUVEMENT = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Icônes propres aux features sans bouton de nav (sections d'accueil).
  var ICONE_HEBDO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="8.2"/><circle cx="12" cy="12" r="3.4"/></svg>';
  var ICONE_SECONDAIRES =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 3l2.1 6.1 6.4.1-5.1 3.9 1.9 6.2L12 15.6 6.8 19.4l1.9-6.2L3.6 9.2l6.4-.1z"/></svg>';

  // Définition d'un moment par feature. `intensite` : "complete" ou
  // "courte". Les complètes multi-écrans portent `navData` (onglet à
  // rejoindre + page de destination). Le chat est complet mais en
  // overlay (`overlay`). Les courtes vivent sur l'accueil (`section`).
  var DEFS = {
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
      intensite: "courte", section: ".hebdo", icone: ICONE_HEBDO,
      phrase: "Une quête de la semaine apparaît.",
      etapes: [
        { sel: ".hebdo", texte: "Chaque semaine, un défi plus large. Avance-le pas à pas." }
      ]
    },
    secondaires: {
      intensite: "courte", section: ".secondaires", icone: ICONE_SECONDAIRES,
      phrase: "Le Système peut te lancer des défis.",
      etapes: [
        { sel: ".secondaires", texte: "Des quêtes courtes, à la demande. Du bonus, sans pression." }
      ]
    }
  };

  var actif = false; // une seule séquence à la fois

  // Icône du motif : réutilise le SVG du bouton correspondant (nav ou
  // Système) pour rester DRY, sinon l'icône propre à la feature.
  function iconeDe(def) {
    if (def.icone) return def.icone;
    var sel = def.navData
      ? '.nav-lien[data-nav="' + def.navData + '"] svg'
      : (def.boutonSel ? def.boutonSel + " svg" : null);
    var svg = sel && document.querySelector(sel);
    return svg ? svg.outerHTML : "";
  }

  function echapper(s) {
    return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  // ----- Motif signature : cercles + icône + phrase (tap pour suite) -----
  function motif(def, onSuite) {
    var ov = document.createElement("div");
    ov.className = "reveal-overlay reveal-motif";
    ov.innerHTML =
      '<div class="reveal-scene">' +
        '<div class="reveal-cercles"><span></span><span></span><span></span></div>' +
        '<div class="reveal-icone"></div>' +
      "</div>" +
      '<p class="reveal-phrase"></p>' +
      '<p class="reveal-indice">touche pour continuer</p>';
    ov.querySelector(".reveal-icone").innerHTML = iconeDe(def);
    ov.querySelector(".reveal-phrase").textContent = def.phrase;
    ov.addEventListener("click", function () {
      ov.remove();
      onSuite();
    });
    document.body.appendChild(ov);
  }

  // ----- Intro plein écran, écrite lettre par lettre (frappe) -----
  function intro(def, onDone) {
    var ov = document.createElement("div");
    ov.className = "reveal-overlay reveal-intro-overlay";
    ov.innerHTML =
      '<p class="reveal-intro-texte"></p>' +
      '<p class="reveal-indice">touche pour continuer</p>';
    var cible = ov.querySelector(".reveal-intro-texte");
    document.body.appendChild(ov);

    var texte = def.intro || "";
    var i = 0;
    var fini = false;
    var timer = null;

    function rendre() {
      cible.innerHTML =
        echapper(texte.slice(0, i)).replace(/\n/g, "<br>") +
        (fini ? "" : '<span class="reveal-curseur">&nbsp;</span>');
    }
    function terminerFrappe() {
      fini = true;
      if (timer) { clearTimeout(timer); timer = null; }
      i = texte.length;
      rendre();
    }
    function tick() {
      i += 1;
      rendre();
      if (i >= texte.length) { terminerFrappe(); return; }
      timer = setTimeout(tick, texte.charAt(i - 1) === "\n" ? 260 : 42);
    }

    if (SANS_MOUVEMENT) {
      terminerFrappe();
    } else {
      rendre();
      timer = setTimeout(tick, 320);
    }

    ov.addEventListener("click", function () {
      if (!fini) { terminerFrappe(); return; } // 1er tap : révèle tout
      ov.remove();
      onDone();
    });
  }

  // ----- Visite guidée : spotlight + bulle, scroll bloqué, tap = suite -----
  function visiteGuidee(etapes, onDone) {
    // On ne garde que les étapes dont l'élément existe (une section
    // masquée un jour de repos est simplement sautée).
    var liste = etapes.filter(function (e) { return document.querySelector(e.sel); });
    if (liste.length === 0) { onDone(); return; }

    var tour = document.createElement("div");
    tour.className = "reveal-tour";
    tour.innerHTML =
      '<div class="reveal-spot"></div>' +
      '<div class="reveal-bulle">' +
        '<p class="reveal-bulle-texte"></p>' +
        '<div class="reveal-bulle-bas">' +
          '<span class="reveal-bulle-points"></span>' +
          '<span class="reveal-bulle-suite"></span>' +
        "</div>" +
      "</div>";
    var spot = tour.querySelector(".reveal-spot");
    var bulle = tour.querySelector(".reveal-bulle");
    var texteEl = tour.querySelector(".reveal-bulle-texte");
    var pointsEl = tour.querySelector(".reveal-bulle-points");
    var suiteEl = tour.querySelector(".reveal-bulle-suite");
    document.body.appendChild(tour);

    // Scroll bloqué pendant la visite : seul le tap fait avancer.
    var scrollY = window.scrollY;
    function bloquer(e) { e.preventDefault(); }
    document.body.style.overflow = "hidden";
    window.addEventListener("touchmove", bloquer, { passive: false });
    window.addEventListener("wheel", bloquer, { passive: false });

    var index = -1;

    function placer(etape) {
      var el = document.querySelector(etape.sel);
      if (!el) { avancer(); return; }
      el.scrollIntoView({ block: "center", behavior: SANS_MOUVEMENT ? "auto" : "smooth" });
      // On laisse le scroll se poser avant de mesurer.
      setTimeout(function () {
        var r = el.getBoundingClientRect();
        var pad = 8;
        spot.style.top = (r.top - pad) + "px";
        spot.style.left = (r.left - pad) + "px";
        spot.style.width = (r.width + pad * 2) + "px";
        spot.style.height = (r.height + pad * 2) + "px";

        // Bulle sous l'élément si la place le permet, sinon au-dessus.
        texteEl.textContent = etape.texte;
        var placeDessous = r.bottom + 130 < window.innerHeight;
        var top = placeDessous ? (r.bottom + pad + 12) : Math.max(12, r.top - pad - 12 - bulle.offsetHeight);
        bulle.style.top = top + "px";
        var bw = bulle.offsetWidth;
        var left = Math.min(
          Math.max(12, r.left + r.width / 2 - bw / 2),
          window.innerWidth - bw - 12
        );
        bulle.style.left = left + "px";
      }, SANS_MOUVEMENT ? 0 : 240);
    }

    function majPoints(k) {
      pointsEl.innerHTML = "";
      if (liste.length < 2) return;
      for (var j = 0; j < liste.length; j++) {
        var i = document.createElement("i");
        if (j === k) i.className = "actif";
        pointsEl.appendChild(i);
      }
    }

    function avancer() {
      index += 1;
      if (index >= liste.length) { fermer(); return; }
      majPoints(index);
      suiteEl.textContent = index === liste.length - 1 ? "À toi." : "suivant";
      placer(liste[index]);
    }

    function fermer() {
      document.body.style.overflow = "";
      window.removeEventListener("touchmove", bloquer, { passive: false });
      window.removeEventListener("wheel", bloquer, { passive: false });
      window.scrollTo(0, scrollY);
      tour.remove();
      onDone();
    }

    tour.addEventListener("click", avancer);
    avancer();
  }

  // ----- Marque la révélation comme vue et vide l'attente -----
  function terminer(etat, id) {
    if (!Array.isArray(etat.revelationsVues)) etat.revelationsVues = [];
    if (etat.revelationsVues.indexOf(id) === -1) etat.revelationsVues.push(id);
    etat.revelationEnAttente = null;
    Etat.sauvegarder(etat);
    actif = false;
  }

  // ----- Transition vers la nav : le nouveau bouton s'active -----
  // Un voile isole la barre ; le bouton visé passe au-dessus, pulse, et
  // reste tapable pour entrer (navigation naturelle du lien). La phase B
  // (intro + visite) se joue sur la page de destination.
  function transitionNav(etat, def) {
    var lien = document.querySelector('.nav-lien[data-nav="' + def.navData + '"]');
    if (!lien) { // filet : pas de nav (ne devrait pas arriver) -> on clôt
      terminer(etat, idDe(def));
      return;
    }
    var voile = document.createElement("div");
    voile.className = "reveal-nav-focus";
    document.body.appendChild(voile);
    lien.classList.add("reveal-cible");

    var etiquette = document.createElement("div");
    etiquette.className = "reveal-nav-etiquette";
    etiquette.textContent = "Entre pour découvrir";
    document.body.appendChild(etiquette);
    var r = lien.getBoundingClientRect();
    etiquette.style.left = (r.left + r.width / 2) + "px";
    etiquette.style.top = (r.top - 46) + "px";

    // Le tap sur le bouton suit son href : la page de destination
    // reprend la révélation (revelationEnAttente reste posé). On nettoie
    // juste l'habillage avant que la navigation parte.
    lien.addEventListener("click", function () {
      voile.remove();
      etiquette.remove();
      lien.classList.remove("reveal-cible");
    }, { once: true });
    // Le voile ne fait rien au tap : il canalise vers le bouton éclairé.
    voile.addEventListener("click", function (e) { e.stopPropagation(); });
  }

  function idDe(def) {
    for (var k in DEFS) { if (DEFS[k] === def) return k; }
    return null;
  }

  // Attend que la cérémonie d'aura (montée de rang) se termine avant de
  // jouer : le chat s'enchaîne APRÈS le rang D. Si aucune cérémonie
  // n'apparaît (rechargement), joue après un court délai.
  function apresAura(cb) {
    var t0 = Date.now();
    (function check() {
      if (document.querySelector(".aura-overlay")) {
        var suivi = setInterval(function () {
          if (!document.querySelector(".aura-overlay")) { clearInterval(suivi); cb(); }
        }, 200);
      } else if (Date.now() - t0 < 1100) {
        setTimeout(check, 120);
      } else {
        cb();
      }
    })();
  }

  // ----- Point d'entrée : joue la révélation en attente si besoin -----
  // Idempotent : rappelable (chargement + déblocage à chaud) sans risque
  // de double lecture. À appeler avec l'état de la page (même objet).
  function demarrer(etat) {
    if (actif || !etat) return;
    var id = etat.revelationEnAttente;
    if (!id || !DEFS[id]) return;
    if (Array.isArray(etat.revelationsVues) && etat.revelationsVues.indexOf(id) !== -1) {
      // Déjà vue (filet) : on vide l'attente sans rien rejouer.
      etat.revelationEnAttente = null;
      Etat.sauvegarder(etat);
      return;
    }
    var def = DEFS[id];
    var page = document.body.dataset.page;

    if (def.intensite === "courte") {
      if (page !== "accueil") return;
      actif = true;
      motif(def, function () {
        visiteGuidee(def.etapes, function () { terminer(etat, id); });
      });
      return;
    }

    // Cérémonie complète.
    if (def.overlay) { // chat : sur l'accueil, après la cérémonie de rang
      if (page !== "accueil") return;
      actif = true;
      apresAura(function () {
        motif(def, function () {
          intro(def, function () {
            visiteGuidee(def.etapes, function () { terminer(etat, id); });
          });
        });
      });
      return;
    }

    // Complète multi-écrans : motif + transition nav sur l'ORIGINE
    // (accueil), puis intro + visite sur la DESTINATION.
    if (page === "accueil") {
      actif = true;
      motif(def, function () { transitionNav(etat, def); });
    } else if (page === def.navData) {
      actif = true;
      intro(def, function () {
        visiteGuidee(def.etapes, function () { terminer(etat, id); });
      });
    }
  }

  return {
    DEFS: DEFS,
    demarrer: demarrer
  };
})();
