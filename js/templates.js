// ============================================
// LIFE RPG — templates.js
// Templates d'objectif : les six voies proposées
// à l'onboarding, plus l'objectif personnalisé.
// Données et fonctions pures — aucun accès au
// DOM ni au localStorage ici.
// ============================================

var Templates = (function () {

  // Étapes génériques, partagées par l'objectif personnalisé.
  var ETAPES_GENERIQUES = [
    { nom: "Fondations", objectif: 15, bonusXp: 200 },
    { nom: "Régularité", objectif: 40, bonusXp: 400 },
    { nom: "Dépassement", objectif: 80, bonusXp: 800 }
  ];

  var LISTE = [
    {
      id: "sport",
      nom: "Sport & forme",
      classe: "Athlète",
      description: "Forger ton corps, séance après séance.",
      quetePrincipale: {
        titre: "Transformation physique",
        description: "Devenir la meilleure version de toi-même, séance après séance.",
        etapes: [
          { nom: "Fondations", objectif: 15, bonusXp: 200 },
          { nom: "Régularité", objectif: 40, bonusXp: 400 },
          { nom: "Dépassement", objectif: 80, bonusXp: 800 }
        ]
      },
      quetesQuotidiennes: [
        {
          id: "seance-corps", nom: "Séance complète du jour", xp: 40, stat: "corps",
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
        },
        {
          id: "sport-pompes", nom: "30 pompes", xp: 25, stat: "corps",
          type: "series", series: 2, parSerie: "15 pompes", repos: 60
        },
        {
          id: "sport-etirements", nom: "10 min d'étirements", xp: 15, stat: "corps",
          type: "minuterie", duree: 600
        }
      ],
      hebdo: { nom: "3 séances de sport complètes", xp: 150, stat: "corps", objectif: 3 }
    },
    {
      id: "etudes",
      nom: "Études & savoir",
      classe: "Érudit",
      description: "Étendre ton savoir, session après session.",
      quetePrincipale: {
        titre: "L'ascension du savoir",
        description: "Bâtir une connaissance solide, une session de travail à la fois.",
        etapes: [
          { nom: "Premiers chapitres", objectif: 15, bonusXp: 200 },
          { nom: "Rythme d'étude", objectif: 40, bonusXp: 400 },
          { nom: "Maîtrise", objectif: 80, bonusXp: 800 }
        ]
      },
      quetesQuotidiennes: [
        {
          id: "etudes-revision", nom: "25 min de révision", xp: 25, stat: "esprit",
          type: "minuterie", duree: 1500
        },
        {
          id: "etudes-profond", nom: "45 min de travail profond", xp: 35, stat: "esprit",
          type: "minuterie", duree: 2700
        },
        {
          id: "etudes-plan", nom: "Préparer ton plan de révision", xp: 10, stat: "discipline",
          type: "simple", enCours: "Planification en cours"
        }
      ],
      hebdo: { nom: "5 sessions de révision", xp: 150, stat: "esprit", objectif: 5 }
    },
    {
      id: "business",
      nom: "Business",
      classe: "Entrepreneur",
      description: "Bâtir ton projet, une action concrète à la fois.",
      quetePrincipale: {
        titre: "Bâtisseur d'empire",
        description: "Faire exister ton projet par des actions concrètes, jour après jour.",
        etapes: [
          { nom: "Mise en route", objectif: 15, bonusXp: 200 },
          { nom: "Traction", objectif: 40, bonusXp: 400 },
          { nom: "Expansion", objectif: 80, bonusXp: 800 }
        ]
      },
      quetesQuotidiennes: [
        {
          id: "business-prospection", nom: "Contacter un prospect ou un partenaire", xp: 25, stat: "discipline",
          type: "simple", enCours: "Prospection en cours"
        },
        {
          id: "business-apprentissage", nom: "30 min d'apprentissage business", xp: 20, stat: "esprit",
          type: "minuterie", duree: 1800
        },
        {
          id: "business-creation", nom: "45 min de travail sur ton projet", xp: 35, stat: "discipline",
          type: "minuterie", duree: 2700
        }
      ],
      hebdo: { nom: "5 journées d'action pour ton projet", xp: 200, stat: "discipline", objectif: 5 }
    },
    {
      id: "lecture",
      nom: "Lecture",
      classe: "Sage",
      description: "Nourrir ton esprit, page après page.",
      quetePrincipale: {
        titre: "La voie du sage",
        description: "Lire chaque jour, et laisser les livres t'élever.",
        etapes: [
          { nom: "Premières pages", objectif: 15, bonusXp: 200 },
          { nom: "Lecteur assidu", objectif: 40, bonusXp: 400 },
          { nom: "Bibliothèque vivante", objectif: 80, bonusXp: 800 }
        ]
      },
      quetesQuotidiennes: [
        {
          id: "lecture-session", nom: "20 min de lecture", xp: 20, stat: "esprit",
          type: "minuterie", duree: 1200
        },
        {
          id: "lecture-note", nom: "Noter une idée marquante", xp: 10, stat: "esprit",
          type: "simple", enCours: "Prise de notes en cours"
        }
      ],
      hebdo: { nom: "Lire 5 jours cette semaine", xp: 150, stat: "esprit", objectif: 5 }
    },
    {
      id: "discipline",
      nom: "Discipline de vie",
      classe: "Stratège",
      description: "Reprendre le contrôle de tes journées.",
      quetePrincipale: {
        titre: "Maître de tes journées",
        description: "L'ordre d'abord : lever, espace net, journée planifiée.",
        etapes: [
          { nom: "Reprise en main", objectif: 15, bonusXp: 200 },
          { nom: "Routine tenue", objectif: 40, bonusXp: 400 },
          { nom: "Contrôle total", objectif: 80, bonusXp: 800 }
        ]
      },
      quetesQuotidiennes: [
        {
          id: "discipline-reveil", nom: "Lever sans repousser le réveil", xp: 20, stat: "discipline",
          type: "simple", enCours: "Mise en route de la journée"
        },
        {
          id: "discipline-rangement", nom: "10 min de rangement", xp: 15, stat: "discipline",
          type: "minuterie", duree: 600
        },
        {
          id: "discipline-plan", nom: "Planifier ta journée de demain", xp: 15, stat: "esprit",
          type: "simple", enCours: "Planification en cours"
        }
      ],
      hebdo: { nom: "5 matins maîtrisés", xp: 150, stat: "discipline", objectif: 5 }
    },
    {
      id: "creation",
      nom: "Création",
      classe: "Créateur",
      description: "Donner forme à ce qui n'existe pas encore.",
      quetePrincipale: {
        titre: "L'œuvre en devenir",
        description: "Créer chaque jour, et laisser l'œuvre prendre forme.",
        etapes: [
          { nom: "Esquisses", objectif: 15, bonusXp: 200 },
          { nom: "Atelier régulier", objectif: 40, bonusXp: 400 },
          { nom: "Œuvre accomplie", objectif: 80, bonusXp: 800 }
        ]
      },
      quetesQuotidiennes: [
        {
          id: "creation-session", nom: "45 min de création", xp: 35, stat: "esprit",
          type: "minuterie", duree: 2700
        },
        {
          id: "creation-idees", nom: "Noter trois idées nouvelles", xp: 10, stat: "esprit",
          type: "simple", enCours: "Idéation en cours"
        },
        {
          id: "creation-espace", nom: "Préparer ton espace de création", xp: 10, stat: "discipline",
          type: "simple", enCours: "Préparation en cours"
        }
      ],
      hebdo: { nom: "4 sessions de création", xp: 150, stat: "esprit", objectif: 4 }
    }
  ];

  function copier(objet) {
    return JSON.parse(JSON.stringify(objet));
  }

  function liste() {
    return LISTE;
  }

  function parId(id) {
    for (var i = 0; i < LISTE.length; i++) {
      if (LISTE[i].id === id) return LISTE[i];
    }
    return null;
  }

  // Objectif personnalisé : le joueur écrit sa quête (max 80
  // caractères), la structure reste générique et neutre.
  function personnalise(objectif) {
    objectif = String(objectif || "").trim().slice(0, 80);
    return {
      id: "personnalise",
      nom: objectif,
      classe: "Aventurier",
      description: "Ta voie, tracée par toi seul.",
      quetePrincipale: {
        titre: objectif,
        description: "Ta quête, tes règles : avance un peu chaque jour.",
        etapes: copier(ETAPES_GENERIQUES)
      },
      quetesQuotidiennes: [
        {
          id: "perso-corps", nom: "20 min de mouvement", xp: 20, stat: "corps",
          type: "minuterie", duree: 1200
        },
        {
          id: "perso-esprit", nom: "20 min d'apprentissage", xp: 20, stat: "esprit",
          type: "minuterie", duree: 1200
        },
        {
          id: "perso-discipline", nom: "Préparer ta journée", xp: 15, stat: "discipline",
          type: "simple", enCours: "Préparation en cours"
        }
      ],
      hebdo: { nom: "5 jours d'action vers ton objectif", xp: 150, stat: "discipline", objectif: 5 }
    };
  }

  // ----- Copies prêtes à poser dans l'état -----

  function quetePrincipaleDe(template) {
    var qp = copier(template.quetePrincipale);
    qp.etapeActive = 0;
    qp.etapes.forEach(function (etape) { etape.progres = 0; });
    return qp;
  }

  function quetesDe(template) {
    var quetes = copier(template.quetesQuotidiennes);
    quetes.forEach(function (quete) { quete.faite = false; });
    return quetes;
  }

  function hebdoDe(template) {
    var hebdo = copier(template.hebdo);
    hebdo.progres = 0;
    return hebdo;
  }

  // État complet d'un nouveau joueur, créé à la fin de l'onboarding.
  // dernierJour et lundiSemaine restent null : la migration les pose
  // à la date du jour au premier chargement, comme pour tout état.
  function etatNeuf(nom, template) {
    return {
      nom: String(nom || "").trim().slice(0, 20),
      classe: template.classe,
      niveau: 1,
      xp: 0,
      streak: 0,
      streakValideAujourdhui: false,
      dernierJour: null,
      lundiSemaine: null,
      stats: {
        corps: { niveau: 1, xp: 0 },
        esprit: { niveau: 1, xp: 0 },
        discipline: { niveau: 1, xp: 0 }
      },
      quetes: quetesDe(template),
      hebdo: hebdoDe(template),
      quetePrincipale: quetePrincipaleDe(template),
      compteurs: {
        quetesValidees: 0,
        critiques: 0,
        hebdosAccomplies: 0,
        meilleurStreak: 0
      },
      cartesDebloquees: [],
      historique: {},
      // Marqueurs de migration : un état neuf n'a rien à rattraper.
      seanceParDefautAjoutee: true,
      onboardingFait: true
    };
  }

  return {
    liste: liste,
    parId: parId,
    personnalise: personnalise,
    quetePrincipaleDe: quetePrincipaleDe,
    quetesDe: quetesDe,
    hebdoDe: hebdoDe,
    etatNeuf: etatNeuf
  };
})();
