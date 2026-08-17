// ============================================
// LIFE RPG — parametres.js
// Les PANNEAUX du menu : des tiroirs qui glissent depuis la
// droite, contenu assombri derrière (voile). Ouverts par les
// deux boutons réels du rail (js/rail.js) :
//   - « profil »   : nom, objectif, jours d'engagement ;
//   - « reglages » : préférences (son/vibr/notif), données
//     (export/import/recommencer), aide (règles, confidentialité,
//     crédits, version).
// La navigation entre pages reste la NAV BASSE.
//
// Fermeture : tap sur le voile, swipe vers la droite, ou Échap.
// prefers-reduced-motion : glissement -> bascule instantanée.
//
// Rien n'est perdu : export/import/recommencer marchent à
// l'identique ; « changer d'objectif » réutilise EditeurPrincipale ;
// « jours d'engagement » réutilise le sélecteur JoursEngagement.
// ============================================

var Parametres = (function () {

  var VERSION = "v41";
  var NOM_MAX = 20; // borne identique à l'onboarding

  var ctx = null; // { etat, surFermer, overlay, couche, vue }

  // Lettres des jours (0 = lundi ... 6 = dimanche), comme le sélecteur.
  var JOURS_COURTS = ["L", "M", "M", "J", "V", "S", "D"];

  var SVG_CROIX =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var SVG_CHEVRON =
    '<svg class="param-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" ' +
    'stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M9 5l7 7-7 7"/></svg>';

  var SVG_RETOUR =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M15 5l-7 7 7 7"/></svg>';

  // Icônes de tête des rangées (même trait que la nav basse).
  function svgIcone(inner) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + "</svg>";
  }

  var ICONES = {
    nom: svgIcone('<circle cx="12" cy="8" r="3.5"/><path d="M5 20c1-3.6 3.7-5.2 7-5.2s6 1.6 7 5.2"/>'),
    objectif: svgIcone('<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4"/>' +
      '<circle cx="12" cy="12" r="0.7" fill="currentColor"/>'),
    jours: svgIcone('<rect x="4" y="5.5" width="16" height="15" rx="2"/>' +
      '<path d="M4 9.5h16M8 3.5v4M16 3.5v4"/>'),
    son: svgIcone('<path d="M5 9v6h4l5 4V5L9 9z"/><path d="M17 9.5a3.2 3.2 0 0 1 0 5"/>'),
    vibration: svgIcone('<rect x="8.5" y="4.5" width="7" height="15" rx="1.6"/><path d="M4.7 9.5v5M19.3 9.5v5"/>'),
    notif: svgIcone('<path d="M18 16v-5a6 6 0 1 0-12 0v5l-1.8 2h15.6z"/><path d="M10 20a2 2 0 0 0 4 0"/>'),
    aide: svgIcone('<circle cx="12" cy="12" r="8.5"/>' +
      '<path d="M9.6 9.6a2.4 2.4 0 1 1 3.3 2.2c-.8.4-1.4 1-1.4 1.9v.3"/><path d="M11.9 17h.02"/>'),
    confidentialite: svgIcone('<path d="M12 3l7 3v5c0 4.5-3 7.6-7 9-4-1.4-7-4.5-7-9V6z"/>'),
    credits: svgIcone('<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5"/><path d="M11.95 8h.02"/>'),
    exporter: svgIcone('<path d="M12 4v10M8 10.5l4 4 4-4"/><path d="M5 19.5h14"/>'),
    importer: svgIcone('<path d="M12 14.5V4.5M8 8l4-4 4 4"/><path d="M5 19.5h14"/>'),
    recommencer: svgIcone('<path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3"/><path d="M19.5 4.5V9H15"/>')
  };

  function reduitAnimations() {
    return window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // ----- Rendu d'une vue dans le corps de l'overlay -----

  function montrerVue(html) {
    var corps = ctx.overlay.querySelector(".param-corps");
    corps.classList.remove("fondu");
    void corps.offsetWidth; // relance l'animation d'apparition
    corps.classList.add("fondu");
    corps.innerHTML = html;
    corps.scrollTop = 0;
    return corps;
  }

  function echapper(texte) {
    var d = document.createElement("div");
    d.textContent = texte == null ? "" : String(texte);
    return d.innerHTML;
  }

  function resumeJours() {
    var jours = ctx.etat.joursEngagement || [];
    if (!jours.length) return "Aucun jour";
    return jours.map(function (j) { return JOURS_COURTS[j]; }).join(" · ");
  }

  // ============================================
  //  VUES RACINES — deux panneaux distincts, choisis par ctx.vue :
  //  « profil » (identité + gameplay) et « reglages » (préférences,
  //  données, aide). Chaque bouton du rail ouvre l'un des deux.
  // ============================================

  function vueRacine() {
    return ctx.vue === "profil" ? vueProfil() : vueReglages();
  }

  // Libellé du bouton retour des sous-vues, selon le panneau courant.
  function retourLabel() {
    return ctx.vue === "profil" ? "Profil" : "Paramètres";
  }

  // --- Panneau PROFIL : identité + gameplay (une seule liste ; le titre
  // du panneau « Profil » suffit, pas de titre de section redondant) ---
  function vueProfil() {
    var etat = ctx.etat;
    var objectif = etat.objectifTexte || (etat.quetePrincipale && etat.quetePrincipale.titre) || "—";

    var corps = montrerVue(
      '<section class="param-section">' +
        '<div class="param-liste">' +
          ligneHtml("nom", "Nom", echapper(etat.nom)) +
          ligneHtml("objectif", "Objectif", echapper(objectif)) +
          ligneHtml("jours", "Jours d\'engagement", resumeJours()) +
        "</div>" +
      "</section>"
    );

    brancherLignes(corps);
    return corps;
  }

  // --- Panneau PARAMÈTRES : préférences, données, aide. Toutes les
  // entrées partagent la même grammaire de rangée (.param-ligne) : seule
  // la zone droite change (interrupteur, action, ou chevron). ---
  function vueReglages() {
    var corps = montrerVue(
      // --- PRÉFÉRENCES (rangées + interrupteur) ---
      '<section class="param-section">' +
        '<p class="etiquette param-section-titre">Préférences</p>' +
        '<div class="param-liste">' +
          ligneSwitchHtml("son", "Effets sonores") +
          ligneSwitchHtml("vibration", "Vibrations") +
          '<div class="param-reglage-bloc">' +
            ligneSwitchHtml("notif", "Notifications") +
            '<p class="param-reglage-note" data-role="notif-note" hidden></p>' +
          "</div>" +
        "</div>" +
      "</section>" +

      // --- DONNÉES (rangées d'action) ---
      '<section class="param-section">' +
        '<p class="etiquette param-section-titre">Données</p>' +
        '<div class="param-liste">' +
          ligneActionHtml("exporter", "Exporter la sauvegarde") +
          ligneActionHtml("importer", "Importer une sauvegarde") +
          '<input type="file" accept=".json,application/json" data-role="fichier" hidden>' +
          '<div class="param-confirmation" data-role="import-confirm" hidden>' +
            '<p class="param-question">Remplacer ta progression actuelle par ce fichier ?</p>' +
            '<div class="param-confirmation-boutons">' +
              '<button class="session-lien accent" type="button" data-role="import-oui">Remplacer</button>' +
              '<button class="session-lien" type="button" data-role="import-non">Annuler</button>' +
            "</div>" +
          "</div>" +
          ligneActionHtml("recommencer", "Recommencer l\'aventure", { danger: true }) +
          '<div class="param-confirmation" data-role="reset-confirm" hidden>' +
            '<p class="param-question">Abandonner ce personnage ? Sa progression sera effacée pour toujours.</p>' +
            '<div class="param-confirmation-boutons">' +
              '<button class="session-lien accent" type="button" data-role="reset-oui">Abandonner</button>' +
              '<button class="session-lien" type="button" data-role="reset-non">Annuler</button>' +
            "</div>" +
          "</div>" +
          '<p class="param-message" data-role="donnees-message" hidden></p>' +
        "</div>" +
      "</section>" +

      // --- AIDE & À PROPOS (rangées + chevron) ---
      '<section class="param-section">' +
        '<p class="etiquette param-section-titre">Aide &amp; à propos</p>' +
        '<div class="param-liste">' +
          ligneHtml("aide", "Comment jouer", "") +
          ligneHtml("confidentialite", "Confidentialité", "") +
          ligneHtml("credits", "Crédits", "") +
        "</div>" +
        '<p class="param-pied">Life RPG · ' + VERSION + "</p>" +
      "</section>"
    );

    brancherLignes(corps);
    brancherInterrupteurs(corps);
    brancherDonnees(corps);
    return corps;
  }

  function ligneHtml(cle, nom, valeur) {
    return '<button class="param-ligne" type="button" data-ligne="' + cle + '">' +
      '<span class="param-ligne-icone">' + (ICONES[cle] || "") + "</span>" +
      '<span class="param-ligne-infos">' +
        '<span class="param-ligne-nom">' + nom + "</span>" +
        (valeur ? '<span class="param-ligne-valeur">' + valeur + "</span>" : "") +
      "</span>" +
      '<span class="param-ligne-droite">' + SVG_CHEVRON + "</span>" +
    "</button>";
  }

  // Rangée à interrupteur (Son / Vibrations / Notifications). Un <div>
  // (pas un <button>) car elle contient déjà un bouton — seul l'interrupteur
  // est interactif. Même gabarit que les autres rangées.
  function ligneSwitchHtml(cle, nom) {
    return '<div class="param-ligne param-ligne--statique">' +
      '<span class="param-ligne-icone">' + (ICONES[cle] || "") + "</span>" +
      '<span class="param-ligne-infos"><span class="param-ligne-nom">' + nom + "</span></span>" +
      '<span class="param-ligne-droite">' +
        '<button class="interrupteur" type="button" role="switch" data-switch="' + cle + '" ' +
          'aria-label="' + nom + '"><span class="interrupteur-pastille"></span></button>' +
      "</span>" +
    "</div>";
  }

  // Rangée d'action (Exporter / Importer / Recommencer). Toute la rangée
  // est cliquable ; pas de chevron (l'action s'effectue sur place). Le rôle
  // pilote la logique dans brancherDonnees. `danger` : teinte discrète.
  function ligneActionHtml(cle, nom, opts) {
    opts = opts || {};
    return '<button class="param-ligne' + (opts.danger ? " param-ligne--danger" : "") +
      '" type="button" data-role="' + cle + '">' +
      '<span class="param-ligne-icone">' + (ICONES[cle] || "") + "</span>" +
      '<span class="param-ligne-infos"><span class="param-ligne-nom">' + nom + "</span></span>" +
      '<span class="param-ligne-droite"></span>' +
    "</button>";
  }

  // ----- Branchement des rangées cliquables (profil + aide) -----

  function brancherLignes(corps) {
    corps.querySelectorAll("[data-ligne]").forEach(function (b) {
      b.addEventListener("click", function () {
        var cle = b.getAttribute("data-ligne");
        if (cle === "nom") vueNom();
        else if (cle === "objectif") changerObjectif();
        else if (cle === "jours") vueJours();
        else if (cle === "aide") vueDoc("aide");
        else if (cle === "confidentialite") vueDoc("confidentialite");
        else if (cle === "credits") vueDoc("credits");
      });
    });
  }

  // ----- Interrupteurs son / vibration / notifications -----

  function brancherInterrupteurs(corps) {
    // Son.
    var interSon = corps.querySelector('[data-switch="son"]');
    var refletSon = function () { poserSwitch(interSon, window.Son ? Son.actif() : true); };
    refletSon();
    interSon.addEventListener("click", function () {
      if (window.Son) {
        var on = Son.basculer();
        if (on) Son.jouer("quete"); // court confirm à la réactivation
      }
      refletSon();
    });

    // Vibrations.
    var interVib = corps.querySelector('[data-switch="vibration"]');
    var refletVib = function () { poserSwitch(interVib, Juice.vibrationsActives()); };
    refletVib();
    interVib.addEventListener("click", function () {
      var on = Juice.basculerVibrations();
      if (on) Juice.vibrer(20); // confirm haptique à la réactivation
      refletVib();
    });

    // Notifications.
    var interNotif = corps.querySelector('[data-switch="notif"]');
    var note = corps.querySelector('[data-role="notif-note"]');
    var N = window.Notifications;

    function refletNotif() {
      var supporte = N && N.estSupporte();
      var actif = supporte && N.estActif();
      poserSwitch(interNotif, actif);
      if (!supporte) {
        interNotif.disabled = true;
        interNotif.style.opacity = "0.4";
        note.textContent = "Non disponible sur cet appareil. Sur iPhone, installe l\'app pour recevoir les rappels.";
        note.hidden = false;
      } else if (N.permissionActuelle() === "denied") {
        note.textContent = "Bloquées dans les réglages du navigateur — réactive-les là-bas pour recevoir les rappels.";
        note.hidden = false;
      } else {
        note.hidden = true;
      }
    }
    refletNotif();

    interNotif.addEventListener("click", function () {
      if (!N || !N.estSupporte() || interNotif.disabled) return;
      if (N.estActif()) {
        N.desactiver();
        refletNotif();
      } else {
        N.activer().then(refletNotif);
      }
    });
  }

  function poserSwitch(bouton, actif) {
    bouton.classList.toggle("actif", Boolean(actif));
    bouton.setAttribute("aria-checked", String(Boolean(actif)));
  }

  // ============================================
  //  DONNÉES : export / import / recommencer
  //  (déplacés depuis l'ancienne page profil, à l'identique)
  // ============================================

  // Une sauvegarde valide contient au minimum les propriétés clés de
  // l'état ; la migration complète le reste au rechargement.
  function estSauvegardeValide(objet) {
    return (
      objet !== null &&
      typeof objet === "object" &&
      !Array.isArray(objet) &&
      typeof objet.niveau === "number" &&
      typeof objet.xp === "number" &&
      typeof objet.streak === "number" &&
      Array.isArray(objet.quetes) &&
      objet.stats !== null &&
      typeof objet.stats === "object" &&
      typeof objet.stats.corps === "object" &&
      typeof objet.stats.esprit === "object" &&
      typeof objet.stats.discipline === "object"
    );
  }

  function brancherDonnees(corps) {
    var champFichier = corps.querySelector('[data-role="fichier"]');
    var importConfirm = corps.querySelector('[data-role="import-confirm"]');
    var resetConfirm = corps.querySelector('[data-role="reset-confirm"]');
    var message = corps.querySelector('[data-role="donnees-message"]');
    var enAttente = null; // état importé en attente de confirmation

    function afficherMessage(texte) {
      message.textContent = texte;
      message.hidden = false;
    }

    // --- Export : l'état complet dans un fichier daté ---
    corps.querySelector('[data-role="exporter"]').addEventListener("click", function () {
      var etat = Etat.charger();
      var blob = new Blob([JSON.stringify(etat, null, 2)], { type: "application/json" });
      var lien = document.createElement("a");
      lien.href = URL.createObjectURL(blob);
      lien.download = "life-rpg-sauvegarde-" + Jour.dateDuJour() + ".json";
      document.body.appendChild(lien);
      lien.click();
      document.body.removeChild(lien);
      URL.revokeObjectURL(lien.href);
    });

    // --- Import : lecture, validation, confirmation inline ---
    corps.querySelector('[data-role="importer"]').addEventListener("click", function () {
      message.hidden = true;
      champFichier.click();
    });

    champFichier.addEventListener("change", function () {
      var fichier = champFichier.files && champFichier.files[0];
      if (!fichier) return;
      var lecteur = new FileReader();
      lecteur.onload = function () {
        var objet = null;
        try { objet = JSON.parse(lecteur.result); } catch (e) {}
        if (!estSauvegardeValide(objet)) {
          afficherMessage("Ce fichier n'est pas une sauvegarde Life RPG valide.");
          champFichier.value = "";
          return;
        }
        enAttente = objet;
        message.hidden = true;
        importConfirm.hidden = false;
      };
      lecteur.onerror = function () {
        afficherMessage("Impossible de lire ce fichier.");
        champFichier.value = "";
      };
      lecteur.readAsText(fichier);
    });

    corps.querySelector('[data-role="import-oui"]').addEventListener("click", function () {
      if (!enAttente) return;
      // L'état brut est écrit tel quel : la migration s'applique au
      // rechargement, comme pour toute vieille sauvegarde.
      Etat.remplacer(enAttente);
      location.reload();
    });

    corps.querySelector('[data-role="import-non"]').addEventListener("click", function () {
      enAttente = null;
      importConfirm.hidden = true;
      champFichier.value = "";
    });

    // --- Recommencer : abandonner ce personnage, repartir de zéro ---
    corps.querySelector('[data-role="recommencer"]').addEventListener("click", function () {
      message.hidden = true;
      resetConfirm.hidden = false;
    });

    corps.querySelector('[data-role="reset-non"]').addEventListener("click", function () {
      resetConfirm.hidden = true;
    });

    corps.querySelector('[data-role="reset-oui"]').addEventListener("click", function () {
      try { localStorage.removeItem("life-rpg-etat-v1"); } catch (e) {}
      location.href = "onboarding.html";
    });
  }

  // ============================================
  //  SOUS-VUE : NOM (modifiable, borné à 20)
  // ============================================

  function vueNom() {
    var corps = montrerVue(
      boutonRetourHtml("Profil") +
      '<h2 class="param-doc-titre">Ton nom</h2>' +
      '<label class="param-champ">' +
        '<span class="etiquette">Nom du personnage</span>' +
        '<input class="param-entree" type="text" maxlength="' + NOM_MAX + '" autocomplete="off" ' +
          'aria-label="Nom du personnage">' +
      "</label>" +
      '<p class="param-message" data-role="nom-erreur" hidden></p>' +
      '<div class="param-sous-boutons">' +
        '<button class="session-bouton" type="button" data-role="nom-enregistrer">Enregistrer</button>' +
        '<button class="session-lien" type="button" data-role="nom-annuler">Annuler</button>' +
      "</div>"
    );

    var champ = corps.querySelector(".param-entree");
    champ.value = ctx.etat.nom || "";
    corps.querySelector(".param-retour").addEventListener("click", vueRacine);
    corps.querySelector('[data-role="nom-annuler"]').addEventListener("click", vueRacine);

    function enregistrer() {
      var nom = champ.value.trim().slice(0, NOM_MAX);
      if (!nom) {
        var err = corps.querySelector('[data-role="nom-erreur"]');
        err.textContent = "Donne un nom à ton personnage.";
        err.hidden = false;
        return;
      }
      ctx.etat.nom = nom;
      Etat.sauvegarder(ctx.etat);
      if (ctx.surFermer) ctx.surFermer(); // le nom se reflète partout (fiche…)
      vueRacine();
    }

    corps.querySelector('[data-role="nom-enregistrer"]').addEventListener("click", enregistrer);
    champ.addEventListener("keydown", function (e) {
      if (e.key === "Enter") { e.preventDefault(); enregistrer(); }
    });
    setTimeout(function () { champ.focus(); }, 50);
  }

  // ============================================
  //  SOUS-VUE : JOURS D'ENGAGEMENT (sélecteur partagé)
  // ============================================

  function vueJours() {
    var corps = montrerVue(
      boutonRetourHtml("Profil") +
      '<h2 class="param-doc-titre">Tes jours d\'engagement</h2>' +
      '<p class="param-sous-intro">Les jours où la boucle quotidienne est active. Le repos ne casse ' +
        "jamais ta série. Un changement s'applique vers l'avant.</p>" +
      '<div class="param-jours"></div>'
    );
    corps.querySelector(".param-retour").addEventListener("click", vueRacine);

    // Même UI et même règle de persistance que l'éditeur : les changements
    // valent VERS L'AVANT (jour courant exempté), pour ne jamais créer un
    // manque passé ni casser la série en cours (voir jour.js).
    var choix = JoursEngagement.rendre(
      corps.querySelector(".param-jours"),
      ctx.etat.joursEngagement,
      function () {
        if (!choix.estValide()) return; // sous le minimum : on ne persiste pas
        ctx.etat.joursEngagement = choix.lire();
        ctx.etat.jourExempt = ctx.etat.dernierJour;
        Etat.sauvegarder(ctx.etat);
      }
    );
  }

  // ============================================
  //  CHANGER D'OBJECTIF (réutilise EditeurPrincipale)
  // ============================================

  function changerObjectif() {
    if (typeof EditeurPrincipale === "undefined") {
      Juice.bandeau("Bientôt disponible ici", "");
      return;
    }
    var etat = ctx.etat;
    var surFermer = ctx.surFermer;
    // On ferme le tiroir PUIS on ouvre l'éditeur de quête principale
    // (une fois le tiroir retiré) : à sa fermeture, l'hôte se re-rend.
    fermer(function () {
      EditeurPrincipale.ouvrir(etat, surFermer);
    });
  }

  // ============================================
  //  SOUS-VUES D'AIDE (Comment jouer / Confidentialité / Crédits)
  // ============================================

  function vueDoc(type) {
    montrerVue(boutonRetourHtml(retourLabel()) + docHtml(type))
      .querySelector(".param-retour").addEventListener("click", vueRacine);
  }

  function docHtml(type) {
    if (type === "aide") {
      return '<div class="param-doc">' +
        '<h2 class="param-doc-titre">Comment jouer</h2>' +
        "<h3>Quêtes</h3>" +
        "<p>Chaque jour, le Système te propose des quêtes. Les accomplir te fait gagner " +
          "de l'XP. Tu composes toi-même ta liste dans l'éditeur (crayon de l'accueil).</p>" +
        "<h3>XP &amp; niveaux</h3>" +
        "<p>L'XP fait monter ton niveau global et tes trois stats — Corps, Esprit, " +
          "Discipline. Un coup critique double parfois l'XP d'une quête.</p>" +
        "<h3>Rangs</h3>" +
        "<p>Ton niveau te fait franchir des rangs, de E à S puis Nation. Le rang colore " +
          "la lettre de ta fiche et donne le ton de ta progression.</p>" +
        "<h3>Cartes</h3>" +
        "<p>Des jalons de jeu (séries, streaks, journées parfaites) débloquent des cartes " +
          "à collectionner, parfois brillantes. Retrouve-les dans la Collection.</p>" +
        "<h3>Streak &amp; gel</h3>" +
        "<p>Ta série (streak) compte les jours d'engagement tenus d'affilée. Manquer un " +
          "jour d'engagement consomme un gel s'il t'en reste — la chaîne tient. Sans gel, " +
          "la série repart.</p>" +
        "<h3>Jours d'engagement</h3>" +
        "<p>Tu choisis les jours où la boucle quotidienne est active (3 à 6). Les autres " +
          "sont des jours de repos : ils ne cassent jamais ta série.</p>" +
      "</div>";
    }
    if (type === "confidentialite") {
      return '<div class="param-doc">' +
        '<h2 class="param-doc-titre">Confidentialité</h2>' +
        "<p>Toute ta progression vit sur ton appareil (stockage local du navigateur). " +
          "Elle ne part sur aucun serveur, sauf si tu l'exportes toi-même en fichier.</p>" +
        "<h3>Notifications</h3>" +
        "<p>Si tu actives les rappels, le Système envoie au serveur le strict minimum " +
          "pour choisir le bon moment : tes jours d'engagement, ton fuseau horaire, la date " +
          "locale, et des drapeaux (quêtes du jour faites, gel en attente, longueur de série).</p>" +
        '<p class="param-doc-sobre">Jamais ton prénom, jamais le détail de tes quêtes. Les ' +
          "rappels s'arrêtent dès que tu coupes l'interrupteur.</p>" +
      "</div>";
    }
    // Crédits
    return '<div class="param-doc">' +
      '<h2 class="param-doc-titre">Crédits</h2>' +
      "<h3>Polices</h3>" +
      "<p>Saira et Space Grotesk, sous licence SIL Open Font License, auto-hébergées " +
        "(aucune dépendance externe).</p>" +
      "<h3>Sons</h3>" +
      "<p>Aucun fichier audio : tous les effets sont synthétisés en direct via la Web Audio " +
        "API. Des sons originaux, libres de droits par nature.</p>" +
      "<h3>Le jeu</h3>" +
      '<p class="param-doc-sobre">Life RPG · ' + VERSION + ". Une PWA qui transforme " +
        "tes journées en aventure.</p>" +
    "</div>";
  }

  function boutonRetourHtml(libelle) {
    return '<button class="param-retour session-lien" type="button">' +
      SVG_RETOUR + "<span>" + libelle + "</span></button>";
  }

  // ============================================
  //  OUVERTURE / FERMETURE
  // ============================================

  // Gestes de fermeture : swipe vers la droite sur le panneau + Échap.
  function brancherGestes(couche, panneau) {
    var xDepart = null, yDepart = null;
    panneau.addEventListener("touchstart", function (e) {
      var t = e.touches[0];
      xDepart = t.clientX; yDepart = t.clientY;
    }, { passive: true });
    panneau.addEventListener("touchend", function (e) {
      if (xDepart === null) return;
      var t = e.changedTouches[0];
      var dx = t.clientX - xDepart;
      var dy = t.clientY - yDepart;
      // Franchement horizontal, vers la droite.
      if (dx > 55 && Math.abs(dx) > Math.abs(dy) * 1.4) fermer();
      xDepart = null; yDepart = null;
    }, { passive: true });

    couche._surTouche = function (e) { if (e.key === "Escape") fermer(); };
    document.addEventListener("keydown", couche._surTouche);
  }

  // Ferme le tiroir (glissement sortant), le retire, re-rend l'hôte, puis
  // exécute `apres` (ex. ouvrir EditeurPrincipale une fois le tiroir parti).
  function fermer(apres) {
    if (!ctx) return;
    var surFermer = ctx.surFermer;
    var couche = ctx.couche;
    ctx = null;
    if (couche._surTouche) document.removeEventListener("keydown", couche._surTouche);

    function retirer() {
      if (couche.parentNode) couche.parentNode.removeChild(couche);
      if (surFermer) surFermer();
      if (typeof apres === "function") apres();
    }

    couche.classList.remove("ouvert");
    if (reduitAnimations()) { retirer(); return; }
    var fini = false;
    var termine = function () { if (fini) return; fini = true; retirer(); };
    couche.querySelector(".parametres").addEventListener("transitionend", termine, { once: true });
    setTimeout(termine, 360); // repli garanti si transitionend ne part pas
  }

  // `vue` : "profil" (identité + gameplay) ou "reglages" (défaut :
  // préférences, données, aide). Chaque bouton du rail ouvre l'un des deux.
  function ouvrir(etat, surFermer, vue) {
    if (ctx) return;
    vue = vue === "profil" ? "profil" : "reglages";
    ctx = { etat: etat, surFermer: surFermer || null, overlay: null, couche: null, vue: vue };

    var titre = vue === "profil" ? "Profil" : "Paramètres";

    var couche = document.createElement("div");
    couche.className = "param-couche";

    var panneau = document.createElement("aside");
    panneau.className = "parametres";
    panneau.setAttribute("role", "dialog");
    panneau.setAttribute("aria-modal", "true");
    panneau.setAttribute("aria-label", titre);
    panneau.innerHTML =
      '<header class="param-entete">' +
        "<div>" +
          '<p class="etiquette">Menu</p>' +
          '<h2 class="param-titre">' + titre + "</h2>" +
        "</div>" +
        '<button class="session-fermer" type="button" data-action="fermer" ' +
          'aria-label="Fermer le menu">' + SVG_CROIX + "</button>" +
      "</header>" +
      '<div class="param-corps"></div>';

    couche.innerHTML = '<div class="param-scrim" data-role="scrim"></div>';
    couche.appendChild(panneau);

    // Tap sur le voile ou le bouton fermer.
    couche.addEventListener("click", function (e) {
      if (e.target.closest('[data-action="fermer"]') ||
          e.target.closest('[data-role="scrim"]')) {
        fermer();
      }
    });

    brancherGestes(couche, panneau);

    document.body.appendChild(couche);
    ctx.couche = couche;
    ctx.overlay = panneau;
    vueRacine();

    // Déclenche le glissement (ou l'affiche d'un coup si animations réduites).
    if (reduitAnimations()) {
      couche.classList.add("ouvert");
    } else {
      void couche.offsetWidth;
      requestAnimationFrame(function () { couche.classList.add("ouvert"); });
    }
  }

  return {
    ouvrir: ouvrir
  };
})();
