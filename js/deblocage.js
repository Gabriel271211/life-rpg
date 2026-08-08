// ============================================
// LIFE RPG — deblocage.js
// Déblocage progressif des fonctionnalités sur la
// première semaine (chantier 2). Ne fait QUE poser
// les drapeaux (debloque.X) et la révélation en
// attente : l'ANIMATION de révélation est le
// chantier 3, qui lira revelationEnAttente.
//
// Réutilisable : ajouter une feature = une entrée
// dans FEATURES + sa condition dans CONDITIONS
// (et sa clé dans etat.debloque). Servira plus tard
// à la boutique, aux stats avancées, etc.
// ============================================

var Deblocage = (function () {

  // Ordre canonique des fonctionnalités déblocables. Sert aussi de
  // source à la migration (revelationsVues = toutes) via Object.keys.
  var FEATURES = [
    "fichePerso", "collection", "hebdo",
    "quetePrincipale", "secondaires", "gel", "chat"
  ];

  // Numéros de jour de jeu déclencheurs (tunables).
  var JOUR_HEBDO = 2;    // hebdo dès le 2ᵉ jour, quêtes du jour finies
  var JOUR_QP = 3;       // quête principale au 3ᵉ jour
  var JOURS_SEMAINE = 7; // gel à la fin de la 1ʳᵉ semaine tenue

  // Carte "tout ouvert" : joueur existant ou état illisible — jamais
  // re-verrouillé.
  function toutOuvert() {
    var d = {};
    FEATURES.forEach(function (f) { d[f] = true; });
    return d;
  }

  // Numéro du jour de jeu courant (1 = jour d'onboarding). Calé sur
  // dateDebut ; dernierJour est synchronisé à aujourd'hui au chargement.
  function numeroJour(etat) {
    if (etat.dateDebut && etat.dernierJour) {
      return Math.max(1, Jour.joursEcoules(etat.dateDebut, etat.dernierJour) + 1);
    }
    return 1;
  }

  function toutesQuetesFaites(etat) {
    return Array.isArray(etat.quetes) && etat.quetes.length > 0 &&
      etat.quetes.every(function (q) { return q.faite; });
  }

  // Condition de déblocage par feature — fonctions PURES de l'état.
  // Évaluables à tout moment : une feature déjà ouverte n'est jamais
  // ré-évaluée (evaluer ignore ce qui est déjà true).
  var CONDITIONS = {
    // 1ʳᵉ quête validée (jamais auparavant).
    fichePerso: function (e) {
      return Boolean(e.compteurs && e.compteurs.quetesValidees > 0);
    },
    // 1ʳᵉ journée où TOUTES les quêtes du jour sont faites.
    collection: function (e) {
      return toutesQuetesFaites(e);
    },
    // Dès le 2ᵉ jour, quand les quêtes du jour sont finies.
    hebdo: function (e) {
      return numeroJour(e) >= JOUR_HEBDO && toutesQuetesFaites(e);
    },
    // Au 3ᵉ jour de jeu (l'objectif est connu depuis l'onboarding ;
    // on révèle le chemin de jalons).
    quetePrincipale: function (e) {
      return numeroJour(e) >= JOUR_QP;
    },
    // Fin de la 1ʳᵉ semaine tenue : 7 jours de jeu, série vivante.
    gel: function (e) {
      return numeroJour(e) >= JOURS_SEMAINE && (e.streak || 0) > 0;
    },
    // 1ʳᵉ quête hebdomadaire accomplie.
    secondaires: function (e) {
      return Boolean(e.compteurs && e.compteurs.hebdosAccomplies > 0);
    },
    // Rang D atteint (niveau 10).
    chat: function (e) {
      return (e.niveau || 1) >= 10;
    }
  };

  // Évalue toutes les conditions, débloque ce qui doit l'être et pose la
  // révélation en attente (id de la dernière feature débloquée — les
  // déclencheurs sont étalés, une collision dans le même tick est quasi
  // impossible). Ne sauvegarde pas : l'appelant s'en charge. Retourne la
  // liste des features nouvellement débloquées (vide si rien).
  function evaluer(etat) {
    if (!etat || !etat.debloque) return [];
    var nouveaux = [];
    FEATURES.forEach(function (f) {
      if (!etat.debloque[f] && CONDITIONS[f] && CONDITIONS[f](etat)) {
        etat.debloque[f] = true;
        nouveaux.push(f);
      }
    });
    if (nouveaux.length) {
      etat.revelationEnAttente = nouveaux[nouveaux.length - 1];
    }
    return nouveaux;
  }

  // Lecture légère de la carte de déblocage depuis localStorage, pour la
  // nav et les gardes (sans relancer charger()/migration). Absent ou
  // illisible => tout ouvert (joueur existant).
  function lire() {
    try {
      var brut = localStorage.getItem("life-rpg-etat-v1");
      if (brut) {
        var d = JSON.parse(brut).debloque;
        if (d && typeof d === "object") return d;
      }
    } catch (e) {}
    return toutOuvert();
  }

  return {
    FEATURES: FEATURES,
    JOUR_HEBDO: JOUR_HEBDO,
    JOUR_QP: JOUR_QP,
    JOURS_SEMAINE: JOURS_SEMAINE,
    toutOuvert: toutOuvert,
    numeroJour: numeroJour,
    evaluer: evaluer,
    lire: lire
  };
})();
