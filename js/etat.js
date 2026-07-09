// ============================================
// LIFE RPG — etat.js
// État du personnage : source de vérité unique,
// persistée en localStorage, avec migration et
// application du changement de jour au chargement.
// ============================================

var Etat = (function () {

  var CLE = "life-rpg-etat-v1";

  var DEFAUT = {
    nom: "Gabriel",
    classe: "Athlète",
    niveau: 12,
    xp: 840,
    streak: 6,
    streakValideAujourdhui: false,
    dernierJour: null,   // rempli à la date du jour par la migration
    lundiSemaine: null,  // rempli au lundi de la semaine par la migration
    stats: {
      corps: { niveau: 8, xp: 130 },
      esprit: { niveau: 5, xp: 90 },
      discipline: { niveau: 11, xp: 210 }
    },
    quetes: [
      { id: "pompes", nom: "30 pompes", xp: 25, stat: "corps", faite: false },
      { id: "lecture", nom: "20 min de lecture", xp: 20, stat: "esprit", faite: false },
      { id: "rangement", nom: "Ranger ton espace de travail", xp: 15, stat: "discipline", faite: false }
    ],
    hebdo: {
      nom: "3 séances de sport complètes",
      xp: 150,
      stat: "corps",
      progres: 1,
      objectif: 3
    },
    quetePrincipale: {
      titre: "Transformation physique",
      description: "Devenir la meilleure version de toi-même, séance après séance.",
      etapeActive: 0,
      etapes: [
        { nom: "Fondations", objectif: 15, progres: 0, bonusXp: 200 },
        { nom: "Régularité", objectif: 40, progres: 0, bonusXp: 400 },
        { nom: "Dépassement", objectif: 80, progres: 0, bonusXp: 800 }
      ]
    },
    compteurs: {
      quetesValidees: 0,   // total historique de quêtes quotidiennes validées
      critiques: 0,        // total de coups critiques obtenus
      hebdosAccomplies: 0, // total de quêtes hebdo terminées
      meilleurStreak: 6    // record de streak atteint (ne redescend jamais)
    },
    cartesDebloquees: []
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

  return {
    charger: charger,
    sauvegarder: sauvegarder,
    reinitialiser: reinitialiser
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
  }
};
