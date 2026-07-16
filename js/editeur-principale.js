// ============================================
// LIFE RPG — editeur-principale.js
// Éditeur de la quête principale : overlay au
// même langage que l'éditeur de quêtes. Titre,
// description, étapes (ajout / retrait / bornes),
// et changement complet d'objectif via les
// templates. Cohérence : une étape accomplie est
// verrouillée, l'XP acquis ne bouge jamais, et
// un objectif réduit sous le progrès se complète
// au prochain rendu (Regles.rattraperQuetePrincipale).
// ============================================

var EditeurPrincipale = (function () {

  var ctx = null; // { etat, overlay, surFermer }

  var BORNES = {
    titre: 60,
    description: 120,
    nomEtape: 40,
    objectif: { min: 5, max: 200 },
    bonusXp: { min: 50, max: 1000 },
    maxEtapes: 6
  };

  var SVG_CROIX =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var SVG_CORBEILLE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M4.5 7h15"/>' +
    '<path d="M9.5 7V5.4A1.4 1.4 0 0 1 10.9 4h2.2a1.4 1.4 0 0 1 1.4 1.4V7"/>' +
    '<path d="M6.5 7l.8 12.1A1.5 1.5 0 0 0 8.8 20.5h6.4a1.5 1.5 0 0 0 1.5-1.4L17.5 7"/>' +
    '<path d="M10 11v6M14 11v6"/></svg>';

  function borner(valeur, bornes) {
    var n = parseInt(valeur, 10);
    if (isNaN(n)) n = bornes.min;
    return Math.min(bornes.max, Math.max(bornes.min, n));
  }

  // Copie de travail des étapes : rien ne touche l'état avant
  // Enregistrer. Les étapes accomplies sont copiées telles quelles.
  var brouillon = null;

  function montrerVue(html) {
    var corps = ctx.overlay.querySelector(".editeur-corps");
    corps.classList.remove("fondu");
    void corps.offsetWidth;
    corps.classList.add("fondu");
    corps.innerHTML = html;
    return corps;
  }

  // --- Formulaire principal ---

  function champTexte(libelle, nom, maxlength) {
    return '<label class="editeur-champ">' +
      '<span class="etiquette">' + libelle + "</span>" +
      '<input class="editeur-entree" name="' + nom + '" type="text" maxlength="' + maxlength + '" autocomplete="off">' +
    "</label>";
  }

  function vueFormulaire() {
    var qp = ctx.etat.quetePrincipale;
    brouillon = JSON.parse(JSON.stringify(qp.etapes));

    var corps = montrerVue(
      '<form class="editeur-formulaire" novalidate>' +
        champTexte("Titre", "titre", BORNES.titre) +
        champTexte("Description", "description", BORNES.description) +
        '<p class="etiquette editeur-section">Étapes</p>' +
        '<div class="editeur-liste ep-etapes"></div>' +
        '<p class="editeur-message" hidden></p>' +
        '<button class="session-lien ep-ajouter" type="button">Ajouter une étape</button>' +
        '<p class="editeur-erreur" hidden></p>' +
        '<div class="editeur-formulaire-boutons">' +
          '<button class="session-bouton" type="submit">Enregistrer</button>' +
          '<button class="session-lien" type="button" data-role="annuler">Annuler</button>' +
        "</div>" +
      "</form>" +
      '<div class="ep-changer">' +
        '<p class="etiquette editeur-section">Nouvelle voie</p>' +
        '<div class="ep-changer-lignes"></div>' +
      "</div>"
    );

    var form = corps.querySelector("form");
    form.titre.value = qp.titre;
    form.description.value = qp.description;

    rendreEtapes(corps);
    rendreChangerObjectif(corps);

    corps.querySelector(".ep-ajouter").addEventListener("click", function () {
      if (brouillon.length >= BORNES.maxEtapes) {
        message(corps, "Six étapes au maximum : garde une quête lisible.");
        return;
      }
      var derniere = brouillon[brouillon.length - 1];
      brouillon.push({
        nom: "Nouvelle étape",
        objectif: Math.min(BORNES.objectif.max, derniere ? derniere.objectif * 2 : 15),
        progres: 0,
        bonusXp: Math.min(BORNES.bonusXp.max, derniere ? derniere.bonusXp * 2 : 200)
      });
      rendreEtapes(corps);
    });

    form.querySelector('[data-role="annuler"]').addEventListener("click", fermer);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var titre = form.titre.value.trim().slice(0, BORNES.titre);
      if (!titre) {
        var erreur = form.querySelector(".editeur-erreur");
        erreur.textContent = "Donne un titre à ta quête.";
        erreur.hidden = false;
        return;
      }
      lireEtapes(corps);

      qp.titre = titre;
      qp.description = form.description.value.trim().slice(0, BORNES.description);
      qp.etapes = brouillon;
      // L'étape active ne peut pas pointer au-delà de la liste.
      qp.etapeActive = Math.min(qp.etapeActive, qp.etapes.length);

      // Objectifs réduits sous le progrès : l'étape se complète,
      // bonus compris — le progrès n'est jamais volé.
      Regles.rattraperQuetePrincipale(ctx.etat);

      Etat.sauvegarder(ctx.etat);
      fermer();
    });
  }

  function message(corps, texte) {
    var el = corps.querySelector(".editeur-message");
    el.textContent = texte;
    el.hidden = false;
  }

  // --- Étapes : lignes éditables, accomplies verrouillées ---

  function rendreEtapes(corps) {
    var conteneur = corps.querySelector(".ep-etapes");
    conteneur.innerHTML = "";
    var etapeActive = ctx.etat.quetePrincipale.etapeActive;

    brouillon.forEach(function (etape, i) {
      var accomplie = i < etapeActive;
      var ligne = document.createElement("div");
      ligne.className = "editeur-ligne ep-etape" + (accomplie ? " ep-accomplie" : "");

      if (accomplie) {
        // Verrouillée : grisée, ni éditable ni supprimable.
        ligne.innerHTML =
          '<div class="editeur-ligne-infos">' +
            '<p class="editeur-ligne-nom"></p>' +
            '<p class="editeur-ligne-meta">Accomplie · +' + etape.bonusXp + " XP acquis</p>" +
          "</div>";
        ligne.querySelector(".editeur-ligne-nom").textContent = etape.nom;
      } else {
        ligne.innerHTML =
          '<div class="ep-etape-champs">' +
            '<input class="editeur-entree ep-nom" type="text" maxlength="' + BORNES.nomEtape + '" ' +
              'autocomplete="off" aria-label="Nom de l\'étape">' +
            '<div class="ep-etape-nombres">' +
              '<label class="editeur-champ">' +
                '<span class="etiquette">Objectif (quêtes)</span>' +
                '<input class="editeur-entree ep-objectif" type="number" inputmode="numeric" ' +
                  'min="' + BORNES.objectif.min + '" max="' + BORNES.objectif.max + '">' +
              "</label>" +
              '<label class="editeur-champ">' +
                '<span class="etiquette">Bonus XP</span>' +
                '<input class="editeur-entree ep-bonus" type="number" inputmode="numeric" ' +
                  'min="' + BORNES.bonusXp.min + '" max="' + BORNES.bonusXp.max + '">' +
              "</label>" +
            "</div>" +
            (etape.progres > 0 ? '<p class="editeur-ligne-meta ep-progres">Progrès en cours : ' + etape.progres + "</p>" : "") +
          "</div>" +
          '<button class="editeur-supprimer" type="button" aria-label="Supprimer l\'étape">' +
            SVG_CORBEILLE + "</button>";

        ligne.querySelector(".ep-nom").value = etape.nom;
        ligne.querySelector(".ep-objectif").value = etape.objectif;
        ligne.querySelector(".ep-bonus").value = etape.bonusXp;

        ligne.querySelector(".editeur-supprimer").addEventListener("click", function () {
          demanderSuppression(corps, ligne, i);
        });
      }

      conteneur.appendChild(ligne);
    });
  }

  // Relit les champs des étapes non verrouillées dans le brouillon.
  function lireEtapes(corps) {
    var lignes = corps.querySelectorAll(".ep-etape");
    lignes.forEach(function (ligne, i) {
      if (ligne.classList.contains("ep-accomplie")) return;
      // Ligne remplacée par une confirmation de suppression : rien à lire.
      if (!ligne.querySelector(".ep-nom")) return;
      var etape = brouillon[i];
      etape.nom = ligne.querySelector(".ep-nom").value.trim().slice(0, BORNES.nomEtape) || etape.nom;
      etape.objectif = borner(ligne.querySelector(".ep-objectif").value, BORNES.objectif);
      etape.bonusXp = borner(ligne.querySelector(".ep-bonus").value, BORNES.bonusXp);
    });
  }

  function demanderSuppression(corps, ligne, index) {
    if (brouillon.length <= 1) {
      message(corps, "Garde au moins une étape.");
      return;
    }
    // Les saisies en cours sont conservées avant le re-rendu.
    lireEtapes(corps);
    ligne.innerHTML =
      '<p class="editeur-ligne-question">Supprimer cette étape ?</p>' +
      '<div class="editeur-ligne-boutons">' +
        '<button class="session-lien" type="button" data-role="confirmer">Supprimer</button>' +
        '<button class="session-lien accent" type="button" data-role="annuler">Annuler</button>' +
      "</div>";
    ligne.querySelector('[data-role="confirmer"]').addEventListener("click", function () {
      brouillon.splice(index, 1);
      rendreEtapes(corps);
    });
    ligne.querySelector('[data-role="annuler"]').addEventListener("click", function () {
      rendreEtapes(corps);
    });
  }

  // --- Changer d'objectif : confirmation inline, puis templates ---

  function rendreChangerObjectif(corps) {
    var conteneur = corps.querySelector(".ep-changer-lignes");

    function ligneDepart() {
      conteneur.innerHTML =
        '<div class="editeur-ligne">' +
          '<button class="editeur-ligne-infos" type="button">' +
            '<p class="editeur-ligne-nom">Changer d\'objectif</p>' +
            '<p class="editeur-ligne-meta">Nouvelle quête principale, personnage conservé</p>' +
          "</button>" +
        "</div>";
      conteneur.querySelector(".editeur-ligne-infos").addEventListener("click", ligneConfirmation);
    }

    function ligneConfirmation() {
      conteneur.innerHTML =
        '<div class="editeur-ligne">' +
          '<p class="editeur-ligne-question">Abandonner cette quête pour une nouvelle ?</p>' +
          '<div class="editeur-ligne-boutons">' +
            '<button class="session-lien" type="button" data-role="confirmer">Changer</button>' +
            '<button class="session-lien accent" type="button" data-role="annuler">Annuler</button>' +
          "</div>" +
        "</div>";
      conteneur.querySelector('[data-role="confirmer"]').addEventListener("click", vueChoixObjectif);
      conteneur.querySelector('[data-role="annuler"]').addEventListener("click", ligneDepart);
    }

    ligneDepart();
  }

  // Ré-affichage du choix des templates (l'étape 2 de l'onboarding),
  // dans le corps de l'overlay.
  function vueChoixObjectif() {
    var corps = montrerVue(
      '<p class="etiquette">Nouvelle voie</p>' +
      '<h3 class="ep-choix-titre">Quelle est ta quête ?</h3>' +
      '<div class="ep-choix-grille"></div>' +
      '<div class="editeur-formulaire-boutons ep-choix-boutons">' +
        '<button class="session-bouton" type="button" data-role="valider" disabled>Choisir cette voie</button>' +
        '<button class="session-lien" type="button" data-role="annuler">Annuler</button>' +
      "</div>"
    );

    var boutonValider = corps.querySelector('[data-role="valider"]');
    var choix = ChoixObjectif.rendre(corps.querySelector(".ep-choix-grille"), function () {
      boutonValider.disabled = choix.lire() === null;
    });

    corps.querySelector('[data-role="annuler"]').addEventListener("click", vueFormulaire);

    boutonValider.addEventListener("click", function () {
      var template = choix.lire();
      if (!template) return;
      vueQuetesDuJour(template);
    });
  }

  // Question finale : remplacer aussi les quêtes du jour ?
  function vueQuetesDuJour(template) {
    var corps = montrerVue(
      '<p class="etiquette">Nouvelle voie</p>' +
      '<h3 class="ep-choix-titre"></h3>' +
      '<p class="ep-choix-question">Remplacer aussi tes quêtes du jour par celles du nouvel objectif ?</p>' +
      '<div class="editeur-formulaire-boutons ep-choix-boutons">' +
        '<button class="session-bouton" type="button" data-role="remplacer">Oui, remplacer</button>' +
        '<button class="session-bouton" type="button" data-role="garder">Garder les miennes</button>' +
      "</div>"
    );
    corps.querySelector(".ep-choix-titre").textContent = template.quetePrincipale.titre;

    corps.querySelector('[data-role="remplacer"]').addEventListener("click", function () {
      appliquerChangement(template, true);
    });
    corps.querySelector('[data-role="garder"]').addEventListener("click", function () {
      appliquerChangement(template, false);
    });
  }

  // Le personnage (niveau, rang, stats, cartes, streak, compteurs)
  // est conservé : seules la quête principale — et la classe, qui
  // suit la voie choisie — changent. Les quêtes du jour et l'hebdo
  // ne sont remplacées que sur demande.
  function appliquerChangement(template, remplacerQuetes) {
    var etat = ctx.etat;
    etat.quetePrincipale = Templates.quetePrincipaleDe(template);
    etat.classe = template.classe;
    if (remplacerQuetes) {
      etat.quetes = Templates.quetesDe(template);
      etat.hebdo = Templates.hebdoDe(template);
      // Plus aucune quête cochée aujourd'hui : le streak du jour
      // est recalculé honnêtement, l'XP acquis ne bouge pas.
      Jour.majStreak(etat);
    }
    Etat.sauvegarder(etat);
    fermer();
  }

  // ----- Ouverture / fermeture -----

  function fermer() {
    if (!ctx) return;
    var surFermer = ctx.surFermer;
    ctx.overlay.remove();
    ctx = null;
    brouillon = null;
    if (surFermer) surFermer();
  }

  function ouvrir(etat, surFermer) {
    if (ctx) return;
    ctx = { etat: etat, surFermer: surFermer || null, overlay: null };

    var overlay = document.createElement("div");
    overlay.className = "editeur";
    overlay.innerHTML =
      '<header class="editeur-entete">' +
        "<div>" +
          '<p class="etiquette">Éditeur</p>' +
          '<h2 class="editeur-titre">Ta quête principale</h2>' +
        "</div>" +
        '<button class="session-fermer" type="button" data-action="fermer" ' +
          'aria-label="Fermer l\'éditeur">' + SVG_CROIX + "</button>" +
      "</header>" +
      '<div class="editeur-corps"></div>';

    overlay.addEventListener("click", function (e) {
      if (e.target.closest('[data-action="fermer"]')) fermer();
    });

    document.body.appendChild(overlay);
    ctx.overlay = overlay;
    vueFormulaire();
  }

  return {
    ouvrir: ouvrir
  };
})();
