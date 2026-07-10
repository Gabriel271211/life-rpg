// ============================================
// LIFE RPG — quete.js
// Rendu de l'écran Quête principale à partir
// de l'état : chemin d'étapes avec statuts.
// ============================================

(function () {

  var etat = Etat.charger();
  var qp = etat.quetePrincipale;

  var SVG_COCHE =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5.5 12.5l4.2 4.2L18.5 8"/></svg>';

  var SVG_CADENAS =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="5.5" y="10.5" width="13" height="9" rx="2"/>' +
    '<path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/></svg>';

  document.getElementById("qp-titre").textContent = qp.titre;
  document.getElementById("qp-description").textContent = qp.description;

  var conteneur = document.getElementById("etapes");

  qp.etapes.forEach(function (etape, i) {
    var statut = i < qp.etapeActive ? "finie" : (i === qp.etapeActive ? "active" : "future");

    var li = document.createElement("li");
    li.className = "etape " + statut;
    li.innerHTML =
      '<div class="etape-marqueur">' +
        (statut === "finie" ? SVG_COCHE : statut === "future" ? SVG_CADENAS : "") +
      "</div>" +
      '<div class="etape-corps">' +
        '<div class="etape-ligne">' +
          '<span class="etape-nom"></span>' +
          '<span class="etape-bonus">+' + etape.bonusXp + " XP</span>" +
        "</div>" +
        '<div class="barre"><div class="barre-remplie"></div></div>' +
        '<div class="etape-detail"><span class="etape-compte"></span></div>' +
      "</div>";

    li.querySelector(".etape-nom").textContent = etape.nom;
    li.querySelector(".etape-compte").textContent = etape.progres + " / " + etape.objectif;

    // apparition en cascade + barre qui se remplit après le premier rendu
    li.classList.add("entree");
    li.style.animationDelay = (i * 70) + "ms";
    var barre = li.querySelector(".barre-remplie");
    var largeur = Math.min(100, Math.round((etape.progres / etape.objectif) * 100));
    setTimeout(function () { barre.style.width = largeur + "%"; }, 120 + i * 70);

    conteneur.appendChild(li);
  });

  document.getElementById("qp-accomplie").hidden = !Regles.quetePrincipaleAccomplie(qp);

})();
