// ============================================
// LIFE RPG — etat.js
// État du personnage : source de vérité unique,
// persistée en localStorage, avec migration et
// application du changement de jour au chargement.
// ============================================

var Etat = (function () {

  var CLE = "life-rpg-etat-v1";

  // État de TEST / SECOURS uniquement. Le vrai état d'un joueur est
  // créé par l'onboarding (Templates.etatNeuf) : DEFAUT ne sert plus
  // que de filet quand le stockage est indisponible, et de référence
  // aux migrations qui complètent les vieilles sauvegardes (quêtes
  // par id, blocs de séance). Rien ici n'est affiché à un joueur
  // ayant traversé l'onboarding.
  var DEFAUT = {
    nom: "Aventurier",
    classe: "Aventurier",
    niveau: 1,
    xp: 0,
    streak: 0,
    streakValideAujourdhui: false,
    dernierJour: null,   // rempli à la date du jour par la migration
    lundiSemaine: null,  // rempli au lundi de la semaine par la migration
    // Jours d'engagement choisis (0 = lundi ... 6 = dimanche) : la boucle
    // quotidienne n'est active que ces jours-là. Par défaut lundi-vendredi.
    joursEngagement: [0, 1, 2, 3, 4],
    gels: 2,              // protections d'un jour d'engagement manqué (plafond 2)
    tenusSemaine: 0,      // jours d'engagement honorés dans la semaine en cours
    gelEnAttente: false,  // un gel vient d'être consommé : message sobre à afficher
    jourExempt: null,     // date exemptée après un changement de jours (VERS L'AVANT)
    journal: {},          // issues par jour (date -> "honore"|"gele") : AFFICHAGE seul
    stats: {
      corps: { niveau: 1, xp: 0 },
      esprit: { niveau: 1, xp: 0 },
      discipline: { niveau: 1, xp: 0 }
    },
    quetes: [
      {
        id: "pompes", nom: "30 pompes", xp: 25, stat: "corps", faite: false,
        type: "series", series: 2, parSerie: "15 pompes", repos: 60
      },
      {
        id: "lecture", nom: "20 min de lecture", xp: 20, stat: "esprit", faite: false,
        type: "minuterie", duree: 1200
      },
      {
        id: "rangement", nom: "Ranger ton espace de travail", xp: 15, stat: "discipline", faite: false,
        type: "simple", enCours: "Rangement en cours"
      },
      {
        id: "seance-corps", nom: "Séance complète du jour", xp: 40, stat: "corps", faite: false,
        type: "seance",
        // Source unique des blocs dans commun.js (chargé avant etat.js).
        // DEFAUT est toujours cloné (JSON) avant usage : partager la
        // référence ici ne risque aucune mutation croisée.
        blocs: Commun.BLOCS_SEANCE
      }
    ],
    hebdo: {
      nom: "3 séances de sport complètes",
      xp: 150,
      stat: "corps",
      progres: 0,
      objectif: 3,
      lien: "seance"
    },
    quetePrincipale: {
      titre: "Transformation physique",
      description: "Devenir la meilleure version de toi-même, séance après séance.",
      niveau: 1,
      bonusXpParJalon: 150,
      terminee: false,
      jalons: [
        { nom: "Rythme installé", critere: "Deux semaines d'entraînement sans jour manqué", atteint: false, dateAtteint: null },
        { nom: "20 pompes d'affilée", critere: "Tu enchaînes 20 pompes strictes, sans pause ni genoux posés", atteint: false, dateAtteint: null },
        { nom: "Corps transformé", critere: "Deux mois de séances tenus — les progrès se voient et se mesurent", atteint: false, dateAtteint: null }
      ]
    },
    quetesAccomplies: [],
    compteurs: {
      quetesValidees: 0,       // total historique de quêtes quotidiennes validées
      critiques: 0,            // total de coups critiques obtenus
      hebdosAccomplies: 0,     // total de quêtes hebdo terminées
      meilleurStreak: 0,       // record de streak atteint (ne redescend jamais)
      streakParfait: 0,        // jours parfaits (toutes quêtes validées) consécutifs
      meilleurStreakParfait: 0 // record de streak parfait (pour les cartes brillantes)
    },
    cartesDebloquees: [],
    cartesObjectif: [],
    quetesSecondaires: [],
    chat: [],
    chatArchives: [],
    historique: {},
    // Déblocage progressif (chantier 2). DEFAUT est un état de SECOURS
    // (stockage indisponible) : il représente un joueur établi, donc
    // tout est ouvert et rien n'est en attente de révélation. Un NOUVEAU
    // joueur passe par Templates.etatNeuf, qui pose tout à false.
    debloque: {
      fichePerso: true, collection: true, hebdo: true,
      quetePrincipale: true, secondaires: true, gel: true, chat: true
    },
    revelationsVues: ["fichePerso", "collection", "hebdo", "quetePrincipale", "secondaires", "gel", "chat"],
    revelationEnAttente: null,
    dateDebut: null, // posé à aujourd'hui par la migration au 1ᵉʳ chargement
    onboardingFait: true
  };

  // Table FIGÉE des hebdos livrées par le passé (templates et anciennes
  // versions), pour deviner `lien` et `session` des états d'AVANT que
  // l'hebdo ne porte elle-même ces champs. Les clés sont des noms
  // d'affichage HISTORIQUES : ne jamais les renommer, seulement en
  // ajouter — un état ancien garde son ancien nom. Une seule table pour
  // que `lien` et `session` ne puissent plus diverger. Un nom absent ->
  // lien null (progression manuelle) et pas de session (tap +1 direct).
  // Les blocs d'une session "seance" sont posés au runtime depuis
  // commun.js (Commun.blocsSeance()), source unique de la séance.
  var HEBDOS_CONNUES = {
    "3 séances de sport complètes":               { lien: "seance", session: { type: "seance" } },
    "3 séances complètes":                        { lien: "seance", session: { type: "seance" } },
    "5 sessions de révision":                     { lien: "minuterie:esprit", session: { type: "minuterie", duree: 1500 } },
    "Lire 5 jours cette semaine":                 { lien: "minuterie:esprit", session: { type: "minuterie", duree: 1200 } },
    "4 sessions de lecture":                      { lien: "minuterie:esprit", session: { type: "minuterie", duree: 1200 } },
    "4 sessions de création":                     { lien: "minuterie:esprit", session: { type: "minuterie", duree: 2700 } },
    "5 matins maîtrisés":                         { lien: "journee" },
    "6 journées avec toutes les quêtes validées": { lien: "journee" },
    "5 jours d'action vers ton objectif":         { lien: "quete" },
    "5 quêtes accomplies dans la semaine":        { lien: "quete" },
    "5 actions concrètes pour ton business":      { session: { type: "simple", enCours: "Action en cours" } },
    "5 journées d'action pour ton projet":        { session: { type: "simple", enCours: "Action en cours" } }
  };

  // Ajoute les propriétés manquantes aux états sauvegardés par
  // d'anciennes versions, sans écraser le reste.
  // Retourne true si quelque chose a été ajouté.
  function migrer(etat) {
    var modifie = false;
    // Filet d'intégrité : un état tronqué ou corrompu peut manquer des
    // structures de base que la suite de la migration ET les écrans
    // supposent présentes (etat.quetes est lu plus bas sans garde, et
    // le changement de jour/semaine lit quetes et hebdo). On les
    // rétablit depuis DEFAUT AVANT tout le reste, pour qu'aucun accès
    // ne parte en exception et ne laisse un écran blanc.
    if (!Array.isArray(etat.quetes)) {
      etat.quetes = JSON.parse(JSON.stringify(DEFAUT.quetes));
      modifie = true;
    }
    if (!etat.hebdo || typeof etat.hebdo !== "object") {
      etat.hebdo = JSON.parse(JSON.stringify(DEFAUT.hebdo));
      modifie = true;
    }
    if (!etat.stats || typeof etat.stats !== "object") {
      etat.stats = JSON.parse(JSON.stringify(DEFAUT.stats));
      modifie = true;
    }
    if (typeof etat.niveau !== "number") { etat.niveau = 1; modifie = true; }
    if (typeof etat.xp !== "number") { etat.xp = 0; modifie = true; }
    if (typeof etat.streak !== "number") { etat.streak = 0; modifie = true; }
    if (typeof etat.dernierJour !== "string") {
      etat.dernierJour = Jour.dateDuJour();
      modifie = true;
    }
    if (typeof etat.streakValideAujourdhui !== "boolean") {
      etat.streakValideAujourdhui = false;
      modifie = true;
    }
    if (typeof etat.lundiSemaine !== "string") {
      etat.lundiSemaine = Jour.lundiDe(Jour.dateDuJour());
      modifie = true;
    }
    // Jours d'engagement (défaut lundi-vendredi) + gels. Un état existant
    // hérite de 5 jours et de 2 gels : sa série en cours n'est jamais
    // cassée (la migration tourne AVANT le changement de jour, et les
    // jours déjà refermés ne sont pas ré-évalués). On assainit les indices
    // (0-6, uniques) pour qu'un tableau corrompu ne fige pas la progression.
    if (!Array.isArray(etat.joursEngagement)) {
      etat.joursEngagement = [0, 1, 2, 3, 4];
      modifie = true;
    } else {
      var propres = [];
      etat.joursEngagement.forEach(function (j) {
        var n = parseInt(j, 10);
        if (n >= 0 && n <= 6 && propres.indexOf(n) === -1) propres.push(n);
      });
      propres.sort(function (a, b) { return a - b; });
      if (propres.length === 0) propres = [0, 1, 2, 3, 4];
      if (propres.length !== etat.joursEngagement.length ||
          propres.some(function (n, i) { return n !== etat.joursEngagement[i]; })) {
        etat.joursEngagement = propres;
        modifie = true;
      }
    }
    if (typeof etat.gels !== "number") {
      etat.gels = Jour.GELS_DEPART;
      modifie = true;
    }
    if (typeof etat.tenusSemaine !== "number") {
      etat.tenusSemaine = 0;
      modifie = true;
    }
    if (typeof etat.gelEnAttente !== "boolean") {
      etat.gelEnAttente = false;
      modifie = true;
    }
    if (!("jourExempt" in etat)) {
      etat.jourExempt = null;
      modifie = true;
    }
    // Journal des issues quotidiennes (affichage : mini-semaine + flamme
    // gelée). Un état existant démarre à vide : la semaine se remplit au
    // fil des validations, aucun historique à reconstituer.
    if (!etat.journal || typeof etat.journal !== "object" || Array.isArray(etat.journal)) {
      etat.journal = {};
      modifie = true;
    }
    if (!etat.quetePrincipale) {
      etat.quetePrincipale = JSON.parse(JSON.stringify(DEFAUT.quetePrincipale));
      modifie = true;
    }
    // Quête principale 2.0 : les étapes-compteurs deviennent des
    // jalons auto-déclarés. Les étapes accomplies sont des jalons
    // atteints, le progrès de l'étape en cours est conservé en note
    // dans le critère — rien n'est perdu, l'XP acquis ne bouge pas.
    if (etat.quetePrincipale && Array.isArray(etat.quetePrincipale.etapes)) {
      var ancienneQp = etat.quetePrincipale;
      var etapeActive = ancienneQp.etapeActive || 0;
      var jalons = ancienneQp.etapes.map(function (etape, i) {
        var atteint = i < etapeActive;
        // Les étapes issues de l'IA (chantier 2) portent déjà un
        // critère ; les étapes-compteurs en reçoivent un décrivant
        // l'ancien objectif.
        var critere = etape.critere || ("Valider " + etape.objectif + " quêtes quotidiennes");
        if (!atteint && etape.progres > 0) {
          critere += " — progrès repris : " + etape.progres + " / " + etape.objectif;
        }
        return {
          nom: etape.critere ? etape.nom : "Étape : " + etape.nom,
          critere: critere,
          atteint: atteint,
          dateAtteint: null
        };
      });
      etat.quetePrincipale = {
        titre: ancienneQp.titre,
        description: ancienneQp.description || "",
        niveau: 1,
        bonusXpParJalon: 150,
        terminee: jalons.length > 0 && jalons.every(function (j) { return j.atteint; }),
        jalons: jalons
      };
      modifie = true;
    }
    // Palmarès des quêtes principales accomplies.
    if (!Array.isArray(etat.quetesAccomplies)) {
      etat.quetesAccomplies = [];
      modifie = true;
    }
    // Historique du chat du Système (chantier 7) : conversation courante
    // + archives des conversations passées.
    if (!Array.isArray(etat.chat)) {
      etat.chat = [];
      modifie = true;
    }
    if (!Array.isArray(etat.chatArchives)) {
      etat.chatArchives = [];
      modifie = true;
    }
    // Quêtes secondaires (chantier 5) et cartes d'objectif qu'elles
    // débloquent : un état existant démarre à vide.
    if (!Array.isArray(etat.quetesSecondaires)) {
      etat.quetesSecondaires = [];
      modifie = true;
    }
    if (!Array.isArray(etat.cartesObjectif)) {
      etat.cartesObjectif = [];
      modifie = true;
    }
    // Cartes 2.0 : les cartes d'objectif portent leur origine et le
    // titre de la quête principale qui les a fait naître, pour se
    // regrouper en sections dans la collection.
    etat.cartesObjectif.forEach(function (carte) {
      if (carte.origine !== "objectif") { carte.origine = "objectif"; modifie = true; }
      if (typeof carte.origineTitre !== "string") {
        carte.origineTitre = (etat.quetePrincipale && etat.quetePrincipale.titre) || "Ton aventure";
        modifie = true;
      }
    });
    // Proposition d'hebdo hebdomadaire (chantier 4) : l'hebdo qui vient
    // de se clore et le drapeau qui déclenche la proposition sur
    // l'accueil. Un état existant n'a rien en attente.
    if (!("hebdoPrecedente" in etat)) {
      etat.hebdoPrecedente = null;
      modifie = true;
    }
    if (typeof etat.propositionHebdoAttendue !== "boolean") {
      etat.propositionHebdoAttendue = false;
      modifie = true;
    }
    if (!etat.compteurs) {
      etat.compteurs = {
        quetesValidees: 0,
        critiques: 0,
        hebdosAccomplies: 0,
        // le record démarre au streak en cours, pour rester honnête
        meilleurStreak: etat.streak || 0
      };
      modifie = true;
    }
    // Streak parfait (chantier 6) : jours parfaits consécutifs, pour la
    // version brillante des cartes. Un état existant démarre à zéro : on
    // ne peut pas reconstituer l'historique de perfection.
    if (typeof etat.compteurs.streakParfait !== "number") {
      etat.compteurs.streakParfait = 0;
      modifie = true;
    }
    if (typeof etat.compteurs.meilleurStreakParfait !== "number") {
      etat.compteurs.meilleurStreakParfait = 0;
      modifie = true;
    }
    if (!Array.isArray(etat.cartesDebloquees)) {
      etat.cartesDebloquees = [];
      modifie = true;
    }
    // Cartes 2.0 : cartesDebloquees passe d'une liste d'ids (strings) à
    // une liste de { id, niveau, brillante }. "Marathonien" (streak 30)
    // devient le palier 2 de "Semaine de fer" : un joueur qui l'avait
    // garde son niveau. verifier() recalculera ensuite les niveaux réels
    // d'après les compteurs.
    if (etat.cartesDebloquees.length && typeof etat.cartesDebloquees[0] === "string") {
      var avaitMarathonien = etat.cartesDebloquees.indexOf("marathonien") !== -1;
      var converties = [];
      etat.cartesDebloquees.forEach(function (id) {
        if (id === "marathonien") return; // fusionnée
        converties.push({ id: id, niveau: 1, brillante: false });
      });
      if (avaitMarathonien) {
        var sf = null;
        converties.forEach(function (c) { if (c.id === "semaine-de-fer") sf = c; });
        if (!sf) {
          sf = { id: "semaine-de-fer", niveau: 1, brillante: false };
          converties.push(sf);
        }
        sf.niveau = Math.max(sf.niveau, 2);
      }
      etat.cartesDebloquees = converties;
      modifie = true;
    }
    // Les états d'avant l'onboarding sont considérés comme l'ayant
    // fait : seul un état neuf (ou remis à false en debug) y passe.
    if (typeof etat.onboardingFait !== "boolean") {
      etat.onboardingFait = true;
      modifie = true;
    }
    // Historique de progression : XP total gagné par jour ("YYYY-MM-DD").
    if (!etat.historique || typeof etat.historique !== "object" || Array.isArray(etat.historique)) {
      etat.historique = {};
      modifie = true;
    }
    // Lien de progression automatique de l'hebdo : déduit du nom si
    // l'hebdo vient d'un template connu (noms actuels et historiques),
    // sinon null (progression manuelle) — une hebdo personnalisée ne
    // se met pas à avancer toute seule.
    if (etat.hebdo && !("lien" in etat.hebdo)) {
      var connueLien = HEBDOS_CONNUES[etat.hebdo.nom];
      etat.hebdo.lien = (connueLien && "lien" in connueLien) ? connueLien.lien : null;
      modifie = true;
    }
    // Session guidée de l'hebdo : le tap sur la carte traverse une
    // vraie session (séance en blocs, minuterie, action) au lieu d'un
    // simple +1. Déduite du nom si l'hebdo vient d'un template connu,
    // sinon null (tap direct conservé).
    if (etat.hebdo && !("session" in etat.hebdo)) {
      var connueSession = HEBDOS_CONNUES[etat.hebdo.nom];
      var sessionConnue = (connueSession && connueSession.session)
        ? JSON.parse(JSON.stringify(connueSession.session))
        : null;
      // La séance reprend les blocs de la séance par défaut, source
      // unique dans commun.js.
      if (sessionConnue && sessionConnue.type === "seance") {
        sessionConnue.blocs = Commun.blocsSeance();
      }
      etat.hebdo.session = sessionConnue;
      modifie = true;
    }
    // Contexte d'objectif pour les appels IA : la phrase d'objectif du
    // joueur. Pour les états d'avant : le titre de la quête principale
    // en fait office.
    if (typeof etat.objectifTexte !== "string") {
      etat.objectifTexte = (etat.quetePrincipale && etat.quetePrincipale.titre) || "";
      modifie = true;
    }
    // La séance guidée par défaut, ajoutée UNE seule fois aux états
    // existants : le marqueur évite qu'elle ressuscite si le joueur
    // la supprime ensuite dans l'éditeur.
    if (!etat.seanceParDefautAjoutee) {
      var dejaPresente = etat.quetes.some(function (q) { return q.id === "seance-corps"; });
      if (!dejaPresente) {
        for (var j = 0; j < DEFAUT.quetes.length; j++) {
          if (DEFAUT.quetes[j].id === "seance-corps") {
            etat.quetes.push(JSON.parse(JSON.stringify(DEFAUT.quetes[j])));
          }
        }
      }
      etat.seanceParDefautAjoutee = true;
      modifie = true;
    }
    // Textes explicatifs des blocs de séance, ajoutés après coup :
    // on complète les états qui ont la séance sans les explications.
    var seanceDefaut = null;
    for (var k = 0; k < DEFAUT.quetes.length; k++) {
      if (DEFAUT.quetes[k].id === "seance-corps") seanceDefaut = DEFAUT.quetes[k];
    }
    etat.quetes.forEach(function (quete) {
      if (quete.id !== "seance-corps" || !Array.isArray(quete.blocs) || !seanceDefaut) return;
      quete.blocs.forEach(function (bloc, i) {
        var defautBloc = seanceDefaut.blocs[i];
        if (!bloc.explication && defautBloc && defautBloc.nom === bloc.nom && defautBloc.explication) {
          bloc.explication = defautBloc.explication;
          modifie = true;
        }
      });
    });
    // Types de quêtes (mode Session) : on complète depuis les définitions
    // par défaut via l'id, sans toucher à faite / xpDonne.
    etat.quetes.forEach(function (quete) {
      var defaut = null;
      for (var i = 0; i < DEFAUT.quetes.length; i++) {
        if (DEFAUT.quetes[i].id === quete.id) defaut = DEFAUT.quetes[i];
      }
      if (!quete.type) {
        if (defaut) {
          quete.type = defaut.type;
          if (defaut.duree !== undefined) quete.duree = defaut.duree;
          if (defaut.series !== undefined) quete.series = defaut.series;
          if (defaut.parSerie !== undefined) quete.parSerie = defaut.parSerie;
          if (defaut.repos !== undefined) quete.repos = defaut.repos;
        } else {
          quete.type = "simple";
        }
        modifie = true;
      }
      // Phrase d'activité des quêtes simples ("Rangement en cours").
      if (quete.type === "simple" && !quete.enCours && defaut && defaut.enCours) {
        quete.enCours = defaut.enCours;
        modifie = true;
      }
    });
    // Chantier 2 : déblocage progressif. Un état SANS `debloque` a été
    // sauvegardé avant ce chantier : c'est un joueur EXISTANT, tout lui
    // est déjà ouvert et AUCUNE révélation ne se joue rétroactivement.
    // Un état neuf (Templates.etatNeuf) porte déjà son `debloque` (tout
    // à false) : on n'y touche pas.
    if (!etat.debloque || typeof etat.debloque !== "object" || Array.isArray(etat.debloque)) {
      etat.debloque = {
        fichePerso: true, collection: true, hebdo: true,
        quetePrincipale: true, secondaires: true, gel: true, chat: true
      };
      etat.revelationsVues = Object.keys(etat.debloque); // toutes déjà vues
      etat.revelationEnAttente = null;
      modifie = true;
    }
    // Filets si `debloque` existe mais que ses compagnons manquent.
    if (!Array.isArray(etat.revelationsVues)) { etat.revelationsVues = []; modifie = true; }
    if (!("revelationEnAttente" in etat)) { etat.revelationEnAttente = null; modifie = true; }
    // Date de début de jeu (compte des jours de jeu). Absente (joueur
    // existant ou état neuf) => aujourd'hui, calée sur dernierJour déjà
    // synchronisé plus haut dans la migration.
    if (typeof etat.dateDebut !== "string") {
      etat.dateDebut = etat.dernierJour || Jour.dateDuJour();
      modifie = true;
    }
    return modifie;
  }

  // Nouvelle session d'app = nouveau chat. Le marqueur vit dans
  // sessionStorage : conservé tant que l'app reste ouverte (y compris en
  // naviguant entre les écrans), effacé à la vraie fermeture. À la
  // première ouverture d'une session, la conversation courante — si elle
  // n'est pas vide — rejoint les archives, et le chat repart vierge.
  function rotationSessionChat(etat) {
    var nouvelleSession;
    try {
      nouvelleSession = !sessionStorage.getItem("life-rpg-session-chat");
      if (nouvelleSession) sessionStorage.setItem("life-rpg-session-chat", "1");
    } catch (e) {
      return false; // sessionStorage indisponible : on ne casse rien.
    }
    if (!nouvelleSession) return false;
    if (!Array.isArray(etat.chat) || etat.chat.length === 0) return false;

    if (!Array.isArray(etat.chatArchives)) etat.chatArchives = [];
    etat.chatArchives.push({
      date: etat.dernierJour || Jour.dateDuJour(),
      messages: etat.chat
    });
    // On ne garde que les 20 dernières conversations.
    if (etat.chatArchives.length > 20) {
      etat.chatArchives = etat.chatArchives.slice(-20);
    }
    etat.chat = [];
    return true;
  }

  function charger() {
    var etat = null;
    try {
      var brut = localStorage.getItem(CLE);
      if (brut) etat = JSON.parse(brut);
    } catch (e) {
      // Stockage indisponible ou corrompu : on repart de l'état par défaut.
    }
    // Un JSON valide mais non-objet (tableau, nombre, null) ne peut pas
    // servir d'état : on repart proprement.
    if (!etat || typeof etat !== "object" || Array.isArray(etat)) {
      etat = JSON.parse(JSON.stringify(DEFAUT));
    }

    // migrer() a un filet interne, mais on ceinture aussi ici : si un
    // état trop corrompu la faisait malgré tout échouer, on repart de
    // DEFAUT plutôt que de laisser l'exception blanchir tous les écrans.
    var aMigre;
    try {
      aMigre = migrer(etat);
    } catch (e) {
      etat = JSON.parse(JSON.stringify(DEFAUT));
      aMigre = migrer(etat);
    }
    var nouvelleSessionChat = rotationSessionChat(etat);
    var aujourdhui = Jour.dateDuJour();
    var nouveauJour = Jour.appliquerNouveauJour(etat, aujourdhui);
    var nouvelleSemaine = Jour.appliquerNouvelleSemaine(etat, aujourdhui);
    // Cartes dont la condition est déjà vraie au chargement (migration,
    // niveaux à recalculer, progression sur un autre appareil...).
    // Au chargement on ne révèle rien : on persiste seulement l'évolution.
    var evo = Cartes.verifier(etat);
    var aEvolue = evo.nouvelles.length > 0 || evo.montees.length > 0 || evo.brillantes.length > 0;
    if (aMigre || nouvelleSessionChat || nouveauJour || nouvelleSemaine || aEvolue) {
      sauvegarder(etat);
    }
    return etat;
  }

  function sauvegarder(etat) {
    try {
      localStorage.setItem(CLE, JSON.stringify(etat));
    } catch (e) {
      // Stockage indisponible : l'état reste valable pour la session en cours.
    }
    // Signal découplé : notifications.js (s'il est chargé) resynchronise
    // ses drapeaux push. Aucun couplage dur — l'absence d'écouteur est sans effet.
    try { window.dispatchEvent(new CustomEvent("life-rpg-etat-sauve")); } catch (e) {}
  }

  function reinitialiser() {
    try {
      localStorage.removeItem(CLE);
    } catch (e) {}
    return JSON.parse(JSON.stringify(DEFAUT));
  }

  // Écrit un état brut (import de sauvegarde) sans le migrer :
  // la migration s'applique au prochain charger(), comme pour
  // n'importe quel état ancien.
  function remplacer(etatBrut) {
    try {
      localStorage.setItem(CLE, JSON.stringify(etatBrut));
    } catch (e) {}
  }

  return {
    charger: charger,
    sauvegarder: sauvegarder,
    reinitialiser: reinitialiser,
    remplacer: remplacer
  };
})();

