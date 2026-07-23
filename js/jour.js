// ============================================
// LIFE RPG — jour.js
// Notion de temps : reset quotidien des quêtes
// et règles du streak. Fonctions pures — aucun
// accès au DOM ni au localStorage ici.
// ============================================

var Jour = (function () {

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

    // Écart négatif = horloge reculée : on resynchronise la date sans juger le streak.
    if (ecart > 0 && !(ecart === 1 && etat.streakValideAujourdhui)) {
      etat.streak = 0;
    }

    // Hebdo liée à la journée accomplie : la journée qui se ferme
    // compte (+1, une seule fois) si toutes ses quêtes étaient
    // validées — avant le reset, l'XP éventuel crédité à ce jour-là.
    // Regles est chargé avant jour.js sur tous les écrans.
    if (etat.hebdo && etat.hebdo.lien === "journee" &&
        etat.quetes.length > 0 &&
        etat.quetes.every(function (q) { return q.faite; })) {
      Regles.progresserHebdo(etat);
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

    etat.streakValideAujourdhui = false;
    etat.dernierJour = aujourdhui;
    return true;
  }

  // À appeler après chaque validation / décochage de quête :
  // - première quête validée du jour  -> streak +1
  // - toutes les quêtes décochées     -> streak -1 (retour à l'état d'avant)
  function majStreak(etat) {
    var aucuneFaite = etat.quetes.every(function (q) { return !q.faite; });

    if (!aucuneFaite && !etat.streakValideAujourdhui) {
      etat.streak += 1;
      etat.streakValideAujourdhui = true;
      // Le record de streak ne redescend jamais.
      if (etat.compteurs && etat.streak > etat.compteurs.meilleurStreak) {
        etat.compteurs.meilleurStreak = etat.streak;
      }
    } else if (aucuneFaite && etat.streakValideAujourdhui) {
      etat.streak = Math.max(0, etat.streak - 1);
      etat.streakValideAujourdhui = false;
    }
  }

  return {
    dateDuJour: dateDuJour,
    joursEcoules: joursEcoules,
    decalerDate: decalerDate,
    lundiDe: lundiDe,
    appliquerNouveauJour: appliquerNouveauJour,
    appliquerNouvelleSemaine: appliquerNouvelleSemaine,
    majStreak: majStreak
  };
})();
