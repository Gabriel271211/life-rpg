// ============================================
// LIFE RPG — juice.js
// Feedback visuel et haptique : XP flottant,
// bannière de niveau, pulsation des puces.
// Toutes les animations sont dans css/juice.css.
// ============================================

var Juice = (function () {

  // Préférence vibrations (Android) : "1" = actif (défaut), "0" = coupé.
  // Miroir exact du réglage muet (son.js) : localStorage, échec silencieux,
  // défaut activé. Réglée depuis Paramètres ; TOUTES les vibrations passent
  // par Juice.vibrer, donc couper ici les coupe partout.
  var CLE_VIBRATION = "life-rpg-vibration";

  function vibrationsActives() {
    try { return localStorage.getItem(CLE_VIBRATION) !== "0"; }
    catch (e) { return true; }
  }

  function definirVibrations(v) {
    try { localStorage.setItem(CLE_VIBRATION, v ? "1" : "0"); } catch (e) {}
  }

  function basculerVibrations() {
    var v = !vibrationsActives();
    definirVibrations(v);
    return v;
  }

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
    if (!vibrationsActives()) return; // réglage coupé : aucune vibration
    if (navigator.vibrate) navigator.vibrate(duree);
  }

  // Bannière en haut de l'écran ("NIVEAU 13", "CARTE DÉBLOQUÉE Semaine de fer") :
  // apparaît, reste ~2s, disparaît. Jamais bloquante. La classe optionnelle
  // permet de teinter le bandeau (rareté d'une carte).
  function bandeau(etiquette, valeur, classe) {
    var el = document.createElement("div");
    el.className = "bandeau-niveau" + (classe ? " " + classe : "");
    // Le grand mot (valeur) n'est rendu que s'il existe : un bandeau
    // sans valeur reste une simple ligne discrète, sans espace vide.
    el.innerHTML =
      '<span class="bandeau-etiquette"></span>' +
      (valeur ? '<span class="bandeau-valeur"></span>' : "");
    el.querySelector(".bandeau-etiquette").textContent = etiquette;
    if (valeur) el.querySelector(".bandeau-valeur").textContent = valeur;
    document.body.appendChild(el);
    setTimeout(function () { el.remove(); }, 2600);
  }

  function bandeauNiveau(niveau) {
    bandeau("Niveau", niveau);
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
    bandeau: bandeau,
    bandeauNiveau: bandeauNiveau,
    pulser: pulser,
    vibrationsActives: vibrationsActives,
    definirVibrations: definirVibrations,
    basculerVibrations: basculerVibrations
  };
})();
