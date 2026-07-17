// ============================================
// LIFE RPG — editeur.js
// Éditeur de quêtes : overlay plein écran pour
// créer, modifier et supprimer les quêtes
// quotidiennes, et ajuster la quête hebdomadaire.
// Aucune règle de jeu ici : l'XP déjà acquis ne
// bouge jamais ; seul le streak du jour est
// recalculé (Jour.majStreak) après suppression.
// ============================================

var Editeur = (function () {

  var ctx = null; // { etat, overlay, surFermer }

  var BORNES = {
    xp: { min: 5, max: 50 },
    duree: { min: 1, max: 120 },   // minutes
    series: { min: 1, max: 10 },
    repos: { min: 10, max: 300 },  // secondes
    hebdoXp: { min: 50, max: 300 },
    objectif: { min: 1, max: 7 }
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

  function etiquetteStat(cle) {
    return cle.charAt(0).toUpperCase() + cle.slice(1);
  }

  function etiquetteType(type) {
    if (type === "minuterie") return "Minuterie";
    if (type === "series") return "Séries";
    if (type === "seance") return "Séance guidée — bientôt personnalisable";
    return "Simple";
  }

  // ----- Vues -----

  function montrerVue(html) {
    var corps = ctx.overlay.querySelector(".editeur-corps");
    corps.classList.remove("fondu");
    void corps.offsetWidth; // relance l'animation d'apparition
    corps.classList.add("fondu");
    corps.innerHTML = html;
    return corps;
  }

  function message(texte) {
    var el = ctx.overlay.querySelector(".editeur-message");
    if (!el) return;
    el.textContent = texte;
    el.hidden = false;
  }

  // --- Liste des quêtes ---

  function vueListe() {
    var corps = montrerVue(
      '<p class="etiquette">Quêtes quotidiennes</p>' +
      '<div class="editeur-liste"></div>' +
      '<p class="editeur-message" hidden></p>' +
      '<button class="session-bouton editeur-nouvelle" type="button">Nouvelle quête</button>' +
      '<p class="etiquette editeur-section">Quête hebdomadaire</p>' +
      '<div class="editeur-liste"></div>'
    );

    var listes = corps.querySelectorAll(".editeur-liste");
    ctx.etat.quetes.forEach(function (quete) {
      listes[0].appendChild(ligneQuete(quete));
    });
    listes[1].appendChild(ligneHebdo());

    corps.querySelector(".editeur-nouvelle").addEventListener("click", function () {
      vueFormulaire(null);
    });
  }

  function ligneQuete(quete) {
    var ligne = document.createElement("div");
    ligne.className = "editeur-ligne";
    ligne.innerHTML =
      '<button class="editeur-ligne-infos" type="button">' +
        '<p class="editeur-ligne-nom"></p>' +
        '<p class="editeur-ligne-meta"></p>' +
      "</button>" +
      '<button class="editeur-supprimer" type="button" aria-label="Supprimer la quête">' +
        SVG_CORBEILLE + "</button>";

    ligne.querySelector(".editeur-ligne-nom").textContent = quete.nom;
    ligne.querySelector(".editeur-ligne-meta").textContent =
      "+" + quete.xp + " XP · " + etiquetteStat(quete.stat) + " · " + etiquetteType(quete.type);

    // Les séances ne s'éditent pas encore (l'édition de blocs viendra
    // avec l'IA) : la ligne reste visible et supprimable, sans formulaire.
    if (quete.type === "seance") {
      ligne.querySelector(".editeur-ligne-infos").disabled = true;
    } else {
      ligne.querySelector(".editeur-ligne-infos").addEventListener("click", function () {
        vueFormulaire(quete);
      });
    }
    ligne.querySelector(".editeur-supprimer").addEventListener("click", function () {
      demanderSuppression(ligne, quete);
    });
    return ligne;
  }

  function ligneHebdo() {
    var h = ctx.etat.hebdo;
    var ligne = document.createElement("div");
    ligne.className = "editeur-ligne";
    ligne.innerHTML =
      '<button class="editeur-ligne-infos" type="button">' +
        '<p class="editeur-ligne-nom"></p>' +
        '<p class="editeur-ligne-meta"></p>' +
      "</button>";
    ligne.querySelector(".editeur-ligne-nom").textContent = h.nom;
    ligne.querySelector(".editeur-ligne-meta").textContent =
      "+" + h.xp + " XP · " + h.objectif + " fois par semaine";
    ligne.querySelector(".editeur-ligne-infos").addEventListener("click", vueFormulaireHebdo);
    return ligne;
  }

  // --- Suppression : confirmation inline dans la ligne ---

  function demanderSuppression(ligne, quete) {
    if (ctx.etat.quetes.length <= 1) {
      message("Garde au moins une quête quotidienne.");
      return;
    }
    ligne.innerHTML =
      '<p class="editeur-ligne-question">Supprimer cette quête ?</p>' +
      '<div class="editeur-ligne-boutons">' +
        '<button class="session-lien" type="button" data-role="confirmer">Supprimer</button>' +
        '<button class="session-lien accent" type="button" data-role="annuler">Annuler</button>' +
      "</div>";
    ligne.querySelector('[data-role="confirmer"]').addEventListener("click", function () {
      supprimerQuete(quete);
    });
    ligne.querySelector('[data-role="annuler"]').addEventListener("click", vueListe);
  }

  function supprimerQuete(quete) {
    var index = ctx.etat.quetes.indexOf(quete);
    if (index === -1) return;
    ctx.etat.quetes.splice(index, 1);
    // L'XP déjà acquis reste acquis. Seul le streak du jour est
    // recalculé, comme au décochage : si c'était la seule quête
    // validée aujourd'hui, le streak redescend.
    if (quete.faite) Jour.majStreak(ctx.etat);
    Etat.sauvegarder(ctx.etat);
    vueListe();
  }

  // --- Formulaire : gabarits de champs ---

  function champTexte(libelle, nom, maxlength) {
    return '<label class="editeur-champ">' +
      '<span class="etiquette">' + libelle + "</span>" +
      '<input class="editeur-entree" name="' + nom + '" type="text" maxlength="' + maxlength + '" autocomplete="off">' +
    "</label>";
  }

  function champNombre(libelle, nom, bornes) {
    return '<label class="editeur-champ">' +
      '<span class="etiquette">' + libelle + "</span>" +
      '<input class="editeur-entree" name="' + nom + '" type="number" ' +
        'min="' + bornes.min + '" max="' + bornes.max + '" inputmode="numeric">' +
    "</label>";
  }

  function groupePuces(libelle, champ, options) {
    var html = '<div class="editeur-champ">' +
      '<span class="etiquette">' + libelle + "</span>" +
      '<div class="editeur-puces" data-champ="' + champ + '">';
    options.forEach(function (o) {
      html += '<button class="editeur-puce" type="button" data-valeur="' + o[0] + '">' + o[1] + "</button>";
    });
    return html + "</div></div>";
  }

  function poserPuce(corps, champ, valeur) {
    var groupe = corps.querySelector('.editeur-puces[data-champ="' + champ + '"]');
    Array.prototype.forEach.call(groupe.children, function (puce) {
      puce.classList.toggle("actif", puce.getAttribute("data-valeur") === valeur);
    });
  }

  function lirePuce(corps, champ) {
    var actif = corps.querySelector('.editeur-puces[data-champ="' + champ + '"] .actif');
    return actif.getAttribute("data-valeur");
  }

  // --- Formulaire quête quotidienne (création et modification) ---

  function vueFormulaire(quete) {
    var corps = montrerVue(
      '<p class="etiquette">' + (quete ? "Modifier la quête" : "Nouvelle quête") + "</p>" +
      '<form class="editeur-formulaire" novalidate>' +
        champTexte("Nom", "nom", 60) +
        groupePuces("Stat", "stat", [
          ["corps", "Corps"], ["esprit", "Esprit"], ["discipline", "Discipline"]
        ]) +
        champNombre("XP (5 à 50)", "xp", BORNES.xp) +
        groupePuces("Type", "type", [
          ["simple", "Simple"], ["minuterie", "Minuterie"], ["series", "Séries"]
        ]) +
        '<div class="editeur-conditionnel" data-type="minuterie" hidden>' +
          champNombre("Durée en minutes (1 à 120)", "duree", BORNES.duree) +
        "</div>" +
        '<div class="editeur-conditionnel" data-type="series" hidden>' +
          champNombre("Nombre de séries (1 à 10)", "series", BORNES.series) +
          champTexte("Une série (ex. 15 pompes)", "parSerie", 60) +
          champNombre("Repos en secondes (10 à 300)", "repos", BORNES.repos) +
        "</div>" +
        '<p class="editeur-erreur" hidden></p>' +
        '<div class="editeur-formulaire-boutons">' +
          '<button class="session-bouton" type="submit">Enregistrer</button>' +
          '<button class="session-lien" type="button" data-role="annuler">Annuler</button>' +
        "</div>" +
      "</form>"
    );

    var form = corps.querySelector("form");
    form.nom.value = quete ? quete.nom : "";
    form.xp.value = quete ? quete.xp : 20;
    form.duree.value = quete && quete.duree ? Math.round(quete.duree / 60) : 10;
    form.series.value = quete && quete.series ? quete.series : 3;
    form.parSerie.value = quete && quete.parSerie ? quete.parSerie : "";
    form.repos.value = quete && quete.repos ? quete.repos : 60;
    poserPuce(form, "stat", quete ? quete.stat : "corps");
    poserPuce(form, "type", quete ? quete.type : "simple");

    function majConditionnels() {
      var type = lirePuce(form, "type");
      Array.prototype.forEach.call(form.querySelectorAll(".editeur-conditionnel"), function (bloc) {
        bloc.hidden = bloc.getAttribute("data-type") !== type;
      });
    }
    majConditionnels();

    form.addEventListener("click", function (e) {
      var puce = e.target.closest(".editeur-puce");
      if (!puce) return;
      poserPuce(form, puce.parentNode.getAttribute("data-champ"), puce.getAttribute("data-valeur"));
      majConditionnels();
    });

    form.querySelector('[data-role="annuler"]').addEventListener("click", vueListe);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nom = form.nom.value.trim().slice(0, 60);
      if (!nom) {
        var erreur = form.querySelector(".editeur-erreur");
        erreur.textContent = "Donne un nom à ta quête.";
        erreur.hidden = false;
        return;
      }

      var q = quete;
      if (!q) {
        q = { id: "q" + Date.now(), faite: false };
        ctx.etat.quetes.push(q);
      }
      q.nom = nom;
      q.stat = lirePuce(form, "stat");
      q.xp = borner(form.xp.value, BORNES.xp);
      q.type = lirePuce(form, "type");

      // Seuls les champs du type choisi sont conservés.
      delete q.duree;
      delete q.series;
      delete q.parSerie;
      delete q.repos;
      if (q.type === "minuterie") {
        q.duree = borner(form.duree.value, BORNES.duree) * 60;
      } else if (q.type === "series") {
        q.series = borner(form.series.value, BORNES.series);
        q.parSerie = form.parSerie.value.trim().slice(0, 60) || nom;
        q.repos = borner(form.repos.value, BORNES.repos);
      }

      Etat.sauvegarder(ctx.etat);
      vueListe();
    });
  }

  // --- Formulaire quête hebdomadaire ---

  function vueFormulaireHebdo() {
    var corps = montrerVue(
      '<p class="etiquette">Quête hebdomadaire</p>' +
      '<form class="editeur-formulaire" novalidate>' +
        champTexte("Nom", "nom", 60) +
        champNombre("XP (50 à 300)", "xp", BORNES.hebdoXp) +
        champNombre("Objectif par semaine (1 à 7)", "objectif", BORNES.objectif) +
        // Le lien de progression automatique se lit, il ne s'édite
        // pas encore : la phrase vient de Regles.descriptionLienHebdo.
        '<p class="editeur-hebdo-lien"></p>' +
        '<p class="editeur-erreur" hidden></p>' +
        '<div class="editeur-formulaire-boutons">' +
          '<button class="session-bouton" type="submit">Enregistrer</button>' +
          '<button class="session-lien" type="button" data-role="annuler">Annuler</button>' +
        "</div>" +
      "</form>"
    );

    var form = corps.querySelector("form");
    var h = ctx.etat.hebdo;
    form.nom.value = h.nom;
    form.xp.value = h.xp;
    form.objectif.value = h.objectif;
    corps.querySelector(".editeur-hebdo-lien").textContent =
      Regles.descriptionLienHebdo(h.lien);

    form.querySelector('[data-role="annuler"]').addEventListener("click", vueListe);

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var nom = form.nom.value.trim().slice(0, 60);
      if (!nom) {
        var erreur = form.querySelector(".editeur-erreur");
        erreur.textContent = "Donne un nom à ta quête.";
        erreur.hidden = false;
        return;
      }
      h.nom = nom;
      h.xp = borner(form.xp.value, BORNES.hebdoXp);
      h.objectif = borner(form.objectif.value, BORNES.objectif);
      // L'objectif peut redescendre sous la progression en cours.
      h.progres = Math.min(h.progres, h.objectif);
      Etat.sauvegarder(ctx.etat);
      vueListe();
    });
  }

  // ----- Ouverture / fermeture -----

  function fermer() {
    if (!ctx) return;
    var surFermer = ctx.surFermer;
    ctx.overlay.remove();
    ctx = null;
    if (surFermer) surFermer();
  }

  // L'éditeur travaille directement sur l'objet d'état de l'accueil,
  // qui se re-rend à la fermeture via le callback.
  function ouvrir(etat, surFermer) {
    if (ctx) return;
    ctx = { etat: etat, surFermer: surFermer || null, overlay: null };

    var overlay = document.createElement("div");
    overlay.className = "editeur";
    overlay.innerHTML =
      '<header class="editeur-entete">' +
        "<div>" +
          '<p class="etiquette">Éditeur</p>' +
          '<h2 class="editeur-titre">Tes quêtes</h2>' +
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
    vueListe();
  }

  return {
    ouvrir: ouvrir
  };
})();
