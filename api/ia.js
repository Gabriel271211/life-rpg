// ============================================
// LIFE RPG — api/ia.js
// Fonction serverless Vercel : l'unique porte vers
// l'IA (Groq). La clé vit dans process.env.GROQ_API_KEY,
// jamais dans le front. POST { type, donnees } ->
// réponse JSON validée et bornée par type.
//
// Principes :
// - validation stricte maison (aucune librairie) :
//   structure exigée, valeurs hors borne clampées,
//   JSON amont invalide -> 502 propre
// - entrée utilisateur limitée et filtrée : seuls les
//   champs listés par type partent vers Groq, jamais
//   de prénom ni d'historique complet
// - timeout amont ~20 s, erreurs toujours en JSON
// ============================================

var PROMPTS = require("./_prompts.js");

var GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
var MODELE = "llama-3.3-70b-versatile";
var TIMEOUT_AMONT = 20000;   // ms
var MAX_CORPS = 10000;       // taille brute maximale du corps de requête

// ----- Outils de validation -----

function texte(valeur, max) {
  if (typeof valeur !== "string") return "";
  return valeur.trim().slice(0, max);
}

function entier(valeur, min, max, defaut) {
  var n = parseInt(valeur, 10);
  if (isNaN(n)) n = defaut;
  return Math.min(max, Math.max(min, n));
}

function parmi(valeur, liste, defaut) {
  return liste.indexOf(valeur) !== -1 ? valeur : defaut;
}

var STATS = ["corps", "esprit", "discipline"];
var CLASSES = ["Athlète", "Érudit", "Entrepreneur", "Sage", "Stratège", "Créateur", "Aventurier"];
var LIENS = ["seance", "minuterie:corps", "minuterie:esprit", "minuterie:discipline", "journee", "quete"];

// Une quête quotidienne générée : structure exigée, bornes clampées
// (XP 5-50, durée 20-7200 s, séries 1-10, repos 10-300).
function validerQueteQuotidienne(q) {
  if (!q || typeof q !== "object") return null;
  var nom = texte(q.nom, 60);
  if (!nom) return null;
  var quete = {
    nom: nom,
    xp: entier(q.xp, 5, 50, 20),
    stat: parmi(q.stat, STATS, "discipline"),
    type: parmi(q.type, ["simple", "minuterie", "series"], "simple")
  };
  if (quete.type === "minuterie") {
    quete.duree = entier(q.duree, 20, 7200, 1200);
  } else if (quete.type === "series") {
    quete.series = entier(q.series, 1, 10, 3);
    quete.parSerie = texte(q.parSerie, 60) || nom;
    quete.repos = entier(q.repos, 10, 300, 60);
  }
  return quete;
}

// ----- Types d'appels -----
// Chaque type définit : son prompt système, la construction du message
// utilisateur (filtrage strict de l'entrée) et la validation de la
// sortie. Un type absent d'ici n'existe pas -> 400.

var TYPES = {

  onboarding: {
    json: true,
    // Entrée : { objectif, deadline, tempsParJour, niveau } — rien d'autre
    // ne part vers Groq (jamais le prénom).
    message: function (d) {
      if (!d || typeof d !== "object") return null;
      var objectif = texte(d.objectif, 500).slice(0, 80);
      if (!objectif) return null;
      return "Objectif du joueur : " + objectif +
        "\nDeadline visée : " + parmi(d.deadline, ["1 mois", "3 mois", "6 mois", "12 mois"], "3 mois") +
        "\nTemps disponible par jour : " + parmi(d.tempsParJour, ["15 min", "30 min", "60+ min"], "30 min") +
        "\nNiveau de départ : " + parmi(d.niveau, ["Débutant", "Intermédiaire", "Avancé"], "Débutant");
    },
    // Sortie : { classe, quetePrincipale{titre,description,niveau,jalons[]},
    // quetesQuotidiennes[], hebdo } — bornée, ou null si structure invalide.
    valider: function (o) {
      if (!o || typeof o !== "object") return null;

      var qp = o.quetePrincipale;
      if (!qp || typeof qp !== "object" || !Array.isArray(qp.jalons)) return null;
      var jalons = [];
      qp.jalons.slice(0, 4).forEach(function (j) {
        if (!j || typeof j !== "object") return;
        var nom = texte(j.nom, 40);
        if (nom) jalons.push({ nom: nom, critere: texte(j.critere, 120) });
      });
      if (jalons.length < 3) return null;

      if (!Array.isArray(o.quetesQuotidiennes)) return null;
      var quetes = [];
      o.quetesQuotidiennes.slice(0, 4).forEach(function (q) {
        var propre = validerQueteQuotidienne(q);
        if (propre) quetes.push(propre);
      });
      if (quetes.length < 2) return null;

      var h = o.hebdo;
      if (!h || typeof h !== "object" || !texte(h.nom, 60)) return null;

      return {
        classe: parmi(o.classe, CLASSES, "Aventurier"),
        quetePrincipale: {
          titre: texte(qp.titre, 60) || "Ta quête",
          description: texte(qp.description, 120),
          niveau: 1,
          jalons: jalons
        },
        quetesQuotidiennes: quetes,
        hebdo: {
          nom: texte(h.nom, 60),
          xp: entier(h.xp, 50, 300, 150),
          stat: parmi(h.stat, STATS, "discipline"),
          objectif: entier(h.objectif, 1, 7, 5),
          lien: LIENS.indexOf(h.lien) !== -1 ? h.lien : null
        }
      };
    }
  }
};

