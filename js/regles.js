// ============================================
// LIFE RPG — regles.js
// Règles du jeu : courbes d'XP, rangs, progression.
// Fonctions pures uniquement — aucun accès au DOM ici.
// ============================================

var Regles = (function () {

  // Paliers de rang, liés au niveau global du personnage.
  var RANGS = [
    { lettre: "E", niveauRequis: 1 },
    { lettre: "D", niveauRequis: 10 },
    { lettre: "C", niveauRequis: 20 },
    { lettre: "B", niveauRequis: 35 },
    { lettre: "A", niveauRequis: 55 },
    { lettre: "S", niveauRequis: 80 }
  ];

  // Coup critique : chance qu'une quête validée rapporte le double d'XP.
  var CHANCE_CRITIQUE = 0.15;
  var MULTIPLICATEUR_CRITIQUE = 2;

  function lancerCritique() {
    return Math.random() < CHANCE_CRITIQUE;
  }

  // XP nécessaire pour passer du niveau N au niveau N+1.
  function xpRequisNiveau(niveau) {
    return niveau * 100;
  }

  // XP nécessaire pour monter une stat du niveau N au niveau N+1.
  function xpRequisStat(niveau) {
    return niveau * 30;
  }

  // Rang actuel, rang suivant et progression (0 à 1) vers celui-ci.
  function rang(niveau) {
    var actuel = RANGS[0];
    var suivant = null;

    for (var i = 0; i < RANGS.length; i++) {
      if (niveau >= RANGS[i].niveauRequis) {
        actuel = RANGS[i];
      } else {
        suivant = RANGS[i];
        break;
      }
    }

    var progression = 1;
    if (suivant) {
      progression = (niveau - actuel.niveauRequis) / (suivant.niveauRequis - actuel.niveauRequis);
      progression = Math.max(0, Math.min(1, progression));
    }

    return { actuel: actuel, suivant: suivant, progression: progression };
  }

  // Historique de progression : XP total gagné par jour. La clé est
  // etat.dernierJour, synchronisé à la date du jour au chargement —
  // regles.js reste pur, sans lire l'horloge. Plancher à zéro : le
  // décochage ne creuse jamais de dette.
  function noterHistorique(etat, delta) {
    if (!etat.historique || typeof etat.dernierJour !== "string") return;
    var total = (etat.historique[etat.dernierJour] || 0) + delta;
    etat.historique[etat.dernierJour] = Math.max(0, total);
  }

  // Ajoute de l'XP au personnage et à la stat associée,
  // en gérant les montées de niveau successives.
  function gagnerXp(etat, quantite, statCle) {
    noterHistorique(etat, quantite);
    etat.xp += quantite;
    while (etat.xp >= xpRequisNiveau(etat.niveau)) {
      etat.xp -= xpRequisNiveau(etat.niveau);
      etat.niveau += 1;
    }

    var stat = statCle && etat.stats[statCle];
    if (stat) {
      stat.xp += quantite;
      while (stat.xp >= xpRequisStat(stat.niveau)) {
        stat.xp -= xpRequisStat(stat.niveau);
        stat.niveau += 1;
      }
    }
  }

  // Retire de l'XP (quête décochée), en redescendant les niveaux si besoin.
  function retirerXp(etat, quantite, statCle) {
    noterHistorique(etat, -quantite);
    etat.xp -= quantite;
    while (etat.xp < 0 && etat.niveau > 1) {
      etat.niveau -= 1;
      etat.xp += xpRequisNiveau(etat.niveau);
    }
    if (etat.xp < 0) etat.xp = 0;

    var stat = statCle && etat.stats[statCle];
    if (stat) {
      stat.xp -= quantite;
      while (stat.xp < 0 && stat.niveau > 1) {
        stat.niveau -= 1;
        stat.xp += xpRequisStat(stat.niveau);
      }
      if (stat.xp < 0) stat.xp = 0;
    }
  }

  // ----- Quête principale -----
  // Chaque quête quotidienne validée fait progresser l'étape active.

  function etapeActive(quetePrincipale) {
    return quetePrincipale.etapes[quetePrincipale.etapeActive] || null;
  }

  function quetePrincipaleAccomplie(quetePrincipale) {
    return quetePrincipale.etapeActive >= quetePrincipale.etapes.length;
  }

  // +1 au progrès de l'étape active. Si elle est complétée : bonus d'XP
  // et passage à l'étape suivante. Retourne l'étape accomplie, sinon null.
  function progresserQuetePrincipale(etat) {
    var etape = etapeActive(etat.quetePrincipale);
    if (!etape) return null;

    etape.progres += 1;
    if (etape.progres >= etape.objectif) {
      etape.progres = etape.objectif;
      etat.quetePrincipale.etapeActive += 1;
      gagnerXp(etat, etape.bonusXp);
      return etape;
    }
    return null;
  }

  // Rattrapage après édition de la quête principale : si l'objectif
  // d'une étape en cours a été réduit sous son progrès, elle se
  // complète (bonus compris) — le progrès n'est jamais volé.
  // Retourne les étapes accomplies par ce rattrapage.
  function rattraperQuetePrincipale(etat) {
    var accomplies = [];
    var etape = etapeActive(etat.quetePrincipale);
    while (etape && etape.progres >= etape.objectif) {
      etape.progres = etape.objectif;
      etat.quetePrincipale.etapeActive += 1;
      gagnerXp(etat, etape.bonusXp);
      accomplies.push(etape);
      etape = etapeActive(etat.quetePrincipale);
    }
    return accomplies;
  }

  // -1 au progrès de l'étape active (plancher 0). Les étapes déjà
  // accomplies ne sont pas rouvertes : leur bonus reste acquis.
  function regresserQuetePrincipale(etat) {
    var etape = etapeActive(etat.quetePrincipale);
    if (etape && etape.progres > 0) {
      etape.progres -= 1;
    }
  }

  return {
    RANGS: RANGS,
    MULTIPLICATEUR_CRITIQUE: MULTIPLICATEUR_CRITIQUE,
    lancerCritique: lancerCritique,
    etapeActive: etapeActive,
    quetePrincipaleAccomplie: quetePrincipaleAccomplie,
    progresserQuetePrincipale: progresserQuetePrincipale,
    rattraperQuetePrincipale: rattraperQuetePrincipale,
    regresserQuetePrincipale: regresserQuetePrincipale,
    xpRequisNiveau: xpRequisNiveau,
    xpRequisStat: xpRequisStat,
    rang: rang,
    gagnerXp: gagnerXp,
    retirerXp: retirerXp
  };
})();
