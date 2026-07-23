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

  var puceStreak = document.getElementById("puce-streak");
  var puceNiveau = document.getElementById("puce-niveau");
  var listeQuetes = document.getElementById("quetes");

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

  function etiquetteStat(cle) {
    return cle.charAt(0).toUpperCase() + cle.slice(1);
  }

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
  }

  // Feedback après un gain : bandeau de montée de niveau, révélation
  // plein écran pour les cartes, et la montée de rang — le moment
  // fort — par-dessus tout.
  function afficherBandeaux(niveauAvant, nouvellesCartes) {
    if (etat.niveau > niveauAvant) {
      Juice.bandeau("Niveau", etat.niveau);
    }
    if (nouvellesCartes && nouvellesCartes.length > 0) {
      Revelation.montrer(nouvellesCartes);
    }

    var rangAvant = Regles.rang(niveauAvant).actuel.lettre;
    var rangApres = Regles.rang(etat.niveau).actuel.lettre;
    if (rangApres !== rangAvant) {
      Aura.monterRang(rangAvant, rangApres);
    }
  }

  // Rang redescendu (décochage) : l'aura suit, sans cérémonie.
  function majAuraSansCeremonie(niveauAvant) {
    var rangApres = Regles.rang(etat.niveau).actuel.lettre;
    if (rangApres !== Regles.rang(niveauAvant).actuel.lettre) {
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

    var nouvellesCartes = Cartes.verifier(etat);
    Etat.sauvegarder(etat);

    return {
      critique: critique,
      xpDonne: quete.xpDonne,
      niveauAvant: niveauAvant,
      nouvellesCartes: nouvellesCartes,
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
      afficherBandeaux(res.niveauAvant, res.nouvellesCartes);
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
      var nouvellesCartes = Cartes.verifier(etat);
      Etat.sauvegarder(etat);
      Juice.xpFlottant(
        hebdoBouton,
        (res.critique ? "CRITIQUE ! +" : "+") + etat.hebdo.xpDonne + " XP",
        res.critique
      );
      Juice.vibrer(nouvellesCartes.length > 0 ? 70 : 40);
      afficherBandeaux(niveauAvant, nouvellesCartes);
    } else {
      Etat.sauvegarder(etat);
      Juice.xpFlottant(hebdoBouton, "+1", false);
      Juice.vibrer(30);
    }

    rendreHebdo();
    majPuces();
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
      var nouvellesCartes = Cartes.verifier(etat);
      Etat.sauvegarder(etat);
      rendreHebdo();
      majPuces();

      if (res && res.accomplie) {
        afficherBandeaux(niveauAvant, nouvellesCartes);
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
    // La nouvelle hebdo remplace l'actuelle, remise à zéro. La session
    // guidée éventuelle sera rattachée par un chantier ultérieur.
    etat.hebdo = {
      nom: propositionHebdo.nom,
      xp: propositionHebdo.xp,
      stat: propositionHebdo.stat,
      objectif: propositionHebdo.objectif,
      lien: propositionHebdo.lien,
      session: null,
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

  majPuces();
  majQuetePrincipale();
  rendreHebdo();
  majJourAccompli();
  proposerHebdoSiBesoin();

})();
