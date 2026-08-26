(() => {
  document.querySelectorAll("img").forEach((img) => {
    const markEmpty = () => img.classList.add("is-empty");
    img.addEventListener("error", markEmpty);
    if (img.complete && img.naturalWidth === 0 && img.getAttribute("src")) {
      markEmpty();
    }
  });
})();
