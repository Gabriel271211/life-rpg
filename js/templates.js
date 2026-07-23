// ============================================
// LIFE RPG — templates.js
// Templates d'objectif : les six voies proposées
// à l'onboarding, plus l'objectif personnalisé.
// Données et fonctions pures — aucun accès au
// DOM ni au localStorage ici.
// ============================================

var Templates = (function () {

  // Jalons génériques, partagés par l'objectif personnalisé : des
  // accomplissements concrets et auto-vérifiables, sans compteur.
  var JALONS_GENERIQUES = [
    { nom: "Fondations", critere: "Le premier pas concret vers ton objectif est accompli" },
    { nom: "Régularité", critere: "Deux semaines d'actions quotidiennes sans abandonner" },
    { nom: "Dépassement", critere: "Un résultat visible que tu ne pouvais pas atteindre au départ" }
  ];

  // La séance guidée du template Sport, partagée entre la quête
  // quotidienne et la session de l'hebdo. Toujours copiée avant
  // d'entrer dans l'état (quetesDe / hebdoDe).
  var BLOCS_SEANCE = [
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
        jalons: [
          { nom: "Rythme installé", critere: "Deux semaines d'entraînement sans jour manqué" },
          { nom: "20 pompes d'affilée", critere: "Tu enchaînes 20 pompes strictes, sans pause ni genoux posés" },
          { nom: "Endurance prouvée", critere: "Tu tiens 30 minutes d'effort continu sans t'arrêter" },
          { nom: "Corps transformé", critere: "Deux mois de séances tenus — les progrès se voient et se mesurent" }
        ]
      },
      quetesQuotidiennes: [
        {
          id: "seance-corps", nom: "Séance complète du jour", xp: 40, stat: "corps",
          type: "seance",
          blocs: BLOCS_SEANCE
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
      hebdo: {
        nom: "3 séances complètes", xp: 150, stat: "corps", objectif: 3, lien: "seance",
        session: { type: "seance", blocs: BLOCS_SEANCE }
      }
    },
    {
      id: "etudes",
      nom: "Études & savoir",
      classe: "Érudit",
      description: "Étendre ton savoir, session après session.",
      quetePrincipale: {
        titre: "L'ascension du savoir",
        description: "Bâtir une connaissance solide, une session de travail à la fois.",
        jalons: [
          { nom: "Système de travail posé", critere: "Ton planning de révision est écrit et ton espace de travail prêt" },
          { nom: "Première matière maîtrisée", critere: "Un chapitre entier expliqué à voix haute, sans tes notes" },
          { nom: "Régularité prouvée", critere: "Trois semaines de sessions de travail sans interruption" },
          { nom: "Examen blanc réussi", critere: "Un test complet en conditions réelles, au score que tu visais" }
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
      hebdo: {
        nom: "5 sessions de révision", xp: 150, stat: "esprit", objectif: 5, lien: "minuterie:esprit",
        session: { type: "minuterie", duree: 1500 }
      }
    },
    {
      id: "business",
      nom: "Business",
      classe: "Entrepreneur",
      description: "Bâtir ton projet, une action concrète à la fois.",
      quetePrincipale: {
        titre: "Bâtisseur d'empire",
        description: "Faire exister ton projet par des actions concrètes, jour après jour.",
        jalons: [
          { nom: "Offre définie", critere: "Ton produit ou service est décrit en une page claire" },
          { nom: "Vitrine en ligne", critere: "Ta boutique, ton site ou ton profil pro est publié" },
          { nom: "Premiers contacts", critere: "Dix prospects contactés, au moins une vraie discussion engagée" },
          { nom: "Premier revenu", critere: "Ton premier paiement client est encaissé" }
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
      // Pas de lien automatique (une action business se fait souvent
      // hors de l'app), mais le tap ouvre une session guidée : l'action
      // se fait en conscience, puis compte.
      hebdo: {
        nom: "5 actions concrètes pour ton business", xp: 180, stat: "discipline", objectif: 5, lien: null,
        session: { type: "simple", enCours: "Action en cours" }
      }
    },
    {
      id: "lecture",
      nom: "Lecture",
      classe: "Sage",
      description: "Nourrir ton esprit, page après page.",
      quetePrincipale: {
        titre: "La voie du sage",
        description: "Lire chaque jour, et laisser les livres t'élever.",
        jalons: [
          { nom: "Premier livre achevé", critere: "Un livre terminé, trois idées notées" },
          { nom: "Rituel installé", critere: "Deux semaines de lecture quotidienne sans exception" },
          { nom: "Bibliothèque vivante", critere: "Cinq livres terminés, chacun résumé en quelques lignes" }
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
      hebdo: {
        nom: "4 sessions de lecture", xp: 120, stat: "esprit", objectif: 4, lien: "minuterie:esprit",
        session: { type: "minuterie", duree: 1200 }
      }
    },
    {
      id: "discipline",
      nom: "Discipline de vie",
      classe: "Stratège",
      description: "Reprendre le contrôle de tes journées.",
      quetePrincipale: {
        titre: "Maître de tes journées",
        description: "L'ordre d'abord : lever, espace net, journée planifiée.",
        jalons: [
          { nom: "Matins conquis", critere: "Une semaine entière levé à l'heure prévue, sans repousser le réveil" },
          { nom: "Espace en ordre", critere: "Ton espace de vie rangé, et maintenu ainsi deux semaines" },
          { nom: "Journées pilotées", critere: "Trois semaines où chaque journée a été planifiée la veille" }
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
      // Une journée complète ne se joue pas en une session : pas de
      // session guidée, la progression vient du lien "journee".
      hebdo: {
        nom: "6 journées avec toutes les quêtes validées", xp: 200, stat: "discipline", objectif: 6, lien: "journee",
        session: null
      }
    },
    {
      id: "creation",
      nom: "Création",
      classe: "Créateur",
      description: "Donner forme à ce qui n'existe pas encore.",
      quetePrincipale: {
        titre: "L'œuvre en devenir",
        description: "Créer chaque jour, et laisser l'œuvre prendre forme.",
        jalons: [
          { nom: "Atelier ouvert", critere: "Ton espace et tes outils de création sont prêts à l'emploi" },
          { nom: "Première œuvre achevée", critere: "Une création terminée de bout en bout, montrable" },
          { nom: "Œuvre partagée", critere: "Ta création publiée ou montrée à de vraies personnes" }
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
      hebdo: {
        nom: "4 sessions de création", xp: 150, stat: "esprit", objectif: 4, lien: "minuterie:esprit",
        session: { type: "minuterie", duree: 2700 }
      }
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
        jalons: copier(JALONS_GENERIQUES)
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
      // Les quêtes du jour font déjà avancer l'hebdo (lien "quete") :
      // pas de session guidée dédiée.
      hebdo: {
        nom: "5 quêtes accomplies dans la semaine", xp: 150, stat: "discipline", objectif: 5, lien: "quete",
        session: null
      }
    };
  }

  // ----- Copies prêtes à poser dans l'état -----

  // Quête principale prête à poser dans l'état : jalons vierges,
  // niveau 1 (ou celui du template — la suite IA en fournit un).
  function quetePrincipaleDe(template) {
    var qp = copier(template.quetePrincipale);
    return {
      titre: qp.titre,
      description: qp.description || "",
      niveau: qp.niveau || 1,
      bonusXpParJalon: qp.bonusXpParJalon || 150,
      terminee: false,
      jalons: (qp.jalons || []).map(function (jalon) {
        return { nom: jalon.nom, critere: jalon.critere || "", atteint: false, dateAtteint: null };
      })
    };
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
      quetesAccomplies: [],
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
