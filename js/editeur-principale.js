// ============================================
// LIFE RPG — editeur-principale.js
// Éditeur de la quête principale : overlay au
// même langage que l'éditeur de quêtes. Titre,
// description, jalons (nom + critère, ajout /
// retrait bornés), et changement complet
// d'objectif via les templates. Cohérence : un
// jalon atteint est verrouillé, l'XP acquis ne
// bouge jamais. C'est aussi le secours quand le
// Système se tait : la suite se forge à la main.
// ============================================

var EditeurPrincipale = (function () {

  var ctx = null; // { etat, overlay, surFermer }

  var BORNES = {
    titre: 60,
    description: 120,
    nomJalon: 40,
    critere: 120,
    maxJalons: 6
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

  // Copie de travail des jalons : rien ne touche l'état avant
  // Enregistrer. Les jalons atteints sont copiés tels quels.
  var brouillon = null;

  function montrerVue(html) {
    var corps = ctx.overlay.querySelector(".editeur-corps");
    corps.classList.remove("fondu");
    void corps.offsetWidth;
    corps.classList.add("fondu");
    corps.innerHTML = html;
    return corps;
  }

  function message(corps, texte) {
    var el = corps.querySelector(".editeur-message");
    el.textContent = texte;
    el.hidden = false;
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
    brouillon = JSON.parse(JSON.stringify(qp.jalons));

    var corps = montrerVue(
      '<form class="editeur-formulaire" novalidate>' +
        champTexte("Titre", "titre", BORNES.titre) +
        champTexte("Description", "description", BORNES.description) +
        '<p class="etiquette editeur-section">Jalons</p>' +
        '<div class="editeur-liste ep-etapes"></div>' +
        '<p class="editeur-message" hidden></p>' +
        '<button class="session-lien ep-ajouter" type="button">Ajouter un jalon</button>' +
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

    rendreJalons(corps);
    rendreChangerObjectif(corps);

    corps.querySelector(".ep-ajouter").addEventListener("click", function () {
      if (brouillon.length >= BORNES.maxJalons) {
        message(corps, "Six jalons au maximum : garde une quête lisible.");
        return;
      }
      lireJalons(corps);
      brouillon.push({
        nom: "Nouveau jalon",
        critere: "",
        atteint: false,
        dateAtteint: null
      });
      rendreJalons(corps);
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
      lireJalons(corps);

      qp.titre = titre;
      qp.description = form.description.value.trim().slice(0, BORNES.description);
      qp.jalons = brouillon;
      // Ajouter un jalon après l'accomplissement rouvre la quête ;
      // le palmarès, lui, garde la trace de ce qui a été accompli.
      qp.terminee = qp.jalons.length > 0 &&
        qp.jalons.every(function (jalon) { return jalon.atteint; });

      Etat.sauvegarder(ctx.etat);
      fermer();
    });
  }

  // --- Jalons : lignes éditables, atteints verrouillés ---

  function rendreJalons(corps) {
    var conteneur = corps.querySelector(".ep-etapes");
    conteneur.innerHTML = "";

    brouillon.forEach(function (jalon, i) {
      var ligne = document.createElement("div");
      ligne.className = "editeur-ligne ep-etape" + (jalon.atteint ? " ep-accomplie" : "");

      if (jalon.atteint) {
        // Verrouillé : grisé, ni éditable ni supprimable.
        ligne.innerHTML =
          '<div class="editeur-ligne-infos">' +
            '<p class="editeur-ligne-nom"></p>' +
            '<p class="editeur-ligne-meta">Jalon atteint — verrouillé</p>' +
          "</div>";
        ligne.querySelector(".editeur-ligne-nom").textContent = jalon.nom;
      } else {
        ligne.innerHTML =
          '<div class="ep-etape-champs">' +
            '<input class="editeur-entree ep-nom" type="text" maxlength="' + BORNES.nomJalon + '" ' +
              'autocomplete="off" aria-label="Nom du jalon" placeholder="Nom du jalon">' +
            '<input class="editeur-entree ep-critere" type="text" maxlength="' + BORNES.critere + '" ' +
              'autocomplete="off" aria-label="Critère du jalon" ' +
              'placeholder="Ce qui doit être vrai (ex. Ta boutique est en ligne)">' +
          "</div>" +
          '<button class="editeur-supprimer" type="button" aria-label="Supprimer le jalon">' +
            SVG_CORBEILLE + "</button>";

        ligne.querySelector(".ep-nom").value = jalon.nom;
        ligne.querySelector(".ep-critere").value = jalon.critere;

        ligne.querySelector(".editeur-supprimer").addEventListener("click", function () {
          demanderSuppression(corps, ligne, i);
        });
      }

      conteneur.appendChild(ligne);
    });
  }

  // Relit les champs des jalons non verrouillés dans le brouillon.
  function lireJalons(corps) {
    var lignes = corps.querySelectorAll(".ep-etape");
    lignes.forEach(function (ligne, i) {
      if (ligne.classList.contains("ep-accomplie")) return;
      // Ligne remplacée par une confirmation de suppression : rien à lire.
      if (!ligne.querySelector(".ep-nom")) return;
      var jalon = brouillon[i];
      jalon.nom = ligne.querySelector(".ep-nom").value.trim().slice(0, BORNES.nomJalon) || jalon.nom;
      jalon.critere = ligne.querySelector(".ep-critere").value.trim().slice(0, BORNES.critere);
    });
  }

  function demanderSuppression(corps, ligne, index) {
    if (brouillon.length <= 1) {
      message(corps, "Garde au moins un jalon.");
      return;
    }
    lireJalons(corps);
    ligne.innerHTML =
      '<p class="editeur-ligne-question">Supprimer ce jalon ?</p>' +
      '<div class="editeur-ligne-boutons">' +
        '<button class="session-lien" type="button" data-role="confirmer">Supprimer</button>' +
        '<button class="session-lien accent" type="button" data-role="annuler">Annuler</button>' +
      "</div>";
    ligne.querySelector('[data-role="confirmer"]').addEventListener("click", function () {
      brouillon.splice(index, 1);
      rendreJalons(corps);
    });
    ligne.querySelector('[data-role="annuler"]').addEventListener("click", function () {
      rendreJalons(corps);
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
    etat.objectifTexte = template.quetePrincipale.titre;
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
