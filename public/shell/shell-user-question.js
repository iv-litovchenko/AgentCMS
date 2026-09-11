/** CLI user-question modal (Claude AskUserQuestion / Codex request_user_input). */

const OTHER_OPTION_VALUE = "__shell_other__";
const OTHER_OPTION_LABEL = "Other";

function isOtherOptionLabel(label) {
  return /^other\b/i.test(String(label || "").trim());
}

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
              if (!label || isOtherOptionLabel(label)) return null;
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

function readOtherText(form, questionKey) {
  const field = form.querySelector(`[data-other-for="${questionKey}"]`);
  return String(field?.value || "").trim();
}

function collectAnswers(form, questions) {
  const answers = {};
  for (const q of questions) {
    const name = `auq-${encodeURIComponent(q.question)}`;
    const otherText = readOtherText(form, name);
    if (q.multiSelect) {
      const checked = [...form.querySelectorAll(`input[name="${name}"]:checked`)]
        .map((el) => el.value)
        .filter((value) => value !== OTHER_OPTION_VALUE);
      const parts = [...checked];
      const otherChecked = form.querySelector(
        `input[name="${name}"][value="${OTHER_OPTION_VALUE}"]:checked`
      );
      if (otherChecked && otherText) parts.push(otherText);
      if (parts.length) answers[q.question] = parts.join(", ");
      continue;
    }
    const picked = form.querySelector(`input[name="${name}"]:checked`);
    if (!picked) continue;
    if (picked.value === OTHER_OPTION_VALUE) {
      if (otherText) answers[q.question] = otherText;
    } else {
      answers[q.question] = picked.value;
    }
  }
  return answers;
}

function validateAnswers(form, questions, answers) {
  for (const q of questions) {
    const name = `auq-${encodeURIComponent(q.question)}`;
    const value = String(answers[q.question] || "").trim();
    if (value) continue;
    const otherPicked = q.multiSelect
      ? form.querySelector(`input[name="${name}"][value="${OTHER_OPTION_VALUE}"]:checked`)
      : form.querySelector(`input[name="${name}"]:checked`)?.value === OTHER_OPTION_VALUE;
    if (otherPicked) return `${q.question}:other-empty`;
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
  const syncOtherField = () => {
    const otherInput = block.querySelector(`[data-other-for="${inputName}"]`);
    if (!otherInput) return;
    const otherSelected = q.multiSelect
      ? Boolean(
          block.querySelector(`input[name="${inputName}"][value="${OTHER_OPTION_VALUE}"]:checked`)
        )
      : block.querySelector(`input[name="${inputName}"]:checked`)?.value === OTHER_OPTION_VALUE;
    otherInput.disabled = !otherSelected;
    otherInput.required = Boolean(otherSelected);
    if (otherSelected) otherInput.focus();
  };

  q.options.forEach((opt, optIndex) => {
    const label = document.createElement("label");
    label.className = "shell-user-question-option";

    const input = document.createElement("input");
    input.type = q.multiSelect ? "checkbox" : "radio";
    input.name = inputName;
    input.value = opt.label;
    input.addEventListener("change", syncOtherField);

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

    if (!q.multiSelect && optIndex === 0) input.checked = true;
  });

  const otherLabel = document.createElement("label");
  otherLabel.className = "shell-user-question-option shell-user-question-option--other";

  const otherInput = document.createElement("input");
  otherInput.type = q.multiSelect ? "checkbox" : "radio";
  otherInput.name = inputName;
  otherInput.value = OTHER_OPTION_VALUE;
  otherInput.addEventListener("change", syncOtherField);

  const otherText = document.createElement("span");
  otherText.className = "shell-user-question-option-text";
  otherText.textContent = OTHER_OPTION_LABEL;

  otherLabel.append(otherInput, otherText);

  const customField = document.createElement("textarea");
  customField.className = "shell-user-question-other-input shell-textarea";
  customField.dataset.otherFor = inputName;
  customField.placeholder = "Свой вариант…";
  customField.rows = 3;
  customField.disabled = true;
  customField.addEventListener("input", () => {
    if (!q.multiSelect && !otherInput.checked) otherInput.checked = true;
    if (q.multiSelect && !otherInput.checked) otherInput.checked = true;
    syncOtherField();
  });
  customField.addEventListener("focus", () => {
    otherInput.checked = true;
    if (!q.multiSelect) {
      for (const el of optionsWrap.querySelectorAll(`input[name="${inputName}"]`)) {
        if (el !== otherInput) el.checked = false;
      }
    }
    syncOtherField();
  });

  otherLabel.append(customField);
  optionsWrap.append(otherLabel);
  block.append(optionsWrap);
  syncOtherField();
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
  getAgentId,
  onStatus
} = {}) {
  if (!dialog || !listEl || !formEl || !submitBtn || !cancelBtn) return {};

  const queue = [];
  let active = null;
  let busy = false;

  function resolveAgentId(fallback = "") {
    if (typeof getAgentId === "function") {
      const id = String(getAgentId() || "").trim();
      if (id) return id;
    }
    return String(fallback || "").trim();
  }

  function setStatus(text) {
    if (typeof onStatus === "function") onStatus(String(text || "").trim());
  }

  function dismissAll() {
    queue.length = 0;
    active = null;
    busy = false;
    if (dialog.open && typeof dialog.close === "function") dialog.close();
  }

  function renderRequest(item) {
    const questions = normalizeQuestions(item?.questions);
    if (titleEl) titleEl.textContent = "Агент задаёт вопрос";
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
    const agentId = active.agentId;
    try {
      await apiFetch("/api/shell/user-question/complete", {
        agentId,
        method: "POST",
        body: JSON.stringify({ agentId, requestId, ...payload })
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
    const requestAgentId = String(payload?.agentId || resolveAgentId() || "").trim();
    const currentAgentId = resolveAgentId();
    if (currentAgentId && requestAgentId && requestAgentId !== currentAgentId) return;
    queue.push({ agentId: requestAgentId || currentAgentId, requestId, questions });
    showNext();
  }

  formEl.addEventListener("submit", (event) => {
    event.preventDefault();
    if (!active) return;
    const answers = collectAnswers(formEl, active.questions);
    const missing = validateAnswers(formEl, active.questions, answers);
    if (missing) {
      if (missing.endsWith(":other-empty")) {
        setStatus("Введите свой вариант в поле Other");
      } else {
        setStatus(`Выберите ответ: ${missing}`);
      }
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

  return { handleRequest, dismissAll, hasPending: () => Boolean(active || queue.length) };
}
