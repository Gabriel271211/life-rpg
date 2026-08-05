// ============================================
// LIFE RPG — api/push.js
// Porte des abonnements push côté client.
//   GET               -> { clePublique } (clé VAPID publique à embarquer)
//   POST { action }   -> "abonner" | "synchro" | "desabonner"
//
// Ne stocke QUE le strict minimum (abonnement + quelques drapeaux
// d'état), jamais le prénom, jamais d'historique. Voir _push.js.
// ============================================

var PUSH = require("./_push.js");

function repondre(res, code, objet) {
  res.status(code).json(objet);
}

// ----- Nettoyage défensif des drapeaux -----

function entier(v, min, max, defaut) {
  var n = parseInt(v, 10);
  if (isNaN(n)) return defaut;
  return Math.min(max, Math.max(min, n));
}

function drapeauxPropres(d) {
  d = d && typeof d === "object" ? d : {};
  var jours = Array.isArray(d.joursEngagement)
    ? d.joursEngagement
        .map(function (j) { return parseInt(j, 10); })
        .filter(function (j) { return j >= 0 && j <= 6; })
    : [];
  var date = typeof d.dateLocale === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d.dateLocale)
    ? d.dateLocale : null;
  return {
    joursEngagement: jours,
    tzOffsetMin: entier(d.tzOffsetMin, -840, 840, 0),
    dateLocale: date,
    quetesFaites: Boolean(d.quetesFaites),
    gelEnAttente: Boolean(d.gelEnAttente),
    streak: entier(d.streak, 0, 99999, 0)
  };
}

// Un abonnement Web Push valide : endpoint http(s) + clés p256dh/auth.
function abonnementValide(a) {
  return a && typeof a === "object" &&
    typeof a.endpoint === "string" &&
    /^https?:\/\//.test(a.endpoint) &&
    a.keys && typeof a.keys === "object" &&
    typeof a.keys.p256dh === "string" &&
    typeof a.keys.auth === "string";
}

module.exports = async function (req, res) {
  // GET : la clé publique VAPID, pour que le client puisse s'abonner.
  if (req.method === "GET") {
    if (!PUSH.VAPID_PUBLIC) {
      return repondre(res, 503, { erreur: "Push non configuré" });
    }
    return repondre(res, 200, { clePublique: PUSH.VAPID_PUBLIC });
  }

  if (req.method !== "POST") {
    return repondre(res, 405, { erreur: "Méthode non autorisée" });
  }

  if (!PUSH.storePret()) {
    // Store non configuré : on l'annonce proprement, le client n'insiste pas.
    return repondre(res, 503, { erreur: "Push non configuré" });
  }

  var corps = req.body;
  if (typeof corps === "string") {
    try { corps = JSON.parse(corps); } catch (e) { corps = null; }
  }
  if (!corps || typeof corps !== "object") {
    return repondre(res, 400, { erreur: "Requête malformée" });
  }

  // Désabonnement : on oublie l'abonnement, rien de plus.
  if (corps.action === "desabonner") {
    var ep = corps.abonnement && corps.abonnement.endpoint;
    if (typeof ep !== "string") return repondre(res, 400, { erreur: "Endpoint manquant" });
    await PUSH.oublier(ep);
    return repondre(res, 200, { ok: true });
  }

  // Abonnement ou synchro : mêmes données, on écrase l'enregistrement.
  if (corps.action === "abonner" || corps.action === "synchro") {
    if (!abonnementValide(corps.abonnement)) {
      return repondre(res, 400, { erreur: "Abonnement invalide" });
    }
    var ok = await PUSH.enregistrer(corps.abonnement, drapeauxPropres(corps.drapeaux));
    if (!ok) return repondre(res, 502, { erreur: "Stockage indisponible" });
    return repondre(res, 200, { ok: true });
  }

  return repondre(res, 400, { erreur: "Action inconnue" });
};
