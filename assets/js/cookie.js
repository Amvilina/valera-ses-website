(() => {
  const root = document.getElementById("cookie");
  if (!root) return;

  const key = "cookie-ok";
  let seen = false;
  try {
    seen = localStorage.getItem(key) === "1";
  } catch {
    seen = false;
  }
  if (seen) return;

  root.hidden = false;
  root.querySelector(".cookie-x")?.addEventListener("click", () => {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* stay closed for this view */
    }
    root.hidden = true;
  });
})();
