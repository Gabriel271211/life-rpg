// ============================================
// LIFE RPG — api/_planificateur.js
// Logique PURE (aucun réseau, aucun store) des rappels :
//   - convertir l'instant courant en date/heure LOCALES du joueur ;
//   - tirer au hasard un créneau par fenêtre (matin / après-midi /
//     soir), à des heures DIFFÉRENTES chaque jour ;
//   - décider, à chaque réveil du planificateur, s'il faut envoyer un
//     rappel maintenant et lequel.
// Fonctions pures et déterministes (aléa injectable) -> testables.
// ============================================

// Fenêtres en minutes locales depuis minuit.
var FENETRES = [
  { nom: "matin", debut: 8 * 60, fin: 11 * 60 },      // 08:00 – 11:00
  { nom: "aprem", debut: 13 * 60, fin: 17 * 60 },     // 13:00 – 17:00
  { nom: "soir", debut: 19 * 60, fin: 21 * 60 + 30 }  // 19:00 – 21:30
];

function pad(n) { return n < 10 ? "0" + n : "" + n; }

// Instant UTC -> repères LOCAUX du joueur (offset = getTimezoneOffset(),
// négatif à l'est de UTC). On décale l'epoch pour que les getters UTC
// lisent l'heure murale locale.
function jourLocal(nowMs, tzOffsetMin) {
  var d = new Date(nowMs - tzOffsetMin * 60000);
  return {
    dateLocale: d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()),
    jourSemaine: (d.getUTCDay() + 6) % 7,          // 0 = lundi ... 6 = dimanche
    minutesDepuisMinuit: d.getUTCHours() * 60 + d.getUTCMinutes()
  };
}

// La date locale (AAAA-MM-JJ) est-elle un jour d'engagement ?
function estJourEngagement(jourSemaine, joursEngagement) {
  return Array.isArray(joursEngagement) && joursEngagement.indexOf(jourSemaine) !== -1;
}

// Heure locale (min) -> instant UTC réel pour cette date locale.
function versUTC(dateLocale, minuteLocale, tzOffsetMin) {
  var p = dateLocale.split("-");
  var minuit = Date.UTC(parseInt(p[0], 10), parseInt(p[1], 10) - 1, parseInt(p[2], 10));
  return minuit + (minuteLocale + tzOffsetMin) * 60000;
}

// Tire un créneau (timestamp UTC) par fenêtre pour la journée. `rnd`
// est injectable pour des tests déterministes.
function genererCreneaux(dateLocale, tzOffsetMin, rnd) {
  rnd = rnd || Math.random;
  return FENETRES.map(function (f) {
    var minute = f.debut + Math.floor(rnd() * (f.fin - f.debut + 1));
    return { ts: versUTC(dateLocale, minute, tzOffsetMin), fenetre: f.nom, envoye: false };
  }).sort(function (a, b) { return a.ts - b.ts; });
}

// Décide quoi envoyer MAINTENANT.
//   plan      : { creneaux: [{ts, fenetre, envoye}], gelEnvoye }
//   nowMs     : instant courant
//   contexte  : { quetesFaites, gelEnAttente, jourSemaine }
// Retourne null (rien à envoyer) ou :
//   { index, aConsommer:[...], categorie }
// index         = créneau à envoyer (le plus récent dû, jamais de rafale)
// aConsommer    = indices à marquer envoyés (les créneaux dépassés)
// categorie     = clé de la banque de messages
function choisirEnvoi(plan, nowMs, contexte) {
  // Règle absolue : plus rien une fois les quêtes du jour faites.
  if (contexte.quetesFaites) return null;

  var dus = [];
  plan.creneaux.forEach(function (c, i) {
    if (!c.envoye && c.ts <= nowMs) dus.push(i);
  });
  if (dus.length === 0) return null;

  var index = dus[dus.length - 1];          // le plus récent dû
  var fenetre = plan.creneaux[index].fenetre;

  var categorie;
  if (contexte.gelEnAttente && !plan.gelEnvoye) {
    categorie = "gel";                       // gel consommé la veille : priorité
  } else if (fenetre === "soir") {
    categorie = "dernierMoment";             // dernier rappel, plus marqué
  } else if (contexte.jourSemaine === 0 && fenetre === "matin") {
    categorie = "nouvelleSemaine";           // lundi matin : nouvelle semaine
  } else {
    categorie = "rappel";                    // rappel générique
  }

  return { index: index, aConsommer: dus, categorie: categorie };
}

module.exports = {
  FENETRES: FENETRES,
  jourLocal: jourLocal,
  estJourEngagement: estJourEngagement,
  versUTC: versUTC,
  genererCreneaux: genererCreneaux,
  choisirEnvoi: choisirEnvoi
};
