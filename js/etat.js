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
    dernierJour: null, // rempli à la date du jour par la migration
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
    }
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
    var nouveauJour = Jour.appliquerNouveauJour(etat, Jour.dateDuJour());
    if (aMigre || nouveauJour) {
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
  reinitialiser: function () {
    Etat.reinitialiser();
    location.reload();
  }
};
