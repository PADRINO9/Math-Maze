(() => {
  "use strict";

  const dialog = document.getElementById("question-dialog");
  const answerInput = document.getElementById("answer-input");

  function configure() {
    if (!answerInput) return;
    answerInput.readOnly = true;
    answerInput.inputMode = "none";
    answerInput.setAttribute("inputmode", "none");
    answerInput.setAttribute("pattern", "[0-9]*");
    answerInput.setAttribute("maxlength", "4");
    answerInput.setAttribute("aria-describedby", "game-number-pad");
  }

  if (dialog) {
    new MutationObserver(configure).observe(dialog, {
      attributes: true,
      attributeFilter: ["hidden"]
    });
  }

  window.addEventListener("pageshow", configure);
  configure();
})();
