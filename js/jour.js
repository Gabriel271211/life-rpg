// ============================================
// LIFE RPG — jour.js
// Notion de temps : reset quotidien des quêtes
// et règles du streak. Fonctions pures — aucun
// accès au DOM ni au localStorage ici.
// ============================================

var Jour = (function () {

  // Gels : protections contre un jour d'engagement manqué. Valeurs
  // simples et ajustables. La mécanique de CONSOMMATION (ci-dessous)
  // est volontairement isolée du mode d'OBTENTION (recharge à la
  // semaine tenue) : plus tard, l'obtention passera par une boutique
  // sans toucher à la consommation.
  var GELS_MAX = 2;
  var GELS_DEPART = 2;

  function deuxChiffres(n) {
    return n < 10 ? "0" + n : String(n);
  }

  // Date locale de l'appareil au format "YYYY-MM-DD".
  function dateDuJour(maintenant) {
    var d = maintenant || new Date();
    return d.getFullYear() + "-" + deuxChiffres(d.getMonth() + 1) + "-" + deuxChiffres(d.getDate());
  }

  // "YYYY-MM-DD" -> Date à minuit, fuseau local.
  function versDate(chaine) {
    var parts = chaine.split("-");
    return new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2]));
  }

  // Nombre de jours entiers écoulés entre deux dates "YYYY-MM-DD".
  function joursEcoules(de, a) {
    return Math.round((versDate(a) - versDate(de)) / 86400000);
  }

  // Décale une date "YYYY-MM-DD" de N jours (N peut être négatif).
  function decalerDate(chaine, jours) {
    var d = versDate(chaine);
    d.setDate(d.getDate() + jours);
    return dateDuJour(d);
  }

  // Lundi de la semaine d'une date "YYYY-MM-DD" (fuseau local).
  function lundiDe(chaine) {
    var d = versDate(chaine);
    var decalage = (d.getDay() + 6) % 7; // lundi = 0 ... dimanche = 6
    d.setDate(d.getDate() - decalage);
    return dateDuJour(d);
  }

  // Indice du jour de la semaine d'une date "YYYY-MM-DD" :
  // 0 = lundi ... 6 = dimanche (même convention que lundiDe).
  function indiceJourSemaine(chaine) {
    return (versDate(chaine).getDay() + 6) % 7;
  }

  // La date est-elle un jour d'engagement du joueur ? Filet : sans
  // configuration (état tronqué), tout jour compte comme engagement,
  // pour ne jamais bloquer la progression.
  function estJourEngagement(etat, dateISO) {
    var jours = etat && etat.joursEngagement;
    if (!Array.isArray(jours) || jours.length === 0) return true;
    return jours.indexOf(indiceJourSemaine(dateISO)) !== -1;
  }

  // Recharge d'un gel quand la semaine qui se ferme a été entièrement
  // tenue : tous les jours d'engagement honorés (tenusSemaine compte les
  // jours d'engagement validés au fil de la semaine). Plafonné.
  // Mode d'OBTENTION isolé — à remplacer plus tard par une boutique.
  function rechargerGelSiSemaineTenue(etat) {
    var nb = Array.isArray(etat.joursEngagement) ? etat.joursEngagement.length : 0;
    if (nb > 0 && (etat.tenusSemaine || 0) >= nb && (etat.gels || 0) < GELS_MAX) {
      etat.gels = Math.min(GELS_MAX, (etat.gels || 0) + 1);
    }
  }

  // Transition de semaine, appelée au même moment qu'appliquerNouveauJour.
  // La quête hebdomadaire se réinitialise chaque lundi ; l'XP acquis reste acquis.
  // Retourne true si l'état a été modifié.
  function appliquerNouvelleSemaine(etat, aujourdhui) {
    var lundi = lundiDe(aujourdhui);
    if (etat.lundiSemaine === lundi) return false;

    // La semaine qui se ferme est mémorisée (nom + réussie) : le
    // Système ajuste la difficulté de la suivante d'après ce résultat.
    // Un drapeau signale à l'accueil qu'une proposition d'hebdo attend
    // le joueur — proposée en douceur, jamais imposée.
    etat.hebdoPrecedente = {
      nom: etat.hebdo.nom,
      reussie: etat.hebdo.progres >= etat.hebdo.objectif
    };
    etat.propositionHebdoAttendue = true;

    // Recharge de gel : la semaine qui vient de se fermer a-t-elle été
    // entièrement tenue ? On évalue AVANT de remettre le compteur à zéro
    // pour la nouvelle semaine.
    rechargerGelSiSemaineTenue(etat);
    etat.tenusSemaine = 0;

    etat.hebdo.progres = 0;
    delete etat.hebdo.xpDonne;
    etat.lundiSemaine = lundi;
    return true;
  }

  // Transition de jour. Retourne true si l'état a été modifié.
  // - streak conservé uniquement si UN seul jour s'est écoulé
  //   et que la veille avait été validée ; cassé (0) sinon
  // - les quêtes quotidiennes se décochent SANS retirer l'XP :
  //   l'XP est acquis pour toujours
  function appliquerNouveauJour(etat, aujourdhui) {
    if (etat.dernierJour === aujourdhui) return false;

    var ecart = joursEcoules(etat.dernierJour, aujourdhui);

    // Le jour qui se ferme (== dernierJour) a-t-il été exempté par une
    // modification des jours d'engagement faite dans la journée ? Si oui,
    // il est traité comme un jour de repos : un changement de jours
    // s'applique VERS L'AVANT et ne crée jamais de manque rétroactif ni
    // ne casse la série en cours.
    var jourExempt = etat.jourExempt || null;
    function engagementEffectif(dateISO) {
      if (jourExempt && dateISO === jourExempt) return false;
      return estJourEngagement(etat, dateISO);
    }

    // --- Streak : manques et gels sur les jours d'engagement refermés ---
    // On ne juge que quand le temps a avancé (écart > 0) ; une horloge
    // reculée resynchronise sans rien casser. Pour chaque jour calendaire
    // qui s'est refermé entre dernierJour et aujourd'hui :
    //   - jour de repos            -> transparent (ignoré)
    //   - jour d'engagement tenu   -> rien à casser (le +1 a déjà eu lieu)
    //   - jour d'engagement manqué -> un gel le protège, sinon série = 0
    // Seul le jour == dernierJour a pu être honoré (streakValideAujourdhui) ;
    // les jours strictement entre sont forcément non honorés.
    // Issue de la série sur les jours refermés : suivie pour alimenter le
    // MOMENT plein écran joué une fois à la réouverture (accueil.js).
    var streakAvant = etat.streak;
    var gelUtilise = false;
    var serieRompue = false;
    if (ecart > 0) {
      for (var i = 0; i < ecart; i++) {
        var jourFerme = decalerDate(etat.dernierJour, i);
        if (!engagementEffectif(jourFerme)) continue;
        var honore = i === 0 && etat.streakValideAujourdhui;
        if (honore) continue;
        if (etat.gels > 0) {
          etat.gels -= 1;
          etat.gelEnAttente = true; // message sobre au prochain affichage
          gelUtilise = true;
          if (etat.journal) etat.journal[jourFerme] = "gele"; // mémoire d'affichage
        } else {
          etat.streak = 0;
          if (streakAvant > 0) serieRompue = true;
          break; // série cassée : on arrête d'évaluer les manques suivants
        }
      }
    }

    // Drapeau transitoire d'issue de série (continuée / gelée / rompue),
    // lu PUIS effacé par l'accueil pour ne jouer le moment qu'une fois.
    // Priorité rompue > gelée > continuée ; rien au tout premier lancement
    // ni sur un simple jour de repos sans événement.
    var honoreFermeture = ecart > 0 && engagementEffectif(etat.dernierJour) &&
      etat.streakValideAujourdhui;
    if (serieRompue) {
      etat.transitionSerie = "rompue";
    } else if (gelUtilise) {
      etat.transitionSerie = "gelee";
    } else if (honoreFermeture) {
      etat.transitionSerie = "continuee";
    }

    // Le jour qui se ferme était-il PARFAIT (toutes les quêtes du jour
    // validées) ? Sert aux cartes brillantes (streak parfait).
    var jourParfait = etat.quetes.length > 0 &&
      etat.quetes.every(function (q) { return q.faite; });

    // Hebdo liée à la journée accomplie : la journée qui se ferme
    // compte (+1, une seule fois) si toutes ses quêtes étaient
    // validées — avant le reset, l'XP éventuel crédité à ce jour-là.
    // Regles est chargé avant jour.js sur tous les écrans.
    if (etat.hebdo && etat.hebdo.lien === "journee" && jourParfait) {
      Regles.progresserHebdo(etat);
    }

    // Streak parfait : on ne considère QUE les jours d'engagement. Un
    // jour de repos ne rompt pas la chaîne (transparent) ; un jour
    // d'engagement manqué dans l'intervalle la brise.
    if (etat.compteurs && ecart > 0 && engagementEffectif(etat.dernierJour)) {
      var manqueEngagement = false;
      for (var j = 1; j < ecart; j++) {
        if (engagementEffectif(decalerDate(etat.dernierJour, j))) {
          manqueEngagement = true;
          break;
        }
      }
      if (jourParfait && !manqueEngagement) {
        etat.compteurs.streakParfait = (etat.compteurs.streakParfait || 0) + 1;
      } else {
        etat.compteurs.streakParfait = 0;
      }
      etat.compteurs.meilleurStreakParfait = Math.max(
        etat.compteurs.meilleurStreakParfait || 0,
        etat.compteurs.streakParfait
      );
    }

    etat.quetes.forEach(function (quete) {
      quete.faite = false;
      delete quete.xpDonne;
      delete quete.hebdoCompte;
    });

    // Quêtes secondaires : celles dont la date d'expiration est passée
    // disparaissent, sans pénalité. L'XP déjà gagné (si validée) reste
    // acquis ; une carte débloquée le reste aussi. Une secondaire ne se
    // décoche PAS au changement de jour — elle vit jusqu'à son terme.
    if (Array.isArray(etat.quetesSecondaires)) {
      etat.quetesSecondaires = etat.quetesSecondaires.filter(function (q) {
        return typeof q.expire === "string" && joursEcoules(aujourdhui, q.expire) >= 0;
      });
    }

    // L'historique de progression ne garde que les 90 derniers jours.
    if (etat.historique) {
      Object.keys(etat.historique).forEach(function (date) {
        if (joursEcoules(date, aujourdhui) > 90) {
          delete etat.historique[date];
        }
      });
    }

    // Journal des issues (honoré / gelé) : mémoire d'AFFICHAGE de la
    // mini-semaine et de la flamme gelée. Purgé au-delà de 14 jours —
    // seule la semaine en cours est montrée. N'influence aucune règle.
    if (etat.journal) {
      Object.keys(etat.journal).forEach(function (date) {
        if (joursEcoules(date, aujourdhui) > 14) {
          delete etat.journal[date];
        }
      });
    }

    etat.streakValideAujourdhui = false;
    etat.dernierJour = aujourdhui;

    // L'exemption ne vaut que pour le jour où le changement a eu lieu :
    // une fois ce jour refermé, on l'oublie.
    if (etat.jourExempt && etat.jourExempt !== aujourdhui) {
      etat.jourExempt = null;
    }
    return true;
  }

  // À appeler après chaque validation / décochage de quête :
  // - première quête validée du jour  -> streak +1
  // - toutes les quêtes décochées     -> streak -1 (retour à l'état d'avant)
  function majStreak(etat) {
    // La série ne bouge QUE les jours d'engagement. Un jour de repos, la
    // boucle quotidienne est inactive : aucune validation, aucun effet.
    if (!estJourEngagement(etat, etat.dernierJour)) return;

    var aucuneFaite = etat.quetes.every(function (q) { return !q.faite; });

    if (!aucuneFaite && !etat.streakValideAujourdhui) {
      etat.streak += 1;
      etat.streakValideAujourdhui = true;
      // Jour d'engagement tenu, comptabilisé pour la recharge de gel.
      etat.tenusSemaine = (etat.tenusSemaine || 0) + 1;
      if (etat.journal) etat.journal[etat.dernierJour] = "honore"; // affichage
      // Le record de streak ne redescend jamais.
      if (etat.compteurs && etat.streak > etat.compteurs.meilleurStreak) {
        etat.compteurs.meilleurStreak = etat.streak;
      }
    } else if (aucuneFaite && etat.streakValideAujourdhui) {
      etat.streak = Math.max(0, etat.streak - 1);
      etat.streakValideAujourdhui = false;
      etat.tenusSemaine = Math.max(0, (etat.tenusSemaine || 0) - 1);
      if (etat.journal) delete etat.journal[etat.dernierJour]; // affichage
    }
  }

  return {
    GELS_MAX: GELS_MAX,
    GELS_DEPART: GELS_DEPART,
    dateDuJour: dateDuJour,
    joursEcoules: joursEcoules,
    decalerDate: decalerDate,
    lundiDe: lundiDe,
    indiceJourSemaine: indiceJourSemaine,
    estJourEngagement: estJourEngagement,
    appliquerNouveauJour: appliquerNouveauJour,
    appliquerNouvelleSemaine: appliquerNouvelleSemaine,
    majStreak: majStreak
  };
})();
