(() => {
  const box = document.querySelector(".nav-check");
  const modal = document.querySelector(".nav-modal");
  if (!box || !modal) return;

  modal.addEventListener("click", (event) => {
    if (event.target.closest("a")) box.checked = false;
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") box.checked = false;
  });
})();
