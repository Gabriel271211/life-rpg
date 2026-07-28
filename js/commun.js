// ============================================
// LIFE RPG — commun.js
// Petites données et fonctions partagées par
// plusieurs modules, sans dépendance. Chargé
// AVANT etat.js et templates.js sur chaque page :
// c'est la source unique de la séance guidée par
// défaut et de l'étiquette de stat.
// Fonctions pures — aucun accès au DOM ni au
// localStorage ici.
// ============================================

var Commun = (function () {

  // Séance guidée par défaut : SOURCE UNIQUE des blocs, référencée par
  // etat.js (DEFAUT + migration) et templates.js (template Sport). Ne
  // jamais entrer cet objet tel quel dans l'état : toujours en poser
  // une copie (blocsSeance() ou copier() côté templates).
  var BLOCS_SEANCE = [
    { nom: "Échauffement", detail: "Mobilité articulaire", duree: 120,
      explication: "Cercles de bras, rotations du bassin, montées de genoux : réveille chaque articulation en douceur." },
    { nom: "Pompes", detail: "15 répétitions",
      explication: "Mains sous les épaules, corps bien gainé : descends la poitrine près du sol, remonte sans cambrer." },
    { nom: "Repos", duree: 60, repos: true },
    { nom: "Squats", detail: "20 répétitions",
      explication: "Pieds largeur d'épaules, dos droit : descends comme pour t'asseoir, talons au sol." },
    { nom: "Repos", duree: 60, repos: true },
    { nom: "Gainage", detail: "Tiens la position", duree: 45,
      explication: "En appui sur les avant-bras, corps aligné des épaules aux talons : ne laisse pas le bassin tomber." },
    { nom: "Repos", duree: 60, repos: true },
    { nom: "Pompes", detail: "12 répétitions",
      explication: "Même consigne que la première série : amplitude complète, rythme régulier." },
    { nom: "Étirements", detail: "Retour au calme", duree: 90,
      explication: "Respire profondément et étire chaque groupe musculaire travaillé, sans à-coups." }
  ];

  // Copie profonde des blocs, prête à poser dans un état.
  function blocsSeance() {
    return JSON.parse(JSON.stringify(BLOCS_SEANCE));
  }

  // "corps" -> "Corps" : étiquette affichable d'une clé de stat.
  function etiquetteStat(cle) {
    return String(cle).charAt(0).toUpperCase() + String(cle).slice(1);
  }

  return {
    BLOCS_SEANCE: BLOCS_SEANCE,
    blocsSeance: blocsSeance,
    etiquetteStat: etiquetteStat
  };
})();
