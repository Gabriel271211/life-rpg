// ============================================
// LIFE RPG — feedback.js
// Le feedback d'évolution partagé : à partir du
// retour de Cartes.verifier(), enchaîne les
// bandeaux (niveau, cartes élevées, cartes
// brillantes), révèle les nouvelles cartes en
// plein écran, puis joue la montée de rang par
// dessus tout. Réutilisé par l'accueil et par
// l'écran Quête, pour un langage identique.
// Dépend de Juice, Cartes, Revelation, Regles,
// Aura — tous chargés avant lui.
// ============================================

var Feedback = (function () {

  var PAS_BANDEAU = 2700; // ms entre deux bandeaux enchaînés

  // niveauAvant / niveauApres : niveau global avant et après le gain.
  // evoCartes : { nouvelles, montees, brillantes } de Cartes.verifier.
  // opts.tete   : bandeaux [ [etiquette, valeur], ... ] joués EN TÊTE de
  //               file (ex. "Jalon atteint" sur l'écran Quête).
  // opts.avecNiveau : inclure le bandeau "Niveau" si le niveau a monté
  //               (défaut true ; false quand l'écran gère le niveau
  //               autrement, ex. écran de quête accomplie).
  function evolution(niveauAvant, niveauApres, evoCartes, opts) {
    opts = opts || {};

    var file = (opts.tete || []).slice();
    if (opts.avecNiveau !== false && niveauApres > niveauAvant) {
      file.push(["Niveau", niveauApres]);
    }
    if (evoCartes) {
      evoCartes.montees.forEach(function (m) {
        file.push(["Carte élevée", m.carte.nom + " " + Cartes.romain(m.niveau)]);
      });
      evoCartes.brillantes.forEach(function (c) {
        file.push(["Carte brillante", c.nom]);
      });
    }
    file.forEach(function (b, i) {
      setTimeout(function () { Juice.bandeau(b[0], b[1]); }, i * PAS_BANDEAU);
    });

    if (evoCartes && evoCartes.nouvelles.length > 0) {
      Revelation.montrer(evoCartes.nouvelles);
    }

    // La montée de rang — le moment fort — passe par-dessus tout.
    var rangAvant = Regles.rang(niveauAvant).actuel.lettre;
    var rangApres = Regles.rang(niveauApres).actuel.lettre;
    if (rangApres !== rangAvant) {
      Aura.monterRang(rangAvant, rangApres);
    }
  }

  return {
    evolution: evolution
  };
})();
