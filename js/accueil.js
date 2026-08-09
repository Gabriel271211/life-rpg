// ============================================
// LIFE RPG — accueil.js
// Quêtes du jour : rendu, validation (XP, critique,
// streak, quête principale, compteurs, cartes),
// quête hebdomadaire et ouverture du mode Session.
// La validation est UNIQUE : le tap direct et la
// session passent par le même chemin.
// ============================================

(function () {

  var etat = Etat.charger();

  // Déblocage progressif (chantier 2) : `debloque` est la carte des
  // fonctionnalités ouvertes (même référence que etat.debloque, mutée
  // en place par Deblocage.evaluer). L'accueil masque les sections non
  // ouvertes et les fait apparaître à chaud dès qu'elles se débloquent.
  var debloque = etat.debloque;

  var sectionHebdo = document.querySelector(".hebdo");
  var sectionSecondaires = document.querySelector(".secondaires");
  var lienQuetePrincipale = document.querySelector(".qp-lien");

  function afficherSi(el, ouvert) {
    if (el) el.style.display = ouvert ? "" : "none";
  }

  // Masque/affiche les sections de l'accueil selon `debloque`, et
  // répercute sur la nav. Le chat fait exception (toujours visible,
  // verrouillé => teaser) ; les écrans Perso/Collection/Quête sont
  // gardés par garde.js.
  function appliquerMasquage() {
    afficherSi(sectionHebdo, debloque.hebdo);
    afficherSi(sectionSecondaires, debloque.secondaires);
    afficherSi(lienQuetePrincipale, debloque.quetePrincipale);
    if (window.Nav) Nav.appliquer(debloque);
  }

  // Ré-évalue les déclencheurs après un changement d'état. Ce qui
  // s'ouvre est persisté et l'UI se met à jour aussitôt. La révélation
  // ANIMÉE est le chantier 3 : ici on ne fait que poser les drapeaux
  // (Deblocage.evaluer a déjà écrit revelationEnAttente).
  function evaluerDeblocages() {
    if (!window.Deblocage) return;
    var nouveaux = Deblocage.evaluer(etat);
    if (nouveaux.length) {
      Etat.sauvegarder(etat);
      appliquerMasquage();
      // Une feature vient de s'ouvrir : la cinématique prend la main
      // (module autonome). Le rendu, lui, ne déclenche rien.
      if (window.Cinematique) Cinematique.demarrer(etat);
    }
  }

  var puceStreak = document.getElementById("puce-streak");
  var puceNiveau = document.getElementById("puce-niveau");
  var listeQuetes = document.getElementById("quetes");

  var flammeEntete = document.getElementById("flamme-entete");
  var flammeRepos = document.getElementById("flamme-repos");
  var reposStreakValeur = document.getElementById("repos-streak-valeur");
  var semaineConteneur = document.getElementById("streak-semaine");

  var LABELS_SEMAINE = ["L", "M", "M", "J", "V", "S", "D"];

  // Petite flamme des créneaux honorés / gelés de la mini-semaine.
  var SVG_FLAMME_MINI =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">' +
    '<path d="M13.5.67s.74 2.65.74 4.8c0 2.06-1.35 3.73-3.41 3.73-2.07 0-3.63-1.67-3.63-3.73l.03-.36C5.21 7.51 4 10.62 4 14c0 4.42 3.58 8 8 8s8-3.58 8-8C20 8.61 17.41 3.8 13.5.67zM11.71 19c-1.78 0-3.22-1.4-3.22-3.14 0-1.62 1.05-2.76 2.81-3.12 1.77-.36 3.6-1.21 4.62-2.58.39 1.29.59 2.65.59 4.04 0 2.65-2.15 4.8-4.8 4.8z"/></svg>';

  var elementsQuetes = {}; // id de quête -> { carte, bouton }

  var SVG_COCHE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5.5 12.5l4.2 4.2L18.5 8"/></svg>';

  // Indicateurs de quête guidée
  var SVG_CHRONO =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="13.5" r="7"/><path d="M12 10v3.5l2.3 2.3"/><path d="M9.5 3h5"/></svg>';

  var SVG_SERIES =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" aria-hidden="true">' +
    '<path d="M5.5 19v-6"/><path d="M12 19V7"/><path d="M18.5 19v-9"/></svg>';

  var SVG_SEANCE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" aria-hidden="true">' +
    '<path d="M5 6.5h14"/><path d="M5 12h14"/><path d="M5 17.5h9"/></svg>';

  var etiquetteStat = Commun.etiquetteStat; // util partagé (commun.js)

  function estGuidee(quete) {
    return quete.type === "minuterie" || quete.type === "series" || quete.type === "seance";
  }

  function majPuce(el, valeur) {
    var texte = String(valeur);
    if (el.textContent !== texte) {
      el.textContent = texte;
      Juice.pulser(el);
    }
  }

  function majPuces() {
    majPuce(puceStreak, etat.streak);
    majPuce(puceNiveau, etat.niveau);
    majFlamme();
    majSemaine();
  }

  // ----- Flamme évolutive + flamme gelée -----

  // Braise (3+) -> flamme (10+) -> brasier (30+). En dessous : dormante.
  function palierFlamme(streak) {
    if (streak >= 30) return "t-brasier";
    if (streak >= 10) return "t-flamme";
    if (streak >= 3) return "t-braise";
    return "t-dormante";
  }

  // La série est-elle actuellement TENUE PAR UN GEL ? On remonte depuis
  // aujourd'hui : le dernier jour d'engagement à issue est-il un gel
  // (pas encore relayé par un jour honoré) ? La flamme se fige alors,
  // le nombre de jours conservé.
  function flammeGelee() {
    if (!etat.streak || !etat.journal) return false;
    for (var i = 0; i <= 14; i++) {
      var d = Jour.decalerDate(etat.dernierJour, -i);
      if (!Jour.estJourEngagement(etat, d)) continue;
      var s = etat.journal[d];
      if (s === "gele") return true;
      if (s === "honore") return false;
      if (d !== etat.dernierJour) return false; // manque sec : rien à figer
    }
    return false;
  }

  function majFlamme() {
    var palier = palierFlamme(etat.streak);
    var gel = flammeGelee();
    if (flammeEntete) {
      flammeEntete.className = "flamme flamme-entete " + palier + (gel ? " gelee" : "");
    }
    if (flammeRepos) {
      flammeRepos.className = "flamme flamme-repos " + palier + (gel ? " gelee" : "");
    }
    if (reposStreakValeur) reposStreakValeur.textContent = etat.streak;
  }

  // ----- Mini-semaine : 7 créneaux L..D reflétant l'état réel -----

  function construireSemaine() {
    if (!semaineConteneur) return;
    semaineConteneur.innerHTML = "";
    for (var i = 0; i < 7; i++) {
      var jour = document.createElement("div");
      jour.className = "sem-jour";
      jour.innerHTML =
        '<span class="sem-slot"></span>' +
        '<span class="sem-label">' + LABELS_SEMAINE[i] + "</span>";
      semaineConteneur.appendChild(jour);
    }
  }

  // repos / avenir / actuel / honore / manque / gele pour un jour de la
  // semaine courante (index 0 = lundi de etat.lundiSemaine).
  function etatJourSemaine(idx) {
    var date = Jour.decalerDate(etat.lundiSemaine, idx);
    if (!Jour.estJourEngagement(etat, date)) return "repos";
    var s = etat.journal && etat.journal[date];
    if (s === "gele") return "gele";
    if (s === "honore") return "honore";
    var cmp = Jour.joursEcoules(etat.dernierJour, date); // >0 futur, 0 aujourd'hui, <0 passé
    if (cmp === 0) return "actuel";
    if (cmp < 0) return "manque";
    return "avenir";
  }

  function majSemaine() {
    if (!semaineConteneur || !semaineConteneur.children.length) return;
    var aujourdIdx = Jour.indiceJourSemaine(etat.dernierJour);
    for (var i = 0; i < 7; i++) {
      var jour = semaineConteneur.children[i];
      var et = etatJourSemaine(i);
      jour.setAttribute("data-etat", et);
      jour.classList.toggle("actuel", i === aujourdIdx);
      var slot = jour.querySelector(".sem-slot");
      if (et === "honore" || et === "gele") {
        slot.innerHTML =
          '<span class="flamme sem-flamme' + (et === "gele" ? " gelee" : "") + '">' +
          SVG_FLAMME_MINI + "</span>";
      } else {
        slot.innerHTML = "";
      }
    }
  }

  // Feedback après un gain : niveau, cartes élevées, cartes devenues
  // brillantes, révélation plein écran des nouvelles cartes, et la montée
  // de rang — le moment fort — par-dessus tout. Délégué au module partagé
  // Feedback (même langage que l'écran Quête). evoCartes est le retour de
  // Cartes.verifier : { nouvelles, montees, brillantes }.
  function afficherBandeaux(niveauAvant, evoCartes) {
    // Tant que la Collection n'est pas débloquée, AUCUNE révélation de
    // carte ne se joue : Cartes.verifier a bien enregistré la carte en
    // état, mais l'overlay attend. Au moment où la Collection s'ouvre
    // (journée complète), c'est SA cinématique qui porte le moment — on
    // ne double pas avec un overlay de carte. La 1ʳᵉ carte se découvre
    // alors dans la Collection.
    var evo = evoCartes;
    if (!debloque.collection || etat.revelationEnAttente === "collection") {
      evo = { nouvelles: [], montees: evoCartes.montees, brillantes: evoCartes.brillantes };
    }
    Feedback.evolution(niveauAvant, etat.niveau, evo);
  }

  // Rang redescendu (décochage) : l'aura suit, sans cérémonie.
  function majAuraSansCeremonie(niveauAvant) {
    var rangApres = Regles.rang(etat.niveau).actuel.cle;
    if (rangApres !== Regles.rang(niveauAvant).actuel.cle) {
      Aura.appliquer(rangApres);
    }
  }

  // ----- Validation / dévalidation : le SEUL chemin du jeu.
  // Utilisé par le tap direct ET par la fin d'une session. -----

  function validerQuete(quete) {
    var critique = Regles.lancerCritique();
    quete.faite = true;
    // On retient l'XP réellement donné (doublé si critique) pour
    // pouvoir retirer exactement la même chose au décochage.
    quete.xpDonne = quete.xp * (critique ? Regles.MULTIPLICATEUR_CRITIQUE : 1);

    var niveauAvant = etat.niveau;
    Regles.gagnerXp(etat, quete.xpDonne, quete.stat);
    Jour.majStreak(etat);
    etat.compteurs.quetesValidees += 1;
    if (critique) etat.compteurs.critiques += 1;

    // Progression automatique de l'hebdo selon son lien (séance,
    // minuterie d'une stat, toute quête...). Le marqueur hebdoCompte
    // retient que CETTE quête a fait avancer l'hebdo : le décochage
    // retirera exactement ce progrès-là, et rien d'autre.
    var hebdoProgres = false;
    if (Regles.queteCompteDansHebdo(etat.hebdo, quete)) {
      hebdoProgres = Regles.progresserHebdo(etat) !== null;
      if (hebdoProgres) quete.hebdoCompte = true;
    }

    var evoCartes = Cartes.verifier(etat);
    Etat.sauvegarder(etat);

    return {
      critique: critique,
      xpDonne: quete.xpDonne,
      niveauAvant: niveauAvant,
      evoCartes: evoCartes,
      hebdoProgres: hebdoProgres
    };
  }

  function devaliderQuete(quete) {
    // On décrémente les compteurs pour rester honnête — mais les
    // cartes déjà débloquées ne se re-verrouillent jamais.
    var etaitCritique = Boolean(quete.xpDonne && quete.xpDonne > quete.xp);
    var niveauAvant = etat.niveau;
    quete.faite = false;
    Regles.retirerXp(etat, quete.xpDonne || quete.xp, quete.stat);
    delete quete.xpDonne;
    Jour.majStreak(etat);
    etat.compteurs.quetesValidees = Math.max(0, etat.compteurs.quetesValidees - 1);
    if (etaitCritique) {
      etat.compteurs.critiques = Math.max(0, etat.compteurs.critiques - 1);
    }

    // Si cette quête avait fait avancer l'hebdo (progression
    // automatique), son décochage retire ce progrès — et rouvre
    // l'hebdo si c'est lui qui l'avait accomplie.
    if (quete.hebdoCompte) {
      Regles.regresserHebdo(etat);
      delete quete.hebdoCompte;
    }

    Etat.sauvegarder(etat);
    majAuraSansCeremonie(niveauAvant);
  }

  function majCarte(quete) {
    var el = elementsQuetes[quete.id];
    if (!el) return;
    el.carte.classList.toggle("faite", quete.faite);
    el.bouton.setAttribute("aria-pressed", String(quete.faite));
  }

  // --- Journée accomplie : le moment de fierté quotidien ---

  var jourAccompli = document.getElementById("jour-accompli");
  var jourAccompliXp = document.getElementById("jour-accompli-xp");

  function majJourAccompli() {
    var toutFait = etat.quetes.length > 0 &&
      etat.quetes.every(function (q) { return q.faite; });
    if (toutFait) {
      jourAccompliXp.textContent =
        (etat.historique && etat.historique[etat.dernierJour]) || 0;
    }
    jourAccompli.hidden = !toutFait;
  }

  function majApresChangement() {
    majPuces();
    majQuetePrincipale();
    rendreHebdo();
    majJourAccompli();
    evaluerDeblocages();
  }

  function devaliderParTap(quete) {
    devaliderQuete(quete);
    majCarte(quete);
    majApresChangement();
  }

  // Bref éclat de la carte au retour d'une session accomplie,
  // pour relier visuellement la session à la liste.
  function eclatCarte(quete) {
    var el = elementsQuetes[quete.id];
    if (!el) return;
    el.carte.classList.add("eclat");
    setTimeout(function () { el.carte.classList.remove("eclat"); }, 700);
  }

  // Étiquette du flottant de progression automatique, selon le lien.
  function libelleProgresHebdo() {
    return etat.hebdo.lien === "seance" ? "+1 séance" : "+1";
  }

  // La session est le SEUL moyen de valider une quête, quel que soit
  // son type. À la fin, elle valide par le chemin classique.
  function ouvrirSession(quete) {
    var hebdoAvancee = false;
    Session.ouvrir(quete, function () {
      var res = validerQuete(quete);
      hebdoAvancee = res.hebdoProgres;
      majCarte(quete);
      majApresChangement();
      afficherBandeaux(res.niveauAvant, res.evoCartes);
      return res;
    }, function () {
      if (quete.faite) {
        eclatCarte(quete);
        // La session a fait avancer l'hebdo : petit flottant sur sa
        // carte au retour, pour relier la session à la semaine.
        if (hebdoAvancee) {
          Juice.xpFlottant(hebdoCarte, libelleProgresHebdo(), false);
        }
      }
    });
  }

  function creerCarte(quete) {
    var guidee = estGuidee(quete);

    var carte = document.createElement("article");
    carte.className = "quete guidee" + (quete.faite ? " faite" : "");
    carte.innerHTML =
      '<div class="quete-infos">' +
        '<p class="quete-nom"></p>' +
        '<div class="quete-meta">' +
          '<span class="quete-xp">+' + quete.xp + " XP</span>" +
          '<span class="quete-tag"></span>' +
          (guidee
            ? '<span class="quete-indicateur">' +
                (quete.type === "minuterie" ? SVG_CHRONO :
                 quete.type === "seance" ? SVG_SEANCE : SVG_SERIES) +
              "</span>"
            : "") +
        "</div>" +
      "</div>" +
      '<button class="quete-cercle" type="button" aria-pressed="' + quete.faite + '" ' +
        'aria-label="Valider la quête">' + SVG_COCHE + "</button>";

    carte.querySelector(".quete-nom").textContent = quete.nom;
    carte.querySelector(".quete-tag").textContent = etiquetteStat(quete.stat);

    var bouton = carte.querySelector(".quete-cercle");
    elementsQuetes[quete.id] = { carte: carte, bouton: bouton };

    bouton.addEventListener("click", function (e) {
      e.stopPropagation();
      if (quete.faite) {
        devaliderParTap(quete);
      } else {
        ouvrirSession(quete);
      }
    });

    carte.addEventListener("click", function () {
      if (!quete.faite) ouvrirSession(quete);
    });

    return carte;
  }

  function rendreQuetes() {
    listeQuetes.innerHTML = "";
    elementsQuetes = {};
    etat.quetes.forEach(function (quete, i) {
      var carte = creerCarte(quete);
      // apparition en cascade
      carte.classList.add("entree");
      carte.style.animationDelay = (i * 60) + "ms";
      listeQuetes.appendChild(carte);
    });
  }
  rendreQuetes();

  // --- Éditeur de quêtes : re-rendu complet au retour ---

  document.getElementById("editeur-ouvrir").addEventListener("click", function () {
    Editeur.ouvrir(etat, function () {
      rendreQuetes();
      rendreHebdo();
      majPuces();
      majQuetePrincipale();
      majJourAccompli();
      // Les jours d'engagement ont pu changer : on ré-évalue le repos.
      majModeRepos();
    });
  });

  // --- Chat du Système : une action appliquée re-rend l'accueil ---

  // Le bouton du Système reste VISIBLE avant le rang D, mais verrouillé :
  // au tap, un teaser au lieu d'ouvrir le chat. Débloqué (niv 10),
  // il ouvre normalement.
  document.getElementById("ouvrir-chat").addEventListener("click", function () {
    if (!debloque.chat) {
      // Teaser sobre : une seule ligne discrète, aucun mot en gros.
      Juice.bandeau("Le Système observe", "");
      Juice.vibrer(20);
      return;
    }
    Chat.ouvrir(etat, function () {
      rendreQuetes();
      majQuetePrincipale();
      majJourAccompli();
      rendreSecondaires();
    });
  });

  // --- Quête principale : ligne de rappel vers quete.html ---

  var qpEtape = document.getElementById("qp-etape");
  var qpProgres = document.getElementById("qp-progres");

  function majQuetePrincipale() {
    var qp = etat.quetePrincipale;
    if (Regles.quetePrincipaleAccomplie(qp)) {
      qpEtape.textContent = "Entre deux quêtes";
      qpProgres.textContent = "";
    } else {
      var actif = Regles.jalonActif(qp);
      qpEtape.textContent = actif.jalon.nom;
      qpProgres.textContent = Regles.nbJalonsAtteints(qp) + "/" + qp.jalons.length;
    }
  }

  // --- Quête hebdomadaire ---

  var hebdoCarte = document.getElementById("hebdo-carte");
  var hebdoBouton = document.getElementById("hebdo-bouton");
  var hebdoAnnuler = document.getElementById("hebdo-annuler");

  function hebdoEstAccomplie() {
    return Regles.hebdoAccomplie(etat.hebdo);
  }

  function rendreHebdo() {
    var h = etat.hebdo;
    document.getElementById("hebdo-nom").textContent = h.nom;
    document.getElementById("hebdo-xp").textContent = "+" + h.xp + " XP";

    var segments = document.getElementById("hebdo-segments");
    segments.innerHTML = "";
    for (var i = 0; i < h.objectif; i++) {
      var segment = document.createElement("div");
      segment.className = "hebdo-segment" + (i < h.progres ? " rempli" : "");
      segments.appendChild(segment);
    }
    document.getElementById("hebdo-compte").innerHTML =
      h.progres + " <span>/ " + h.objectif + "</span>";

    hebdoCarte.classList.toggle("accomplie", hebdoEstAccomplie());
    hebdoBouton.disabled = hebdoEstAccomplie();
    hebdoAnnuler.hidden = h.progres === 0;
  }

  // Le tap manuel reste possible quel que soit le lien : une action
  // faite hors app compte aussi.
  function progresserHebdoManuel() {
    var niveauAvant = etat.niveau;
    var res = Regles.progresserHebdo(etat);
    if (!res) return;

    if (res.accomplie) {
      var evoCartes = Cartes.verifier(etat);
      Etat.sauvegarder(etat);
      Juice.xpFlottant(
        hebdoBouton,
        (res.critique ? "CRITIQUE ! +" : "+") + etat.hebdo.xpDonne + " XP",
        res.critique
      );
      Juice.vibrer(evoCartes.nouvelles.length > 0 ? 70 : 40);
      afficherBandeaux(niveauAvant, evoCartes);
    } else {
      Etat.sauvegarder(etat);
      Juice.xpFlottant(hebdoBouton, "+1", false);
      Juice.vibrer(30);
    }

    rendreHebdo();
    majPuces();
    evaluerDeblocages();
  }

  // L'hebdo se vit comme une quête du jour : si elle définit une
  // session guidée (séance en blocs, minuterie, action), le tap la
  // traverse étape par étape et le +1 tombe à la fin. Sans session
  // (journée complète, quêtes accomplies), le tap direct reste.
  function tapHebdo() {
    if (hebdoEstAccomplie()) return;
    if (etat.hebdo.session) {
      ouvrirSessionHebdo();
    } else {
      progresserHebdoManuel();
    }
  }

  function ouvrirSessionHebdo() {
    var s = etat.hebdo.session;
    var uniteValidee = false;

    Session.ouvrir({
      nom: etat.hebdo.nom,
      type: s.type,
      duree: s.duree,
      blocs: s.blocs,
      series: s.series,
      parSerie: s.parSerie,
      repos: s.repos,
      enCours: s.enCours
    }, function () {
      uniteValidee = true;
      var niveauAvant = etat.niveau;
      var res = Regles.progresserHebdo(etat);
      var evoCartes = Cartes.verifier(etat);
      Etat.sauvegarder(etat);
      rendreHebdo();
      majPuces();
      evaluerDeblocages();

      if (res && res.accomplie) {
        afficherBandeaux(niveauAvant, evoCartes);
        return {
          critique: res.critique,
          xpDonne: etat.hebdo.xpDonne,
          finEtiquette: "Quête hebdomadaire accomplie"
        };
      }
      return {
        critique: false,
        xpDonne: 0,
        finEtiquette: "Quête hebdomadaire",
        finTexte: etat.hebdo.progres + " / " + etat.hebdo.objectif
      };
    }, function () {
      if (uniteValidee) eclatHebdo();
    });
  }

  // Bref éclat de la carte hebdo, même langage que les quêtes du jour.
  function eclatHebdo() {
    hebdoCarte.classList.add("eclat");
    setTimeout(function () { hebdoCarte.classList.remove("eclat"); }, 700);
  }

  hebdoBouton.addEventListener("click", function (e) {
    e.stopPropagation();
    tapHebdo();
  });

  // Comme les quêtes du jour : la carte entière réagit au tap,
  // pas seulement le cercle. "annuler" garde son propre rôle.
  hebdoCarte.addEventListener("click", function (e) {
    if (e.target.closest("#hebdo-annuler")) return;
    tapHebdo();
  });

  hebdoAnnuler.addEventListener("click", function (e) {
    e.stopPropagation();
    if (etat.hebdo.progres === 0) return;
    // Annuler retire un progrès ; si l'hebdo était accomplie, elle se
    // rouvre et l'XP donné est retiré à l'identique (les cartes
    // débloquées restent débloquées).
    var niveauAvant = etat.niveau;
    Regles.regresserHebdo(etat);
    majAuraSansCeremonie(niveauAvant);
    Etat.sauvegarder(etat);

    rendreHebdo();
    majPuces();
  });

  // --- Hebdo guidée : proposition en douceur au fil des semaines ---
  // Au premier lancement d'une nouvelle semaine (drapeau posé par
  // jour.js), si le joueur a un objectif, le Système propose une hebdo
  // ajustée à la semaine passée. Jamais de remplacement silencieux :
  // Accepter ou Garder l'actuelle. Échec de l'appel -> l'hebdo en
  // cours est reconduite en silence, aucun message.

  var hebdoProposition = document.getElementById("hebdo-proposition");
  var hebdoPropositionAccepter = document.getElementById("hebdo-proposition-accepter");
  var hebdoPropositionGarder = document.getElementById("hebdo-proposition-garder");
  var propositionHebdo = null;

  function libelleLienHebdo(lien) {
    if (lien === "seance") return "à chaque séance";
    if (lien === "quete") return "à chaque quête validée";
    if (lien === "journee") return "à chaque journée complète";
    if (lien && lien.indexOf("minuterie") === 0) return "à chaque session minutée";
    return "à cocher toi-même";
  }

  function proposerHebdoSiBesoin() {
    if (!etat.propositionHebdoAttendue || !etat.objectifTexte) return;

    var actif = Regles.jalonActif(etat.quetePrincipale);
    IA.appeler("hebdo", {
      objectif: etat.objectifTexte,
      jalon: actif ? { nom: actif.jalon.nom, critere: actif.jalon.critere } : null,
      hebdoPrecedente: etat.hebdoPrecedente,
      stats: {
        corps: etat.stats.corps.niveau,
        esprit: etat.stats.esprit.niveau,
        discipline: etat.stats.discipline.niveau
      }
    }).then(function (resultat) {
      if (resultat) {
        propositionHebdo = resultat;
        afficherPropositionHebdo(resultat);
      } else {
        // Reconduite silencieuse : on éteint le drapeau, aucune erreur.
        etat.propositionHebdoAttendue = false;
        Etat.sauvegarder(etat);
      }
    });
  }

  function afficherPropositionHebdo(h) {
    document.getElementById("hebdo-proposition-nom").textContent = h.nom;
    document.getElementById("hebdo-proposition-meta").textContent =
      "+" + h.xp + " XP · " + h.objectif + " fois · progresse " + libelleLienHebdo(h.lien);
    hebdoProposition.hidden = false;
  }

  hebdoPropositionAccepter.addEventListener("click", function () {
    if (!propositionHebdo) return;
    // La nouvelle hebdo remplace l'actuelle, remise à zéro. Sa session
    // guidée est déduite du lien, comme les hebdos de template : une
    // hebdo IA minutée se tape en minuterie, pas en +1 sec.
    etat.hebdo = {
      nom: propositionHebdo.nom,
      xp: propositionHebdo.xp,
      stat: propositionHebdo.stat,
      objectif: propositionHebdo.objectif,
      lien: propositionHebdo.lien,
      session: Templates.sessionPourLien(propositionHebdo.lien),
      progres: 0
    };
    etat.propositionHebdoAttendue = false;
    propositionHebdo = null;
    Etat.sauvegarder(etat);
    hebdoProposition.hidden = true;
    rendreHebdo();
  });

  hebdoPropositionGarder.addEventListener("click", function () {
    etat.propositionHebdoAttendue = false;
    propositionHebdo = null;
    Etat.sauvegarder(etat);
    hebdoProposition.hidden = true;
  });

  // --- Quêtes secondaires : la variété à durée limitée ---
  // Optionnelles, hors socle : elles ne touchent NI au streak NI aux
  // compteurs du jour. Validation par tap simple (actions hors app),
  // deux actives au maximum, disparition sans pénalité à l'expiration.

  var MAX_SECONDAIRES = 2;

  var secondairesListe = document.getElementById("secondaires-liste");
  var secondairesDemander = document.getElementById("secondaires-demander");
  var secondairesProposition = document.getElementById("secondaires-proposition");
  var secondairesAttente = document.getElementById("secondaires-attente");
  var secondairesMessage = document.getElementById("secondaires-message");
  var secondairesAccepter = document.getElementById("secondaires-prop-accepter");
  var secondairesRefuser = document.getElementById("secondaires-prop-refuser");
  var propositionSecondaire = null;

  function texteExpiration(expire) {
    var restant = Jour.joursEcoules(etat.dernierJour, expire);
    if (restant <= 0) return "dernier jour";
    if (restant === 1) return "1 j restant";
    return restant + " j restants";
  }

  function creerCarteSecondaire(q) {
    var carte = document.createElement("article");
    carte.className = "secondaire" + (q.faite ? " faite" : "");
    carte.innerHTML =
      '<div class="secondaire-infos">' +
        '<div class="secondaire-haut">' +
          '<p class="secondaire-nom"></p>' +
          '<span class="secondaire-expire"></span>' +
        "</div>" +
        '<p class="secondaire-desc"></p>' +
        '<div class="quete-meta">' +
          '<span class="quete-xp">+' + q.xp + " XP</span>" +
          '<span class="quete-tag"></span>' +
          (q.carteLiee ? '<span class="secondaire-recompense">Carte à la clé</span>' : "") +
        "</div>" +
      "</div>" +
      '<button class="quete-cercle" type="button" aria-pressed="' + q.faite + '" ' +
        'aria-label="Valider la quête secondaire">' + SVG_COCHE + "</button>";

    carte.querySelector(".secondaire-nom").textContent = q.nom;
    carte.querySelector(".secondaire-expire").textContent = texteExpiration(q.expire);
    carte.querySelector(".secondaire-desc").textContent = q.description;
    carte.querySelector(".quete-tag").textContent = etiquetteStat(q.stat);

    carte.querySelector(".quete-cercle").addEventListener("click", function (e) {
      e.stopPropagation();
      basculerSecondaire(q);
    });
    return carte;
  }

  function rendreSecondaires() {
    secondairesListe.innerHTML = "";
    etat.quetesSecondaires.forEach(function (q) {
      secondairesListe.appendChild(creerCarteSecondaire(q));
    });
    // Le bouton "Demander" n'apparaît que s'il reste une place, et
    // pas pendant une proposition ou une attente en cours.
    var placeLibre = etat.quetesSecondaires.length < MAX_SECONDAIRES;
    var occupe = !secondairesProposition.hidden || !secondairesAttente.hidden;
    secondairesDemander.hidden = !placeLibre || occupe;
  }

  // Validation / dévalidation par tap. Les secondaires ne comptent pas
  // dans le socle : pas de streak, pas de compteurs, pas de critique.
  // Une carte débloquée ne se re-verrouille jamais.
  function basculerSecondaire(q) {
    var niveauAvant = etat.niveau;
    if (!q.faite) {
      q.faite = true;
      Regles.gagnerXp(etat, q.xp, q.stat);
      var evoCartes = Cartes.verifier(etat);
      var carteObjectif = q.carteLiee ? debloquerCarteObjectif(q) : null;
      Etat.sauvegarder(etat);
      rendreSecondaires();
      majPuces();
      evaluerDeblocages();
      Juice.vibrer(carteObjectif ? 70 : 40);
      afficherBandeaux(niveauAvant, evoCartes);
      if (carteObjectif) Revelation.montrer([carteObjectif]);
    } else {
      q.faite = false;
      Regles.retirerXp(etat, q.xp, q.stat);
      Etat.sauvegarder(etat);
      rendreSecondaires();
      majPuces();
      majAuraSansCeremonie(niveauAvant);
    }
  }

  // Crée la carte d'objectif portée par la quête et la range dans la
  // collection (cartesObjectif). Retourne l'objet prêt pour la
  // révélation. Une carte déjà obtenue (re-validation) n'est pas recréée.
  function debloquerCarteObjectif(q) {
    if (q.carteObtenueId) return null;
    var def = q.carteLiee;
    var carte = {
      id: "obj-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      nom: def.nom,
      description: def.description,
      rarete: def.rarete || "rare",
      dateObtenue: etat.dernierJour || null,
      // Rattachée à l'aventure en cours : sert au regroupement en
      // sections dans la collection.
      origine: "objectif",
      origineTitre: etat.quetePrincipale.titre
    };
    etat.cartesObjectif.push(carte);
    q.carteObtenueId = carte.id;
    return carte;
  }

  // --- Génération d'une quête secondaire ---

  function majEtatSection() {
    rendreSecondaires();
  }

  secondairesDemander.addEventListener("click", function () {
    if (etat.quetesSecondaires.length >= MAX_SECONDAIRES) return;
    secondairesMessage.hidden = true;
    secondairesDemander.hidden = true;
    secondairesAttente.hidden = false;

    var actif = Regles.jalonActif(etat.quetePrincipale);
    IA.appeler("secondaires", {
      objectif: etat.objectifTexte || etat.quetePrincipale.titre,
      jalon: actif ? { nom: actif.jalon.nom, critere: actif.jalon.critere } : null
    }, { forcer: true }).then(function (resultat) {
      secondairesAttente.hidden = true;
      if (resultat) {
        propositionSecondaire = resultat;
        afficherPropositionSecondaire(resultat);
      } else {
        secondairesMessage.textContent = IA.MESSAGE_SILENCE;
        secondairesMessage.hidden = false;
        majEtatSection();
      }
    });
  });

  function afficherPropositionSecondaire(p) {
    document.getElementById("secondaires-prop-nom").textContent = p.nom;
    document.getElementById("secondaires-prop-desc").textContent = p.description;
    document.getElementById("secondaires-prop-meta").textContent =
      "+" + p.xp + " XP · " + etiquetteStat(p.stat) + " · " + p.dureeJours + " jours" +
      (p.carte ? " · carte " + p.carte.rarete : "");
    secondairesProposition.hidden = false;
    majEtatSection();
  }

  secondairesAccepter.addEventListener("click", function () {
    if (!propositionSecondaire) return;
    var p = propositionSecondaire;
    etat.quetesSecondaires.push({
      id: "sec-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
      nom: p.nom,
      description: p.description,
      xp: p.xp,
      stat: p.stat,
      expire: Jour.decalerDate(etat.dernierJour, p.dureeJours),
      faite: false,
      carteLiee: p.carte || null
    });
    propositionSecondaire = null;
    secondairesProposition.hidden = true;
    Etat.sauvegarder(etat);
    rendreSecondaires();
  });

  secondairesRefuser.addEventListener("click", function () {
    propositionSecondaire = null;
    secondairesProposition.hidden = true;
    majEtatSection();
  });

  // --- Jour de repos : la boucle quotidienne se met en pause ---
  // Un jour de repos, on ne gagne rien (ni XP, ni flamme) : la liste des
  // quêtes, l'hebdo et les secondaires s'effacent au profit d'un écran
  // calme avec un décompte en temps réel jusqu'au prochain jour
  // d'engagement. La quête principale (qp-lien) reste, elle, accessible.

  var jourRepos = document.getElementById("jour-repos");
  var reposTemps = document.getElementById("repos-temps");
  var titreH1 = document.querySelector(".accueil-titre h1");
  var intervalleRepos = null;

  function estJourRepos() {
    return !Jour.estJourEngagement(etat, etat.dernierJour);
  }

  // "YYYY-MM-DD" du prochain jour d'engagement, à partir de demain.
  function prochainJourEngagement() {
    for (var i = 1; i <= 14; i++) {
      var d = Jour.decalerDate(etat.dernierJour, i);
      if (Jour.estJourEngagement(etat, d)) return d;
    }
    return Jour.decalerDate(etat.dernierJour, 1); // filet
  }

  function deuxChiffres(n) {
    return n < 10 ? "0" + n : String(n);
  }

  // Chiffres nets séparés par des points sobres : le décompte rassure
  // sans presser. Minutes/secondes à deux chiffres pour une largeur
  // stable et calme.
  function texteDecompte(secondes) {
    var h = Math.floor(secondes / 3600);
    var m = Math.floor((secondes % 3600) / 60);
    var s = secondes % 60;
    return '<span class="rt-n">' + h + '</span>' +
           '<span class="rt-sep"></span>' +
           '<span class="rt-n">' + deuxChiffres(m) + '</span>' +
           '<span class="rt-sep"></span>' +
           '<span class="rt-n">' + deuxChiffres(s) + '</span>';
  }

  // Décompte jusqu'à minuit (00:00 local) du prochain jour d'engagement.
  // Peut dépasser 24h si plusieurs repos s'enchaînent.
  function tickDecompte() {
    var parts = prochainJourEngagement().split("-");
    var cibleMs = new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]), 0, 0, 0).getTime();
    var reste = Math.max(0, Math.round((cibleMs - Date.now()) / 1000));
    reposTemps.innerHTML = texteDecompte(reste);
  }

  function arreterDecompte() {
    if (intervalleRepos) {
      clearInterval(intervalleRepos);
      intervalleRepos = null;
    }
  }

  function majModeRepos() {
    var repos = estJourRepos();
    document.body.classList.toggle("mode-repos", repos);
    arreterDecompte();
    if (repos) {
      titreH1.textContent = "Jour de repos";
      tickDecompte();
      intervalleRepos = setInterval(tickDecompte, 1000);
    } else {
      titreH1.textContent = "Tes quêtes du jour";
    }
  }

  // Le décompte s'arrête proprement à la sortie de la page.
  window.addEventListener("pagehide", arreterDecompte);

  // --- Message sobre au retour, quand un gel a été consommé ---
  var gelMessage = document.getElementById("gel-message");
  function afficherMessageGelSiBesoin() {
    if (!etat.gelEnAttente) return;
    gelMessage.hidden = false;
    etat.gelEnAttente = false;
    Etat.sauvegarder(etat);
  }

  // --- Grand moment plein écran selon l'issue de la série (une seule fois) ---
  function jouerMomentSerieSiBesoin() {
    var issue = etat.transitionSerie;
    if (!issue) return;
    // Effacé AVANT de jouer : même si l'app se ferme pendant l'animation,
    // le moment ne se rejoue jamais au rechargement du même jour.
    delete etat.transitionSerie;
    Etat.sauvegarder(etat);
    if (window.MomentSerie) MomentSerie.jouer(issue, etat.streak);
  }

  jouerMomentSerieSiBesoin();
  construireSemaine();
  majPuces();
  majQuetePrincipale();
  rendreHebdo();
  majJourAccompli();
  rendreSecondaires();
  if (!estJourRepos()) proposerHebdoSiBesoin();
  majModeRepos();
  afficherMessageGelSiBesoin();
  // Déblocage progressif : on reflète l'état actuel, puis on évalue les
  // déclencheurs liés au JOUR (quête principale au 3ᵉ jour, gel à la
  // 1ʳᵉ semaine tenue) qui ne dépendent d'aucune action immédiate.
  appliquerMasquage();
  evaluerDeblocages();
  // Révélation déjà en attente d'une session précédente (ex. quête
  // principale au 3ᵉ jour, ou chat à reprendre) : la cinématique la joue.
  if (window.Cinematique) Cinematique.demarrer(etat);

})();
