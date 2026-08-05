// ============================================
// LIFE RPG — api/_limite.js
// Garde-fou de débit pour /api/ia. Seul but : stopper un abus
// FLAGRANT (script en boucle, bot) qui brûlerait le quota Groq —
// jamais gêner un vrai joueur. Limites volontairement TRÈS larges.
//
// Choix : compteurs EN MÉMOIRE. Aucune dépendance, aucun service
// externe, aucune configuration — actif dès le déploiement.
//
// Les fonctions serverless étant multi-instances, ces compteurs sont
// par INSTANCE (et remis à zéro au démarrage à froid). Ce n'est donc
// PAS un quota comptable exact — mais c'est exactement le cas d'abus
// visé :
//   - un script qui martèle en boucle garde UNE instance chaude et
//     retombe dessus : il est stoppé net ;
//   - le budget global (par instance) plafonne la casse même si l'IP
//     est falsifiée dans les en-têtes.
// Un vrai joueur (quelques appels par minute) n'atteint jamais ces
// seuils. C'est un coupe-circuit contre l'emballement, pas un péage.
//
// FAIL-SAFE : la moindre anomalie -> on laisse passer (le jeu prime).
//
// Seuils surchargeables (facultatif) par variable d'environnement :
//   LIMITE_IP_MIN (60)  LIMITE_IP_JOUR (1000)  BUDGET_GLOBAL_JOUR (2000, 0=off)
// ============================================

function nombreEnv(nom, defaut) {
  var n = parseInt(process.env[nom], 10);
  return isNaN(n) || n < 0 ? defaut : n;
}

var LIMITE_MIN = nombreEnv("LIMITE_IP_MIN", 60);          // requêtes / minute / IP
var LIMITE_JOUR = nombreEnv("LIMITE_IP_JOUR", 1000);      // requêtes / jour   / IP
var BUDGET_GLOBAL = nombreEnv("BUDGET_GLOBAL_JOUR", 2000);// req / jour, toutes IP (0 = off)

var MINUTE = 60000, JOUR = 86400000; // ms
var MAX_IPS = 10000;                 // borne mémoire dure (anti-gonflement)

var parIp = new Map();               // ip -> { min:{reset,n}, jour:{reset,n} }
var glob = { reset: 0, n: 0 };       // budget global de l'instance
var dernierBalayage = 0;

// IP appelante : sur Vercel, x-real-ip porte l'IP réelle du client ;
// x-forwarded-for sert de repli.
function ipDe(req) {
  var h = req.headers || {};
  var xri = h["x-real-ip"];
  if (typeof xri === "string" && xri) return xri.trim();
  var xff = h["x-forwarded-for"];
  if (typeof xff === "string" && xff) return xff.split(",")[0].trim();
  return "inconnue";
}

// Compteur à fenêtre glissante par pas fixe : la fenêtre se réarme
// quand elle a expiré. Renvoie le compte après incrément.
function compter(etat, duree, maintenant) {
  if (maintenant >= etat.reset) { etat.reset = maintenant + duree; etat.n = 0; }
  etat.n += 1;
  return etat.n;
}

// Purge périodique des IP dont la fenêtre-jour est expirée (borne mémoire).
function balayer(maintenant) {
  if (maintenant - dernierBalayage < MINUTE) return;
  dernierBalayage = maintenant;
  parIp.forEach(function (e, ip) {
    if (maintenant >= e.jour.reset) parIp.delete(ip);
  });
}

// Vérifie (et incrémente) les compteurs. Retourne :
//   null            -> requête autorisée (poursuivre vers Groq)
//   { code, corps } -> requête à refuser (le handler répond tel quel,
//                      sans jamais appeler Groq)
function verifier(req) {
  try {
    var maintenant = Date.now();
    balayer(maintenant);

    // 1) Limite par IP (minute + jour). Le budget global n'est PAS
    //    grevé par une requête déjà refusée ici.
    var ip = ipDe(req);
    var e = parIp.get(ip);
    if (!e && parIp.size < MAX_IPS) {
      e = { min: { reset: 0, n: 0 }, jour: { reset: 0, n: 0 } };
      parIp.set(ip, e);
    }
    if (e) {
      var nMin = compter(e.min, MINUTE, maintenant);
      var nJour = compter(e.jour, JOUR, maintenant);
      if (nMin > LIMITE_MIN || nJour > LIMITE_JOUR) {
        return { code: 429, corps: { erreur: "Trop de requêtes" } };
      }
    }

    // 2) Ceinture + bretelles : budget quotidien GLOBAL de l'instance,
    //    compté seulement pour les requêtes qui vont réellement
    //    solliciter Groq. Épuisé -> échec propre : le front retombe sur
    //    son contenu de secours, comme pour n'importe quel échec amont.
    if (BUDGET_GLOBAL > 0) {
      var nGlobal = compter(glob, JOUR, maintenant);
      if (nGlobal > BUDGET_GLOBAL) {
        return { code: 503, corps: { erreur: "Le Système est silencieux" } };
      }
    }

    return null;
  } catch (err) {
    return null; // fail-safe : jamais bloquer un joueur sur un bug interne
  }
}

module.exports = { verifier: verifier };
