/** Compact mode: two stacked blocks — question on top, answer below. */

import { renderShellReplyBody } from "@shell/markdown";

function questionBody(item) {
  return String(item?.body || "").trim();
}

function extractLatestPair(history) {
  const items = Array.isArray(history) ? history : [];
  let lastUserIndex = -1;
  for (let i = items.length - 1; i >= 0; i -= 1) {
    if (items[i]?.role === "user") {
      lastUserIndex = i;
      break;
    }
  }
  if (lastUserIndex < 0) return { question: null, answer: null };

  const question = items[lastUserIndex];
  let answer = null;
  for (let i = lastUserIndex + 1; i < items.length; i += 1) {
    const item = items[i];
    if (item?.role === "tool") continue;
    if (item?.role === "agent") {
      answer = item;
      break;
    }
    if (item?.role === "user") break;
  }
  return { question, answer };
}

function buildLatestPair(options) {
  const { question, answer } = extractLatestPair(options.getHistory?.() || []);
  const streaming = Boolean(options.isStreaming?.());
  const liveReply = String(options.getLiveReply?.() || "").trim();
  const lastAsk = String(options.getLastAsk?.() || "").trim();
  const processingAsk = String(options.getProcessingMessage?.() || "").trim();

  const qText =
    questionBody(question) || (streaming ? lastAsk || processingAsk : "") || processingAsk;
  let aText = questionBody(answer);
  let pending = false;

  if (streaming && liveReply) {
    aText = liveReply;
    pending = false;
  } else if (streaming && qText && !aText) {
    pending = true;
  }

  if (!qText && !aText && !pending) return null;

  return { question: qText, answer: aText, pending };
}

function pairKey(pair) {
  if (!pair) return "";
  return `${String(pair.question || "").trim()}|${pair.pending ? "pending" : String(pair.answer || "").trim()}`;
}

export function createShellCompactQa(options = {}) {
  const root = options.root;
  const frame = options.frame;
  const pane = options.pane;
  let lastPairKey = "";

  function setAnswerBody(el, pair) {
    el.classList.toggle("is-pending", !pair.answer);
    if (pair.answer) {
      renderShellReplyBody(el, pair.answer);
      return;
    }
    el.innerHTML =
      '<span class="shell-compact-qa-dots" aria-hidden="true"><span></span><span></span><span></span></span>';
  }

  function updateAnswerOnly(pair) {
    if (!pane) return false;
    const answerEl = pane.querySelector(".shell-compact-qa-block--reply .shell-compact-qa-answer");
    if (!answerEl) return false;
    frame?.classList.toggle("is-waiting", Boolean(pair.pending));
    setAnswerBody(answerEl, pair);
    return true;
  }

  function renderPane(pair) {
    if (!pane) return;

    pane.replaceChildren();
    frame?.classList.remove("is-empty", "is-waiting");

    if (!pair) {
      frame?.classList.add("is-empty");
      lastPairKey = "";
      const empty = document.createElement("p");
      empty.className = "shell-compact-qa-placeholder";
      empty.textContent = "Скажите — ответ появится здесь";
      pane.append(empty);
      return;
    }

    lastPairKey = pairKey(pair);
    if (pair.pending) frame?.classList.add("is-waiting");

    if (pair.question) {
      const askBlock = document.createElement("section");
      askBlock.className = "shell-compact-qa-block shell-compact-qa-block--ask";
      askBlock.setAttribute("aria-label", "Ваш вопрос");

      const questionEl = document.createElement("p");
      questionEl.className = "shell-compact-qa-question";
      questionEl.textContent = pair.question;

      askBlock.append(questionEl);
      pane.append(askBlock);
    }

    const questionOnly = Boolean(options.questionOnly);
    if (!questionOnly && (pair.answer || pair.pending)) {
      const replyBlock = document.createElement("section");
      replyBlock.className = "shell-compact-qa-block shell-compact-qa-block--reply";
      replyBlock.setAttribute("aria-label", "Ответ агента");

      const answerEl = document.createElement("div");
      answerEl.className = "shell-compact-qa-answer";
      setAnswerBody(answerEl, pair);

      replyBlock.append(answerEl);
      pane.append(replyBlock);
    }
  }

  function render() {
    if (!root || !pane) return;

    const enabled = Boolean(options.isEnabled?.());
    const compact = Boolean(options.isCompact?.());
    if (!enabled || !compact) {
      root.hidden = true;
      root.dataset.visible = "0";
      lastPairKey = "";
      return;
    }

    root.hidden = false;
    root.dataset.visible = "1";

    const pair = buildLatestPair(options);
    const key = pairKey(pair);
    if (!options.questionOnly && pair && key && key === lastPairKey && updateAnswerOnly(pair)) return;
    renderPane(pair);
  }

  return { render, sync: render };
}
