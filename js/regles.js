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

  // ----- Quête principale : jalons auto-déclarés -----
  // Un jalon = un accomplissement CONCRET de la vraie vie, décrit par
  // son critère. L'app fait confiance : le joueur déclare lui-même le
  // jalon atteint — se mentir n'apporte que de l'XP creux. Les jalons
  // se valident DANS L'ORDRE : le suivant se déverrouille quand le
  // précédent est atteint.

  // Premier jalon non atteint, ou null si tout est accompli.
  function jalonActif(quetePrincipale) {
    if (!quetePrincipale || !Array.isArray(quetePrincipale.jalons)) return null;
    for (var i = 0; i < quetePrincipale.jalons.length; i++) {
      if (!quetePrincipale.jalons[i].atteint) {
        return { jalon: quetePrincipale.jalons[i], index: i };
      }
    }
    return null;
  }

  function nbJalonsAtteints(quetePrincipale) {
    var n = 0;
    quetePrincipale.jalons.forEach(function (jalon) {
      if (jalon.atteint) n += 1;
    });
    return n;
  }

  function quetePrincipaleAccomplie(quetePrincipale) {
    return Boolean(quetePrincipale.terminee) || jalonActif(quetePrincipale) === null;
  }

  // Déclare atteint le jalon actif : bonus d'XP, date du jour (via
  // etat.dernierJour, synchronisé au chargement — pas d'horloge ici).
  // Si c'était le dernier : la quête se termine et entre au palmarès.
  // Retourne { jalon, terminee }, ou null si rien à atteindre.
  function atteindreJalon(etat) {
    var qp = etat.quetePrincipale;
    var actif = jalonActif(qp);
    if (!actif) return null;

    actif.jalon.atteint = true;
    actif.jalon.dateAtteint = etat.dernierJour || null;
    gagnerXp(etat, qp.bonusXpParJalon || 150);

    var terminee = jalonActif(qp) === null;
    if (terminee && !qp.terminee) {
      qp.terminee = true;
      if (Array.isArray(etat.quetesAccomplies)) {
        etat.quetesAccomplies.push({
          titre: qp.titre,
          niveau: qp.niveau || 1,
          date: etat.dernierJour || null
        });
      }
    }
    return { jalon: actif.jalon, terminee: terminee };
  }

  // ----- Quête hebdomadaire -----
  // Le champ `lien` de l'hebdo définit ce qui la fait progresser
  // automatiquement, en plus du tap manuel :
  // - "seance"           : une session de type séance terminée
  // - "minuterie:esprit" : une session minutée de la stat donnée
  // - "journee"          : toutes les quêtes du jour validées
  //                        (appliqué au changement de jour, jour.js)
  // - "quete"            : toute quête quotidienne validée
  // - null               : progression manuelle uniquement

  function hebdoAccomplie(hebdo) {
    return hebdo.progres >= hebdo.objectif;
  }

  // La validation de cette quête fait-elle avancer l'hebdo ?
  // ("journee" ne dépend d'aucune quête isolée : géré par jour.js.)
  function queteCompteDansHebdo(hebdo, quete) {
    if (!hebdo || !hebdo.lien) return false;
    if (hebdo.lien === "quete") return true;
    if (hebdo.lien === "seance") return quete.type === "seance";
    var parts = hebdo.lien.split(":");
    if (parts[0] === "minuterie") {
      return quete.type === "minuterie" && (!parts[1] || quete.stat === parts[1]);
    }
    return false;
  }

  // +1 au progrès. Si l'objectif est atteint : XP (critique possible)
  // et compteurs. Retourne { accomplie, critique }, ou null si l'hebdo
  // était déjà accomplie (rien ne s'est passé).
  function progresserHebdo(etat) {
    var h = etat.hebdo;
    if (hebdoAccomplie(h)) return null;
    h.progres += 1;
    if (!hebdoAccomplie(h)) return { accomplie: false, critique: false };

    var critique = lancerCritique();
    h.xpDonne = h.xp * (critique ? MULTIPLICATEUR_CRITIQUE : 1);
    gagnerXp(etat, h.xpDonne, h.stat);
    etat.compteurs.hebdosAccomplies += 1;
    if (critique) etat.compteurs.critiques += 1;
    return { accomplie: true, critique: critique };
  }

  // -1 au progrès. Si c'est ce progrès qui avait accompli l'hebdo,
  // elle se rouvre : l'XP donné est retiré à l'identique et les
  // compteurs redescendent (les cartes débloquées restent acquises).
  function regresserHebdo(etat) {
    var h = etat.hebdo;
    if (h.progres <= 0) return;
    if (hebdoAccomplie(h) && h.xpDonne) {
      var etaitCritique = h.xpDonne > h.xp;
      retirerXp(etat, h.xpDonne, h.stat);
      delete h.xpDonne;
      etat.compteurs.hebdosAccomplies = Math.max(0, etat.compteurs.hebdosAccomplies - 1);
      if (etaitCritique) {
        etat.compteurs.critiques = Math.max(0, etat.compteurs.critiques - 1);
      }
    }
    h.progres -= 1;
  }

  // Phrase affichée dans l'éditeur pour expliquer le lien (lecture seule).
  function descriptionLienHebdo(lien) {
    if (lien === "seance") return "Progresse automatiquement avec tes séances";
    if (lien === "quete") return "Progresse automatiquement à chaque quête validée";
    if (lien === "journee") return "Progresse automatiquement quand toutes tes quêtes du jour sont validées";
    if (lien && lien.indexOf("minuterie") === 0) {
      var stat = lien.split(":")[1];
      return "Progresse automatiquement avec tes sessions minutées" +
        (stat ? " (" + stat.charAt(0).toUpperCase() + stat.slice(1) + ")" : "");
    }
    return "Progression manuelle";
  }

  return {
    RANGS: RANGS,
    MULTIPLICATEUR_CRITIQUE: MULTIPLICATEUR_CRITIQUE,
    hebdoAccomplie: hebdoAccomplie,
    queteCompteDansHebdo: queteCompteDansHebdo,
    progresserHebdo: progresserHebdo,
    regresserHebdo: regresserHebdo,
    descriptionLienHebdo: descriptionLienHebdo,
    lancerCritique: lancerCritique,
    jalonActif: jalonActif,
    nbJalonsAtteints: nbJalonsAtteints,
    quetePrincipaleAccomplie: quetePrincipaleAccomplie,
    atteindreJalon: atteindreJalon,
    xpRequisNiveau: xpRequisNiveau,
    xpRequisStat: xpRequisStat,
    rang: rang,
    gagnerXp: gagnerXp,
    retirerXp: retirerXp
  };
})();
