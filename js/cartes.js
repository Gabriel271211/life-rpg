// ============================================
// LIFE RPG — cartes.js
// Les cartes : trophées débloqués par des
// accomplissements réels. Cartes 2.0 : chaque
// carte a des PALIERS (niveau 1 à 3) et parfois
// une condition BRILLANTE (version d'exception).
// Définitions pures — aucun accès au DOM ni au
// localStorage. verifier() mute cartesDebloquees,
// désormais une liste de { id, niveau, brillante }.
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

  // Losange fin de niveau, pour la rangée de crans sous le nom.
  var LOSANGE =
    '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M5 0.4l4.6 4.6L5 9.6 0.4 5z"/></svg>';

  function embleme(dessins) {
    return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" ' +
      'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + dessins + "</svg>";
  }

  // Chaque carte : paliers ordonnés (croissants), condition brillante
  // optionnelle. "Marathonien" (streak 30) a été absorbée en palier 2
  // de "Semaine de fer" — la migration convertit les états existants.
  var TOUTES = [
    {
      id: "premier-pas",
      embleme: embleme('<path d="M12 3v11"/><path d="M8.5 14h7"/><path d="M12 14v5"/><path d="M10 21h4"/>'),
      nom: "Premier pas",
      rarete: "commune",
      cachee: false,
      description: "Toute légende commence par une seule quête.",
      paliers: [
        { objectif: "Valide ta première quête", atteint: function (e) { return e.compteurs.quetesValidees >= 1; } }
      ]
    },
    {
      id: "lame-affutee",
      embleme: embleme('<path d="M5 4l13.5 13.5"/><path d="M19 4L5.5 17.5"/><path d="M16.5 19.5l3.5-3.5"/><path d="M7.5 19.5L4 16"/>'),
      nom: "Lame affûtée",
      rarete: "commune",
      cachee: false,
      description: "La répétition forge le tranchant.",
      paliers: [
        { objectif: "Valide 25 quêtes", atteint: function (e) { return e.compteurs.quetesValidees >= 25; } },
        { objectif: "Valide 100 quêtes", atteint: function (e) { return e.compteurs.quetesValidees >= 100; } },
        { objectif: "Valide 300 quêtes", atteint: function (e) { return e.compteurs.quetesValidees >= 300; } }
      ]
    },
    {
      id: "semaine-de-fer",
      embleme: embleme('<path d="M12 3l7 2.8v5.4c0 4.6-3 7.6-7 9.8-4-2.2-7-5.2-7-9.8V5.8z"/>'),
      nom: "Semaine de fer",
      rarete: "rare",
      cachee: false,
      description: "Les jours s'enchaînent, la volonté ne cède pas.",
      paliers: [
        { objectif: "Atteins un streak de 7 jours", atteint: function (e) { return e.compteurs.meilleurStreak >= 7; } },
        { objectif: "Atteins un streak de 30 jours", atteint: function (e) { return e.compteurs.meilleurStreak >= 30; } },
        { objectif: "Atteins un streak de 90 jours", atteint: function (e) { return e.compteurs.meilleurStreak >= 90; } }
      ],
      // Version d'exception : sept jours parfaits d'affilée (toutes les
      // quêtes du jour validées, chaque jour).
      brillante: function (e) { return (e.compteurs.meilleurStreakParfait || 0) >= 7; }
    },
    {
      id: "main-du-destin",
      embleme: embleme('<path d="M13 3L6 13.5h5L10 21l8-11.5h-5.5z"/>'),
      nom: "Main du destin",
      rarete: "rare",
      cachee: false,
      description: "La chance sourit à ceux qui frappent sans relâche.",
      paliers: [
        { objectif: "Obtiens 10 coups critiques", atteint: function (e) { return e.compteurs.critiques >= 10; } },
        { objectif: "Obtiens 40 coups critiques", atteint: function (e) { return e.compteurs.critiques >= 40; } },
        { objectif: "Obtiens 100 coups critiques", atteint: function (e) { return e.compteurs.critiques >= 100; } }
      ]
    },
    {
      id: "conquerant",
      embleme: embleme('<path d="M6.5 21V4"/><path d="M6.5 5h10.5l-2.2 3.2L17 11.5H6.5z"/>'),
      nom: "Conquérant",
      rarete: "rare",
      cachee: false,
      description: "Semaine après semaine, le territoire s'étend.",
      paliers: [
        { objectif: "Accomplis 5 quêtes hebdomadaires", atteint: function (e) { return e.compteurs.hebdosAccomplies >= 5; } },
        { objectif: "Accomplis 20 quêtes hebdomadaires", atteint: function (e) { return e.compteurs.hebdosAccomplies >= 20; } },
        { objectif: "Accomplis 50 quêtes hebdomadaires", atteint: function (e) { return e.compteurs.hebdosAccomplies >= 50; } }
      ]
    },
    {
      id: "eveil",
      embleme: embleme('<path d="M3 12s3.5-5.5 9-5.5S21 12 21 12s-3.5 5.5-9 5.5S3 12 3 12z"/><circle cx="12" cy="12" r="2.3"/>'),
      nom: "Éveil",
      rarete: "epique",
      cachee: true,
      description: "Le rang C franchi, la véritable ascension commence.",
      paliers: [
        { objectif: "Atteins le rang C", atteint: function (e) { return e.niveau >= 20; } }
      ]
    },
    {
      id: "transcendance",
      embleme: embleme('<path d="M5 17.5h14"/><path d="M5 17.5L3.8 8.5l4.7 3.6L12 5.5l3.5 6.6 4.7-3.6-1.2 9z"/>'),
      nom: "Transcendance",
      rarete: "legendaire",
      cachee: true,
      description: "Au sommet du rang S, il ne reste que toi.",
      paliers: [
        { objectif: "Atteins le rang S", atteint: function (e) { return e.niveau >= 80; } }
      ]
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

  function nbPaliers(carte) {
    return carte.paliers.length;
  }

  // Niveau atteint pour l'état : le plus haut palier dont la condition
  // est vraie (0 = pas encore débloquée). Paliers monotones croissants.
  function niveauPourEtat(carte, etat) {
    var n = 0;
    for (var i = 0; i < carte.paliers.length; i++) {
      if (carte.paliers[i].atteint(etat)) n = i + 1;
    }
    return n;
  }

  // Entrée { id, niveau, brillante } dans cartesDebloquees, ou null.
  function entree(etat, id) {
    var d = etat.cartesDebloquees;
    for (var i = 0; i < d.length; i++) {
      if (d[i] && d[i].id === id) return d[i];
    }
    return null;
  }

  // Vue aplatie d'une carte à un niveau donné, pour l'affichage
  // (collection, révélation, bandeaux). Combine définition + état.
  function vue(carte, niveau, brillante) {
    return {
      id: carte.id,
      embleme: carte.embleme,
      nom: carte.nom,
      rarete: carte.rarete,
      description: carte.description,
      niveau: niveau,
      paliers: carte.paliers.length,
      brillante: brillante
    };
  }

  // Vue d'une carte débloquée d'après son entrée d'état, ou null.
  function vueDebloquee(etat, carte) {
    var ent = entree(etat, carte.id);
    if (!ent) return null;
    return vue(carte, ent.niveau, ent.brillante);
  }

  // Rangée de crans de niveau : `paliers` losanges, `niveau` remplis.
  function losanges(niveau, paliers) {
    var html = "";
    for (var i = 0; i < paliers; i++) {
      html += '<span class="carte-cran' + (i < niveau ? " actif" : "") + '">' + LOSANGE + "</span>";
    }
    return html;
  }

  // Chiffre romain du niveau (I, II, III) pour les bandeaux.
  function romain(n) {
    return ["", "I", "II", "III"][n] || String(n);
  }

  // Débloque, élève et fait briller les cartes selon l'état. Une carte
  // débloquée ne se re-verrouille ni ne redescend JAMAIS de niveau,
  // même si les compteurs baissent. Retourne les trois flux de feedback :
  // { nouvelles: [vue], montees: [{ carte:vue, niveau }], brillantes: [vue] }.
  function verifier(etat) {
    var nouvelles = [], montees = [], brillantes = [];
    TOUTES.forEach(function (carte) {
      var niveauCible = niveauPourEtat(carte, etat);
      if (niveauCible === 0) return;

      var ent = entree(etat, carte.id);
      if (!ent) {
        var brille = carte.brillante ? Boolean(carte.brillante(etat)) : false;
        etat.cartesDebloquees.push({ id: carte.id, niveau: niveauCible, brillante: brille });
        nouvelles.push(vue(carte, niveauCible, brille));
        return;
      }
      if (niveauCible > ent.niveau) {
        ent.niveau = niveauCible;
        montees.push({ carte: vue(carte, niveauCible, ent.brillante), niveau: niveauCible });
      }
      if (!ent.brillante && carte.brillante && carte.brillante(etat)) {
        ent.brillante = true;
        brillantes.push(vue(carte, ent.niveau, true));
      }
    });
    return { nouvelles: nouvelles, montees: montees, brillantes: brillantes };
  }

  return {
    NOMS_RARETES: NOMS_RARETES,
    EMBLEME_DEFAUT: EMBLEME_DEFAUT,
    liste: liste,
    parId: parId,
    nbPaliers: nbPaliers,
    niveauPourEtat: niveauPourEtat,
    entree: entree,
    vue: vue,
    vueDebloquee: vueDebloquee,
    losanges: losanges,
    romain: romain,
    verifier: verifier
  };
})();
