// ============================================
// LIFE RPG — personnage.js
// Rendu de la fiche de personnage à partir
// de l'état et des règles du jeu.
// ============================================

(function () {

  var etat = Etat.charger();

  // Les largeurs de barres sont posées après le premier rendu :
  // elles partent de zéro et se remplissent (transition CSS).
  var barres = [];
  function poserLargeur(el, pourcent) {
    barres.push([el, pourcent]);
  }
  setTimeout(function () {
    barres.forEach(function (b) { b[0].style.width = b[1] + "%"; });
  }, 80);

  // --- Identité ---
  document.getElementById("perso-nom").textContent = etat.nom;
  document.getElementById("perso-classe").textContent = etat.classe;

  // --- Rang + progression vers le rang suivant ---
  var infoRang = Regles.rang(etat.niveau);
  document.getElementById("rang-lettre").textContent = infoRang.actuel.lettre;

  var prochainTexte = document.getElementById("rang-prochain-texte");
  var prochainBarre = document.getElementById("rang-prochain-remplie");
  if (infoRang.suivant) {
    prochainTexte.textContent =
      "Rang " + infoRang.suivant.lettre + " au niveau " + infoRang.suivant.niveauRequis;
    poserLargeur(prochainBarre, Math.round(infoRang.progression * 100));
  } else {
    prochainTexte.textContent = "Rang maximal atteint";
    poserLargeur(prochainBarre, 100);
  }

  // --- Niveau + XP ---
  var xpRequis = Regles.xpRequisNiveau(etat.niveau);
  document.getElementById("niveau-num").textContent = etat.niveau;
  document.getElementById("niveau-xp").innerHTML =
    "<strong>" + etat.xp + "</strong> / " + xpRequis + " XP";
  poserLargeur(
    document.getElementById("xp-remplie"),
    Math.min(100, Math.round((etat.xp / xpRequis) * 100))
  );

  // --- Stats : progression réelle vers le prochain niveau ---
  Object.keys(etat.stats).forEach(function (cle) {
    var bloc = document.querySelector('.stat[data-stat="' + cle + '"]');
    if (!bloc) return;

    var stat = etat.stats[cle];
    var requis = Regles.xpRequisStat(stat.niveau);

    bloc.querySelector(".stat-niveau").textContent = stat.niveau;
    poserLargeur(
      bloc.querySelector(".barre-remplie"),
      Math.min(100, Math.round((stat.xp / requis) * 100))
    );
    bloc.querySelector(".stat-prochain").textContent = "Prochain : niv. " + (stat.niveau + 1);
    bloc.querySelector(".stat-xp").textContent = stat.xp + " / " + requis + " XP";
  });

  // --- Streak ---
  document.getElementById("streak-valeur").textContent = etat.streak;

  // --- Bilan de l'aventure ---
  document.getElementById("bilan-quetes").textContent = etat.compteurs.quetesValidees;
  document.getElementById("bilan-critiques").textContent = etat.compteurs.critiques;
  document.getElementById("bilan-record").textContent = etat.compteurs.meilleurStreak;

})();
