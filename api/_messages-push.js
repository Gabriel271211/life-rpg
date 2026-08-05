// ============================================
// LIFE RPG — api/_messages-push.js
// Banque de messages des notifications. Ton du Système :
// froid, sobre, court, SANS emoji, JAMAIS culpabilisant —
// il constate et invite, il ne juge pas.
//
// Chaque catégorie est un tableau ; le cron en tire un au
// hasard selon les drapeaux d'état du joueur.
// ============================================

var BANQUE = {

  // Rappel générique d'un jour d'engagement, quêtes non faites.
  // Une invitation neutre à agir, sans reproche.
  rappel: [
    { titre: "Le Système observe", corps: "Un jour d'engagement est en cours. Une action suffit à le marquer." },
    { titre: "Rien n'est encore inscrit", corps: "La journée attend un premier acte. Lequel ?" },
    { titre: "Le moment est là", corps: "Tu as choisi ce jour. Honore-le d'un seul geste." },
    { titre: "Une porte ouverte", corps: "Quelques minutes suffisent à faire avancer la chaîne." },
    { titre: "Le Système patiente", corps: "L'élan se crée maintenant, pas plus tard." }
  ],

  // Dernier rappel du jour (fenêtre du soir) : plus marqué, la série
  // d'engagement risque de casser. Toujours sans culpabilité.
  dernierMoment: [
    { titre: "La journée se referme", corps: "Il reste peu de temps pour tenir ce jour. Un acte, et la chaîne survit." },
    { titre: "Le dernier moment", corps: "Ce jour n'est pas encore perdu. Une action le sauve." },
    { titre: "Avant la nuit", corps: "La série tient à un seul geste. Le tien." }
  ],

  // Un gel a été consommé la veille : la chaîne a tenu grâce à une
  // protection. On rassure, puis on invite à ne pas rejouer le manque.
  gel: [
    { titre: "Un jour a été gelé", corps: "La chaîne tient. Ne la laisse pas se rompre deux fois de suite." },
    { titre: "Protection utilisée", corps: "Hier a été couvert. Aujourd'hui, reprends la main." }
  ],

  // Premier jour d'engagement de la semaine (lundi) : nouvelle page.
  nouvelleSemaine: [
    { titre: "Une semaine commence", corps: "Sept jours neufs. Le premier se joue maintenant." },
    { titre: "Nouvelle semaine", corps: "La chaîne repart d'un acte. Pose-le tôt." }
  ]
};

// Tire un message au hasard dans une catégorie (repli sur 'rappel').
function tirer(categorie) {
  var liste = BANQUE[categorie] || BANQUE.rappel;
  return liste[Math.floor(Math.random() * liste.length)];
}

module.exports = { BANQUE: BANQUE, tirer: tirer };
