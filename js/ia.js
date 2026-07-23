// ============================================
// LIFE RPG — ia.js
// Client de la fonction serverless /api/ia.
// IA.appeler(type, donnees, options) -> Promise du JSON
// validé par le serveur, ou null sur TOUT échec
// (réseau, 4xx/5xx, timeout, JSON invalide) :
// chaque appelant a un contenu de secours, l'IA
// ne casse jamais le jeu. Anti-spam local : un
// même type au plus une fois toutes les 10 s —
// SAUF si options.forcer, pour les (re)générations
// déclenchées par un clic explicite de l'utilisateur
// (bouton "Régénérer", "Demander au Système"...) qui
// suivent de près un premier appel du même type.
// ============================================

var IA = (function () {

  var TIMEOUT = 25000;    // ms
  var DELAI_MIN = 10000;  // ms entre deux appels d'un même type

  // Message sobre à afficher quand un appelant veut signaler l'échec.
  var MESSAGE_SILENCE = "Le Système est silencieux — réessaie plus tard.";

  var derniers = {}; // type -> timestamp du dernier appel

  function appeler(type, donnees, options) {
    var forcer = options && options.forcer;
    // Un appel forcé ignore complètement le throttle (ni lu ni écrit) :
    // une régénération volontaire ne doit pas être bloquée par le
    // premier appel, ni bloquer les appels suivants.
    if (!forcer) {
      var maintenant = Date.now();
      if (derniers[type] && maintenant - derniers[type] < DELAI_MIN) {
        // Relance trop rapprochée : refus silencieux, l'appelant
        // retombe sur son contenu de secours.
        return Promise.resolve(null);
      }
      derniers[type] = maintenant;
    }

    var controleur = typeof AbortController !== "undefined" ? new AbortController() : null;
    var minuteur = controleur
      ? setTimeout(function () { controleur.abort(); }, TIMEOUT)
      : null;

    return fetch("/api/ia", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type: type, donnees: donnees || {} }),
      signal: controleur ? controleur.signal : undefined
    }).then(function (reponse) {
      if (!reponse.ok) return null;
      return reponse.json().catch(function () { return null; });
    }).catch(function () {
      return null;
    }).then(function (resultat) {
      if (minuteur) clearTimeout(minuteur);
      return resultat;
    });
  }

  return {
    appeler: appeler,
    MESSAGE_SILENCE: MESSAGE_SILENCE
  };
})();
