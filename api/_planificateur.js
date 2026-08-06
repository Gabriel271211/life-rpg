// ============================================
// LIFE RPG — api/_planificateur.js
// Logique PURE (aucun réseau, aucun store) des rappels :
//   - convertir l'instant courant en date/heure LOCALES du joueur, à
//     partir de son fuseau IANA (ex. "Europe/Paris") — jamais un simple
//     décalage numérique, qui casserait au changement d'heure été/hiver ;
//   - tirer au hasard un créneau par fenêtre (matin / après-midi /
//     soir), à des heures différentes chaque jour ;
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

// Un fuseau IANA est-il exploitable par le moteur ?
function fuseauValide(tz) {
  if (typeof tz !== "string" || !tz) return false;
  try { new Intl.DateTimeFormat("en-US", { timeZone: tz }); return true; }
  catch (e) { return false; }
}

// Décalage (ms) entre l'heure LOCALE du fuseau et UTC, à l'instant tsUtc.
// Recalculé à chaque appel -> suit automatiquement l'heure d'été/hiver.
function decalageMs(tsUtc, tz) {
  var dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });
  var m = {};
  dtf.formatToParts(new Date(tsUtc)).forEach(function (p) { m[p.type] = p.value; });
  var h = m.hour === "24" ? 0 : parseInt(m.hour, 10); // certains moteurs rendent "24"
  var commeUTC = Date.UTC(+m.year, +m.month - 1, +m.day, h, +m.minute, +m.second);
  return commeUTC - tsUtc;
}

// Instant UTC -> repères LOCAUX du joueur (date, jour de semaine, minute).
function jourLocal(nowMs, tz) {
  if (!fuseauValide(tz)) tz = "UTC";
  var d = new Date(nowMs + decalageMs(nowMs, tz)); // getters UTC = heure murale locale
  return {
    dateLocale: d.getUTCFullYear() + "-" + pad(d.getUTCMonth() + 1) + "-" + pad(d.getUTCDate()),
    jourSemaine: (d.getUTCDay() + 6) % 7,          // 0 = lundi ... 6 = dimanche
    minutesDepuisMinuit: d.getUTCHours() * 60 + d.getUTCMinutes()
  };
}

// La date locale est-elle un jour d'engagement ?
function estJourEngagement(jourSemaine, joursEngagement) {
  return Array.isArray(joursEngagement) && joursEngagement.indexOf(jourSemaine) !== -1;
}

// Heure locale (min) d'une date locale -> instant UTC réel. Une passe de
// raffinage gère proprement les bords de changement d'heure.
function versUTC(dateLocale, minuteLocale, tz) {
  if (!fuseauValide(tz)) tz = "UTC";
  var p = dateLocale.split("-");
  var murAsUTC = Date.UTC(+p[0], +p[1] - 1, +p[2], Math.floor(minuteLocale / 60), minuteLocale % 60);
  var dec = decalageMs(murAsUTC, tz);
  var reel = murAsUTC - dec;
  var dec2 = decalageMs(reel, tz);
  if (dec2 !== dec) reel = murAsUTC - dec2;
  return reel;
}

// Tire un créneau (timestamp UTC) par fenêtre pour la journée locale.
// `rnd` est injectable pour des tests déterministes.
function genererCreneaux(dateLocale, tz, rnd) {
  rnd = rnd || Math.random;
  return FENETRES.map(function (f) {
    var minute = f.debut + Math.floor(rnd() * (f.fin - f.debut + 1));
    return { ts: versUTC(dateLocale, minute, tz), fenetre: f.nom, envoye: false };
  }).sort(function (a, b) { return a.ts - b.ts; });
}

// Décide quoi envoyer MAINTENANT.
//   plan      : { creneaux: [{ts, fenetre, envoye}], gelEnvoye }
//   nowMs     : instant courant
//   contexte  : { quetesFaites, gelEnAttente, jourSemaine }
// Retourne null (rien à envoyer) ou :
//   { index, aConsommer:[...], categorie }
// index      = créneau à envoyer (le plus récent dû, jamais de rafale)
// aConsommer = indices à marquer envoyés (les créneaux dépassés)
// categorie  = clé de la banque de messages
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

// Applique au plan le résultat d'un envoi (marqueurs anti-double-envoi).
// Pur, donc testable.
//   - fenêtres échues SAUTÉES (dépassées, hors cible) : marquées quoi
//     qu'il arrive -> jamais de rafale de rattrapage ;
//   - fenêtre CIBLE : marquée seulement si l'envoi a RÉUSSI. Un échec
//     TRANSITOIRE (429/5xx, réseau) la laisse ouverte pour un nouvel
//     essai au prochain passage ;
//   - gelEnvoye n'est posé qu'après un envoi de gel réussi.
function appliquerEnvoi(plan, choix, envoiOk) {
  choix.aConsommer.forEach(function (i) {
    if (i !== choix.index) plan.creneaux[i].envoye = true;
  });
  if (envoiOk) {
    plan.creneaux[choix.index].envoye = true;
    if (choix.categorie === "gel") plan.gelEnvoye = true;
  }
  return plan;
}

module.exports = {
  FENETRES: FENETRES,
  fuseauValide: fuseauValide,
  decalageMs: decalageMs,
  jourLocal: jourLocal,
  estJourEngagement: estJourEngagement,
  versUTC: versUTC,
  genererCreneaux: genererCreneaux,
  choisirEnvoi: choisirEnvoi,
  appliquerEnvoi: appliquerEnvoi
};
