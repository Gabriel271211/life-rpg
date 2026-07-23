// ============================================
// LIFE RPG — sw.js
// Service worker : pré-cache des fichiers
// statiques et stratégies de mise à jour.
//
// Stratégies :
// - HTML (navigations)  : réseau d'abord, cache en secours
//   -> une mise à jour Vercel arrive dès la visite suivante.
// - CSS / JS            : cache d'abord, rafraîchi en arrière-plan
//   (stale-while-revalidate) -> affichage instantané, et comme les
//   fichiers ne sont pas versionnés par hash, le cache se remet à
//   jour tout seul à chaque visite au lieu de figer du vieux code.
// - Icônes / manifest   : cache d'abord (ils ne changent pas).
// - Police Google Fonts : non interceptée, reste réseau.
// ============================================

// Version à incrémenter à chaque déploiement qui modifie plusieurs
// fichiers JS interdépendants : le nouveau worker ré-installe un
// pré-cache complet et cohérent, au lieu de laisser le rafraîchissement
// en arrière-plan mélanger anciens et nouveaux fichiers.
var CACHE = "life-rpg-v11";

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
  "css/juice.css",
  "js/regles.js",
  "js/aura.js",
  "js/garde.js",
  "js/ia.js",
  "js/jour.js",
  "js/cartes.js",
  "js/etat.js",
  "js/templates.js",
  "js/juice.js",
  "js/revelation.js",
  "js/session.js",
  "js/editeur.js",
  "js/editeur-principale.js",
  "js/objectif.js",
  "js/onboarding.js",
  "js/accueil.js",
  "js/personnage.js",
  "js/collection.js",
  "js/quete.js",
  "js/sauvegarde.js",
  "js/nav.js",
  "js/pwa.js",
  "assets/icone-192.png",
  "assets/icone-512.png",
  "assets/apple-touch-icon.png"
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

  // CSS / JS : servi du cache immédiatement, rafraîchi en arrière-plan.
  event.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(requete).then(function (enCache) {
        var rafraichissement = fetch(requete).then(function (reponse) {
          if (reponse && reponse.ok) {
            cache.put(requete, reponse.clone());
          }
          return reponse;
        }).catch(function () {
          return enCache;
        });
        return enCache || rafraichissement;
      });
    })
  );
});
