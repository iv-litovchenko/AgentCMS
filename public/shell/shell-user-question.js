/** Claude CLI AskUserQuestion modal (SSE → pick options → answers back to CLI). */

function normalizeQuestions(raw) {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const question = String(item.question || "").trim();
      if (!question) return null;
      const options = Array.isArray(item.options)
        ? item.options
            .map((opt) => {
              if (!opt || typeof opt !== "object") return null;
              const label = String(opt.label || "").trim();
              if (!label) return null;
              return {
                label,
                description: String(opt.description || "").trim()
              };
            })
            .filter(Boolean)
        : [];
      return {
        question,
        header: String(item.header || "").trim(),
        multiSelect: Boolean(item.multiSelect),
        options
      };
    })
    .filter(Boolean);
}

function collectAnswers(form, questions) {
  const answers = {};
  for (const q of questions) {
    const name = `auq-${encodeURIComponent(q.question)}`;
    if (q.multiSelect) {
      const checked = [...form.querySelectorAll(`input[name="${name}"]:checked`)].map(
        (el) => el.value
      );
      if (checked.length) answers[q.question] = checked.join(", ");
      continue;
    }
    const picked = form.querySelector(`input[name="${name}"]:checked`);
    if (picked) answers[q.question] = picked.value;
  }
  return answers;
}

function validateAnswers(questions, answers) {
  for (const q of questions) {
    const value = String(answers[q.question] || "").trim();
    if (!value) return q.question;
  }
  return "";
}

function renderQuestionBlock(q, index) {
  const block = document.createElement("fieldset");
  block.className = "shell-user-question-block";

  const legend = document.createElement("legend");
  legend.className = "shell-user-question-legend";
  legend.textContent = q.header || `Вопрос ${index + 1}`;
  block.append(legend);

  const prompt = document.createElement("p");
  prompt.className = "shell-user-question-prompt";
  prompt.textContent = q.question;
  block.append(prompt);

  const optionsWrap = document.createElement("div");
  optionsWrap.className = "shell-user-question-options";

  const inputName = `auq-${encodeURIComponent(q.question)}`;
  q.options.forEach((opt, optIndex) => {
    const label = document.createElement("label");
    label.className = "shell-user-question-option";

    const input = document.createElement("input");
    input.type = q.multiSelect ? "checkbox" : "radio";
    input.name = inputName;
    input.value = opt.label;
    input.required = !q.multiSelect;
    if (!q.multiSelect && optIndex === 0) input.checked = true;

    const text = document.createElement("span");
    text.className = "shell-user-question-option-text";
    text.textContent = opt.label;

    label.append(input, text);
    if (opt.description) {
      const desc = document.createElement("span");
      desc.className = "shell-user-question-option-desc";
      desc.textContent = opt.description;
      label.append(desc);
    }
    optionsWrap.append(label);
  });

  block.append(optionsWrap);
  return block;
}

export function initShellUserQuestion({
  dialog,
  titleEl,
  listEl,
  formEl,
  submitBtn,
  cancelBtn,
  apiFetch,
  onStatus
} = {}) {
  if (!dialog || !listEl || !formEl || !submitBtn || !cancelBtn) return {};

  const queue = [];
  let active = null;
  let busy = false;

  function setStatus(text) {
    if (typeof onStatus === "function") onStatus(String(text || "").trim());
  }

  function renderRequest(item) {
    const questions = normalizeQuestions(item?.questions);
    if (titleEl) titleEl.textContent = "Claude задаёт вопрос";
    listEl.replaceChildren();
    for (let i = 0; i < questions.length; i += 1) {
      listEl.append(renderQuestionBlock(questions[i], i));
    }
    setStatus(
      questions.length === 1
        ? "Выберите вариант ответа"
        : `Ответьте на ${questions.length} вопроса`
    );
  }

  async function complete(payload) {
    if (!active || busy) return;
    busy = true;
    const requestId = active.requestId;
    try {
      await apiFetch("/api/shell/user-question/complete", {
        method: "POST",
        body: JSON.stringify({ requestId, ...payload })
      });
      if (payload.cancelled) setStatus("Вопрос отменён");
      else setStatus("Ответ отправлен");
    } catch (error) {
      setStatus(String(error?.message || error || "Не удалось отправить ответ"));
    } finally {
      busy = false;
      active = null;
      if (typeof dialog.close === "function") dialog.close();
      showNext();
    }
  }

  function showNext() {
    if (active || busy || queue.length === 0) return;
    active = queue.shift();
    renderRequest(active);
    if (typeof dialog.showModal === "function") dialog.showModal();
  }

  function handleRequest(payload) {
    const requestId = String(payload?.requestId || "").trim();
    const questions = normalizeQuestions(payload?.questions);
    if (!requestId || !questions.length) return;
    queue.push({ requestId, questions });
    showNext();
  }

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!active) return;
    const answers = collectAnswers(formEl, active.questions);
    const missing = validateAnswers(active.questions, answers);
    if (missing) {
      setStatus(`Выберите ответ: ${missing}`);
      return;
    }
    void complete({ answers, cancelled: false });
  });

  cancelBtn.addEventListener("click", (event) => {
    event.preventDefault();
    void complete({ cancelled: true, answers: {} });
  });

  dialog.addEventListener("cancel", (event) => {
    if (!active) return;
    event.preventDefault();
    void complete({ cancelled: true, answers: {} });
  });

  return { handleRequest };
}
