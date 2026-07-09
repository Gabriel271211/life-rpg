// ============================================
// LIFE RPG — juice.js
// Feedback visuel et haptique : XP flottant,
// bannière de niveau, pulsation des puces.
// Toutes les animations sont dans css/juice.css.
// ============================================

var Juice = (function () {

  // "+25 XP" qui apparaît au niveau de l'élément d'origine,
  // monte en fondu, puis disparaît du DOM.
  function xpFlottant(origine, texte, critique) {
    var rect = origine.getBoundingClientRect();
    var el = document.createElement("div");
    el.className = "xp-flottant" + (critique ? " critique" : "");
    el.textContent = texte;
    el.style.left = (rect.left + rect.width / 2) + "px";
    el.style.top = (rect.top - 6) + "px";
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, critique ? 950 : 850);
  }

  function vibrer(duree) {
    if (navigator.vibrate) navigator.vibrate(duree);
  }

  // Bannière "NIVEAU 13" en haut de l'écran : apparaît,
  // reste ~2s, disparaît. Jamais bloquante.
  function bandeauNiveau(niveau) {
    var el = document.createElement("div");
    el.className = "bandeau-niveau";
    el.innerHTML =
      '<span class="bandeau-etiquette">Niveau</span>' +
      '<span class="bandeau-valeur"></span>';
    el.querySelector(".bandeau-valeur").textContent = niveau;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }

  // Micro-pulsation d'un élément dont la valeur vient de changer.
  function pulser(el) {
    el.classList.remove("pulse");
    void el.offsetWidth; // force un reflow pour pouvoir rejouer l'animation
    el.classList.add("pulse");
    setTimeout(function () { el.classList.remove("pulse"); }, 400);
  }

  return {
    xpFlottant: xpFlottant,
    vibrer: vibrer,
    bandeauNiveau: bandeauNiveau,
    pulser: pulser
  };
})();
