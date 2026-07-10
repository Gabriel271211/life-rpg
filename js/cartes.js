// ============================================
// LIFE RPG — cartes.js
// Les cartes : trophées débloqués par des
// accomplissements réels. Définitions pures —
// aucun accès au DOM ni au localStorage ici.
// ============================================

var Cartes = (function () {

  var NOMS_RARETES = {
    commune: "Commune",
    rare: "Rare",
    epique: "Épique",
    legendaire: "Légendaire"
  };

  // Emblème par défaut (losange) pour les cartes sans emblème dédié.
  var EMBLEME_DEFAUT =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.4" ' +
    'stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M12 2.5l7 9.5-7 9.5L5 12z"/>' +
    '<path d="M12 7l3.7 5-3.7 5-3.7-5z"/></svg>';

  function embleme(dessins) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + dessins + "</svg>";
  }

  var TOUTES = [
    {
      id: "premier-pas",
      embleme: embleme('<path d="M12 3v11"/><path d="M8.5 14h7"/><path d="M12 14v5"/><path d="M10 21h4"/>'),
      nom: "Premier pas",
      rarete: "commune",
      cachee: false,
      description: "Toute légende commence par une seule quête.",
      objectif: "Valide ta première quête",
      condition: function (e) { return e.compteurs.quetesValidees >= 1; }
    },
    {
      id: "lame-affutee",
      embleme: embleme('<path d="M5 4l13.5 13.5"/><path d="M19 4L5.5 17.5"/><path d="M16.5 19.5l3.5-3.5"/><path d="M7.5 19.5L4 16"/>'),
      nom: "Lame affûtée",
      rarete: "commune",
      cachee: false,
      description: "La répétition forge le tranchant.",
      objectif: "Valide 25 quêtes",
      condition: function (e) { return e.compteurs.quetesValidees >= 25; }
    },
    {
      id: "semaine-de-fer",
      embleme: embleme('<path d="M12 3l7 2.8v5.4c0 4.6-3 7.6-7 9.8-4-2.2-7-5.2-7-9.8V5.8z"/>'),
      nom: "Semaine de fer",
      rarete: "rare",
      cachee: false,
      description: "Sept jours sans faillir.",
      objectif: "Atteins un streak de 7 jours",
      condition: function (e) { return e.compteurs.meilleurStreak >= 7; }
    },
    {
      id: "marathonien",
      embleme: embleme('<path d="M12 3.5c.5 2.5-.6 4-2 5.6-1.1 1.3-1.9 2.6-1.9 4.4a5.9 5.9 0 0 0 11.8 0c0-2-.9-3.9-2.3-5.5-.2 1-.7 1.9-1.5 2.5.1-2.6-1.5-5-4.1-7z"/>'),
      nom: "Marathonien",
      rarete: "epique",
      cachee: false,
      description: "Trente jours. La discipline est devenue une seconde nature.",
      objectif: "Atteins un streak de 30 jours",
      condition: function (e) { return e.compteurs.meilleurStreak >= 30; }
    },
    {
      id: "main-du-destin",
      embleme: embleme('<path d="M13 3L6 13.5h5L10 21l8-11.5h-5.5z"/>'),
      nom: "Main du destin",
      rarete: "rare",
      cachee: false,
      description: "La chance sourit à ceux qui frappent sans relâche.",
      objectif: "Obtiens 10 coups critiques",
      condition: function (e) { return e.compteurs.critiques >= 10; }
    },
    {
      id: "conquerant",
      embleme: embleme('<path d="M6.5 21V4"/><path d="M6.5 5h10.5l-2.2 3.2L17 11.5H6.5z"/>'),
      nom: "Conquérant",
      rarete: "rare",
      cachee: false,
      description: "Semaine après semaine, le territoire s'étend.",
      objectif: "Accomplis 5 quêtes hebdomadaires",
      condition: function (e) { return e.compteurs.hebdosAccomplies >= 5; }
    },
    {
      id: "eveil",
      embleme: embleme('<path d="M3 12s3.5-5.5 9-5.5S21 12 21 12s-3.5 5.5-9 5.5S3 12 3 12z"/><circle cx="12" cy="12" r="2.3"/>'),
      nom: "Éveil",
      rarete: "epique",
      cachee: true,
      description: "Le rang C franchi, la véritable ascension commence.",
      objectif: "Atteins le rang C",
      condition: function (e) { return e.niveau >= 20; }
    },
    {
      id: "transcendance",
      embleme: embleme('<path d="M5 17.5h14"/><path d="M5 17.5L3.8 8.5l4.7 3.6L12 5.5l3.5 6.6 4.7-3.6-1.2 9z"/>'),
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
    NOMS_RARETES: NOMS_RARETES,
    EMBLEME_DEFAUT: EMBLEME_DEFAUT,
    liste: liste,
    parId: parId,
    verifier: verifier
  };
})();
