// ============================================
// LIFE RPG — quete.js
// Écran Quête principale : le chemin de jalons
// auto-déclarés, l'écran épique de quête
// accomplie, la suite forgée par le Système
// (accepter / régénérer / décider plus tard),
// et le palmarès des quêtes accomplies.
// ============================================

(function () {

  var etat = Etat.charger();

  var SVG_COCHE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5.5 12.5l4.2 4.2L18.5 8"/></svg>';

  var SVG_CADENAS =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="5.5" y="10.5" width="13" height="9" rx="2"/>' +
    '<path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';

  var conteneur = document.getElementById("etapes");
  var entreQuetes = document.getElementById("entre-quetes");
  var entreQuetesMessage = document.getElementById("entre-quetes-message");

  // La proposition de suite reste en mémoire : "Décider plus tard"
  // puis "Forger la suite" la ré-affiche sans rappeler le Système.
  var propositionSuite = null;
  var regenerations = 0;

  var MOIS = ["janv.", "févr.", "mars", "avr.", "mai", "juin",
    "juil.", "août", "sept.", "oct.", "nov.", "déc."];

  function formaterDate(iso) {
    if (!iso) return "";
    var p = iso.split("-");
    return parseInt(p[2], 10) + " " + MOIS[parseInt(p[1], 10) - 1] + " " + p[0];
  }

  // ----- Rendu du chemin de jalons -----

  function rendre() {
    var qp = etat.quetePrincipale;

    document.getElementById("qp-etiquette").textContent =
      "Quête principale" + ((qp.niveau || 1) > 1 ? " — Niveau " + qp.niveau : "");
    document.getElementById("qp-titre").textContent = qp.titre;
    document.getElementById("qp-description").textContent = qp.description;

    var actif = Regles.jalonActif(qp);
    var indexActif = actif ? actif.index : -1;

    conteneur.innerHTML = "";
    qp.jalons.forEach(function (jalon, i) {
      var statut = jalon.atteint ? "finie" : (i === indexActif ? "active" : "future");

      var li = document.createElement("li");
      li.className = "etape " + statut;
      li.innerHTML =
        '<div class="etape-marqueur">' +
          (statut === "finie" ? SVG_COCHE : statut === "future" ? SVG_CADENAS : "") +
        "</div>" +
        '<div class="etape-corps">' +
          '<div class="etape-ligne">' +
            '<span class="etape-nom"></span>' +
            (jalon.atteint
              ? '<span class="etape-date"></span>'
              : '<span class="etape-bonus">+' + (qp.bonusXpParJalon || 150) + " XP</span>") +
          "</div>" +
          '<p class="etape-critere"></p>' +
          (statut === "active"
            ? '<button class="session-bouton jalon-atteindre" type="button">Jalon atteint</button>' +
              '<div class="jalon-confirmation" hidden>' +
                "<p>Ce jalon est-il vraiment accompli ?</p>" +
                '<div class="jalon-confirmation-boutons">' +
                  '<button class="session-lien accent" type="button" data-role="oui">Oui, atteint</button>' +
                  '<button class="session-lien" type="button" data-role="non">Annuler</button>' +
                "</div>" +
              "</div>"
            : "") +
        "</div>";

      li.querySelector(".etape-nom").textContent = jalon.nom;
      li.querySelector(".etape-critere").textContent = jalon.critere;
      var date = li.querySelector(".etape-date");
      if (date) date.textContent = formaterDate(jalon.dateAtteint);

      // Auto-déclaration, dans l'ordre : bouton sobre, confirmation
      // inline — l'app fait confiance.
      var bouton = li.querySelector(".jalon-atteindre");
      if (bouton) {
        var confirmation = li.querySelector(".jalon-confirmation");
        bouton.addEventListener("click", function () {
          bouton.hidden = true;
          confirmation.hidden = false;
        });
        confirmation.querySelector('[data-role="non"]').addEventListener("click", function () {
          confirmation.hidden = true;
          bouton.hidden = false;
        });
        confirmation.querySelector('[data-role="oui"]').addEventListener("click", validerJalon);
      }

      li.classList.add("entree");
      li.style.animationDelay = (i * 70) + "ms";
      conteneur.appendChild(li);
    });

    entreQuetes.hidden = !Regles.quetePrincipaleAccomplie(qp);
    entreQuetesMessage.hidden = true;
    rendrePalmares();
  }

  function rendrePalmares() {
    var section = document.getElementById("palmares");
    var liste = document.getElementById("palmares-liste");
    var accomplies = etat.quetesAccomplies || [];
    section.hidden = accomplies.length === 0;
    liste.innerHTML = "";
    // Les plus récentes d'abord — le palmarès se lit comme une saga.
    accomplies.slice().reverse().forEach(function (quete) {
      var li = document.createElement("li");
      li.className = "palmares-item";
      li.innerHTML =
        '<span class="palmares-titre"></span>' +
        '<span class="palmares-meta"></span>';
      li.querySelector(".palmares-titre").textContent = quete.titre;
      li.querySelector(".palmares-meta").textContent =
        "Niveau " + (quete.niveau || 1) +
        (quete.date ? " · " + formaterDate(quete.date) : "");
      liste.appendChild(li);
    });
  }

  // ----- Validation d'un jalon : bonus, feedback fort -----

  function validerJalon() {
    var niveauAvant = etat.niveau;
    var res = Regles.atteindreJalon(etat);
    if (!res) return;

    var nouvellesCartes = Cartes.verifier(etat);
    Etat.sauvegarder(etat);
    Juice.vibrer([80, 60, 120]);
    rendre();

    if (res.terminee) {
      montrerQueteAccomplie();
    } else {
      Juice.bandeau("Jalon atteint", res.jalon.nom);
      if (etat.niveau > niveauAvant) {
        setTimeout(function () { Juice.bandeau("Niveau", etat.niveau); }, 2700);
      }
    }

    if (nouvellesCartes.length > 0) {
      Revelation.montrer(nouvellesCartes);
    }
    var rangAvant = Regles.rang(niveauAvant).actuel.lettre;
    var rangApres = Regles.rang(etat.niveau).actuel.lettre;
    if (rangApres !== rangAvant) {
      Aura.monterRang(rangAvant, rangApres);
    }
  }

  // ----- Quête accomplie : l'écran épique, esprit montée de rang -----

  function montrerQueteAccomplie() {
    var overlay = document.createElement("div");
    overlay.className = "qa-overlay";
    overlay.innerHTML =
      '<p class="etiquette qa-etiquette">Quête accomplie</p>' +
      '<h2 class="qa-titre"></h2>' +
      '<p class="etiquette qa-niveau"></p>' +
      '<button class="session-bouton qa-continuer" type="button">Continuer</button>';
    overlay.querySelector(".qa-titre").textContent = etat.quetePrincipale.titre;
    overlay.querySelector(".qa-niveau").textContent =
      "Niveau " + (etat.quetePrincipale.niveau || 1) + " franchi";

    overlay.querySelector(".qa-continuer").addEventListener("click", function () {
      overlay.classList.add("qa-sortie");
      setTimeout(function () { overlay.remove(); }, 350);
      // Il y a TOUJOURS une quête après.
      forgerSuite();
    });

    document.body.appendChild(overlay);
    Juice.vibrer([100, 60, 100, 60, 160]);
  }

  // ----- La suite : le Système forge la quête d'après -----

  function contexteSuite() {
    var qp = etat.quetePrincipale;
    return {
      objectif: etat.objectifTexte || qp.titre,
      titre: qp.titre,
      niveau: qp.niveau || 1,
      jalonsAccomplis: qp.jalons.map(function (jalon) { return jalon.nom; })
    };
  }

  function forgerSuite() {
    // Proposition déjà en main ("Décider plus tard") : on la rouvre.
    if (propositionSuite) {
      montrerPropositionSuite();
      return;
    }

    var attente = montrerAttente();
    IA.appeler("suite-principale", contexteSuite()).then(function (resultat) {
      attente.remove();
      if (resultat) {
        propositionSuite = resultat;
        regenerations = 0;
        montrerPropositionSuite();
      } else {
        // Le Système se tait : l'état "Entre deux quêtes" reste, avec
        // son bouton pour réessayer — et l'éditeur sait forger à la main.
        entreQuetesMessage.textContent = IA.MESSAGE_SILENCE;
        entreQuetesMessage.hidden = false;
      }
    });
  }

  function montrerAttente() {
    var overlay = document.createElement("div");
    overlay.className = "suite-attente";
    overlay.innerHTML =
      '<div class="anneau rotatif suite-anneau" aria-hidden="true">' +
        '<svg viewBox="0 0 200 200">' +
          '<circle class="anneau-piste" cx="100" cy="100" r="90"/>' +
          '<circle class="anneau-progression" cx="100" cy="100" r="90" ' +
            'stroke-dasharray="141 565.5" stroke-dashoffset="0"/>' +
        "</svg>" +
      "</div>" +
      '<p class="etiquette suite-attente-texte">Le Système prépare la suite…</p>';
    document.body.appendChild(overlay);
    return overlay;
  }

  // Même écran que la proposition d'onboarding : l'IA propose,
  // l'humain dispose — dans le chrome sobre de l'éditeur.
  function montrerPropositionSuite() {
    var overlay = document.createElement("div");
    overlay.className = "editeur";
    overlay.innerHTML =
      '<header class="editeur-entete">' +
        "<div>" +
          '<p class="etiquette">Le Système propose</p>' +
          '<h2 class="editeur-titre">La suite de ton aventure</h2>' +
        "</div>" +
      "</header>" +
      '<div class="editeur-corps suite-corps"></div>';
    document.body.appendChild(overlay);

    function fermer() { overlay.remove(); }

    function rendreContenu() {
      var corps = overlay.querySelector(".suite-corps");
      corps.innerHTML =
        '<p class="etiquette suite-niveau"></p>' +
        '<h3 class="suite-titre"></h3>' +
        '<p class="suite-description"></p>' +
        '<ol class="onb-prop-jalons suite-jalons"></ol>' +
        '<p class="editeur-message suite-message" hidden></p>' +
        '<div class="editeur-formulaire-boutons suite-boutons">' +
          '<button class="session-bouton" type="button" data-role="accepter">Accepter cette quête</button>' +
          (regenerations < 1
            ? '<button class="session-lien accent" type="button" data-role="regenerer">Régénérer</button>'
            : "") +
          '<button class="session-lien" type="button" data-role="plus-tard">Décider plus tard</button>' +
        "</div>";

      corps.querySelector(".suite-niveau").textContent = "Niveau " + propositionSuite.niveau;
      corps.querySelector(".suite-titre").textContent = propositionSuite.titre;
      corps.querySelector(".suite-description").textContent = propositionSuite.description;

      var listeJalons = corps.querySelector(".suite-jalons");
      propositionSuite.jalons.forEach(function (jalon) {
        var li = document.createElement("li");
        li.className = "onb-prop-jalon";
        li.innerHTML = '<p class="onb-prop-jalon-nom"></p><p class="onb-prop-jalon-critere"></p>';
        li.querySelector(".onb-prop-jalon-nom").textContent = jalon.nom;
        li.querySelector(".onb-prop-jalon-critere").textContent = jalon.critere;
        listeJalons.appendChild(li);
      });

      corps.querySelector('[data-role="accepter"]').addEventListener("click", function () {
        accepterSuite();
        fermer();
      });

      var regenerer = corps.querySelector('[data-role="regenerer"]');
      if (regenerer) {
        regenerer.addEventListener("click", function () {
          regenerations += 1;
          corps.innerHTML =
            '<div class="suite-corps-attente">' +
              '<p class="etiquette onb-attente-texte">Le Système forge une autre voie…</p>' +
            "</div>";
          IA.appeler("suite-principale", contexteSuite()).then(function (resultat) {
            if (resultat) propositionSuite = resultat;
            rendreContenu();
            if (!resultat) {
              var message = overlay.querySelector(".suite-message");
              message.textContent = IA.MESSAGE_SILENCE;
              message.hidden = false;
            }
          });
        });
      }

      corps.querySelector('[data-role="plus-tard"]').addEventListener("click", fermer);
    }

    rendreContenu();
  }

  function accepterSuite() {
    etat.quetePrincipale = {
      titre: propositionSuite.titre,
      description: propositionSuite.description,
      niveau: propositionSuite.niveau,
      bonusXpParJalon: 150,
      terminee: false,
      jalons: propositionSuite.jalons.map(function (jalon) {
        return { nom: jalon.nom, critere: jalon.critere, atteint: false, dateAtteint: null };
      })
    };
    propositionSuite = null;
    regenerations = 0;
    Etat.sauvegarder(etat);
    rendre();
  }

  document.getElementById("forger-suite").addEventListener("click", forgerSuite);

  document.getElementById("qp-editer").addEventListener("click", function () {
    EditeurPrincipale.ouvrir(etat, rendre);
  });

  rendre();

})();
