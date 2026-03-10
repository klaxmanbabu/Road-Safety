(function () {
  const QUESTION_COUNT = 6;
  const BEST_SCORE_KEY = "rsq_best_percent_v1";
  const NICKNAME_KEY = "rsq_nickname_v1";
  const PASS_MARK = 80;

  // 20 seconds per question
  const QUESTION_TIME_SECONDS = 20;

  function $(id) { return document.getElementById(id); }

  const els = {
    startScreen: $("startScreen"),
    quizScreen: $("quizScreen"),
    resultScreen: $("resultScreen"),
    startBtn: $("startBtn"),
    nextBtn: $("nextBtn"),
    restartBtn: $("restartBtn"),
    nickname: $("nickname"),
    questionBlock: $("questionBlock"),
    progressText: $("progressText"),
    scoreSoFar: $("scoreSoFar"),
    resultSummary: $("resultSummary"),
    reviewBlock: $("reviewBlock"),
    // Optional separate display for per question timer (if you add it in HTML)
    // questionTimerText: $("questionTimerText")
  };

  const required = [
    "startScreen","quizScreen","resultScreen","startBtn","nextBtn",
    "restartBtn","questionBlock","progressText","scoreSoFar",
    "resultSummary","reviewBlock"
    // ,"questionTimerText"  // only if you add a separate element
  ];
  const missing = required.filter(k => !els[k]);
  if (missing.length) {
    console.error("Quiz init failed. Missing element IDs:", missing);
    return;
  }

  const bank = Array.isArray(window.QUESTION_BANK) ? window.QUESTION_BANK : [];
  if (!bank.length) {
    els.startBtn.disabled = true;
    els.startScreen.insertAdjacentHTML(
      "beforeend",
      `<p class="hint">Question bank not found. Check questions.js.</p>`
    );
    return;
  }

  function shuffle(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
  function pickN(arr, n) { return shuffle(arr).slice(0, Math.min(n, arr.length)); }
  function show(el) { el.classList.remove("hidden"); }
  function hide(el) { el.classList.add("hidden"); }

  function escapeHtml(s) {
    return String(s)
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }

  function getBestPercent() {
    const raw = localStorage.getItem(BEST_SCORE_KEY);
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  }
  function setBestPercent(p) { localStorage.setItem(BEST_SCORE_KEY, String(p)); }

  function getNickname() { return (localStorage.getItem(NICKNAME_KEY) || "").trim(); }
  function setNickname(n) { localStorage.setItem(NICKNAME_KEY, (n || "").trim()); }

  function bestLineHtml() {
    const best = getBestPercent();
    return best === null
      ? `<div><strong>Best:</strong> Not set</div>`
      : `<div><strong>Best:</strong> ${best}%</div>`;
  }

  let quiz = { questions: [], index: 0, answers: new Map() };

  // Per question timer state
  let questionRemainingSeconds = QUESTION_TIME_SECONDS;
  let questionTimerId = null;

  function updateQuestionTimerDisplay() {
    // Simple: append the per question countdown into progressText line
    // You can change this to a dedicated element if you prefer.
    const base = `Question ${quiz.index + 1} of ${quiz.questions.length}`;
    const timerPart = ` · Time left for this question: ${questionRemainingSeconds}s`;
    els.progressText.textContent = base + timerPart;
  }

  function startQuestionTimer() {
    if (questionTimerId !== null) {
      clearInterval(questionTimerId);
      questionTimerId = null;
    }
    questionRemainingSeconds = QUESTION_TIME_SECONDS;

    // Initial update
    updateQuestionTimerDisplay();

    questionTimerId = setInterval(() => {
      questionRemainingSeconds -= 1;
      if (questionRemainingSeconds <= 0) {
        questionRemainingSeconds = 0;
        updateQuestionTimerDisplay();
        clearInterval(questionTimerId);
        questionTimerId = null;
        handleQuestionTimeout();
        return;
      }
      updateQuestionTimerDisplay();
    }, 1000);
  }

  function stopQuestionTimer() {
    if (questionTimerId !== null) {
      clearInterval(questionTimerId);
      questionTimerId = null;
    }
  }

  // Called when one question's 20 sec timer expires
  function handleQuestionTimeout() {
    const qObj = quiz.questions[quiz.index];
    if (!qObj) return;

    // If user has not answered, we leave it as "No answer" (no entry in map)

    // If this was the last question, finish quiz; otherwise go to next
    if (quiz.index === quiz.questions.length - 1) {
      finishQuiz();
    } else {
      quiz.index += 1;
      renderQuestion();
    }
  }

  function startQuiz() {
    try {
      setNickname(els.nickname ? els.nickname.value : "");
      quiz.questions = pickN(bank, QUESTION_COUNT);
      quiz.index = 0;
      quiz.answers = new Map();

      hide(els.startScreen);
      hide(els.resultScreen);
      show(els.quizScreen);

      renderQuestion();
    } catch (e) {
      console.error("Start quiz error:", e);
      alert("Something went wrong starting the quiz. Please refresh and try again.");
    }
  }

  function renderQuestion() {
    const qObj = quiz.questions[quiz.index];
    if (!qObj) return;

    // Reset button and timer for this question
    els.nextBtn.disabled = true;
    stopQuestionTimer();

    const chosen = quiz.answers.get(qObj.id);

    els.progressText.textContent =
      `Question ${quiz.index + 1} of ${quiz.questions.length}`;
    els.scoreSoFar.innerHTML = `
      <div>Answered: ${quiz.answers.size}/${quiz.questions.length}</div>
      ${bestLineHtml()}
    `;

    const optionsHtml = qObj.options.map((opt, idx) => {
      const checked = chosen === idx ? "checked" : "";
      return `
        <label class="option">
          <input type="radio" name="opt" value="${idx}" ${checked} />
          <span>${escapeHtml(opt)}</span>
        </label>
      `;
    }).join("");

    els.questionBlock.innerHTML = `
      <h2>${escapeHtml(qObj.q)}</h2>
      <div class="options">${optionsHtml}</div>
    `;

    els.questionBlock.querySelectorAll('input[name="opt"]').forEach((r) => {
      r.addEventListener("change", (e) => {
        quiz.answers.set(qObj.id, Number(e.target.value));
        els.nextBtn.disabled = false;
      });
    });

    if (typeof chosen === "number") els.nextBtn.disabled = false;
    els.nextBtn.textContent =
      (quiz.index === quiz.questions.length - 1) ? "Finish" : "Next";

    // Start the 20 second timer for this question
    startQuestionTimer();
  }

  function finishQuiz() {
    // Stop the per question timer so nothing continues running
    stopQuestionTimer();

    const total = quiz.questions.length;
    let correct = 0;

    const reviewItems = quiz.questions.map((q) => {
      const selected = quiz.answers.get(q.id);
      const isCorrect = selected === q.answerIndex;
      if (isCorrect) correct += 1;
      return {
        q: q.q,
        selectedText: (typeof selected === "number") ? q.options[selected] : "No answer",
        correctText: q.options[q.answerIndex],
        isCorrect
      };
    });

    const percent = total ? Math.round((correct / total) * 100) : 0;
    const passed = percent >= PASS_MARK;

    const prevBest = getBestPercent();
    if (prevBest === null || percent > prevBest) setBestPercent(percent);

    const nick = getNickname();
    const whoLine = nick ? `<strong>Player:</strong> ${escapeHtml(nick)}<br />` : "";

    els.resultSummary.innerHTML = `
      ${whoLine}
      <strong>Score:</strong> ${correct}/${total} (${percent}%)
      <span class="badge ${passed ? "pass" : "fail"}">${passed ? "PASS" : "FAIL"}</span><br />
      <strong>Pass mark:</strong> ${PASS_MARK}%<br />
      <strong>Best:</strong> ${getBestPercent()}%
    `;

    els.reviewBlock.innerHTML = reviewItems.map((it, i) => `
      <div class="reviewItem">
        <div><strong>Q${i + 1}.</strong> ${escapeHtml(it.q)}
          <span class="badge ${it.isCorrect ? "pass" : "fail"}">
            ${it.isCorrect ? "Correct" : "Incorrect"}
          </span>
        </div>
        <div><strong>Your answer:</strong> ${escapeHtml(it.selectedText)}</div>
        <div><strong>Correct answer:</strong> ${escapeHtml(it.correctText)}</div>
      </div>
    `).join("");

    hide(els.quizScreen);
    show(els.resultScreen);
  }

  function next() {
    const qObj = quiz.questions[quiz.index];
    if (!qObj) return;
    if (!quiz.answers.has(qObj.id)) return;

    // User moved manually, stop this question's timer
    stopQuestionTimer();

    if (quiz.index === quiz.questions.length - 1) {
      finishQuiz();
      return;
    }
    quiz.index += 1;
    renderQuestion();
  }

  function restart() {
    stopQuestionTimer();
    hide(els.resultScreen);
    hide(els.quizScreen);
    if (els.nickname) els.nickname.value = getNickname();
    show(els.startScreen);
  }

  // Wire up
  els.startBtn.addEventListener("click", startQuiz);
  els.nextBtn.addEventListener("click", next);
  els.restartBtn.addEventListener("click", restart);

  // Initialize start screen nickname + best
  if (els.nickname) els.nickname.value = getNickname();
  els.startScreen.insertAdjacentHTML(
    "beforeend",
    `<p class="hint">${bestLineHtml()}</p>`
  );
})();
