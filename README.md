# Life RPG

Une PWA qui transforme ta vie en jeu de rôle : un personnage avec un niveau,
une classe, un rang et des stats qui montent grâce à tes actions réelles
(quêtes quotidiennes).

**100 % vanilla** — HTML / CSS / JS, aucune librairie, aucun framework.

## Écrans

- **Onboarding** (`onboarding.html`) — création du personnage au premier
  lancement : prénom, choix de l'objectif (6 templates + objectif
  personnalisé), révélation du rang E. Aucune nav basse ; les autres écrans
  y redirigent tant qu'aucun personnage n'existe (`js/garde.js`).
- **Accueil** (`index.html`) — les quêtes du jour, validables via le mode
  Session, avec gain d'XP réel (et 15 % de chance de coup critique qui double
  l'XP), la quête hebdomadaire, le rappel de quête principale, l'éditeur de
  quêtes, et le bloc « journée accomplie » quand tout est validé.
- **Personnage** (`personnage.html`) — la fiche : rang (E → D → C → B → A → S),
  niveau, barre d'XP, stats (Corps, Esprit, Discipline), graphique des
  14 derniers jours (XP par jour, SVG pur), bilan, streak, export / import.
- **Collection** (`collection.html`) — les cartes-trophées débloquées par de
  vrais accomplissements (communes → légendaires, certaines cachées).
- **Quête principale** (`quete.html`) — le chemin d'étapes de l'objectif,
  éditable (titre, description, étapes) et remplaçable (« changer
  d'objectif » : le personnage est conservé, la quête est remplacée).

## Types de quêtes

- **simple** — activité libre : la session affiche « … en cours », on termine
  soi-même.
- **minuterie** — durée fixe avec anneau de progression, pause possible.
- **series** — N séries d'un effort, entrecoupées de repos chronométrés.
- **seance** — enchaînement guidé de blocs (échauffement, exercices, repos,
  étirements), avec écran de préparation avant chaque exercice. Valider une
  séance fait aussi progresser la quête hebdomadaire.

## Architecture

```
js/regles.js             — règles du jeu : courbes d'XP, rangs, critique, quête
                           principale, historique d'XP — fonctions pures
js/jour.js               — temps : reset quotidien, streak, semaine hebdo,
                           nettoyage de l'historique (90 jours) — fonctions pures
js/cartes.js             — définitions des cartes et conditions de déblocage — pur
js/templates.js          — templates d'objectif (6 voies + personnalisé),
                           création d'état neuf — données pures
js/etat.js               — état du personnage : localStorage, migrations,
                           pipeline de chargement, LifeRpgDebug
js/garde.js              — garde d'onboarding : redirige vers onboarding.html
                           tant qu'aucun personnage n'existe (chargé au <head>)
js/aura.js               — l'aura : couleur d'accent par rang, posée avant le
                           rendu, et animation de montée de rang
js/juice.js              — feedback : XP flottant, bandeaux, pulsations, vibrations
js/session.js            — mode Session : minuterie, séries, séance, activité libre
js/editeur.js            — éditeur des quêtes quotidiennes et de l'hebdo
js/editeur-principale.js — éditeur de la quête principale + changement d'objectif
js/objectif.js           — grille de choix d'objectif (onboarding + changement)
js/revelation.js         — révélation plein écran des cartes débloquées
js/onboarding.js         — parcours de création de personnage (3 étapes)
js/accueil.js            — rendu + interactions de l'écran d'accueil
js/personnage.js         — rendu de la fiche (dont le graphique 14 jours)
js/collection.js         — rendu de la collection de cartes
js/quete.js              — rendu de l'écran Quête principale
js/sauvegarde.js         — export / import JSON de la progression
js/nav.js                — navigation basse
js/pwa.js                — enregistrement du service worker (sw.js)
```

L'état vit dans `localStorage` (`life-rpg-etat-v1`). Toute nouvelle propriété
passe par une migration dans `etat.js` : les vieilles sauvegardes se complètent
au chargement sans jamais perdre de progression. L'état `DEFAUT` de `etat.js`
ne sert qu'aux tests et de secours (stockage indisponible) — le vrai état d'un
joueur est créé par l'onboarding (`Templates.etatNeuf`).

## Développement

Aucun build : servir le dossier tel quel (ex. `npx serve .`) ou ouvrir
`index.html` directement. Déployé sur Vercel à chaque push.

Outils de test en console :

```js
LifeRpgDebug.simulerNouveauJour();       // recule d'un jour et recharge
LifeRpgDebug.simulerNouvelleSemaine();   // recule d'une semaine et recharge
LifeRpgDebug.accelererSessions();        // durées de session ÷ 60 (20 min -> 20 s)
LifeRpgDebug.simulerMonteeDeRang();      // joue l'animation de montée de rang
LifeRpgDebug.debloquerToutesLesCartes(); // débloque toute la collection
LifeRpgDebug.relancerOnboarding();       // rejoue l'onboarding (flag remis à false)
LifeRpgDebug.nouveauJoueur();            // efface tout : vrai premier lancement
LifeRpgDebug.reinitialiser();            // repart de l'état de test DEFAUT
```
