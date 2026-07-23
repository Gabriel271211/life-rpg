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
  vrais accomplissements (communes → légendaires, certaines cachées), plus
  les cartes d'objectif obtenues via les quêtes secondaires.
- **Quête principale** (`quete.html`) — le chemin de JALONS de l'objectif :
  des accomplissements concrets de la vraie vie, auto-déclarés dans l'ordre
  (bouton « Jalon atteint », confirmation inline, bonus XP). Dernier jalon
  atteint → écran épique « Quête accomplie », puis le Système forge la
  suite (niveau N+1, jalons plus ambitieux — accepter / régénérer /
  décider plus tard). Palmarès des quêtes accomplies en bas d'écran.
  Éditable (titre, description, jalons) et remplaçable (« changer
  d'objectif » : le personnage est conservé, la quête est remplacée).

## Types de quêtes

- **simple** — activité libre : la session affiche « … en cours », on termine
  soi-même.
- **minuterie** — durée fixe avec anneau de progression, pause possible.
- **series** — N séries d'un effort, entrecoupées de repos chronométrés.
- **seance** — enchaînement guidé de blocs (échauffement, exercices, repos,
  étirements), avec écran de préparation avant chaque exercice.

## Quête hebdomadaire

Chaque template apporte une hebdo cohérente avec sa discipline. Taper la
carte ouvre sa **session guidée** (champ `session` : séance en blocs pour le
sport, minuterie pour révision/lecture/création, action libre pour le
business) — le +1 tombe à la fin de la session, comme pour une quête du
jour. Sans session (`null`), le tap fait +1 directement. Son champ `lien`
définit en plus ce qui la fait progresser automatiquement (« annuler »
reste toujours possible) :

- `"seance"` — une séance terminée compte (+1, flottant « +1 séance »)
- `"minuterie:esprit"` — une session minutée de la stat compte
- `"journee"` — une journée avec toutes les quêtes validées compte
  (appliqué au changement de jour)
- `"quete"` — toute quête quotidienne validée compte
- `null` — progression manuelle uniquement (ex. Business, actions hors app)

Le décochage d'une quête retire exactement le progrès automatique qu'elle
avait apporté (marqueur `hebdoCompte`).

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
js/ia.js                 — client de la fonction IA : IA.appeler(type, donnees),
                           null sur tout échec, anti-spam local 10 s
api/ia.js                — fonction serverless Vercel : unique porte vers Groq,
                           routée par type, validation stricte et bornée
api/_prompts.js          — prompts système de l'IA, un par type (non exposé)
```

L'état vit dans `localStorage` (`life-rpg-etat-v1`). Toute nouvelle propriété
passe par une migration dans `etat.js` : les vieilles sauvegardes se complètent
au chargement sans jamais perdre de progression. L'état `DEFAUT` de `etat.js`
ne sert qu'aux tests et de secours (stockage indisponible) — le vrai état d'un
joueur est créé par l'onboarding (`Templates.etatNeuf`).

## L'IA (Groq via serverless)

La clé API n'est JAMAIS dans le front. Tout passe par `api/ia.js`, une
fonction serverless Vercel :

- `POST /api/ia` avec `{ type, donnees }` — types routés un par un
  (`onboarding`, `suite-principale`, `quetes`, `hebdo`, `seance`,
  `secondaires` ; `chat` viendra)
- clé dans la variable d'environnement `GROQ_API_KEY` (dashboard Vercel →
  Settings → Environment Variables ; en local : fichier `.env.local`,
  ignoré par git)
- modèle `llama-3.3-70b-versatile`, `response_format json_object` (sauf
  futur type `chat`), timeout amont 20 s
- validation stricte maison par type : structure exigée, valeurs hors
  borne clampées (XP quotidiennes 5–50, hebdo 50–300, durées 20–7200 s,
  textes tronqués), JSON amont invalide → 502
- vie privée : seuls les champs listés par type partent vers Groq —
  jamais le prénom, jamais l'historique complet

Côté front, `IA.appeler(type, donnees)` retourne le JSON validé ou `null`
sur TOUT échec (réseau, 4xx/5xx, timeout) : chaque écran a un contenu de
secours, l'IA ne casse jamais le jeu. Au pire l'utilisateur lit « Le
Système est silencieux — réessaie plus tard ». Anti-spam local : un même
type d'appel au plus une fois toutes les 10 s. Le service worker ne met
jamais `/api/` en cache.

## Développement

Aucun build pour le front : servir le dossier tel quel (ex. `npx serve .`).
Pour tester l'IA en local : `npx vercel dev` (après `npx vercel link`),
avec `GROQ_API_KEY` dans `.env.local`. Déployé sur Vercel à chaque push.

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
