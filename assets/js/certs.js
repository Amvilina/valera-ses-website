(() => {
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const scrollMode = reduced ? "auto" : "smooth";
  let scrollY = 0;

  const lockScroll = () => {
    scrollY = window.scrollY;
    document.documentElement.classList.add("modal-open");
    document.body.style.position = "fixed";
    document.body.style.insetInline = "0";
    document.body.style.top = `-${scrollY}px`;
  };

  const restoreScroll = () => {
    const html = document.documentElement;
    html.classList.remove("modal-open");
    document.body.style.position = "";
    document.body.style.insetInline = "";
    document.body.style.top = "";
    html.style.scrollBehavior = "auto";
    window.scrollTo(0, scrollY);
    html.style.scrollBehavior = "";
  };

  const wireLightboxShell = (lightbox) => {
    lightbox.querySelector("[data-cert-close]")?.addEventListener("click", () => lightbox.close());
    lightbox.addEventListener("click", (event) => {
      if (event.target === lightbox) lightbox.close();
    });
    lightbox.addEventListener("close", () => {
      const active = document.activeElement;
      if (active instanceof HTMLElement) active.blur();
      restoreScroll();
      requestAnimationFrame(() => restoreScroll());
    });
  };

  const initShotCarousel = (carousel) => {
    const lightbox = document.querySelector(carousel.dataset.shotCarousel || "");
    const track = carousel.querySelector(".certs-track");
    const items = [...carousel.querySelectorAll(".certs-item")];
    const frame = lightbox?.querySelector("img");
    if (!track || !items.length || !lightbox || !frame) return;

    let index = 0;
    let swipeX = 0;

    const step = () => {
      const item = items[0];
      const styles = getComputedStyle(track);
      const gap = Number.parseFloat(styles.columnGap || styles.gap) || 16;
      return item.getBoundingClientRect().width + gap;
    };

    const show = (next) => {
      index = (next + items.length) % items.length;
      const item = items[index];
      const img = item.querySelector("img");
      frame.src = item.dataset.certSrc;
      frame.alt = img?.alt || "";
      const neighbor = items[(index + 1) % items.length];
      const preload = new Image();
      preload.src = neighbor.dataset.certSrc;
    };

    carousel.querySelector(":scope > .certs-arrow.is-prev")?.addEventListener("click", () => {
      track.scrollBy({ left: -step(), behavior: scrollMode });
    });

    carousel.querySelector(":scope > .certs-arrow.is-next")?.addEventListener("click", () => {
      track.scrollBy({ left: step(), behavior: scrollMode });
    });

    items.forEach((item, i) => {
      item.addEventListener("click", () => {
        show(i);
        lockScroll();
        lightbox.showModal();
      });
    });

    lightbox.querySelector("[data-cert-prev]")?.addEventListener("click", () => show(index - 1));
    lightbox.querySelector("[data-cert-next]")?.addEventListener("click", () => show(index + 1));
    wireLightboxShell(lightbox);

    lightbox.addEventListener("keydown", (event) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        show(index + 1);
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        show(index - 1);
      }
    });

    frame.addEventListener("pointerdown", (event) => {
      swipeX = event.clientX;
    });

    frame.addEventListener("pointerup", (event) => {
      const delta = event.clientX - swipeX;
      if (delta > 48) show(index - 1);
      if (delta < -48) show(index + 1);
    });
  };

  const initDocLightbox = () => {
    const lightbox = document.querySelector("#license-view");
    if (!lightbox) return;

    wireLightboxShell(lightbox);

    document.querySelectorAll("[data-open-doc]").forEach((link) => {
      link.addEventListener("click", (event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        lockScroll();
        lightbox.showModal();
      });
    });
  };

  document.querySelectorAll(".certs-carousel[data-shot-carousel]").forEach(initShotCarousel);
  initDocLightbox();
})();
