// ============================================
// LIFE RPG — accueil.js
// Quêtes du jour : rendu depuis l'état et
// validation des quêtes (gain d'XP réel).
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

  function basculerQuete(quete, carte, bouton) {
    quete.faite = !quete.faite;

    if (quete.faite) {
      var critique = Regles.lancerCritique();
      // On retient l'XP réellement donné (doublé si critique) pour
      // pouvoir retirer exactement la même chose au décochage.
      quete.xpDonne = quete.xp * (critique ? Regles.MULTIPLICATEUR_CRITIQUE : 1);

      var niveauAvant = etat.niveau;
      Regles.gagnerXp(etat, quete.xpDonne, quete.stat);
      Jour.majStreak(etat);
      Etat.sauvegarder(etat);

      Juice.xpFlottant(
        bouton,
        (critique ? "CRITIQUE ! +" : "+") + quete.xpDonne + " XP",
        critique
      );
      Juice.vibrer(30);
      if (etat.niveau > niveauAvant) {
        Juice.bandeauNiveau(etat.niveau);
      }
    } else {
      Regles.retirerXp(etat, quete.xpDonne || quete.xp, quete.stat);
      delete quete.xpDonne;
      Jour.majStreak(etat);
      Etat.sauvegarder(etat);
    }

    carte.classList.toggle("faite", quete.faite);
    bouton.setAttribute("aria-pressed", String(quete.faite));
    majPuces();
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

  // --- Quêtes quotidiennes ---
  etat.quetes.forEach(function (quete) {
    listeQuetes.appendChild(creerCarte(quete));
  });

  // --- Quête hebdomadaire ---
  document.getElementById("hebdo-nom").textContent = etat.hebdo.nom;
  document.getElementById("hebdo-xp").textContent = "+" + etat.hebdo.xp + " XP";

  var segments = document.getElementById("hebdo-segments");
  segments.innerHTML = "";
  for (var i = 0; i < etat.hebdo.objectif; i++) {
    var segment = document.createElement("div");
    segment.className = "hebdo-segment" + (i < etat.hebdo.progres ? " rempli" : "");
    segments.appendChild(segment);
  }
  document.getElementById("hebdo-compte").innerHTML =
    etat.hebdo.progres + " <span>/ " + etat.hebdo.objectif + "</span>";

  majPuces();

})();
