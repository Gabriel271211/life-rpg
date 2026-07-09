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

    etat.quetes.forEach(function (quete) {
      quete.faite = false;
      delete quete.xpDonne;
    });

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
