// ============================================
// LIFE RPG — jours-engagement.js
// Sélecteur des « jours d'engagement » : sept
// pastilles L M M J V S D, des presets rapides,
// un compteur et les bornes 3 à 6. Partagé par
// l'onboarding et l'éditeur (même UI). Aucun accès
// au localStorage : le composant lit et notifie,
// l'écran hôte décide quoi persister.
// ============================================

var JoursEngagement = (function () {

  var MIN = 3;
  var MAX = 6;

  // Libellés courts (index 0 = lundi ... 6 = dimanche) et noms complets
  // pour l'accessibilité (deux « M » à distinguer).
  var COURTS = ["L", "M", "M", "J", "V", "S", "D"];
  var LONGS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  // Presets : nom -> ensemble d'indices.
  var PRESETS = {
    "semaine": [0, 1, 2, 3, 4],          // L-V, la reco
    "sauf-dimanche": [0, 1, 2, 3, 4, 5], // 6 jours
    "alternance": [0, 2, 4]              // un jour sur deux (L, M, V)
  };

  function memesJours(a, b) {
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) {
      if (b.indexOf(a[i]) === -1) return false;
    }
    return true;
  }

  // Rend le sélecteur dans `conteneur`. `joursInitiaux` est un tableau
  // d'indices (0-6). `surChangement` est appelé à chaque modification,
  // pour que l'écran hôte réagisse (activer/désactiver un bouton, ou
  // persister). Retourne { lire, estValide } : lire() donne le tableau
  // trié courant, estValide() dit si le nombre de jours est dans [3, 6].
  function rendre(conteneur, joursInitiaux, surChangement) {
    conteneur.innerHTML = "";
    conteneur.classList.add("je");

    var selection = {};
    (Array.isArray(joursInitiaux) ? joursInitiaux : PRESETS.semaine).forEach(function (j) {
      var n = parseInt(j, 10);
      if (n >= 0 && n <= 6) selection[n] = true;
    });

    // --- Presets ---
    var presets = document.createElement("div");
    presets.className = "je-presets";
    [
      ["semaine", "Semaine"],
      ["sauf-dimanche", "Sauf dimanche"],
      ["alternance", "Un jour sur deux"],
      ["perso", "Perso"]
    ].forEach(function (p) {
      var b = document.createElement("button");
      b.className = "je-preset";
      b.type = "button";
      b.setAttribute("data-preset", p[0]);
      b.textContent = p[1];
      presets.appendChild(b);
    });
    conteneur.appendChild(presets);

    // --- Pastilles L M M J V S D ---
    var pastilles = document.createElement("div");
    pastilles.className = "je-pastilles";
    var boutons = [];
    for (var i = 0; i < 7; i++) {
      var pb = document.createElement("button");
      pb.className = "je-pastille";
      pb.type = "button";
      pb.setAttribute("data-jour", String(i));
      pb.setAttribute("aria-label", LONGS[i]);
      pb.textContent = COURTS[i];
      pastilles.appendChild(pb);
      boutons.push(pb);
    }
    conteneur.appendChild(pastilles);

    // --- Compteur + message ---
    var compteur = document.createElement("p");
    compteur.className = "je-compteur";
    compteur.innerHTML = '<span class="je-compte"></span> / ' + MAX + " jours";
    conteneur.appendChild(compteur);

    var message = document.createElement("p");
    message.className = "je-message";
    conteneur.appendChild(message);

    function compte() {
      return Object.keys(selection).length;
    }

    function estValide() {
      var n = compte();
      return n >= MIN && n <= MAX;
    }

    function lire() {
      return Object.keys(selection)
        .map(function (k) { return parseInt(k, 10); })
        .sort(function (a, b) { return a - b; });
    }

    function rendreEtat() {
      var jours = lire();
      var n = jours.length;

      boutons.forEach(function (b, idx) {
        b.classList.toggle("actif", Boolean(selection[idx]));
      });

      // Preset actif : celui qui correspond exactement, sinon « Perso ».
      var presetActif = "perso";
      Object.keys(PRESETS).forEach(function (cle) {
        if (memesJours(jours, PRESETS[cle])) presetActif = cle;
      });
      Array.prototype.forEach.call(presets.children, function (b) {
        b.classList.toggle("actif", b.getAttribute("data-preset") === presetActif);
      });

      compteur.querySelector(".je-compte").textContent = String(n);
      compteur.classList.toggle("insuffisant", n < MIN);

      if (n < MIN) {
        message.textContent = "Minimum 3 jours — en dessous, l'habitude ne prend pas.";
      } else if (n >= MAX) {
        message.textContent = "Le maximum. Le repos fait partie du plan.";
      } else {
        message.textContent = "5 jours, l'équilibre entre progrès et repos.";
      }
    }

    function notifier() {
      rendreEtat();
      if (surChangement) surChangement();
    }

    // Tap sur une pastille : bascule le jour. Jamais 7 jours possibles :
    // ajouter un jour quand il y en a déjà 6 est bloqué (le repos est
    // obligatoire). Retirer reste toujours permis.
    pastilles.addEventListener("click", function (e) {
      var b = e.target.closest(".je-pastille");
      if (!b) return;
      var idx = parseInt(b.getAttribute("data-jour"), 10);
      if (selection[idx]) {
        delete selection[idx];
      } else {
        if (compte() >= MAX) { rendreEtat(); return; }
        selection[idx] = true;
      }
      notifier();
    });

    presets.addEventListener("click", function (e) {
      var b = e.target.closest(".je-preset");
      if (!b) return;
      var cle = b.getAttribute("data-preset");
      // « Perso » ne change pas la sélection : il laisse la main aux
      // pastilles (l'étiquette s'allume d'elle-même quand la sélection
      // ne correspond à aucun preset).
      if (cle === "perso") return;
      selection = {};
      PRESETS[cle].forEach(function (j) { selection[j] = true; });
      notifier();
    });

    rendreEtat();

    return { lire: lire, estValide: estValide };
  }

  return {
    MIN: MIN,
    MAX: MAX,
    rendre: rendre
  };
})();
