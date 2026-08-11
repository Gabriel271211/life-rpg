// ============================================
// LIFE RPG — son.js
// Couche sonore : effets courts joués AUX MÊMES
// moments que les vibrations (Juice.vibrer). Sons
// ORIGINAUX, SYNTHÉTISÉS en direct via la Web Audio
// API — aucun fichier audio, donc rien à télécharger,
// à pré-cacher, ni à décoder : zéro latence, zéro
// dépendance, hors-ligne natif. L'identité est unique :
// froid, clinique, cristallin, un "Système" qui accorde
// du pouvoir.
//
// Contraintes respectées :
// - Déverrouillage iOS/mobile : l'AudioContext ne peut
//   démarrer qu'après un geste utilisateur -> resume()
//   au 1er tap (aucun son avant, normal).
// - Réglage muet (localStorage) respecté partout.
// - Échec SILENCIEUX si l'audio est indisponible : ne
//   jamais casser l'app, comme le reste (try/catch,
//   gardes window.Son && ... côté appelants).
//
// API : Son.jouer(nom, { volume }), Son.actif(),
//       Son.definir(bool), Son.basculer().
// ============================================

var Son = (function () {

  var CLE_MUET = "life-rpg-son"; // "1" = actif (défaut), "0" = muet

  var ctx = null;      // AudioContext (créé au 1er geste)
  var master = null;   // gain de sortie global
  var reverb = null;   // bus de réverbération (entrée du convolver)
  var bruitBuf = null; // buffer de bruit blanc réutilisé
  var pret = false;    // graphe audio construit ?

  // ----- Préférence muet (localStorage) -----

  function actif() {
    try { return localStorage.getItem(CLE_MUET) !== "0"; }
    catch (e) { return true; } // défaut : activé
  }

  function definir(v) {
    try { localStorage.setItem(CLE_MUET, v ? "1" : "0"); } catch (e) {}
  }

  function basculer() {
    var v = !actif();
    definir(v);
    if (v) reveiller(); // réactivé : s'assurer que le contexte tourne
    return v;
  }

  // ----- Construction du graphe (paresseuse) -----

  // Réponse impulsionnelle synthétique (bruit qui décroît) pour une
  // réverb discrète et cohérente sur toutes les révélations.
  function impulsion(duree, chute) {
    var n = Math.floor(ctx.sampleRate * duree);
    var buf = ctx.createBuffer(2, n, ctx.sampleRate);
    for (var c = 0; c < 2; c++) {
      var d = buf.getChannelData(c);
      for (var i = 0; i < n; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / n, chute);
      }
    }
    return buf;
  }

  function bruitBuffer() {
    var n = Math.floor(ctx.sampleRate * 1.2);
    var buf = ctx.createBuffer(1, n, ctx.sampleRate);
    var d = buf.getChannelData(0);
    for (var i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  function construire() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return; // pas de Web Audio : échec silencieux
    try { ctx = new AC(); } catch (e) { ctx = null; return; }

    master = ctx.createGain();
    master.gain.value = 0.55; // niveau global mesuré, jamais agressif
    master.connect(ctx.destination);

    reverb = ctx.createConvolver();
    reverb.buffer = impulsion(1.1, 2.8);
    var rGain = ctx.createGain();
    rGain.gain.value = 0.85;
    reverb.connect(rGain);
    rGain.connect(master);

    bruitBuf = bruitBuffer();
    pret = true;
  }

  // Déverrouillage : créer/relancer le contexte sur un geste (iOS).
  function reveiller() {
    construire();
    if (ctx && ctx.state === "suspended") {
      try { ctx.resume(); } catch (e) {}
    }
  }

  // ----- Briques de synthèse -----

  // Enveloppe exponentielle (attaque -> maintien -> extinction). Les
  // rampes exponentielles ne peuvent atteindre 0 : on vise 0.0001.
  function env(g, t0, pic, attaque, duree, relache) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(pic, t0 + attaque);
    var maintien = Math.max(attaque, duree - relache);
    g.gain.setValueAtTime(pic, t0 + maintien);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + duree);
  }

  // Une voix = un oscillateur -> (filtre optionnel) -> gain -> master
  // (+ envoi réverb optionnel). Options : gain, attaque, relache,
  // detune, glisse (freq cible), filtre/filtreFreq/filtreVers/filtreQ,
  // reverb.
  function voix(type, freq, t0, duree, o) {
    o = o || {};
    var osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (o.glisse) osc.frequency.exponentialRampToValueAtTime(o.glisse, t0 + duree);
    if (o.detune) osc.detune.setValueAtTime(o.detune, t0);

    var g = ctx.createGain();
    var pic = o.gain == null ? 0.3 : o.gain;
    var attaque = o.attaque == null ? 0.005 : o.attaque;
    var relache = o.relache == null ? Math.min(0.15, duree * 0.6) : o.relache;
    env(g, t0, pic, attaque, duree, relache);

    if (o.filtre) {
      var f = ctx.createBiquadFilter();
      f.type = o.filtre;
      f.frequency.setValueAtTime(o.filtreFreq || 1000, t0);
      if (o.filtreVers) f.frequency.exponentialRampToValueAtTime(o.filtreVers, t0 + duree);
      if (o.filtreQ) f.Q.value = o.filtreQ;
      osc.connect(f); f.connect(g);
    } else {
      osc.connect(g);
    }
    g.connect(master);
    if (o.reverb) g.connect(reverb);

    osc.start(t0);
    osc.stop(t0 + duree + 0.05);
  }

  // Bruit filtré (souffle, braise, cendres) -> filtre -> gain.
  function souffle(t0, duree, o) {
    o = o || {};
    var src = ctx.createBufferSource();
    src.buffer = bruitBuf;
    src.loop = true;
    var f = ctx.createBiquadFilter();
    f.type = o.filtre || "bandpass";
    f.frequency.setValueAtTime(o.freq || 800, t0);
    if (o.freqVers) f.frequency.exponentialRampToValueAtTime(o.freqVers, t0 + duree);
    f.Q.value = o.q || 0.7;
    var g = ctx.createGain();
    env(g, t0, o.gain == null ? 0.12 : o.gain, o.attaque == null ? 0.02 : o.attaque,
        duree, o.relache == null ? duree * 0.6 : o.relache);
    src.connect(f); f.connect(g); g.connect(master);
    if (o.reverb) g.connect(reverb);
    src.start(t0);
    src.stop(t0 + duree + 0.05);
  }

  // Cloche cristalline : somme de partiels sinusoïdaux légèrement
  // inharmoniques, les aigus s'éteignant plus vite -> verre/carillon.
  function cloche(t0, fond, duree, o) {
    o = o || {};
    var ratios = o.ratios || [1, 2.01, 3.03, 4.6];
    var gains = o.gains || [1, 0.5, 0.28, 0.14];
    var pic = o.gain == null ? 0.3 : o.gain;
    for (var i = 0; i < ratios.length; i++) {
      var d = Math.max(0.08, duree * (1 - i * 0.16));
      voix("sine", fond * ratios[i], t0, d, {
        gain: pic * gains[i],
        attaque: 0.002,
        relache: d * 0.92,
        reverb: o.reverb
      });
    }
  }

  // ----- Recettes (t = instant de départ, v = volume 0..1) -----

  var RECETTES = {
    // Validation de quête : confirm doux, feutré, grave-médium (~120 ms).
    quete: function (t, v) {
      voix("sine", 392, t, 0.12, { gain: 0.5 * v, filtre: "lowpass", filtreFreq: 1900, relache: 0.09 });
      voix("triangle", 588, t + 0.006, 0.10, { gain: 0.24 * v, filtre: "lowpass", filtreFreq: 2400, relache: 0.08 });
    },

    // Coup critique : ping brillant, deux notes montantes + scintillement (~250 ms).
    critique: function (t, v) {
      voix("triangle", 659, t, 0.12, { gain: 0.4 * v, filtre: "highpass", filtreFreq: 320 });
      voix("triangle", 988, t + 0.085, 0.17, { gain: 0.4 * v, reverb: true });
      voix("sine", 1976, t + 0.085, 0.12, { gain: 0.11 * v, reverb: true }); // pointe scintillante
    },

    // Découverte de carte : carillon de révélation cristallin (~600 ms).
    carte: function (t, v) {
      cloche(t, 880, 0.6, { gain: 0.3 * v, reverb: true });
      voix("sine", 2640, t + 0.02, 0.35, { gain: 0.05 * v, attaque: 0.002, reverb: true });
    },

    // Déblocage de feature : LA fanfare. Courte montée triomphante de
    // 4 notes de synthé propre, sub pour le poids, réverb subtile,
    // froid, premium (~1,2 s). Le son signature.
    deblocage: function (t, v) {
      var notes = [330, 415, 494, 659]; // E4 · G#4 · B4 · E5 : montée claire
      for (var i = 0; i < notes.length; i++) {
        var t0 = t + i * 0.12;
        var dernier = i === notes.length - 1;
        var d = dernier ? 0.7 : 0.22;
        voix("triangle", notes[i], t0, d, {
          gain: 0.24 * v, attaque: 0.004, filtre: "lowpass",
          filtreFreq: 1400, filtreVers: 4200, reverb: true,
          relache: dernier ? 0.6 : 0.16
        });
        voix("sawtooth", notes[i], t0, d, {
          gain: 0.06 * v, filtre: "lowpass", filtreFreq: 1200, filtreVers: 3000, reverb: true
        });
      }
      // Sub qui enfle sous la montée -> le poids "système".
      voix("sine", 82.4, t, 0.9, { gain: 0.22 * v, attaque: 0.12, relache: 0.5 });
      // Éclat final scintillant sur la dernière note.
      voix("sine", 1318, t + 0.36, 0.55, { gain: 0.07 * v, attaque: 0.01, reverb: true });
    },

    // Montée de rang : nappe cinématique grave qui enfle, sub profond +
    // pad montant, cérémonial (~1,8 s).
    rang: function (t, v) {
      voix("sine", 55, t, 1.8, { gain: 0.3 * v, attaque: 0.5, relache: 0.8 }); // sub profond
      var dets = [-6, 0, 6];
      for (var i = 0; i < dets.length; i++) {
        voix("sawtooth", 110, t, 1.7, {
          gain: 0.09 * v, detune: dets[i], attaque: 0.45,
          filtre: "lowpass", filtreFreq: 200, filtreVers: 1300, filtreQ: 4, relache: 0.7
        });
      }
      voix("sine", 165, t + 0.1, 1.5, { gain: 0.1 * v, attaque: 0.6, relache: 0.6 }); // quinte
      voix("sine", 880, t + 0.9, 0.9, { gain: 0.05 * v, attaque: 0.3, reverb: true }); // lueur haute
    },

    // Jalon atteint : impact / cloche grave unique, résolu (~500 ms).
    jalon: function (t, v) {
      cloche(t, 196, 0.5, { gain: 0.32 * v, ratios: [1, 2.0, 2.98], gains: [1, 0.4, 0.2], reverb: true });
      voix("sine", 98, t, 0.4, { gain: 0.16 * v, attaque: 0.004, relache: 0.3 }); // poids grave
    },

    // Flamme continuée : souffle chaud montant, braise (~700 ms).
    "flamme-continuee": function (t, v) {
      souffle(t, 0.7, { filtre: "bandpass", freq: 300, freqVers: 1200, q: 0.8, gain: 0.11 * v, reverb: true });
      voix("sine", 130, t, 0.7, { gain: 0.16 * v, glisse: 190, attaque: 0.06, filtre: "lowpass", filtreFreq: 900, relache: 0.4 });
    },

    // Flamme rompue : son mat descendant qui s'éteint (~700 ms).
    "flamme-rompue": function (t, v) {
      voix("triangle", 220, t, 0.7, { gain: 0.2 * v, glisse: 88, attaque: 0.01, filtre: "lowpass", filtreFreq: 1200, filtreVers: 280, relache: 0.5 });
      souffle(t + 0.1, 0.55, { filtre: "lowpass", freq: 900, freqVers: 250, gain: 0.07 * v, relache: 0.45 });
    },

    // Flamme gelée : scintillement de glace cristallin (~700 ms).
    "flamme-gelee": function (t, v) {
      var f = [1245, 1760, 2350, 3140];
      for (var i = 0; i < f.length; i++) {
        voix("sine", f[i], t + i * 0.05, 0.5 - i * 0.06, { gain: 0.09 * v, attaque: 0.002, reverb: true });
      }
      voix("sine", 620, t, 0.6, { gain: 0.06 * v, attaque: 0.02, reverb: true });
    },

    // Gel consommé : ping de verre / bouclier, cristallin, protecteur (~400 ms).
    gel: function (t, v) {
      cloche(t, 1320, 0.4, { gain: 0.24 * v, ratios: [1, 2.02, 3.2], gains: [1, 0.45, 0.2], reverb: true });
      voix("sine", 660, t, 0.3, { gain: 0.08 * v, attaque: 0.004, reverb: true });
    }
  };

  // ----- Lecture -----

  // Joue un SFX. Échec SILENCIEUX si muet, audio indisponible, ou
  // contexte pas encore débloqué (avant le 1er geste).
  function jouer(nom, opts) {
    if (!actif()) return;
    if (!pret || !ctx) { reveiller(); return; } // pas prêt : ce tour est muet
    if (ctx.state === "suspended") { reveiller(); return; }
    var rec = RECETTES[nom];
    if (!rec) return;
    var v = (opts && opts.volume != null) ? opts.volume : 1;
    try { rec(ctx.currentTime + 0.02, v); } catch (e) {}
  }

  // ----- Déverrouillage au 1er geste (persistant : idempotent) -----
  (function () {
    if (typeof window === "undefined") return;
    var evs = ["pointerdown", "touchend", "mousedown", "keydown"];
    function surGeste() { reveiller(); }
    evs.forEach(function (e) {
      window.addEventListener(e, surGeste, { passive: true, capture: true });
    });
  })();

  return {
    jouer: jouer,
    actif: actif,
    definir: definir,
    basculer: basculer
  };
})();
