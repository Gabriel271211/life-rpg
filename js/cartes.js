// ============================================
// LIFE RPG — cartes.js
// Les cartes : trophées débloqués par des
// accomplissements réels. Définitions pures —
// aucun accès au DOM ni au localStorage ici.
// ============================================

var Cartes = (function () {

  var TOUTES = [
    {
      id: "premier-pas",
      nom: "Premier pas",
      rarete: "commune",
      cachee: false,
      description: "Toute légende commence par une seule quête.",
      objectif: "Valide ta première quête",
      condition: function (e) { return e.compteurs.quetesValidees >= 1; }
    },
    {
      id: "lame-affutee",
      nom: "Lame affûtée",
      rarete: "commune",
      cachee: false,
      description: "La répétition forge le tranchant.",
      objectif: "Valide 25 quêtes",
      condition: function (e) { return e.compteurs.quetesValidees >= 25; }
    },
    {
      id: "semaine-de-fer",
      nom: "Semaine de fer",
      rarete: "rare",
      cachee: false,
      description: "Sept jours sans faillir.",
      objectif: "Atteins un streak de 7 jours",
      condition: function (e) { return e.compteurs.meilleurStreak >= 7; }
    },
    {
      id: "marathonien",
      nom: "Marathonien",
      rarete: "epique",
      cachee: false,
      description: "Trente jours. La discipline est devenue une seconde nature.",
      objectif: "Atteins un streak de 30 jours",
      condition: function (e) { return e.compteurs.meilleurStreak >= 30; }
    },
    {
      id: "main-du-destin",
      nom: "Main du destin",
      rarete: "rare",
      cachee: false,
      description: "La chance sourit à ceux qui frappent sans relâche.",
      objectif: "Obtiens 10 coups critiques",
      condition: function (e) { return e.compteurs.critiques >= 10; }
    },
    {
      id: "conquerant",
      nom: "Conquérant",
      rarete: "rare",
      cachee: false,
      description: "Semaine après semaine, le territoire s'étend.",
      objectif: "Accomplis 5 quêtes hebdomadaires",
      condition: function (e) { return e.compteurs.hebdosAccomplies >= 5; }
    },
    {
      id: "eveil",
      nom: "Éveil",
      rarete: "epique",
      cachee: true,
      description: "Le rang C franchi, la véritable ascension commence.",
      objectif: "Atteins le rang C",
      condition: function (e) { return e.niveau >= 20; }
    },
    {
      id: "transcendance",
      nom: "Transcendance",
      rarete: "legendaire",
      cachee: true,
      description: "Au sommet du rang S, il ne reste que toi.",
      objectif: "Atteins le rang S",
      condition: function (e) { return e.niveau >= 80; }
    }
  ];

  function liste() {
    return TOUTES;
  }

  function parId(id) {
    for (var i = 0; i < TOUTES.length; i++) {
      if (TOUTES[i].id === id) return TOUTES[i];
    }
    return null;
  }

  // Débloque les cartes dont la condition vient de devenir vraie.
  // Retourne la liste des cartes nouvellement débloquées.
  // Une carte débloquée ne se re-verrouille JAMAIS, même si les
  // compteurs redescendent : on n'enlève jamais rien de cartesDebloquees.
  function verifier(etat) {
    var nouvelles = [];
    TOUTES.forEach(function (carte) {
      if (etat.cartesDebloquees.indexOf(carte.id) === -1 && carte.condition(etat)) {
        etat.cartesDebloquees.push(carte.id);
        nouvelles.push(carte);
      }
    });
    return nouvelles;
  }

  return {
    liste: liste,
    parId: parId,
    verifier: verifier
  };
})();
