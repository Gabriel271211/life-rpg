// ============================================
// LIFE RPG — sw.js
// Service worker : pré-cache des fichiers
// statiques et stratégies de mise à jour.
//
// Stratégies :
// - HTML (navigations)  : réseau d'abord, cache en secours
//   -> une mise à jour Vercel arrive dès la visite suivante.
// - CSS / JS            : réseau d'abord, cache en secours (comme le
//   HTML) -> tant qu'il y a du réseau, l'app charge TOUJOURS le JS du
//   déploiement courant. Ceci évite le piège majeur : les fichiers ne
//   sont pas versionnés par hash, donc une stratégie cache-first
//   pouvait figer un MÉLANGE moitié-ancien / moitié-nouveau entre deux
//   déploiements. Réseau d'abord garantit un ensemble COHÉRENT.
// - Icônes / manifest   : cache d'abord (ils ne changent pas).
// - Police Google Fonts : non interceptée, reste réseau.
// ============================================

// La correction de cohérence ne dépend plus d'un geste manuel : le
// réseau-d'abord charge toujours le JS du déploiement courant. Cette
// version ne sert donc plus qu'au snapshot HORS-LIGNE : l'incrémenter
// purge l'ancien cache (activate supprime tout cache != CACHE) et
// rafraîchit le pré-cache atomique servi quand il n'y a pas de réseau.
var CACHE = "life-rpg-v30";

var FICHIERS = [
  "./",
  "index.html",
  "personnage.html",
  "collection.html",
  "quete.html",
  "onboarding.html",
  "manifest.json",
  "css/base.css",
  "css/aura.css",
  "css/accueil.css",
  "css/personnage.css",
  "css/collection.css",
  "css/quete.css",
  "css/cartes.css",
  "css/session.css",
  "css/revelation.css",
  "css/editeur.css",
  "css/objectif.css",
  "css/onboarding.css",
  "css/jours-engagement.css",
  "css/chat.css",
  "css/juice.css",
  "css/moment-serie.css",
  "css/reveal.css",
  "js/regles.js",
  "js/aura.js",
  "js/garde.js",
  "js/ia.js",
  "js/jour.js",
  "js/deblocage.js",
  "js/commun.js",
  "js/cartes.js",
  "js/etat.js",
  "js/templates.js",
  "js/juice.js",
  "js/moment-serie.js",
  "js/revelation.js",
  "js/session.js",
  "js/editeur.js",
  "js/editeur-principale.js",
  "js/objectif.js",
  "js/jours-engagement.js",
  "js/onboarding.js",
  "js/chat.js",
  "js/feedback.js",
  "js/reveal.js",
  "js/accueil.js",
  "js/personnage.js",
  "js/collection.js",
  "js/quete.js",
  "js/sauvegarde.js",
  "js/nav.js",
  "js/pwa.js",
  "js/notifications.js",
  "assets/icone-192.png",
  "assets/icone-512.png",
  "assets/apple-touch-icon.png",
  "assets/fonts/saira-latin.woff2",
  "assets/fonts/saira-latin-ext.woff2",
  "assets/fonts/space-grotesk-latin.woff2",
  "assets/fonts/space-grotesk-latin-ext.woff2"
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches.open(CACHE).then(function (cache) {
      return cache.addAll(FICHIERS);
    }).then(function () {
      // Le nouveau worker prend la main sans attendre la fermeture
      // des onglets : chaque déploiement remplace l'ancien proprement.
      return self.skipWaiting();
    })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (noms) {
      return Promise.all(
        noms.filter(function (nom) {
          return nom !== CACHE;
        }).map(function (nom) {
          return caches.delete(nom);
        })
      );
    }).then(function () {
      return self.clients.claim();
    })
  );
});

self.addEventListener("fetch", function (event) {
  var requete = event.request;
  if (requete.method !== "GET") return;

  var url = new URL(requete.url);
  // La police (et tout autre domaine) reste réseau.
  if (url.origin !== self.location.origin) return;
  // L'IA (/api/) ne passe JAMAIS par le cache : toujours réseau.
  if (url.pathname.indexOf("/api/") === 0) return;

  // HTML : réseau d'abord, cache en secours (mode hors-ligne).
  if (requete.mode === "navigate" || url.pathname.slice(-5) === ".html") {
    event.respondWith(
      fetch(requete).then(function (reponse) {
        var copie = reponse.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(requete, copie);
        });
        return reponse;
      }).catch(function () {
        return caches.match(requete).then(function (enCache) {
          return enCache || caches.match("index.html");
        });
      })
    );
    return;
  }

  // Icônes et manifest : cache d'abord, réseau en secours.
  if (url.pathname.indexOf("/assets/") !== -1 || url.pathname.slice(-13) === "manifest.json") {
    event.respondWith(
      caches.match(requete).then(function (enCache) {
        return enCache || fetch(requete).then(function (reponse) {
          var copie = reponse.clone();
          caches.open(CACHE).then(function (cache) {
            cache.put(requete, copie);
          });
          return reponse;
        });
      })
    );
    return;
  }

  // CSS / JS : réseau d'abord, cache en secours (hors-ligne). Même
  // stratégie que le HTML -> l'app charge un ensemble de fichiers
  // COHÉRENT (tous du déploiement courant), jamais un mélange figé.
  // La copie fraîche remet le cache à jour pour le prochain accès
  // hors-ligne.
  event.respondWith(
    fetch(requete).then(function (reponse) {
      if (reponse && reponse.ok) {
        var copie = reponse.clone();
        caches.open(CACHE).then(function (cache) {
          cache.put(requete, copie);
        });
      }
      return reponse;
    }).catch(function () {
      return caches.match(requete);
    })
  );
});

// ----- Notifications push (rappels des jours d'engagement) -----
// Le serveur envoie un JSON { titre, corps, url }. On affiche la
// notification ; un tap ramène (ou ouvre) l'app.
self.addEventListener("push", function (event) {
  var donnees = {};
  try { donnees = event.data ? event.data.json() : {}; } catch (e) { donnees = {}; }
  var titre = donnees.titre || "Life RPG";
  var options = {
    body: donnees.corps || "",
    icon: "assets/icone-192.png",
    badge: "assets/icone-192.png",
    tag: "life-rpg-rappel",       // une notif à la fois, pas d'empilement
    data: { url: donnees.url || "/index.html" }
  };
  event.waitUntil(self.registration.showNotification(titre, options));
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();
  var cible = (event.notification.data && event.notification.data.url) || "/index.html";
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (liste) {
      for (var i = 0; i < liste.length; i++) {
        if ("focus" in liste[i]) return liste[i].focus();
      }
      if (clients.openWindow) return clients.openWindow(cible);
    })
  );
});
