// ============================================
// LIFE RPG — api/push-cron.js
// Endpoint déclenché par un planificateur externe (GitHub Actions),
// plusieurs fois par jour. Pour chaque abonné :
//   - calcule sa date/heure locales ;
//   - JAMAIS de push un jour de repos, ni après quêtes du jour faites ;
//   - tire (une fois par jour) 3 créneaux au hasard, un par fenêtre ;
//   - envoie au plus UN rappel par réveil, le créneau échu le plus
//     récent, avec le message adapté (gel, dernier moment, semaine…).
//
// Protégé par CRON_SECRET (en-tête Authorization ou ?cle=). Sans
// secret configuré, l'endpoint refuse tout : il ne s'expose pas.
// ============================================

var PUSH = require("./_push.js");
var PLAN = require("./_planificateur.js");
var MESSAGES = require("./_messages-push.js");

function repondre(res, code, objet) {
  res.status(code).json(objet);
}

function autorise(req) {
  var attendu = process.env.CRON_SECRET;
  if (!attendu) return false; // pas de secret -> endpoint fermé
  var entete = req.headers["authorization"] || "";
  if (entete === "Bearer " + attendu) return true;
  try {
    var url = new URL(req.url, "http://x");
    return url.searchParams.get("cle") === attendu;
  } catch (e) {
    return false;
  }
}

async function traiterAbonne(id, nowMs) {
  var enr = await PUSH.lireAbonne(id);
  if (!enr || !enr.abonnement) return "ignore";
  var d = enr.drapeaux || {};

  var tz = d.tz || "UTC";
  var repere = PLAN.jourLocal(nowMs, tz);

  // Jour de repos (en LOCAL) -> aucun push.
  if (!PLAN.estJourEngagement(repere.jourSemaine, d.joursEngagement)) return "repos";

  // Quêtes faites -> plus aucun rappel. MAIS le drapeau ne vaut que
  // pour le jour LOCAL auquel il se rattache : un drapeau d'hier (client
  // pas rouvert depuis) ne doit pas bloquer les rappels d'aujourd'hui.
  if (d.quetesFaites && d.dateLocale === repere.dateLocale) return "faites";

  // Plan du jour LOCAL : tiré une seule fois, puis relu tel quel. La clé
  // est datée en local -> il se réinitialise au changement de jour local
  // (marqueurs "déjà envoyé" par fenêtre remis à zéro).
  var plan = await PUSH.lirePlan(id, repere.dateLocale);
  if (!plan || !Array.isArray(plan.creneaux)) {
    plan = { creneaux: PLAN.genererCreneaux(repere.dateLocale, tz), gelEnvoye: false };
    await PUSH.sauverPlan(id, repere.dateLocale, plan);
  }

  var choix = PLAN.choisirEnvoi(plan, nowMs, {
    quetesFaites: d.quetesFaites,
    gelEnAttente: d.gelEnAttente,
    jourSemaine: repere.jourSemaine
  });
  if (!choix) return "rien";

  var message = MESSAGES.tirer(choix.categorie);
  var envoi = await PUSH.envoyer(enr.abonnement, {
    titre: message.titre,
    corps: message.corps,
    url: "/index.html"
  });

  // Échec PERMANENT (404/410) : l'abonnement est mort -> on le supprime.
  if (envoi.mort) {
    await PUSH.oublierId(id);
    return "mort";
  }

  // Marqueurs anti-double-envoi. La fenêtre cible n'est consommée que si
  // l'envoi a réussi ; un échec transitoire (429/5xx) sera réessayé.
  PLAN.appliquerEnvoi(plan, choix, envoi.ok);
  await PUSH.sauverPlan(id, repere.dateLocale, plan);

  return envoi.ok ? "envoye" : "echec";
}

module.exports = async function (req, res) {
  if (!autorise(req)) {
    return repondre(res, 401, { erreur: "Non autorisé" });
  }
  if (!PUSH.storePret() || !PUSH.vapidPret) {
    return repondre(res, 503, { erreur: "Push non configuré" });
  }

  var nowMs = Date.now();
  var ids = await PUSH.listerIds();

  var bilan = { abonnes: ids.length, envoye: 0, repos: 0, faites: 0, rien: 0, mort: 0 };
  for (var i = 0; i < ids.length; i++) {
    var issue;
    try {
      issue = await traiterAbonne(ids[i], nowMs);
    } catch (e) {
      issue = "erreur";
    }
    if (bilan[issue] !== undefined) bilan[issue] += 1;
  }

  return repondre(res, 200, { ok: true, bilan: bilan });
};
