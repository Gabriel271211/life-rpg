// ============================================
// LIFE RPG — chat.js
// Le chat du Système : overlay plein écran où le
// joueur parle au maître du jeu. Bulles sobres,
// historique dans l'état (30 derniers messages),
// et actions PROPOSÉES par le Système, jamais
// appliquées sans le tap "Appliquer". Tout échec
// réseau désactive le champ, sans casser l'app.
// ============================================

var Chat = (function () {

  var MAX_MESSAGE = 300;
  var MAX_HISTORIQUE = 30;

  var ctx = null; // { etat, surAppliquer, overlay, ... }

  var SVG_CROIX =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>';

  var SVG_ENVOI =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M5 12h13"/><path d="M12 5l7 7-7 7"/></svg>';

  function etiquetteStat(cle) {
    return cle.charAt(0).toUpperCase() + cle.slice(1);
  }

  // ----- Historique dans l'état -----

  function pousserMessage(role, contenu) {
    ctx.etat.chat.push({ role: role, contenu: contenu });
    if (ctx.etat.chat.length > MAX_HISTORIQUE) {
      ctx.etat.chat = ctx.etat.chat.slice(-MAX_HISTORIQUE);
    }
    Etat.sauvegarder(ctx.etat);
  }

  // ----- Rendu des bulles -----

  function bulle(message) {
    var el = document.createElement("div");
    el.className = "chat-bulle chat-" + (message.role === "systeme" ? "systeme" : "joueur");
    el.textContent = message.contenu;
    return el;
  }

  function rendreHistorique() {
    var flux = ctx.overlay.querySelector(".chat-flux");
    flux.innerHTML = "";
    if (ctx.etat.chat.length === 0) {
      var vide = document.createElement("p");
      vide.className = "chat-accueil";
      vide.textContent =
        "Le Système t'écoute. Demande un conseil, ajuste ta quête, ou " +
        "questionne les règles.";
      flux.appendChild(vide);
    } else {
      ctx.etat.chat.forEach(function (m) { flux.appendChild(bulle(m)); });
    }
    defilerEnBas();
  }

  function defilerEnBas() {
    var flux = ctx.overlay.querySelector(".chat-flux");
    flux.scrollTop = flux.scrollHeight;
  }

  // ----- Carte d'action proposée -----

  function libelleAction(action) {
    var d = action.donnees;
    if (action.type === "ajouter-quete") {
      return "Ajouter : " + d.nom + " · +" + d.xp + " XP · " + etiquetteStat(d.stat);
    }
    if (action.type === "modifier-quete") {
      return "Modifier : " + d.nom + " · +" + d.xp + " XP · " + etiquetteStat(d.stat);
    }
    if (action.type === "supprimer-quete") {
      var q = trouverQuete(d.id);
      return "Supprimer : " + (q ? q.nom : "cette quête");
    }
    if (action.type === "nouvelle-secondaire") {
      return "Quête secondaire : " + d.nom + " · +" + d.xp + " XP · " + d.dureeJours + " j";
    }
    return "Proposition du Système";
  }

  function trouverQuete(id) {
    for (var i = 0; i < ctx.etat.quetes.length; i++) {
      if (ctx.etat.quetes[i].id === id) return ctx.etat.quetes[i];
    }
    return null;
  }

  function afficherCarteAction(action) {
    var flux = ctx.overlay.querySelector(".chat-flux");
    var carte = document.createElement("div");
    carte.className = "chat-action";
    carte.innerHTML =
      '<p class="chat-action-libelle"></p>' +
      '<div class="chat-action-boutons">' +
        '<button class="session-lien accent" type="button" data-role="appliquer">Appliquer</button>' +
        '<button class="session-lien" type="button" data-role="ignorer">Ignorer</button>' +
      "</div>";
    carte.querySelector(".chat-action-libelle").textContent = libelleAction(action);

    carte.querySelector('[data-role="appliquer"]').addEventListener("click", function () {
      var ok = appliquerAction(action);
      carte.className = "chat-action chat-action-close";
      carte.innerHTML = '<p class="chat-action-etat"></p>';
      carte.querySelector(".chat-action-etat").textContent = ok
        ? "Appliqué."
        : "Action impossible.";
    });
    carte.querySelector('[data-role="ignorer"]').addEventListener("click", function () {
      carte.className = "chat-action chat-action-close";
      carte.innerHTML = '<p class="chat-action-etat">Ignoré.</p>';
    });

    flux.appendChild(carte);
    defilerEnBas();
  }

  // ----- Application d'une action (après confirmation) -----
  // Réutilise les règles d'état existantes. Retourne true si appliquée.

  function appliquerAction(action) {
    var etat = ctx.etat;
    var d = action.donnees;
    var applique = false;

    if (action.type === "ajouter-quete") {
      var q = JSON.parse(JSON.stringify(d));
      q.id = "chat-" + Date.now() + "-" + Math.floor(Math.random() * 1000);
      q.faite = false;
      etat.quetes.push(q);
      applique = true;

    } else if (action.type === "modifier-quete") {
      var cible = trouverQuete(d.id);
      if (cible) {
        // On garde l'id, l'état "faite" et l'XP déjà donné : seuls les
        // réglages changent.
        cible.nom = d.nom;
        cible.xp = d.xp;
        cible.stat = d.stat;
        cible.type = d.type;
        ["duree", "series", "parSerie", "repos"].forEach(function (k) { delete cible[k]; });
        if (d.type === "minuterie") cible.duree = d.duree;
        else if (d.type === "series") {
          cible.series = d.series; cible.parSerie = d.parSerie; cible.repos = d.repos;
        }
        applique = true;
      }

    } else if (action.type === "supprimer-quete") {
      var idx = -1;
      for (var i = 0; i < etat.quetes.length; i++) {
        if (etat.quetes[i].id === d.id) idx = i;
      }
      // On garde toujours au moins une quête du jour.
      if (idx !== -1 && etat.quetes.length > 1) {
        var etaitFaite = etat.quetes[idx].faite;
        etat.quetes.splice(idx, 1);
        if (etaitFaite) Jour.majStreak(etat);
        applique = true;
      }

    } else if (action.type === "nouvelle-secondaire") {
      // Deux quêtes secondaires actives au maximum, comme sur l'accueil.
      if (etat.quetesSecondaires.length < 2) {
        etat.quetesSecondaires.push({
          id: "sec-" + Date.now() + "-" + Math.floor(Math.random() * 1000),
          nom: d.nom,
          description: d.description,
          xp: d.xp,
          stat: d.stat,
          expire: Jour.decalerDate(etat.dernierJour, d.dureeJours),
          faite: false,
          carteLiee: null
        });
        applique = true;
      }
    }

    if (applique) {
      Etat.sauvegarder(etat);
      if (ctx.surAppliquer) ctx.surAppliquer();
    }
    return applique;
  }

  // ----- Envoi d'un message -----

  function contexteJoueur() {
    var etat = ctx.etat;
    var actif = Regles.jalonActif(etat.quetePrincipale);
    return {
      objectif: etat.objectifTexte || etat.quetePrincipale.titre,
      classe: etat.classe,
      niveau: etat.niveau,
      rang: Regles.rang(etat.niveau).actuel.lettre,
      jalon: actif ? actif.jalon.nom : "",
      streak: etat.streak,
      quetes: etat.quetes.map(function (q) {
        return { id: q.id, nom: q.nom, type: q.type };
      })
    };
  }

  function envoyer() {
    var champ = ctx.overlay.querySelector(".chat-champ");
    var texte = champ.value.trim().slice(0, MAX_MESSAGE);
    if (!texte || ctx.enAttente) return;

    champ.value = "";
    ctx.enAttente = true;
    majEtatEnvoi();

    pousserMessage("joueur", texte);
    var flux = ctx.overlay.querySelector(".chat-flux");
    // Enlève le message d'accueil au premier message.
    var accueil = flux.querySelector(".chat-accueil");
    if (accueil) accueil.remove();
    flux.appendChild(bulle({ role: "joueur", contenu: texte }));
    afficherAttente();

    // L'historique envoyé exclut le message courant (déjà dans `message`).
    var historique = ctx.etat.chat.slice(0, -1).slice(-12);

    IA.appeler("chat", {
      contexte: contexteJoueur(),
      historique: historique,
      message: texte
    }, { forcer: true }).then(function (resultat) {
      retirerAttente();
      ctx.enAttente = false;
      if (resultat && resultat.message) {
        pousserMessage("systeme", resultat.message);
        flux.appendChild(bulle({ role: "systeme", contenu: resultat.message }));
        if (resultat.action) afficherCarteAction(resultat.action);
        defilerEnBas();
        majEtatEnvoi();
      } else {
        // Silence du Système : champ neutralisé, message sobre.
        majEtatEnvoi(true);
      }
    });
  }

  function afficherAttente() {
    var flux = ctx.overlay.querySelector(".chat-flux");
    var el = document.createElement("div");
    el.className = "chat-bulle chat-systeme chat-attente";
    el.innerHTML = '<span></span><span></span><span></span>';
    flux.appendChild(el);
    defilerEnBas();
  }

  function retirerAttente() {
    var el = ctx.overlay.querySelector(".chat-attente");
    if (el) el.remove();
  }

  function majEtatEnvoi(silence) {
    var champ = ctx.overlay.querySelector(".chat-champ");
    var bouton = ctx.overlay.querySelector(".chat-envoyer");
    var silencieux = ctx.overlay.querySelector(".chat-silence");
    if (silence) {
      champ.disabled = true;
      champ.placeholder = "Le Système est silencieux.";
      silencieux.hidden = false;
    } else {
      champ.disabled = ctx.enAttente;
      bouton.disabled = ctx.enAttente;
      silencieux.hidden = true;
    }
  }

  // ----- Ouverture / fermeture -----

  function fermer() {
    if (!ctx) return;
    ctx.overlay.remove();
    ctx = null;
  }

  function ouvrir(etat, surAppliquer) {
    if (ctx) return;
    ctx = { etat: etat, surAppliquer: surAppliquer || null, overlay: null, enAttente: false };

    // Sous-titre d'ambiance : une des trois phrases, au hasard à chaque
    // ouverture — le Système ne fait jamais rien de plus que ça.
    var murmure = ["Il observe.", "Il attend.", "Il enregistre."][Math.floor(Math.random() * 3)];

    var overlay = document.createElement("div");
    overlay.className = "chat";
    overlay.innerHTML =
      '<header class="chat-entete">' +
        '<div class="chat-titre">' +
          '<p class="etiquette">Le Système</p>' +
          '<p class="chat-murmure"></p>' +
        "</div>" +
        '<button class="session-fermer" type="button" data-action="fermer" ' +
          'aria-label="Fermer le chat">' + SVG_CROIX + "</button>" +
      "</header>" +
      '<div class="chat-flux"></div>' +
      '<p class="chat-silence" hidden>Le Système est silencieux — réessaie plus tard.</p>' +
      '<form class="chat-saisie">' +
        '<textarea class="chat-champ" rows="1" maxlength="' + MAX_MESSAGE + '" ' +
          'placeholder="Parle au Système" aria-label="Ton message"></textarea>' +
        '<button class="chat-envoyer" type="submit" aria-label="Envoyer">' + SVG_ENVOI + "</button>" +
      "</form>";

    overlay.querySelector(".chat-murmure").textContent = murmure;

    overlay.addEventListener("click", function (e) {
      if (e.target.closest('[data-action="fermer"]')) fermer();
    });
    overlay.querySelector(".chat-saisie").addEventListener("submit", function (e) {
      e.preventDefault();
      envoyer();
    });
    // Entrée envoie, Maj+Entrée passe à la ligne.
    var champ = overlay.querySelector(".chat-champ");
    champ.addEventListener("keydown", function (e) {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        envoyer();
      }
    });
    champ.addEventListener("input", function () {
      champ.style.height = "auto";
      champ.style.height = Math.min(champ.scrollHeight, 120) + "px";
    });

    document.body.appendChild(overlay);
    ctx.overlay = overlay;
    rendreHistorique();
    setTimeout(function () { champ.focus(); }, 50);
  }

  return {
    ouvrir: ouvrir
  };
})();
