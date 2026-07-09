// ============================================
// LIFE RPG — accueil.js
// Quêtes du jour : rendu depuis l'état, validation
// (XP, critique, streak), quête hebdomadaire et
// progression de la quête principale.
// ============================================

(function () {

  var etat = Etat.charger();

  var puceStreak = document.getElementById("puce-streak");
  var puceNiveau = document.getElementById("puce-niveau");
  var listeQuetes = document.getElementById("quetes");

  var SVG_COCHE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5.5 12.5l4.2 4.2L18.5 8"/></svg>';

  function etiquetteStat(cle) {
    return cle.charAt(0).toUpperCase() + cle.slice(1);
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

  // Bandeaux à afficher après un gain : étape accomplie, montée de
  // niveau, cartes débloquées. Espacés pour ne pas se chevaucher.
  function afficherBandeaux(etapeFinie, niveauAvant, nouvellesCartes) {
    var bandeaux = [];
    if (etapeFinie) bandeaux.push(["Étape accomplie", etapeFinie.nom, null]);
    if (etat.niveau > niveauAvant) bandeaux.push(["Niveau", etat.niveau, null]);
    (nouvellesCartes || []).forEach(function (carte) {
      bandeaux.push(["Carte débloquée", carte.nom, "rarete-" + carte.rarete]);
    });
    bandeaux.forEach(function (b, i) {
      setTimeout(function () { Juice.bandeau(b[0], b[1], b[2]); }, i * 2700);
    });
  }

  // --- Quêtes quotidiennes ---

  function basculerQuete(quete, carte, bouton) {
    quete.faite = !quete.faite;

    if (quete.faite) {
      var critique = Regles.lancerCritique();
      // On retient l'XP réellement donné (doublé si critique) pour
      // pouvoir retirer exactement la même chose au décochage.
      quete.xpDonne = quete.xp * (critique ? Regles.MULTIPLICATEUR_CRITIQUE : 1);

      var niveauAvant = etat.niveau;
      Regles.gagnerXp(etat, quete.xpDonne, quete.stat);
      var etapeFinie = Regles.progresserQuetePrincipale(etat);
      Jour.majStreak(etat);
      etat.compteurs.quetesValidees += 1;
      if (critique) etat.compteurs.critiques += 1;
      var nouvellesCartes = Cartes.verifier(etat);
      Etat.sauvegarder(etat);

      Juice.xpFlottant(
        bouton,
        (critique ? "CRITIQUE ! +" : "+") + quete.xpDonne + " XP",
        critique
      );
      Juice.vibrer(nouvellesCartes.length > 0 ? 70 : 30);
      afficherBandeaux(etapeFinie, niveauAvant, nouvellesCartes);
    } else {
      // On décrémente les compteurs pour rester honnête — mais les
      // cartes déjà débloquées ne se re-verrouillent jamais.
      var etaitCritique = Boolean(quete.xpDonne && quete.xpDonne > quete.xp);
      Regles.retirerXp(etat, quete.xpDonne || quete.xp, quete.stat);
      delete quete.xpDonne;
      Regles.regresserQuetePrincipale(etat);
      Jour.majStreak(etat);
      etat.compteurs.quetesValidees = Math.max(0, etat.compteurs.quetesValidees - 1);
      if (etaitCritique) {
        etat.compteurs.critiques = Math.max(0, etat.compteurs.critiques - 1);
      }
      Etat.sauvegarder(etat);
    }

    carte.classList.toggle("faite", quete.faite);
    bouton.setAttribute("aria-pressed", String(quete.faite));
    majPuces();
    majQuetePrincipale();
  }

  function creerCarte(quete) {
    var carte = document.createElement("article");
    carte.className = "quete" + (quete.faite ? " faite" : "");
    carte.innerHTML =
      '<div class="quete-infos">' +
        '<p class="quete-nom"></p>' +
        '<div class="quete-meta">' +
          '<span class="quete-xp">+' + quete.xp + " XP</span>" +
          '<span class="quete-tag"></span>' +
        "</div>" +
      "</div>" +
      '<button class="quete-cercle" type="button" aria-pressed="' + quete.faite + '" ' +
        'aria-label="Valider la quête">' + SVG_COCHE + "</button>";

    carte.querySelector(".quete-nom").textContent = quete.nom;
    carte.querySelector(".quete-tag").textContent = etiquetteStat(quete.stat);

    var bouton = carte.querySelector(".quete-cercle");
    bouton.addEventListener("click", function () {
      basculerQuete(quete, carte, bouton);
    });

    return carte;
  }

  etat.quetes.forEach(function (quete) {
    listeQuetes.appendChild(creerCarte(quete));
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
      Regles.retirerXp(etat, h.xpDonne, h.stat);
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

})();
