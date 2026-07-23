// ============================================
// LIFE RPG — onboarding.js
// Création de personnage : identité, choix de
// l'objectif, révélation. Le chemin "objectif
// personnalisé" passe par le Système (IA) :
// trois questions, attente, proposition — avec
// le template Aventurier en secours si l'IA se
// tait. À la fin : création de l'état neuf.
// ============================================

(function () {

  var etapes = document.querySelectorAll(".onb-etape");
  var traits = document.querySelectorAll(".onb-trait");

  // Trait allumé selon l'écran : les sous-étapes du parcours
  // personnalisé vivent toutes dans le deuxième temps du voyage.
  var TRAITS_PAR_ETAPE = { "1": 1, "2": 2, "questions": 2, "attente": 3, "proposition": 3, "3": 3 };

  var nom = "";
  var choix = null;           // contrôleur ChoixObjectif
  var templateChoisi = null;  // template final, prêt pour etatNeuf
  var objectifTexte = "";     // la phrase du joueur (parcours personnalisé)
  var reponses = null;        // { deadline, tempsParJour, niveau } ou null
  var proposition = null;     // réponse IA validée par le serveur
  var quetesProposees = [];   // quêtes IA restantes après suppressions

  function montrerEtape(cle) {
    etapes.forEach(function (etape) {
      etape.hidden = etape.getAttribute("data-etape") !== String(cle);
    });
    var allumes = TRAITS_PAR_ETAPE[String(cle)] || 1;
    traits.forEach(function (trait, i) {
      trait.classList.toggle("actif", i < allumes);
    });
    window.scrollTo(0, 0);
  }

  // --- Étape 1 : identité ---

  var formNom = document.getElementById("onb-form-nom");
  var champPrenom = document.getElementById("onb-prenom");
  var erreurNom = document.getElementById("onb-erreur-nom");

  formNom.addEventListener("submit", function (e) {
    e.preventDefault();
    nom = champPrenom.value.trim().slice(0, 20);
    if (!nom) {
      erreurNom.hidden = false;
      return;
    }
    erreurNom.hidden = true;
    montrerEtape(2);
  });

  champPrenom.addEventListener("input", function () {
    erreurNom.hidden = true;
  });

  // --- Étape 2 : objectif ---

  var boutonObjectif = document.getElementById("onb-valider-objectif");

  choix = ChoixObjectif.rendre(document.getElementById("onb-objectifs"), function () {
    boutonObjectif.disabled = choix.lire() === null;
  });

  boutonObjectif.addEventListener("click", function () {
    var lu = choix.lire();
    if (!lu) return;
    templateChoisi = lu;
    objectifTexte = lu.quetePrincipale.titre;
    if (lu.id === "personnalise") {
      // Le Système entre en scène : trois questions d'abord.
      montrerEtape("questions");
    } else {
      reponses = null;
      preparerRevelation();
      montrerEtape(3);
    }
  });

  // --- Étape 2b : trois questions à puces ---

  var ecranQuestions = document.querySelector('.onb-etape[data-etape="questions"]');

  function poserPuce(champ, valeur) {
    var groupe = ecranQuestions.querySelector('.editeur-puces[data-champ="' + champ + '"]');
    Array.prototype.forEach.call(groupe.children, function (puce) {
      puce.classList.toggle("actif", puce.getAttribute("data-valeur") === valeur);
    });
  }

  function lirePuce(champ) {
    var actif = ecranQuestions.querySelector('.editeur-puces[data-champ="' + champ + '"] .actif');
    return actif.getAttribute("data-valeur");
  }

  // Valeurs par défaut raisonnables : le joueur peut foncer.
  poserPuce("deadline", "3 mois");
  poserPuce("tempsParJour", "30 min");
  poserPuce("niveau", "Débutant");

  ecranQuestions.addEventListener("click", function (e) {
    var puce = e.target.closest(".editeur-puce");
    if (!puce) return;
    poserPuce(puce.parentNode.getAttribute("data-champ"), puce.getAttribute("data-valeur"));
  });

  document.getElementById("onb-valider-questions").addEventListener("click", function () {
    reponses = {
      deadline: lirePuce("deadline"),
      tempsParJour: lirePuce("tempsParJour"),
      niveau: lirePuce("niveau")
    };
    forgerQuete();
  });

  // --- Étape 2c : attente, le Système forge ---

  function forgerQuete() {
    montrerEtape("attente");
    IA.appeler("onboarding", {
      objectif: objectifTexte,
      deadline: reponses.deadline,
      tempsParJour: reponses.tempsParJour,
      niveau: reponses.niveau
    }).then(function (resultat) {
      if (resultat) {
        proposition = resultat;
        quetesProposees = resultat.quetesQuotidiennes.slice();
        rendreProposition();
        montrerEtape("proposition");
      } else {
        // Le Système est silencieux : le template Aventurier existant
        // (déjà dans templateChoisi) prend le relais, sans casse.
        preparerRevelation();
        montrerEtape(3);
      }
    });
  }

  // --- Étape 2d : proposition — l'IA propose, l'humain dispose ---

  var SVG_CROIX =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  function etiquetteStat(cle) {
    return cle.charAt(0).toUpperCase() + cle.slice(1);
  }

  function etiquetteType(quete) {
    if (quete.type === "minuterie") return Math.round(quete.duree / 60) + " min";
    if (quete.type === "series") return quete.series + " séries";
    return "Simple";
  }

  function rendreProposition() {
    document.getElementById("prop-classe").textContent = proposition.classe;
    document.getElementById("prop-titre").textContent = proposition.quetePrincipale.titre;
    document.getElementById("prop-description").textContent = proposition.quetePrincipale.description;

    var jalons = document.getElementById("prop-jalons");
    jalons.innerHTML = "";
    proposition.quetePrincipale.jalons.forEach(function (jalon) {
      var li = document.createElement("li");
      li.className = "onb-prop-jalon";
      li.innerHTML = '<p class="onb-prop-jalon-nom"></p><p class="onb-prop-jalon-critere"></p>';
      li.querySelector(".onb-prop-jalon-nom").textContent = jalon.nom;
      li.querySelector(".onb-prop-jalon-critere").textContent = jalon.critere;
      jalons.appendChild(li);
    });

    rendreQuetesProposees();

    var hebdo = document.getElementById("prop-hebdo");
    hebdo.innerHTML =
      '<div class="onb-prop-quete">' +
        '<div class="onb-prop-quete-infos">' +
          '<p class="onb-prop-quete-nom"></p>' +
          '<p class="onb-prop-quete-meta"></p>' +
        "</div>" +
      "</div>";
    hebdo.querySelector(".onb-prop-quete-nom").textContent = proposition.hebdo.nom;
    hebdo.querySelector(".onb-prop-quete-meta").textContent =
      "+" + proposition.hebdo.xp + " XP · " + proposition.hebdo.objectif + " fois par semaine";
  }

  function rendreQuetesProposees() {
    var conteneur = document.getElementById("prop-quetes");
    conteneur.innerHTML = "";
    quetesProposees.forEach(function (quete, i) {
      var ligne = document.createElement("div");
      ligne.className = "onb-prop-quete";
      ligne.innerHTML =
        '<div class="onb-prop-quete-infos">' +
          '<p class="onb-prop-quete-nom"></p>' +
          '<p class="onb-prop-quete-meta"></p>' +
        "</div>" +
        // Chaque quête se refuse d'une croix — mais il en reste
        // toujours au moins une.
        (quetesProposees.length > 1
          ? '<button class="onb-prop-retirer" type="button" aria-label="Retirer cette quête">' + SVG_CROIX + "</button>"
          : "");
      ligne.querySelector(".onb-prop-quete-nom").textContent = quete.nom;
      ligne.querySelector(".onb-prop-quete-meta").textContent =
        "+" + quete.xp + " XP · " + etiquetteStat(quete.stat) + " · " + etiquetteType(quete);
      var retirer = ligne.querySelector(".onb-prop-retirer");
      if (retirer) {
        retirer.addEventListener("click", function () {
          quetesProposees.splice(i, 1);
          rendreQuetesProposees();
        });
      }
      conteneur.appendChild(ligne);
    });
  }

  // La proposition acceptée devient un template prêt pour etatNeuf :
  // les jalons deviennent les étapes de la quête principale (objectifs
  // et bonus croissants — le critère reste porté par l'étape).
  function templateDepuisProposition() {
    var OBJECTIFS = [15, 40, 80, 150];
    var BONUS = [200, 400, 800, 1200];
    var etapesQp = proposition.quetePrincipale.jalons.map(function (jalon, i) {
      return {
        nom: jalon.nom,
        critere: jalon.critere,
        objectif: OBJECTIFS[i] || 150,
        bonusXp: BONUS[i] || 1200
      };
    });
    var quetes = quetesProposees.map(function (quete, i) {
      var copie = JSON.parse(JSON.stringify(quete));
      copie.id = "ia-" + Date.now() + "-" + i;
      return copie;
    });
    var hebdo = JSON.parse(JSON.stringify(proposition.hebdo));
    hebdo.session = null; // session guidée d'hebdo : chantiers suivants
    return {
      id: "ia",
      classe: proposition.classe,
      quetePrincipale: {
        titre: proposition.quetePrincipale.titre,
        description: proposition.quetePrincipale.description,
        etapes: etapesQp
      },
      quetesQuotidiennes: quetes,
      hebdo: hebdo
    };
  }

  document.getElementById("onb-cest-parti").addEventListener("click", function () {
    if (!proposition || quetesProposees.length < 1) return;
    templateChoisi = templateDepuisProposition();
    preparerRevelation();
    montrerEtape(3);
  });

  // --- Étape 3 : révélation ---

  function preparerRevelation() {
    document.getElementById("rev-classe").textContent = templateChoisi.classe;
    document.getElementById("rev-quete-nom").textContent =
      templateChoisi.quetePrincipale.titre;
  }

  document.getElementById("onb-commencer").addEventListener("click", function () {
    if (!templateChoisi) return;
    // L'état neuf remplace tout ce qui pouvait exister : niveau 1,
    // rang E, stats à 1, aucun historique — la vie commence ici.
    var etat = Templates.etatNeuf(nom, templateChoisi);
    // Contexte conservé pour les prochains appels au Système.
    etat.objectifTexte = objectifTexte;
    etat.reponsesOnboarding = reponses;
    Etat.sauvegarder(etat);
    location.replace("index.html");
  });

  montrerEtape(1);

})();
