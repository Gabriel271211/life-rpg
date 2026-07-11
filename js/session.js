// ============================================
// LIFE RPG — session.js
// Mode Session : exécution guidée d'une quête
// (minuterie ou séries) en overlay plein écran.
// La validation passe par le callback fourni par
// l'accueil — aucune logique de jeu dupliquée ici.
// ============================================

var Session = (function () {

  var RAYON = 90;
  var CIRCONFERENCE = 2 * Math.PI * RAYON;

  // 60 en mode debug (LifeRpgDebug.accelererSessions) : 20 min -> 20 s.
  var acceleration = 1;

  var ctx = null; // contexte de la session en cours

  var SVG_CROIX =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var SVG_PASSER =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M6 6l6 6-6 6"/><path d="M13 6l6 6-6 6"/></svg>';

  function reglerAcceleration(actif) {
    acceleration = actif === false ? 1 : 60;
  }

  function formaterTemps(secondes) {
    secondes = Math.max(0, Math.ceil(secondes));
    var m = Math.floor(secondes / 60);
    var s = secondes % 60;
    return (m < 10 ? "0" : "") + m + ":" + (s < 10 ? "0" : "") + s;
  }

  function gabaritAnneau(texteInitial) {
    return '<div class="anneau">' +
      '<svg viewBox="0 0 200 200" aria-hidden="true">' +
        '<circle class="anneau-piste" cx="100" cy="100" r="' + RAYON + '"/>' +
        '<circle class="anneau-progression" cx="100" cy="100" r="' + RAYON + '" ' +
          'stroke-dasharray="' + CIRCONFERENCE + '" stroke-dashoffset="0"/>' +
      "</svg>" +
      '<div class="anneau-centre"><span class="anneau-temps">' + texteInitial + "</span></div>" +
    "</div>";
  }

  // ----- Chrono basé sur Date.now() : le temps reste juste même si
  // l'écran se verrouille. Le setInterval ne sert qu'à l'affichage. -----

  function demarrerChrono(dureeSecondes, surFin) {
    arreterChrono();
    ctx.chrono = {
      duree: dureeSecondes,
      debut: Date.now(),
      pauseCumul: 0,
      pauseDepuis: null,
      surFin: surFin,
      derniereSeconde: null
    };
    ctx.intervalle = setInterval(rafraichirChrono, 250);
    rafraichirChrono();
  }

  function arreterChrono() {
    if (ctx && ctx.intervalle) {
      clearInterval(ctx.intervalle);
      ctx.intervalle = null;
    }
    if (ctx) ctx.chrono = null;
  }

  function tempsRestant() {
    var c = ctx.chrono;
    var maintenant = c.pauseDepuis || Date.now();
    var ecoule = (maintenant - c.debut - c.pauseCumul) / 1000;
    return c.duree - ecoule;
  }

  function basculerPause() {
    var c = ctx && ctx.chrono;
    if (!c) return;
    var bouton = ctx.overlay.querySelector('[data-action="pause"]');
    if (c.pauseDepuis) {
      c.pauseCumul += Date.now() - c.pauseDepuis;
      c.pauseDepuis = null;
      if (bouton) bouton.textContent = "Pause";
    } else {
      c.pauseDepuis = Date.now();
      if (bouton) bouton.textContent = "Reprendre";
    }
  }

  function rafraichirChrono() {
    var c = ctx && ctx.chrono;
    if (!c) return;
    var restant = tempsRestant();

    var temps = ctx.overlay.querySelector(".anneau-temps");
    if (temps) temps.textContent = formaterTemps(restant);

    var progression = ctx.overlay.querySelector(".anneau-progression");
    if (progression) {
      var fraction = Math.min(1, Math.max(0, 1 - restant / c.duree));
      progression.style.strokeDashoffset = String(CIRCONFERENCE * fraction);
    }

    // Trois dernières secondes de repos : pulsation + petite vibration.
    if (ctx.phase === "repos" && restant <= 3 && restant > 0) {
      var seconde = Math.ceil(restant);
      if (seconde !== c.derniereSeconde) {
        c.derniereSeconde = seconde;
        if (temps) Juice.pulser(temps);
        Juice.vibrer(30);
      }
    }

    if (restant <= 0) {
      var surFin = c.surFin;
      arreterChrono();
      surFin();
    }
  }

  // ----- Wake lock : garder l'écran allumé pendant la session -----

  function demanderWakeLock() {
    if (navigator.wakeLock && navigator.wakeLock.request) {
      navigator.wakeLock.request("screen").then(function (verrou) {
        if (ctx) ctx.wakeLock = verrou;
      }).catch(function () {});
    }
  }

  function relacherWakeLock() {
    if (ctx && ctx.wakeLock) {
      try { ctx.wakeLock.release(); } catch (e) {}
      ctx.wakeLock = null;
    }
  }

  // ----- Phases -----

  function montrerPhase(html) {
    var corps = ctx.overlay.querySelector(".session-corps");
    corps.classList.remove("fondu");
    void corps.offsetWidth; // relance l'animation d'apparition
    corps.classList.add("fondu");
    corps.innerHTML = html;
  }

  // Compte à rebours d'entrée : 3, 2, 1 avant la première phase.
  function phaseDecompte() {
    ctx.phase = "decompte";
    montrerPhase(
      '<p class="etiquette">Prépare-toi</p>' +
      '<div class="decompte-chiffre" aria-live="assertive">3</div>'
    );
    decompteTick(3);
  }

  function decompteTick(n) {
    var chiffre = ctx.overlay.querySelector(".decompte-chiffre");
    if (!chiffre) return;
    chiffre.textContent = n;
    chiffre.classList.remove("pop");
    void chiffre.offsetWidth; // relance l'animation à chaque seconde
    chiffre.classList.add("pop");
    Juice.vibrer(30);
    ctx.decompte = setTimeout(function () {
      if (!ctx) return;
      ctx.decompte = null;
      if (n > 1) {
        decompteTick(n - 1);
      } else {
        Juice.vibrer(80);
        phaseInitiale();
      }
    }, 1000);
  }

  function annulerDecompte() {
    if (ctx && ctx.decompte) {
      clearTimeout(ctx.decompte);
      ctx.decompte = null;
    }
  }

  // Première vraie phase selon le type de quête.
  function phaseInitiale() {
    if (ctx.quete.type === "series") {
      phaseEffort(1);
    } else if (ctx.quete.type === "minuterie") {
      phaseMinuterie();
    } else {
      phaseActivite();
    }
  }

  // Quête simple : activité libre — cercle qui tourne, phrase
  // "… en cours", et on termine soi-même (Terminé ou »).
  function phaseActivite() {
    ctx.phase = "activite";
    var arc = Math.round(CIRCONFERENCE * 0.25);
    montrerPhase(
      '<div class="anneau rotatif">' +
        '<svg viewBox="0 0 200 200" aria-hidden="true">' +
          '<circle class="anneau-piste" cx="100" cy="100" r="' + RAYON + '"/>' +
          '<circle class="anneau-progression" cx="100" cy="100" r="' + RAYON + '" ' +
            'stroke-dasharray="' + arc + " " + CIRCONFERENCE + '" stroke-dashoffset="0"/>' +
        "</svg>" +
      "</div>" +
      '<p class="session-encours-texte"></p>' +
      '<button class="session-bouton" type="button" data-action="termine">Terminé</button>'
    );
    ctx.overlay.querySelector(".session-encours-texte").textContent =
      ctx.quete.enCours || "En cours";
  }

  function finActivite() {
    ctx.phase = "transition";
    Juice.vibrer([80, 60, 80]);
    accomplir();
  }

  function phaseMinuterie() {
    ctx.phase = "minuterie";
    var duree = ctx.quete.duree / acceleration;
    montrerPhase(
      gabaritAnneau(formaterTemps(duree)) +
      '<button class="session-bouton" type="button" data-action="pause">Pause</button>'
    );
    demarrerChrono(duree, finMinuterie);
  }

  function finMinuterie() {
    ctx.phase = "transition";
    arreterChrono();
    var anneau = ctx.overlay.querySelector(".anneau");
    if (anneau) anneau.classList.add("plein");
    Juice.vibrer([80, 60, 80]);
    setTimeout(accomplir, 450);
  }

  function phaseEffort(numero) {
    ctx.phase = "effort";
    ctx.serie = numero;
    montrerPhase(
      '<p class="etiquette">Série ' + numero + " / " + ctx.quete.series + "</p>" +
      '<p class="session-effort-texte"></p>' +
      '<button class="session-bouton" type="button" data-action="serie-terminee">Série terminée</button>'
    );
    ctx.overlay.querySelector(".session-effort-texte").textContent = ctx.quete.parSerie;
  }

  function serieTerminee() {
    if (ctx.serie >= ctx.quete.series) {
      ctx.phase = "transition";
      Juice.vibrer([80, 60, 80]);
      accomplir();
    } else {
      phaseRepos();
    }
  }

  function phaseRepos() {
    ctx.phase = "repos";
    var duree = ctx.quete.repos / acceleration;
    montrerPhase(
      '<p class="etiquette">Repos</p>' +
      gabaritAnneau(formaterTemps(duree))
    );
    demarrerChrono(duree, finRepos);
  }

  function finRepos() {
    phaseEffort(ctx.serie + 1);
  }

  // Le bouton "passer" (») : jamais culpabilisant, sans confirmation.
  function passer() {
    if (!ctx) return;
    if (ctx.phase === "decompte") {
      annulerDecompte();
      phaseInitiale();
    } else if (ctx.phase === "minuterie") {
      finMinuterie();
    } else if (ctx.phase === "effort") {
      serieTerminee();
    } else if (ctx.phase === "repos") {
      arreterChrono();
      finRepos();
    } else if (ctx.phase === "activite") {
      finActivite();
    }
  }

  // ----- Fin de session : validation par le chemin classique -----

  function accomplir() {
    if (!ctx || ctx.phase === "fin") return;
    ctx.phase = "fin";
    arreterChrono();
    relacherWakeLock();

    var res = ctx.surValider();

    ctx.overlay.querySelector(".session-fermer").hidden = true;
    ctx.overlay.querySelector(".session-passer").hidden = true;
    masquerConfirmation();

    montrerPhase(
      '<div class="session-fin">' +
        '<p class="etiquette">Quête accomplie</p>' +
        '<h2 class="session-fin-nom"></h2>' +
        (res.critique ? '<p class="etiquette session-fin-critique">Coup critique</p>' : "") +
        '<p class="session-fin-xp' + (res.critique ? " critique" : "") + '">+' + res.xpDonne + " XP</p>" +
        '<button class="session-bouton" type="button" data-action="continuer">Continuer</button>' +
      "</div>"
    );
    ctx.overlay.querySelector(".session-fin-nom").textContent = ctx.quete.nom;

    var xp = ctx.overlay.querySelector(".session-fin-xp");
    setTimeout(function () { if (xp) Juice.pulser(xp); }, 350);
  }

  // ----- Abandon -----

  function montrerConfirmation() {
    ctx.overlay.querySelector(".session-confirmation").hidden = false;
  }

  function masquerConfirmation() {
    ctx.overlay.querySelector(".session-confirmation").hidden = true;
  }

  function fermer() {
    if (!ctx) return;
    var surFermer = ctx.surFermer;
    annulerDecompte();
    arreterChrono();
    relacherWakeLock();
    ctx.overlay.remove();
    ctx = null;
    if (surFermer) surFermer();
  }

  // ----- Ouverture -----

  function ouvrir(quete, surValider, surFermer) {
    if (ctx) return;
    ctx = {
      quete: quete,
      surValider: surValider,
      surFermer: surFermer || null,
      overlay: null,
      phase: null,
      serie: 0,
      chrono: null,
      intervalle: null,
      decompte: null,
      wakeLock: null
    };

    var overlay = document.createElement("div");
    overlay.className = "session";
    overlay.innerHTML =
      '<header class="session-entete">' +
        '<div class="session-titre">' +
          '<p class="etiquette">Session</p>' +
          '<h2 class="session-nom"></h2>' +
        "</div>" +
        '<button class="session-fermer" type="button" data-action="abandon-demande" ' +
          'aria-label="Abandonner la session">' + SVG_CROIX + "</button>" +
      "</header>" +
      '<div class="session-confirmation" hidden>' +
        "<p>Abandonner la session ?</p>" +
        '<div class="session-confirmation-boutons">' +
          '<button class="session-lien" type="button" data-action="abandonner">Abandonner</button>' +
          '<button class="session-lien accent" type="button" data-action="abandon-annule">Continuer</button>' +
        "</div>" +
      "</div>" +
      '<div class="session-corps"></div>' +
      '<button class="session-passer" type="button" data-action="passer" aria-label="Passer">' +
        SVG_PASSER + "</button>";

    overlay.querySelector(".session-nom").textContent = quete.nom;

    overlay.addEventListener("click", function (e) {
      var cible = e.target.closest("[data-action]");
      if (!cible || !ctx) return;
      var action = cible.getAttribute("data-action");
      if (action === "abandon-demande") montrerConfirmation();
      else if (action === "abandon-annule") masquerConfirmation();
      else if (action === "abandonner") fermer();
      else if (action === "pause") basculerPause();
      else if (action === "serie-terminee") serieTerminee();
      else if (action === "termine") finActivite();
      else if (action === "passer") passer();
      else if (action === "continuer") fermer();
    });

    document.body.appendChild(overlay);
    ctx.overlay = overlay;
    demanderWakeLock();

    phaseDecompte();
  }

  return {
    ouvrir: ouvrir,
    reglerAcceleration: reglerAcceleration
  };
})();
