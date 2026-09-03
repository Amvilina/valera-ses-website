(() => {
  const header = document.querySelector(".site-header");
  const setOffset = () => {
    if (!header) return;
    document.documentElement.style.setProperty(
      "--header-offset",
      `${header.getBoundingClientRect().height}px`
    );
  };
  setOffset();
  if (header && "ResizeObserver" in window) {
    new ResizeObserver(setOffset).observe(header);
  }

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
