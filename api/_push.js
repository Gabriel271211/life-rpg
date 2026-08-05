// ============================================
// LIFE RPG — api/_push.js
// Socle des notifications push (app fermée) :
//   - petit client Upstash Redis via API REST (fetch, sans SDK) pour
//     PERSISTER les abonnements et l'état du jour entre les réveils du
//     planificateur ;
//   - envoi Web Push chiffré (VAPID) via la lib `web-push`.
//
// Données stockées, STRICT minimum (jamais le prénom, rien de sensible) :
//   push:ids                       -> set des identifiants d'abonnés
//   push:ab:<id>                   -> { abonnement, drapeaux, maj }
//   push:plan:<id>:<dateLocale>    -> plan du jour (créneaux tirés au sort)
//
// Config (variables d'environnement Vercel) :
//   UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN  (le store)
//   VAPID_PUBLIC / VAPID_PRIVATE / VAPID_SUBJECT        (clés push)
//   CRON_SECRET                                          (protège le cron)
// ============================================

var webpush = require("web-push");

var URL_REST = process.env.UPSTASH_REDIS_REST_URL;
var TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

var VAPID_PUBLIC = process.env.VAPID_PUBLIC;
var VAPID_PRIVATE = process.env.VAPID_PRIVATE;
var VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:life-rpg@exemple.app";

var vapidPret = false;
if (VAPID_PUBLIC && VAPID_PRIVATE) {
  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
    vapidPret = true;
  } catch (e) {
    vapidPret = false;
  }
}

function storePret() { return Boolean(URL_REST && TOKEN); }

// ----- Client Upstash REST -----

var TIMEOUT_STORE = 4000; // ms

async function pipeline(commandes) {
  var controleur = new AbortController();
  var minuteur = setTimeout(function () { controleur.abort(); }, TIMEOUT_STORE);
  try {
    var reponse = await fetch(URL_REST + "/pipeline", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + TOKEN
      },
      signal: controleur.signal,
      body: JSON.stringify(commandes)
    });
    clearTimeout(minuteur);
    if (!reponse.ok) return null;
    var data = await reponse.json();
    return Array.isArray(data) ? data : null;
  } catch (e) {
    clearTimeout(minuteur);
    return null;
  }
}

async function cmd() {
  var res = await pipeline([Array.prototype.slice.call(arguments)]);
  return res && res[0] ? res[0].result : null;
}

// ----- Abonnements -----

// Identifiant stable et opaque dérivé de l'endpoint du navigateur
// (jamais l'endpoint brut en clair comme clé lisible).
function idAbonne(endpoint) {
  var h = 5381;
  for (var i = 0; i < endpoint.length; i++) {
    h = ((h << 5) + h + endpoint.charCodeAt(i)) >>> 0;
  }
  return "a" + h.toString(36) + "_" + endpoint.length.toString(36);
}

async function enregistrer(abonnement, drapeaux) {
  if (!storePret()) return false;
  var id = idAbonne(abonnement.endpoint);
  var valeur = JSON.stringify({ abonnement: abonnement, drapeaux: drapeaux || {}, maj: Date.now() });
  var res = await pipeline([
    ["SET", "push:ab:" + id, valeur],
    ["SADD", "push:ids", id]
  ]);
  return Boolean(res);
}

async function oublier(endpoint) {
  if (!storePret()) return false;
  var id = idAbonne(endpoint);
  var res = await pipeline([
    ["DEL", "push:ab:" + id],
    ["SREM", "push:ids", id]
  ]);
  return Boolean(res);
}

// Supprime par id (utilisé par le cron quand un abonnement est mort).
async function oublierId(id) {
  if (!storePret()) return false;
  await pipeline([
    ["DEL", "push:ab:" + id],
    ["SREM", "push:ids", id]
  ]);
  return true;
}

async function listerIds() {
  if (!storePret()) return [];
  var ids = await cmd("SMEMBERS", "push:ids");
  return Array.isArray(ids) ? ids : [];
}

async function lireAbonne(id) {
  var brut = await cmd("GET", "push:ab:" + id);
  if (!brut) return null;
  try { return JSON.parse(brut); } catch (e) { return null; }
}

// ----- Plan du jour (créneaux tirés au sort) -----

async function lirePlan(id, dateLocale) {
  var brut = await cmd("GET", "push:plan:" + id + ":" + dateLocale);
  if (!brut) return null;
  try { return JSON.parse(brut); } catch (e) { return null; }
}

async function sauverPlan(id, dateLocale, plan) {
  // TTL 2 jours : le plan d'hier disparaît de lui-même.
  await pipeline([
    ["SET", "push:plan:" + id + ":" + dateLocale, JSON.stringify(plan)],
    ["EXPIRE", "push:plan:" + id + ":" + dateLocale, 172800]
  ]);
}

// ----- Envoi Web Push -----

// Retourne { ok, mort } — mort = l'abonnement n'existe plus (404/410),
// le cron doit l'oublier.
async function envoyer(abonnement, charge) {
  if (!vapidPret) return { ok: false, mort: false };
  try {
    await webpush.sendNotification(abonnement, JSON.stringify(charge), { TTL: 3600 });
    return { ok: true, mort: false };
  } catch (e) {
    var code = e && e.statusCode;
    return { ok: false, mort: code === 404 || code === 410 };
  }
}

module.exports = {
  storePret: storePret,
  vapidPret: vapidPret,
  VAPID_PUBLIC: VAPID_PUBLIC,
  idAbonne: idAbonne,
  enregistrer: enregistrer,
  oublier: oublier,
  oublierId: oublierId,
  listerIds: listerIds,
  lireAbonne: lireAbonne,
  lirePlan: lirePlan,
  sauverPlan: sauverPlan,
  envoyer: envoyer
};
