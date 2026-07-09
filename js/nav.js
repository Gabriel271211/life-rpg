// Navigation basse : marque l'onglet actif et neutralise les liens vides.
(function () {
  var page = document.body.dataset.page;

  document.querySelectorAll(".nav-bas .nav-lien").forEach(function (lien) {
    lien.classList.toggle("actif", lien.dataset.nav === page);

    if (lien.getAttribute("href") === "#") {
      lien.addEventListener("click", function (e) {
        e.preventDefault();
      });
    }
  });
})();
