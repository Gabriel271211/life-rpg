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
        blocs: [
          { nom: "Échauffement", detail: "Mobilité articulaire", duree: 120,
            explication: "Cercles de bras, rotations du bassin, montées de genoux : réveille chaque articulation en douceur." },
          { nom: "Pompes", detail: "15 répétitions",
            explication: "Mains sous les épaules, corps bien gainé : descends la poitrine près du sol, remonte sans cambrer." },
          { nom: "Repos", duree: 60, repos: true },
          { nom: "Squats", detail: "20 répétitions",
            explication: "Pieds largeur d'épaules, dos droit : descends comme pour t'asseoir, talons au sol." },
          { nom: "Repos", duree: 60, repos: true },
          { nom: "Gainage", detail: "Tiens la position", duree: 45,
            explication: "En appui sur les avant-bras, corps aligné des épaules aux talons : ne laisse pas le bassin tomber." },
          { nom: "Repos", duree: 60, repos: true },
          { nom: "Pompes", detail: "12 répétitions",
            explication: "Même consigne que la première série : amplitude complète, rythme régulier." },
          { nom: "Étirements", detail: "Retour au calme", duree: 90,
            explication: "Respire profondément et étire chaque groupe musculaire travaillé, sans à-coups." }
        ]
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
      quetesValidees: 0,   // total historique de quêtes quotidiennes validées
      critiques: 0,        // total de coups critiques obtenus
      hebdosAccomplies: 0, // total de quêtes hebdo terminées
      meilleurStreak: 0    // record de streak atteint (ne redescend jamais)
    },
    cartesDebloquees: [],
    cartesObjectif: [],
    quetesSecondaires: [],
    historique: {},
    onboardingFait: true
  };

  // Ajoute les propriétés manquantes aux états sauvegardés par
  // d'anciennes versions, sans écraser le reste.
  // Retourne true si quelque chose a été ajouté.
  function migrer(etat) {
    var modifie = false;
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
    if (!Array.isArray(etat.cartesDebloquees)) {
      etat.cartesDebloquees = [];
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
      var LIENS_CONNUS = {
        "3 séances de sport complètes": "seance",
        "3 séances complètes": "seance",
        "5 sessions de révision": "minuterie:esprit",
        "Lire 5 jours cette semaine": "minuterie:esprit",
        "4 sessions de lecture": "minuterie:esprit",
        "4 sessions de création": "minuterie:esprit",
        "5 matins maîtrisés": "journee",
        "6 journées avec toutes les quêtes validées": "journee",
        "5 jours d'action vers ton objectif": "quete",
        "5 quêtes accomplies dans la semaine": "quete"
      };
      etat.hebdo.lien = Object.prototype.hasOwnProperty.call(LIENS_CONNUS, etat.hebdo.nom)
        ? LIENS_CONNUS[etat.hebdo.nom]
        : null;
      modifie = true;
    }
    // Session guidée de l'hebdo : le tap sur la carte traverse une
    // vraie session (séance en blocs, minuterie, action) au lieu d'un
    // simple +1. Déduite du nom si l'hebdo vient d'un template connu,
    // sinon null (tap direct conservé).
    if (etat.hebdo && !("session" in etat.hebdo)) {
      var SESSIONS_CONNUES = {
        "3 séances de sport complètes": { type: "seance" },
        "3 séances complètes": { type: "seance" },
        "5 sessions de révision": { type: "minuterie", duree: 1500 },
        "Lire 5 jours cette semaine": { type: "minuterie", duree: 1200 },
        "4 sessions de lecture": { type: "minuterie", duree: 1200 },
        "4 sessions de création": { type: "minuterie", duree: 2700 },
        "5 actions concrètes pour ton business": { type: "simple", enCours: "Action en cours" },
        "5 journées d'action pour ton projet": { type: "simple", enCours: "Action en cours" }
      };
      var sessionConnue = SESSIONS_CONNUES[etat.hebdo.nom] || null;
      if (sessionConnue) {
        sessionConnue = JSON.parse(JSON.stringify(sessionConnue));
        // La séance reprend les blocs de la séance par défaut,
        // référence des migrations.
        if (sessionConnue.type === "seance") {
          for (var s = 0; s < DEFAUT.quetes.length; s++) {
            if (DEFAUT.quetes[s].id === "seance-corps") {
              sessionConnue.blocs = JSON.parse(JSON.stringify(DEFAUT.quetes[s].blocs));
            }
          }
        }
      }
      etat.hebdo.session = sessionConnue;
      modifie = true;
    }
    // Contexte d'objectif pour les appels IA : la phrase d'objectif du
    // joueur et ses réponses d'onboarding (deadline, temps, niveau).
    // Pour les états d'avant : le titre de la quête principale fait
    // office d'objectif, les réponses restent inconnues (null).
    if (typeof etat.objectifTexte !== "string") {
      etat.objectifTexte = (etat.quetePrincipale && etat.quetePrincipale.titre) || "";
      modifie = true;
    }
    if (!("reponsesOnboarding" in etat)) {
      etat.reponsesOnboarding = null;
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
    return modifie;
  }

  function charger() {
    var etat = null;
    try {
      var brut = localStorage.getItem(CLE);
      if (brut) etat = JSON.parse(brut);
    } catch (e) {
      // Stockage indisponible ou corrompu : on repart de l'état par défaut.
    }
    if (!etat) etat = JSON.parse(JSON.stringify(DEFAUT));

    var aMigre = migrer(etat);
    var aujourdhui = Jour.dateDuJour();
    var nouveauJour = Jour.appliquerNouveauJour(etat, aujourdhui);
    var nouvelleSemaine = Jour.appliquerNouvelleSemaine(etat, aujourdhui);
    // Cartes dont la condition est déjà vraie au chargement
    // (migration, progression sur un autre appareil...).
    var nouvellesCartes = Cartes.verifier(etat);
    if (aMigre || nouveauJour || nouvelleSemaine || nouvellesCartes.length > 0) {
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
  // Joue la séquence de montée de rang sans grinder : du rang
  // actuel vers le suivant (ou A -> S si le sommet est atteint).
  simulerMonteeDeRang: function () {
    var etat = Etat.charger();
    var info = Regles.rang(etat.niveau);
    var ancienne = info.actuel.lettre;
    var nouvelle = info.suivant ? info.suivant.lettre : "S";
    if (!info.suivant) ancienne = "A";
    Aura.monterRang(ancienne, nouvelle);
  },
  // Débloque toutes les cartes pour vérifier le rendu des raretés.
  debloquerToutesLesCartes: function () {
    var etat = Etat.charger();
    Cartes.liste().forEach(function (carte) {
      if (etat.cartesDebloquees.indexOf(carte.id) === -1) {
        etat.cartesDebloquees.push(carte.id);
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
