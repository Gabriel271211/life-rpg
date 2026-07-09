// ============================================
// LIFE RPG — personnage.js
// Rendu de la fiche de personnage à partir
// de l'état et des règles du jeu.
// ============================================

(function () {

  var etat = Etat.charger();

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
    prochainBarre.style.width = Math.round(infoRang.progression * 100) + "%";
  } else {
    prochainTexte.textContent = "Rang maximal atteint";
    prochainBarre.style.width = "100%";
  }

  // --- Niveau + XP ---
  var xpRequis = Regles.xpRequisNiveau(etat.niveau);
  document.getElementById("niveau-num").textContent = etat.niveau;
  document.getElementById("niveau-xp").innerHTML =
    "<strong>" + etat.xp + "</strong> / " + xpRequis + " XP";
  document.getElementById("xp-remplie").style.width =
    Math.min(100, Math.round((etat.xp / xpRequis) * 100)) + "%";

  // --- Stats : progression réelle vers le prochain niveau ---
  Object.keys(etat.stats).forEach(function (cle) {
    var bloc = document.querySelector('.stat[data-stat="' + cle + '"]');
    if (!bloc) return;

    var stat = etat.stats[cle];
    var requis = Regles.xpRequisStat(stat.niveau);

    bloc.querySelector(".stat-niveau").textContent = stat.niveau;
    bloc.querySelector(".barre-remplie").style.width =
      Math.min(100, Math.round((stat.xp / requis) * 100)) + "%";
    bloc.querySelector(".stat-prochain").textContent = "Prochain : niv. " + (stat.niveau + 1);
    bloc.querySelector(".stat-xp").textContent = stat.xp + " / " + requis + " XP";
  });

  // --- Streak ---
  document.getElementById("streak-valeur").textContent = etat.streak;

})();
