(() => {
  const root = document.querySelector(".quiz");
  if (!root) return;

  const intro = root.querySelector(".quiz-grid");
  const panel = root.querySelector(".quiz-panel");
  const steps = [...root.querySelectorAll(".quiz-step")];
  const form = root.querySelector(".quiz-form");
  const note = form?.querySelector('input[name="note"]');
  const questions = ["Проблема", "Где", "Когда", "Опыт"];
  const answers = [];
  let step = 0;

  const syncNote = () => {
    if (!note) return;
    note.value = answers.map((value, index) => `${questions[index]}: ${value}`).join("\n");
  };

  const show = () => {
    steps.forEach((node, index) => {
      node.classList.toggle("is-off", index !== step);
    });
    steps[step]?.querySelector("h3")?.focus({ preventScroll: true });
    syncNote();
  };

  const open = () => {
    step = 0;
    answers.length = 0;
    form?.reset();
    const error = form?.querySelector(".form-error");
    if (error) error.hidden = true;
    root.classList.add("is-open");
    intro.classList.add("is-off");
    panel.classList.remove("is-off");
    show();
  };

  const close = () => {
    step = 0;
    answers.length = 0;
    form?.reset();
    syncNote();
    panel.classList.add("is-off");
    intro.classList.remove("is-off");
    root.classList.remove("is-open");
  };

  root.querySelector(".quiz-start")?.addEventListener("click", open);

  root.querySelectorAll("[data-quiz-value]").forEach((button) => {
    button.addEventListener("click", () => {
      const current = button.closest(".quiz-step");
      const index = steps.indexOf(current);
      if (index < 0) return;
      answers[index] = button.dataset.quizValue || "";
      answers.length = index + 1;
      step = index + 1;
      show();
    });
  });

  root.querySelector(".quiz-back")?.addEventListener("click", () => {
    if (step === 0) {
      close();
      return;
    }
    answers.pop();
    step -= 1;
    show();
  });

  form?.querySelector('input[name="consent"]')?.addEventListener("change", () => {
    const error = form.querySelector(".form-error");
    if (error) error.hidden = true;
  });
})();
