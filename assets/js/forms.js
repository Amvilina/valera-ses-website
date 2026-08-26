(() => {
  const formatPhone = (digits) => {
    let next = "+7";
    if (digits.length > 1) next += ` (${digits.slice(1, 4)}`;
    if (digits.length >= 4) next += ")";
    if (digits.length > 4) next += ` ${digits.slice(4, 7)}`;
    if (digits.length > 7) next += `-${digits.slice(7, 9)}`;
    if (digits.length > 9) next += `-${digits.slice(9, 11)}`;
    return next;
  };

  const toDigits = (value) => {
    let digits = value.replace(/\D/g, "");
    if (digits.startsWith("8")) digits = `7${digits.slice(1)}`;
    if (digits && !digits.startsWith("7")) digits = `7${digits}`;
    return digits.slice(0, 11);
  };

  const isComplete = (value) => {
    const digits = value.replace(/\D/g, "");
    return digits.length === 11 && digits.startsWith("7");
  };

  document.querySelectorAll('input[type="tel"]').forEach((input) => {
    let prevDigits = toDigits(input.value);

    input.addEventListener("focus", () => {
      if (!input.value) input.value = "+7";
    });

    input.addEventListener("keydown", (event) => {
      if (event.key !== "Backspace" || input.selectionStart !== input.selectionEnd) {
        return;
      }

      const pos = input.selectionStart ?? 0;
      if (pos === 0) return;

      const removed = input.value[pos - 1];
      if (/\d/.test(removed)) return;

      event.preventDefault();
      const digits = toDigits(input.value);
      const next = digits.length > 1 ? digits.slice(0, -1) : "7";
      input.value = formatPhone(next);
      prevDigits = next;
      input.classList.remove("is-invalid");
    });

    input.addEventListener("input", (event) => {
      if (!input.value.trim()) {
        prevDigits = "";
        return;
      }

      let digits = toDigits(input.value);
      const deleting =
        event.inputType === "deleteContentBackward" ||
        event.inputType === "deleteContentForward";

      if (deleting && digits.length >= prevDigits.length && prevDigits.length > 1) {
        digits = prevDigits.slice(0, -1);
      }

      if (!digits || digits === "7") {
        input.value = "+7";
        prevDigits = "7";
        return;
      }

      input.value = formatPhone(digits);
      prevDigits = digits;
      input.classList.remove("is-invalid");
    });
  });

  document.querySelectorAll('input[name="name"]').forEach((input) => {
    input.addEventListener("input", () => input.classList.remove("is-invalid"));
  });

  const modal = document.querySelector("#call");
  const planField = document.querySelector("#lead-plan");

  const resetModalForm = () => {
    if (!modal) return;
    const form = modal.querySelector("form");
    const done = modal.querySelector(".form-done");
    const error = modal.querySelector(".form-error");
    if (form) form.hidden = false;
    if (done) done.hidden = true;
    if (error) error.hidden = true;
  };

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

  let scrollY = 0;

  const openModal = (plan) => {
    if (!modal) return;
    resetModalForm();
    if (planField) planField.value = plan || "";
    lockScroll();
    modal.showModal();
    modal.querySelector('input[name="name"]')?.focus({ preventScroll: true });
  };

  document.querySelectorAll("[data-open-modal]").forEach((el) => {
    el.addEventListener("click", (event) => {
      event.preventDefault();
      openModal(el.getAttribute("data-plan") || "");
    });
  });

  document.querySelectorAll("[data-close-modal]").forEach((el) => {
    el.addEventListener("click", () => modal?.close());
  });

  modal?.addEventListener("click", (event) => {
    if (event.target === modal) modal.close();
  });

  modal?.addEventListener("close", () => {
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
    restoreScroll();
    requestAnimationFrame(() => restoreScroll());
  });

  document.querySelectorAll("form").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      const name = form.querySelector('input[name="name"]');
      const tel = form.querySelector('input[type="tel"]');
      const error = form.querySelector(".form-error");
      const done = form.parentElement.querySelector(".form-done");

      if (name && !name.value.trim()) {
        name.classList.add("is-invalid");
        if (error) {
          error.hidden = false;
          error.textContent = "Укажите имя";
        }
        name.focus();
        return;
      }

      if (!tel || !isComplete(tel.value)) {
        if (tel) tel.classList.add("is-invalid");
        if (error) {
          error.hidden = false;
          error.textContent = "Введите номер полностью, 11 цифр";
        }
        tel?.focus();
        return;
      }

      if (error) error.hidden = true;
      form.hidden = true;
      if (done) done.hidden = false;
    });
  });
})();