// Outils de test accessibles en console.
var LifeRpgDebug = {
  // Recule dernierJour d'un jour et recharge : au rechargement,
  // l'app croit qu'un nouveau jour a commencé.
  simulerNouveauJour: function () {
    var etat = Etat.charger();
    etat.dernierJour = Jour.decalerDate(etat.dernierJour, -1);
    Etat.sauvegarder(etat);
    location.reload();
  },
  // Recule lundiSemaine d'une semaine : au rechargement,
  // l'app croit qu'une nouvelle semaine a commencé.
  simulerNouvelleSemaine: function () {
    var etat = Etat.charger();
    etat.lundiSemaine = Jour.decalerDate(etat.lundiSemaine, -7);
    Etat.sauvegarder(etat);
    location.reload();
  },
  // Divise les durées de session par 60 (20 min -> 20 s) pour tester
  // sans attendre. Flag en mémoire seulement, jamais persisté.
  accelererSessions: function (actif) {
    if (typeof Session !== "undefined") {
      Session.reglerAcceleration(actif !== false);
    }
  },
  // Joue la séquence de montée de rang sans grinder : du rang actuel
  // vers le suivant (ou, au sommet, rejoue la dernière transition).
  simulerMonteeDeRang: function () {
    var etat = Etat.charger();
    var info = Regles.rang(etat.niveau);
    var paliers = Aura.PALIERS;
    var idx = paliers.indexOf(info.actuel);
    var ancienne, nouvelle;
    if (info.suivant) {
      ancienne = info.actuel.cle;
      nouvelle = info.suivant.cle;
    } else {
      ancienne = paliers[Math.max(0, idx - 1)].cle;
      nouvelle = info.actuel.cle;
    }
    Aura.monterRang(ancienne, nouvelle);
  },
  // Pousse le niveau global à une valeur donnée (XP remis à 0 sur le
  // palier) et recharge : pour vérifier l'affichage du rang, des étoiles
  // de S et de "Nation" sans grinder. Ex : LifeRpgDebug.pousserNiveau(90).
  pousserNiveau: function (niveau) {
    var etat = Etat.charger();
    etat.niveau = Math.max(1, Math.round(niveau) || 1);
    etat.xp = 0;
    Etat.sauvegarder(etat);
    location.reload();
  },
  // Rejoue la cinématique de déblocage d'une feature depuis l'accueil.
  // Ex : LifeRpgDebug.jouerCinematique("fichePerso"). Sans argument (ou
  // id inconnu), liste les features disponibles.
  jouerCinematique: function (id) {
    var etat = Etat.charger();
    if (!etat.debloque) return;
    if (!id || !(id in etat.debloque)) {
      console.log("Features : " + Object.keys(etat.debloque).join(", "));
      return;
    }
    etat.debloque[id] = true;
    if (id === "chat" && etat.niveau < 10) etat.niveau = 10; // le chat exige le rang D
    if (Array.isArray(etat.revelationsVues)) {
      etat.revelationsVues = etat.revelationsVues.filter(function (v) { return v !== id; });
    }
    etat.revelationEnAttente = id;
    Etat.sauvegarder(etat);
    location.href = "index.html"; // toutes les cinématiques démarrent ici
  },
  // Débloque TOUT (features + onglets) SANS jouer aucune cinématique :
  // toutes les révélations sont marquées vues. Pour explorer l'app entière.
  toutDebloquer: function () {
    var etat = Etat.charger();
    if (!etat.debloque) return;
    Object.keys(etat.debloque).forEach(function (k) { etat.debloque[k] = true; });
    etat.revelationsVues = Object.keys(etat.debloque);
    etat.revelationEnAttente = null;
    Etat.sauvegarder(etat);
    location.reload();
  },
  // Re-verrouille tout (compte neuf) pour revivre le déblocage progressif :
  // aucune feature ouverte, aucune révélation vue.
  reverrouiller: function () {
    var etat = Etat.charger();
    if (!etat.debloque) return;
    Object.keys(etat.debloque).forEach(function (k) { etat.debloque[k] = false; });
    etat.revelationsVues = [];
    etat.revelationEnAttente = null;
    Etat.sauvegarder(etat);
    location.href = "index.html";
  },
  // Débloque toutes les cartes à leur niveau maximum, la première
  // brillante, pour vérifier le rendu des raretés, niveaux et reflets.
  debloquerToutesLesCartes: function () {
    var etat = Etat.charger();
    Cartes.liste().forEach(function (carte) {
      var ent = Cartes.entree(etat, carte.id);
      var niveauMax = Cartes.nbPaliers(carte);
      if (!ent) {
        etat.cartesDebloquees.push({
          id: carte.id, niveau: niveauMax,
          brillante: Boolean(carte.brillante)
        });
      } else {
        ent.niveau = niveauMax;
        if (carte.brillante) ent.brillante = true;
      }
    });
    Etat.sauvegarder(etat);
    location.reload();
  },
  reinitialiser: function () {
    Etat.reinitialiser();
    location.reload();
  },
  // Rejoue l'onboarding avec le personnage actuel : remet juste le
  // flag, la garde redirige au rechargement. Terminer le parcours
  // recrée un état neuf.
  relancerOnboarding: function () {
    var etat = Etat.charger();
    etat.onboardingFait = false;
    Etat.sauvegarder(etat);
    location.href = "onboarding.html";
  },
  // Vrai premier lancement : efface tout et repart de zéro.
  nouveauJoueur: function () {
    try {
      localStorage.removeItem("life-rpg-etat-v1");
    } catch (e) {}
    location.href = "onboarding.html";
  }
};
