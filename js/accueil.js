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

  // Feedback après un gain : bandeaux pour l'étape accomplie et la
  // montée de niveau, révélation plein écran pour les cartes,
  // et la montée de rang — le moment fort — par-dessus tout.
  function afficherBandeaux(etapeFinie, niveauAvant, nouvellesCartes) {
    var bandeaux = [];
    if (etapeFinie) bandeaux.push(["Étape accomplie", etapeFinie.nom]);
    if (etat.niveau > niveauAvant) bandeaux.push(["Niveau", etat.niveau]);
    bandeaux.forEach(function (b, i) {
      setTimeout(function () { Juice.bandeau(b[0], b[1]); }, i * 2700);
    });
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
    var etapeFinie = Regles.progresserQuetePrincipale(etat);
    Jour.majStreak(etat);
    etat.compteurs.quetesValidees += 1;
    if (critique) etat.compteurs.critiques += 1;

    // La séance guidée compte comme une séance de sport de la
    // semaine : elle fait avancer la quête hebdomadaire, avec le
    // gain d'XP habituel si l'objectif est atteint.
    if (quete.type === "seance" && !hebdoEstAccomplie()) {
      etat.hebdo.progres += 1;
      if (hebdoEstAccomplie()) {
        var critiqueHebdo = Regles.lancerCritique();
        etat.hebdo.xpDonne = etat.hebdo.xp * (critiqueHebdo ? Regles.MULTIPLICATEUR_CRITIQUE : 1);
        Regles.gagnerXp(etat, etat.hebdo.xpDonne, etat.hebdo.stat);
        etat.compteurs.hebdosAccomplies += 1;
        if (critiqueHebdo) etat.compteurs.critiques += 1;
      }
    }

    var nouvellesCartes = Cartes.verifier(etat);
    Etat.sauvegarder(etat);

    return {
      critique: critique,
      xpDonne: quete.xpDonne,
      etapeFinie: etapeFinie,
      niveauAvant: niveauAvant,
      nouvellesCartes: nouvellesCartes
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
    Regles.regresserQuetePrincipale(etat);
    Jour.majStreak(etat);
    etat.compteurs.quetesValidees = Math.max(0, etat.compteurs.quetesValidees - 1);
    if (etaitCritique) {
      etat.compteurs.critiques = Math.max(0, etat.compteurs.critiques - 1);
    }

    // Décocher une séance retire la séance de sport de la semaine,
    // et rouvre l'hebdo si c'est elle qui l'avait accomplie.
    if (quete.type === "seance" && etat.hebdo.progres > 0) {
      if (hebdoEstAccomplie() && etat.hebdo.xpDonne) {
        var hebdoCritique = etat.hebdo.xpDonne > etat.hebdo.xp;
        Regles.retirerXp(etat, etat.hebdo.xpDonne, etat.hebdo.stat);
        delete etat.hebdo.xpDonne;
        etat.compteurs.hebdosAccomplies = Math.max(0, etat.compteurs.hebdosAccomplies - 1);
        if (hebdoCritique) {
          etat.compteurs.critiques = Math.max(0, etat.compteurs.critiques - 1);
        }
      }
      etat.hebdo.progres -= 1;
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

  // La session est le SEUL moyen de valider une quête, quel que soit
  // son type. À la fin, elle valide par le chemin classique.
  function ouvrirSession(quete) {
    Session.ouvrir(quete, function () {
      var res = validerQuete(quete);
      majCarte(quete);
      majApresChangement();
      afficherBandeaux(res.etapeFinie, res.niveauAvant, res.nouvellesCartes);
      return res;
    }, function () {
      if (quete.faite) eclatCarte(quete);
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
      qpEtape.textContent = "Accomplie";
      qpProgres.textContent = "";
    } else {
      var e = Regles.etapeActive(qp);
      qpEtape.textContent = e.nom;
      qpProgres.textContent = e.progres + "/" + e.objectif;
    }
  }

  // --- Quête hebdomadaire ---

  var hebdoCarte = document.getElementById("hebdo-carte");
  var hebdoBouton = document.getElementById("hebdo-bouton");
  var hebdoAnnuler = document.getElementById("hebdo-annuler");

  function hebdoEstAccomplie() {
    return etat.hebdo.progres >= etat.hebdo.objectif;
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

  hebdoBouton.addEventListener("click", function () {
    var h = etat.hebdo;
    if (hebdoEstAccomplie()) return;
    h.progres += 1;

    if (hebdoEstAccomplie()) {
      // Objectif atteint : gain de l'XP hebdomadaire (critique possible).
      var critique = Regles.lancerCritique();
      h.xpDonne = h.xp * (critique ? Regles.MULTIPLICATEUR_CRITIQUE : 1);

      var niveauAvant = etat.niveau;
      Regles.gagnerXp(etat, h.xpDonne, h.stat);
      etat.compteurs.hebdosAccomplies += 1;
      if (critique) etat.compteurs.critiques += 1;
      var nouvellesCartes = Cartes.verifier(etat);
      Etat.sauvegarder(etat);

      Juice.xpFlottant(
        hebdoBouton,
        (critique ? "CRITIQUE ! +" : "+") + h.xpDonne + " XP",
        critique
      );
      Juice.vibrer(nouvellesCartes.length > 0 ? 70 : 40);
      afficherBandeaux(null, niveauAvant, nouvellesCartes);
    } else {
      Etat.sauvegarder(etat);
      Juice.xpFlottant(hebdoBouton, "+1", false);
      Juice.vibrer(30);
    }

    rendreHebdo();
    majPuces();
  });

  hebdoAnnuler.addEventListener("click", function () {
    var h = etat.hebdo;
    if (h.progres === 0) return;

    // Annuler sur une hebdo accomplie : on retire exactement
    // l'XP donné et on rouvre la quête (les compteurs redescendent,
    // les cartes débloquées restent débloquées).
    if (hebdoEstAccomplie() && h.xpDonne) {
      var etaitCritique = h.xpDonne > h.xp;
      var niveauAvant = etat.niveau;
      Regles.retirerXp(etat, h.xpDonne, h.stat);
      majAuraSansCeremonie(niveauAvant);
      delete h.xpDonne;
      etat.compteurs.hebdosAccomplies = Math.max(0, etat.compteurs.hebdosAccomplies - 1);
      if (etaitCritique) {
        etat.compteurs.critiques = Math.max(0, etat.compteurs.critiques - 1);
      }
    }
    h.progres -= 1;
    Etat.sauvegarder(etat);

    rendreHebdo();
    majPuces();
  });

  majPuces();
  majQuetePrincipale();
  rendreHebdo();
  majJourAccompli();

})();
