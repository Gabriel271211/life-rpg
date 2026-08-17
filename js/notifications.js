// ============================================
// LIFE RPG — notifications.js
// Rappels push des jours d'engagement. Entièrement optionnel :
// si le navigateur ne gère pas le push, si la permission est
// refusée, ou si le serveur n'est pas configuré, l'app fonctionne
// exactement pareil — ce module se tait.
//
// Déroulé :
//   - on ne demande RIEN au premier écran ; l'invitation n'apparaît
//     qu'APRÈS un premier jour réussi (streak >= 1) ;
//   - l'utilisateur active d'un geste explicite (bouton) — requis par
//     les navigateurs, et par iOS (PWA installée, iOS 16.4+) ;
//   - une fois abonné, les drapeaux d'état (jours d'engagement, quêtes
//     faites, gel, streak) sont resynchronisés à chaque sauvegarde.
//
// Vie privée : on n'envoie QUE le strict minimum, jamais le prénom.
// ============================================

(function () {

  var CLE_ETAT = "life-rpg-etat-v1";
  var CLE_CHOIX = "life-rpg-push-choix";     // "active" | "refuse" (invitation)
  var CLE_INSTALL = "life-rpg-push-install"; // "vu" (astuce d'installation iOS déjà montrée)
  var DELAI_SYNCHRO = 3000;                  // anti-rafale de re-synchro

  var supporte = ("serviceWorker" in navigator) &&
                 ("PushManager" in window) &&
                 ("Notification" in window);

  // App lancée en mode installé (écran d'accueil) ? Sur iOS, le Web Push
  // n'existe QUE dans ce mode (iOS 16.4+) — jamais dans un onglet Safari.
  var installe = (window.matchMedia &&
                  window.matchMedia("(display-mode: standalone)").matches) ||
                 navigator.standalone === true;

  var ua = navigator.userAgent || "";
  // iPhone/iPad/iPod — l'iPadOS récent se présente comme "Macintosh" mais
  // avec un écran tactile : on le rattrape via maxTouchPoints.
  var estIOS = /iPhone|iPad|iPod/.test(ua) ||
               (/Macintosh/.test(ua) && (navigator.maxTouchPoints || 0) > 1);

  // ----- Lecture SANS effet de bord de l'état -----

  function lireEtat() {
    try {
      var brut = localStorage.getItem(CLE_ETAT);
      if (!brut) return null;
      var etat = JSON.parse(brut);
      return (etat && typeof etat === "object" && !Array.isArray(etat)) ? etat : null;
    } catch (e) {
      return null;
    }
  }

  function pad(n) { return n < 10 ? "0" + n : "" + n; }

  function dateLocale() {
    var d = new Date();
    return d.getFullYear() + "-" + pad(d.getMonth() + 1) + "-" + pad(d.getDate());
  }

  // Fuseau IANA du joueur (ex. "Europe/Paris"). On l'envoie tel quel —
  // pas un décalage numérique, qui casserait au changement d'heure. Le
  // serveur en déduit lui-même l'heure locale, DST compris.
  function fuseau() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      return tz || "UTC";
    } catch (e) {
      return "UTC";
    }
  }

  // Drapeaux STRICT minimum envoyés au serveur.
  function drapeaux(etat) {
    var quetes = Array.isArray(etat.quetes) ? etat.quetes : [];
    var toutesFaites = quetes.length > 0 && quetes.every(function (q) { return q && q.faite; });
    return {
      joursEngagement: Array.isArray(etat.joursEngagement) ? etat.joursEngagement : [],
      tz: fuseau(),
      dateLocale: dateLocale(),
      quetesFaites: toutesFaites,
      gelEnAttente: Boolean(etat.gelEnAttente),
      streak: typeof etat.streak === "number" ? etat.streak : 0
    };
  }

  // Un premier jour réussi a-t-il eu lieu ? (moment d'inviter)
  function jourReussi(etat) {
    return (typeof etat.streak === "number" && etat.streak >= 1) ||
           etat.streakValideAujourdhui === true;
  }

  // ----- Utilitaires push -----

  function base64UrlVersUint8(base64) {
    var padding = "=".repeat((4 - base64.length % 4) % 4);
    var b64 = (base64 + padding).replace(/-/g, "+").replace(/_/g, "/");
    var brut = atob(b64);
    var sortie = new Uint8Array(brut.length);
    for (var i = 0; i < brut.length; i++) sortie[i] = brut.charCodeAt(i);
    return sortie;
  }

  function poster(charge) {
    return fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(charge)
    }).then(function (r) { return r.ok; }).catch(function () { return false; });
  }

  // ----- Abonnement / synchro -----

  function abonnementCourant() {
    return navigator.serviceWorker.ready.then(function (reg) {
      return reg.pushManager.getSubscription();
    });
  }

  function synchroniser() {
    if (!supporte || Notification.permission !== "granted") return;
    var etat = lireEtat();
    if (!etat) return;
    abonnementCourant().then(function (sub) {
      if (!sub) return;
      poster({ action: "synchro", abonnement: sub.toJSON(), drapeaux: drapeaux(etat) });
    }).catch(function () {});
  }

  // Abonne (à la suite d'un geste utilisateur qui a accordé la permission).
  function abonner() {
    var etat = lireEtat();
    if (!etat) return Promise.resolve(false);
    return fetch("/api/push")
      .then(function (r) { return r.ok ? r.json() : null; })
      .then(function (conf) {
        if (!conf || !conf.clePublique) return false;
        return navigator.serviceWorker.ready.then(function (reg) {
          return reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: base64UrlVersUint8(conf.clePublique)
          });
        }).then(function (sub) {
          return poster({ action: "abonner", abonnement: sub.toJSON(), drapeaux: drapeaux(etat) });
        });
      })
      .catch(function () { return false; });
  }

  // ----- Invitation in-app (discrète, une seule fois) -----

  function injecterStyle() {
    if (document.getElementById("notif-invite-style")) return;
    var s = document.createElement("style");
    s.id = "notif-invite-style";
    s.textContent =
      ".notif-invite{position:fixed;left:12px;right:12px;bottom:12px;z-index:9999;" +
      "max-width:520px;margin:0 auto;padding:14px 16px;border-radius:14px;" +
      "background:rgba(18,20,28,.96);border:1px solid rgba(120,140,200,.35);" +
      "box-shadow:0 8px 30px rgba(0,0,0,.45);color:#e8ecf5;" +
      "font:inherit;backdrop-filter:blur(6px)}" +
      ".notif-invite p{margin:0 0 10px;font-size:14px;line-height:1.4;color:#cdd4e4}" +
      ".notif-invite .notif-actions{display:flex;gap:8px;justify-content:flex-end}" +
      ".notif-invite button{font:inherit;font-size:13px;padding:8px 14px;border-radius:9px;" +
      "border:1px solid transparent;cursor:pointer}" +
      ".notif-invite .notif-oui{background:#5566cc;color:#fff}" +
      ".notif-invite .notif-non{background:transparent;color:#9aa3ba;border-color:rgba(150,160,190,.3)}";
    document.head.appendChild(s);
  }

  function fermerInvite() {
    var el = document.querySelector(".notif-invite");
    if (el && el.parentNode) el.parentNode.removeChild(el);
  }

  function afficherInvite() {
    injecterStyle();
    var boite = document.createElement("div");
    boite.className = "notif-invite";
    boite.setAttribute("role", "dialog");
    boite.innerHTML =
      "<p>Veux-tu que le Système te rappelle d'agir tes jours d'engagement ? " +
      "Des rappels sobres, jamais un jour de repos.</p>" +
      "<div class=\"notif-actions\">" +
      "<button type=\"button\" class=\"notif-non\">Pas maintenant</button>" +
      "<button type=\"button\" class=\"notif-oui\">Activer</button>" +
      "</div>";
    document.body.appendChild(boite);

    boite.querySelector(".notif-non").addEventListener("click", function () {
      try { localStorage.setItem(CLE_CHOIX, "refuse"); } catch (e) {}
      fermerInvite();
    });
    boite.querySelector(".notif-oui").addEventListener("click", function () {
      fermerInvite();
      // requestPermission DOIT partir du geste : on est dans le handler.
      Notification.requestPermission().then(function (p) {
        if (p === "granted") {
          try { localStorage.setItem(CLE_CHOIX, "active"); } catch (e) {}
          abonner();
        } else {
          try { localStorage.setItem(CLE_CHOIX, "refuse"); } catch (e) {}
        }
      }).catch(function () {});
    });
  }

  function choix() {
    try { return localStorage.getItem(CLE_CHOIX); } catch (e) { return null; }
  }

  // Astuce d'installation iOS : montrée UNE fois, sans jamais bloquer
  // l'activation ultérieure (clé distincte de CLE_CHOIX).
  function afficherInviteInstall() {
    injecterStyle();
    var boite = document.createElement("div");
    boite.className = "notif-invite";
    boite.setAttribute("role", "dialog");
    boite.innerHTML =
      "<p>Pour recevoir les rappels du Système sur iPhone, installe l'app : " +
      "bouton Partager, puis « Sur l'écran d'accueil ». Les notifications " +
      "s'activeront ensuite.</p>" +
      "<div class=\"notif-actions\">" +
      "<button type=\"button\" class=\"notif-oui\">Compris</button>" +
      "</div>";
    document.body.appendChild(boite);
    boite.querySelector(".notif-oui").addEventListener("click", function () {
      try { localStorage.setItem(CLE_INSTALL, "vu"); } catch (e) {}
      fermerInvite();
    });
  }

  function installVu() {
    try { return localStorage.getItem(CLE_INSTALL) === "vu"; } catch (e) { return false; }
  }

  // ----- Amorçage -----

  function demarrer() {
    var etat = lireEtat();
    var premierSucces = etat && jourReussi(etat);

    // iOS hors installation : le push n'est PAS disponible dans Safari.
    // On n'offre pas l'activation (elle échouerait) ; on invite plutôt à
    // installer l'app, une seule fois, après un premier succès.
    if (estIOS && !installe) {
      if (premierSucces && !installVu()) afficherInviteInstall();
      return;
    }

    if (!supporte) return;

    // Déjà autorisé : on s'assure d'être abonné et on resynchronise.
    if (Notification.permission === "granted") {
      abonnementCourant().then(function (sub) {
        if (sub) synchroniser();
        else if (choix() !== "refuse") abonner();
      }).catch(function () {});
      return;
    }

    // Refusé (navigateur ou invitation) : on ne redemande jamais.
    if (Notification.permission === "denied" || choix() === "refuse") return;

    // Sinon : on n'invite qu'APRÈS un premier jour réussi.
    if (premierSucces) afficherInvite();
  }

  // Re-synchro à chaque sauvegarde d'état (quêtes faites, gel, jours…),
  // anti-rafale par un petit délai.
  var minuteurSynchro = null;
  window.addEventListener("life-rpg-etat-sauve", function () {
    if (minuteurSynchro) clearTimeout(minuteurSynchro);
    minuteurSynchro = setTimeout(synchroniser, DELAI_SYNCHRO);
  });

  if (document.readyState === "loading") {
    window.addEventListener("DOMContentLoaded", demarrer);
  } else {
    demarrer();
  }

  // ----- Pilotage depuis les Paramètres -----
  // L'écran Paramètres offre un interrupteur explicite. On expose de quoi
  // refléter l'état réel et le basculer, sans dupliquer les clés/logique.

  function estSupporte() {
    // Sur iOS hors app installée, le push n'existe pas dans Safari.
    return supporte && !(estIOS && !installe);
  }

  function permissionActuelle() {
    return supporte ? Notification.permission : "unsupported";
  }

  // Actif = navigateur capable, permission accordée, et pas refusé in-app.
  function estActif() {
    return estSupporte() && Notification.permission === "granted" && choix() !== "refuse";
  }

  // Activer : demande la permission si besoin (le tap sur l'interrupteur est
  // le geste requis), puis abonne. Résout avec l'état actif final (bool).
  function activer() {
    if (!estSupporte()) return Promise.resolve(false);
    if (Notification.permission === "granted") {
      try { localStorage.setItem(CLE_CHOIX, "active"); } catch (e) {}
      return abonner().then(function () { return estActif(); });
    }
    if (Notification.permission === "denied") return Promise.resolve(false);
    return Notification.requestPermission().then(function (p) {
      if (p === "granted") {
        try { localStorage.setItem(CLE_CHOIX, "active"); } catch (e) {}
        return abonner().then(function () { return estActif(); });
      }
      try { localStorage.setItem(CLE_CHOIX, "refuse"); } catch (e) {}
      return false;
    }).catch(function () { return false; });
  }

  // Désactiver : on ne peut pas révoquer la permission navigateur, mais on
  // cesse d'abonner/resynchroniser et on mémorise le refus.
  function desactiver() {
    try { localStorage.setItem(CLE_CHOIX, "refuse"); } catch (e) {}
  }

  // Exposition (tests + écran Paramètres).
  window.Notifications = {
    synchroniser: synchroniser,
    abonner: abonner,
    estSupporte: estSupporte,
    permissionActuelle: permissionActuelle,
    estActif: estActif,
    activer: activer,
    desactiver: desactiver
  };
})();
