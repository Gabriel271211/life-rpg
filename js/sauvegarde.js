// ============================================
// LIFE RPG — sauvegarde.js
// Export / import de la progression en fichier
// JSON, depuis la fiche de personnage.
// ============================================

(function () {

  var boutonExporter = document.getElementById("sauvegarde-exporter");
  var boutonImporter = document.getElementById("sauvegarde-importer");
  var champFichier = document.getElementById("sauvegarde-fichier");
  var actions = document.getElementById("sauvegarde-actions");
  var confirmation = document.getElementById("sauvegarde-confirmation");
  var boutonConfirmer = document.getElementById("sauvegarde-confirmer");
  var boutonAbandonner = document.getElementById("sauvegarde-abandonner");
  var message = document.getElementById("sauvegarde-message");

  // État importé en attente de confirmation.
  var enAttente = null;

  // Un fichier de sauvegarde valide contient au minimum les
  // propriétés clés de l'état. Les propriétés apparues depuis
  // seront complétées par la migration au rechargement.
  function estSauvegardeValide(objet) {
    return (
      objet !== null &&
      typeof objet === "object" &&
      !Array.isArray(objet) &&
      typeof objet.niveau === "number" &&
      typeof objet.xp === "number" &&
      typeof objet.streak === "number" &&
      Array.isArray(objet.quetes) &&
      objet.stats !== null &&
      typeof objet.stats === "object" &&
      typeof objet.stats.corps === "object" &&
      typeof objet.stats.esprit === "object" &&
      typeof objet.stats.discipline === "object"
    );
  }

  function afficherMessage(texte) {
    message.textContent = texte;
    message.hidden = false;
  }

  function fermerConfirmation() {
    enAttente = null;
    confirmation.hidden = true;
    actions.hidden = false;
    champFichier.value = "";
  }

  // --- Export : l'état complet dans un fichier daté ---
  boutonExporter.addEventListener("click", function () {
    var etat = Etat.charger();
    var blob = new Blob([JSON.stringify(etat, null, 2)], { type: "application/json" });
    var lien = document.createElement("a");
    lien.href = URL.createObjectURL(blob);
    lien.download = "life-rpg-sauvegarde-" + Jour.dateDuJour() + ".json";
    document.body.appendChild(lien);
    lien.click();
    document.body.removeChild(lien);
    URL.revokeObjectURL(lien.href);
  });

  // --- Import : lecture, validation, confirmation inline ---
  boutonImporter.addEventListener("click", function () {
    message.hidden = true;
    champFichier.click();
  });

  champFichier.addEventListener("change", function () {
    var fichier = champFichier.files && champFichier.files[0];
    if (!fichier) return;

    var lecteur = new FileReader();
    lecteur.onload = function () {
      var objet = null;
      try {
        objet = JSON.parse(lecteur.result);
      } catch (e) {}

      if (!estSauvegardeValide(objet)) {
        afficherMessage("Ce fichier n'est pas une sauvegarde Life RPG valide.");
        champFichier.value = "";
        return;
      }

      enAttente = objet;
      message.hidden = true;
      actions.hidden = true;
      confirmation.hidden = false;
    };
    lecteur.onerror = function () {
      afficherMessage("Impossible de lire ce fichier.");
      champFichier.value = "";
    };
    lecteur.readAsText(fichier);
  });

  boutonConfirmer.addEventListener("click", function () {
    if (!enAttente) return;
    // L'état brut est écrit tel quel : la migration s'applique
    // au rechargement, comme pour toute vieille sauvegarde.
    Etat.remplacer(enAttente);
    location.reload();
  });

  boutonAbandonner.addEventListener("click", fermerConfirmation);

})();