// ----- Réponses -----

function repondre(res, code, objet) {
  res.status(code).json(objet);
}

// ----- Handler -----

module.exports = async function (req, res) {
  if (req.method !== "POST") {
    return repondre(res, 405, { erreur: "POST uniquement" });
  }

  // Corps : Vercel parse le JSON ; on reste défensif (chaîne brute,
  // corps démesuré, structure absente -> 400).
  var corps = req.body;
  if (typeof corps === "string") {
    if (corps.length > MAX_CORPS) return repondre(res, 400, { erreur: "Requête trop longue" });
    try { corps = JSON.parse(corps); } catch (e) { corps = null; }
  }
  if (!corps || typeof corps !== "object") {
    return repondre(res, 400, { erreur: "Requête malformée" });
  }
  if (JSON.stringify(corps).length > MAX_CORPS) {
    return repondre(res, 400, { erreur: "Requête trop longue" });
  }

  var type = TYPES[corps.type];
  if (!type) {
    return repondre(res, 400, { erreur: "Type d'appel inconnu" });
  }

  var message = type.message(corps.donnees);
  if (message === null) {
    return repondre(res, 400, { erreur: "Données manquantes ou malformées" });
  }

  var cle = process.env.GROQ_API_KEY;
  if (!cle) {
    return repondre(res, 500, { erreur: "Clé IA non configurée" });
  }

  // Appel Groq, coupé net après TIMEOUT_AMONT.
  var controleur = new AbortController();
  var minuteur = setTimeout(function () { controleur.abort(); }, TIMEOUT_AMONT);

  var reponse = null;
  try {
    reponse = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + cle
      },
      signal: controleur.signal,
      body: JSON.stringify({
        model: MODELE,
        messages: [
          { role: "system", content: PROMPTS[corps.type] },
          { role: "user", content: message }
        ],
        response_format: type.json ? { type: "json_object" } : undefined,
        temperature: 0.7
      })
    });
  } catch (e) {
    clearTimeout(minuteur);
    return repondre(res, 502, { erreur: "Le Système est silencieux" });
  }
  clearTimeout(minuteur);

  if (!reponse.ok) {
    return repondre(res, 502, { erreur: "Le Système est silencieux" });
  }

  var contenu = null;
  try {
    var donnees = await reponse.json();
    contenu = donnees.choices[0].message.content;
  } catch (e) {
    return repondre(res, 502, { erreur: "Réponse amont illisible" });
  }

  // Types JSON : parse + validation stricte. Type "chat" (à venir) :
  // le texte brut serait renvoyé tel quel, tronqué.
  var objet = null;
  try {
    objet = JSON.parse(contenu);
  } catch (e) {
    return repondre(res, 502, { erreur: "Réponse amont invalide" });
  }

  var valide = type.valider(objet);
  if (valide === null) {
    return repondre(res, 502, { erreur: "Réponse amont invalide" });
  }

  return repondre(res, 200, valide);
};
