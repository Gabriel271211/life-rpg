# Life RPG

Une PWA qui transforme ta vie en jeu de rôle : un personnage avec un niveau,
une classe, un rang et des stats qui montent grâce à tes actions réelles
(quêtes quotidiennes).

**100 % vanilla** — HTML / CSS / JS, aucune librairie, aucun framework.

## Écrans

- **Accueil** (`index.html`) — les quêtes du jour, validables, avec gain d'XP
  réel (et 15 % de chance de coup critique qui double l'XP).
- **Personnage** (`personnage.html`) — la fiche : rang (E → D → C → B → A → S),
  niveau, barre d'XP, stats (Corps, Esprit, Discipline) et streak.

## Architecture

```
js/regles.js   — règles du jeu (courbes d'XP, rangs, critique) : fonctions pures
js/jour.js     — temps : reset quotidien des quêtes, règles du streak : fonctions pures
js/etat.js     — état du personnage : localStorage, migration, pipeline de chargement
js/juice.js    — feedback : XP flottant, bannière de niveau, pulsations
js/accueil.js  — rendu + interactions de l'écran d'accueil
js/personnage.js — rendu de la fiche de personnage
js/nav.js      — navigation basse
```

## Développement

Aucun build : servir le dossier tel quel (ex. `npx serve .`) ou ouvrir
`index.html` directement.

Outils de test en console :

```js
LifeRpgDebug.simulerNouveauJour(); // recule d'un jour et recharge
LifeRpgDebug.reinitialiser();      // repart de l'état par défaut
```
