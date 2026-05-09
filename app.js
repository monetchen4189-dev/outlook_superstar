const state = {
  view: "home",
  storyItems: [],
  opinionItems: [],
  records: [],
  currentItem: null,
  currentKind: null,
  timer: {
    phase: "ready",
    remaining: 0,
    total: 0,
    handle: null,
  },
  recorder: {
    stream: null,
    mediaRecorder: null,
    chunks: [],
    recording: false,
    blob: null,
    url: null,
    kind: "video",
  },
};

const STORAGE_KEY = "hopeStarPracticeRecordsV1";
const DB_NAME = "hopeStarMediaV1";
const DB_STORE = "media";

const views = {
  home: "选择今天练哪个环节",
  speech: "主题演讲",
  story: "看图讲故事",
  opinion: "观点论述",
  final: "电梯演讲",
  history: "练习记录",
};

const speechPlan = {
  id: "speech-2050-city",
  type: "speech",
  title: "A Magical City in 2050",
  prepSeconds: 0,
  speakSeconds: 60,
  reference:
    "Welcome to my magical city in 2050. In this city, clean trains fly quietly in the sky, and smart trees make fresh air for everyone. Children study with friendly robots, but they still play, read, and dream together. My favorite place is the rainbow school, because every child can create something new there. I hope this city can teach us to use technology with kindness.",
};

const finalPrompts = [
  "Sell a smart schoolbag from 2050.",
  "Sell a friendly robot helper.",
  "Persuade everyone to read every day.",
  "Persuade your school to add more outdoor time.",
  "Sell a magical city tour ticket.",
];

const highPressureQuestions = [
  "Why do you think so?",
  "Can you give an example?",
  "What if someone disagrees with you?",
  "How can children use it safely?",
  "Why is it better than another choice?",
];

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
}

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function loadRecords() {
  try {
    state.records = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    state.records = [];
  }
}

function saveRecords() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.records));
}

function openDb() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(DB_STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function putMedia(id, blob) {
  if (!blob) return null;
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readwrite");
    tx.objectStore(DB_STORE).put(blob, id);
    tx.oncomplete = () => resolve(id);
    tx.onerror = () => reject(tx.error);
  });
}

async function getMedia(id) {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(DB_STORE, "readonly");
    const request = tx.objectStore(DB_STORE).get(id);
    request.onsuccess = () => resolve(request.result || null);
    request.onerror = () => reject(request.error);
  });
}

function recordsFor(itemId) {
  return state.records.filter((record) => record.itemId === itemId);
}

function markFor(itemId) {
  const count = recordsFor(itemId).length;
  if (count === 0) return '<span class="badge">未练</span>';
  if (count === 1) return '<span class="badge done">已练 1 次</span>';
  return `<span class="badge done">已练 ${count} 次</span>`;
}

function totalScore(record) {
  return Number(record.scoreA || 0) + Number(record.scoreB || 0) + Number(record.scoreC || 0);
}

function practicedToday() {
  return state.records.filter((record) => record.date.startsWith(todayKey())).length;
}

function setView(view) {
  state.view = view;
  $("#viewTitle").textContent = views[view];
  stopTimer();
  cleanupRecorder();
  render();
}

function renderStats() {
  $("#statsStrip").innerHTML = `
    <div class="stat-pill"><strong>${practicedToday()}</strong>今日已练</div>
    <div class="stat-pill"><strong>${state.records.length}</strong>总体已练</div>
  `;
}

function render() {
  renderStats();
  const content = $("#content");
  if (state.view === "home") content.innerHTML = homeView();
  if (state.view === "speech") content.innerHTML = speechView();
  if (state.view === "story") content.innerHTML = libraryView("story");
  if (state.view === "opinion") content.innerHTML = libraryView("opinion");
  if (state.view === "final") content.innerHTML = finalView();
  if (state.view === "history") content.innerHTML = historyView();
  bindDynamicEvents();
}

function homeView() {
  return `
    <section class="home-hero">
      <p class="eyebrow">今天想练哪一关？</p>
      <h2>选择一个环节，直接开始。</h2>
    </section>
    <div class="module-grid">
      ${moduleCard({
        title: "主题演讲",
        desc: "A Magical City in 2050",
        meta: "表达 60 秒",
        view: "speech",
        count: state.records.filter((record) => record.type === "speech").length,
      })}
      ${moduleCard({
        title: "看图讲故事",
        desc: "175 组图片，练过会标记",
        meta: "准备 180 秒 · 表达 60 秒",
        view: "story",
        count: state.records.filter((record) => record.type === "story").length,
      })}
      ${moduleCard({
        title: "观点论述",
        desc: "55 个观点，选择 Agree / Disagree",
        meta: "准备 300 秒 · 表达 60 秒",
        view: "opinion",
        count: state.records.filter((record) => record.type === "opinion").length,
      })}
      ${moduleCard({
        title: "电梯演讲",
        desc: "30 秒演讲 + 90 秒高压问答",
        meta: "总决赛模拟 120 秒",
        view: "final",
        count: state.records.filter((record) => record.type === "final").length,
      })}
    </div>
  `;
}

function moduleCard({ title, desc, meta, view, count }) {
  return `
    <article class="module-card module-${view}">
      <div class="module-badge">${moduleLabel(view)}</div>
      <h4>${escapeHtml(title)}</h4>
      <p>${escapeHtml(desc)}</p>
      <div class="module-meta">
        <span>${escapeHtml(meta)}</span>
        <strong>已练 ${count} 次</strong>
      </div>
      <div class="card-foot">
        <button class="btn primary" data-view="${view}" type="button">进入练习</button>
      </div>
    </article>
  `;
}

function moduleLabel(view) {
  const labels = {
    speech: "1",
    story: "2",
    opinion: "3",
    final: "4",
  };
  return labels[view] || "";
}

function speechView() {
  return practiceView(speechPlan, "speech");
}

function libraryView(kind) {
  const items = kind === "story" ? state.storyItems : state.opinionItems;
  const sets = [...new Set(state.storyItems.map((item) => item.set))];
  const setFilter =
    kind === "story"
      ? `<select id="setFilter" aria-label="套题筛选"><option value="">全部套题</option>${sets
          .map((set) => `<option value="${set}">${set}套</option>`)
          .join("")}</select>`
      : "";
  return `
    <div class="grid two">
      <section class="panel">
        <h3>${kind === "story" ? "175 组图片题库" : "55 个观点题"}</h3>
        <p class="muted">${kind === "story" ? "练过的图片会自动标记，并保留当时的故事稿。" : "每次记录立场、讲稿、评分和媒体回放。"}</p>
        <div class="toolbar">
          <button class="btn primary" data-action="${kind === "story" ? "random-story" : "random-opinion"}" type="button">随机抽题</button>
          ${setFilter}
          <select id="statusFilter" aria-label="练习状态筛选">
            <option value="">全部状态</option>
            <option value="new">未练</option>
            <option value="done">已练</option>
          </select>
        </div>
        <div class="question-list" id="questionList">
          ${items.map((item) => questionRow(item, kind)).join("")}
        </div>
      </section>
      <section class="panel">
        <h3>怎么用</h3>
        <div class="reference-box">
          <p>${kind === "story" ? "先看两张图片，用 180 秒想人物、地点、问题和结尾，再用 60 秒讲完整故事。" : "先选 Agree 或 Disagree，用 300 秒准备两个理由和一个例子，再用 60 秒说清楚。"}</p>
        </div>
      </section>
    </div>
  `;
}

function questionRow(item, kind) {
  const subtitle =
    kind === "story"
      ? `${item.set}套 · 第 ${item.number} 题`
      : `观点 ${item.number} · ${recordsFor(item.id).length} 次记录`;
  return `
    <article class="question-row" data-set="${item.set || ""}" data-status="${recordsFor(item.id).length ? "done" : "new"}">
      <div>
        <strong>${escapeHtml(item.title)}</strong>
        <div class="row-meta">
          <span class="badge">${escapeHtml(subtitle)}</span>
          ${markFor(item.id)}
        </div>
      </div>
      <button class="btn" data-start="${kind}" data-id="${item.id}" type="button">练习</button>
    </article>
  `;
}

function finalView() {
  const prompt = randomItem(finalPrompts);
  const item = {
    id: `final-${Date.now()}`,
    type: "final",
    title: prompt,
    prepSeconds: 0,
    speakSeconds: 120,
    reference:
      "I want to sell this idea because it is useful, exciting, and good for children. First, it helps us solve a real problem. Also, it can make school or life more fun. If you try it, you will see the difference quickly. Please choose it today.",
  };
  state.currentItem = item;
  state.currentKind = "final";
  return practiceView(item, "final", true);
}

function practiceView(item, kind, finalMode = false) {
  state.currentItem = item;
  state.currentKind = kind;
  const history = recordsFor(item.id);
  const titleBlock =
    kind === "story"
      ? `<div class="image-wrap"><img class="story-image" src="${item.image}" alt="${escapeHtml(item.title)}" /></div>`
      : `<div class="topic-box"><strong>${escapeHtml(item.title)}</strong></div>`;
  const timerTitle = finalMode ? "120 秒总决赛模拟" : `${item.prepSeconds ? "准备 + " : ""}${item.speakSeconds} 秒表达`;
  return `
    <div class="question-layout">
      <section class="panel question-stage">
        <h3>${escapeHtml(item.title)}</h3>
        <p class="muted">${timerTitle}</p>
        ${titleBlock}
        ${kind === "final" ? finalQuestionBlock() : ""}
        <div class="toolbar">
          ${item.prepSeconds ? `<button class="btn primary" data-timer="prep" type="button">开始准备 ${formatTime(item.prepSeconds)}</button>` : ""}
          <button class="btn primary" data-timer="speak" type="button">开始表达 ${formatTime(item.speakSeconds)}</button>
          <button class="btn" data-action="show-reference" type="button">看参考框架</button>
        </div>
        <div id="referenceArea" hidden class="reference-box">
          <strong>参考框架</strong>
          <p>${escapeHtml(item.reference)}</p>
        </div>
      </section>
      <aside class="grid">
        <section class="timer">
          <div class="phase-label" id="phaseLabel">准备开始</div>
          <div class="timer-value" id="timerValue">${formatTime(item.prepSeconds || item.speakSeconds)}</div>
          <div class="toolbar" style="justify-content:center;margin:0">
            <button class="btn" data-action="pause-timer" type="button">暂停</button>
            <button class="btn" data-action="reset-timer" type="button">重置</button>
          </div>
        </section>
        <section class="panel">
          <h3>录音录像</h3>
          <p class="muted">建议表达阶段开始前开启录制。</p>
          <div class="toolbar">
            <select id="recordKind" aria-label="录制类型">
              <option value="video">录像</option>
              <option value="audio">录音</option>
            </select>
            <button class="btn warning" data-action="toggle-recording" type="button">开始录制</button>
          </div>
          <div id="recordStatus" class="muted">尚未录制</div>
          <div id="mediaPreview" class="media-stack"></div>
        </section>
        <section class="panel">
          <h3>保存本次练习</h3>
          ${saveForm(kind)}
        </section>
        <section class="panel parent-only">
          <h3>本题历史</h3>
          <div class="history-list">
            ${history.length ? history.slice(-4).reverse().map(historyItem).join("") : emptyState()}
          </div>
        </section>
      </aside>
    </div>
  `;
}

function finalQuestionBlock() {
  return `
    <div class="reference-box" style="margin-top:12px">
      <p><strong>追问练习：</strong>${highPressureQuestions.slice(0, 3).join(" / ")}</p>
    </div>
  `;
}

function saveForm(kind) {
  const scoreLabels =
    kind === "opinion"
      ? ["切题深度", "语言逻辑", "舞台表现"]
      : kind === "speech"
        ? ["内容表达", "选题创意", "舞台表现"]
        : kind === "final"
          ? ["内容切题", "答题逻辑", "舞台表现"]
          : ["故事创意", "语言表达", "舞台表现"];
  return `
    <form id="practiceForm" class="form-grid">
      ${kind === "opinion" ? `<div class="field"><label>立场</label><select name="stance"><option value="Agree">Agree</option><option value="Disagree">Disagree</option></select></div>` : ""}
      <div class="field">
        <label>孩子这次讲的文字稿</label>
        <textarea name="transcript" placeholder="可以先录下来，回放后再把孩子讲的内容整理到这里。"></textarea>
      </div>
      <div class="score-grid parent-only">
        ${scoreLabels
          .map((label, index) => `<div class="field"><label>${label}</label><input name="score${index}" type="number" min="0" max="100" placeholder="分数" /></div>`)
          .join("")}
      </div>
      <div class="field parent-only">
        <label>家长备注</label>
        <textarea name="notes" placeholder="这次做得好的地方，以及下一次只改进一个小目标。"></textarea>
      </div>
      <button class="btn primary" type="submit">保存练习记录</button>
    </form>
  `;
}

function historyView() {
  const records = [...state.records].reverse();
  return `
    <section class="panel">
      <h3>所有练习记录</h3>
      <div class="toolbar">
        <button class="btn" data-export="json" type="button">导出 JSON</button>
      </div>
      <div class="history-list">
        ${records.length ? records.map(historyItem).join("") : emptyState()}
      </div>
    </section>
  `;
}

function historyItem(record) {
  return `
    <article class="history-item">
      <strong>${escapeHtml(record.title)}</strong>
      <div class="history-meta">
        <span class="badge">${escapeHtml(record.type)}</span>
        <span class="badge">${new Date(record.date).toLocaleString("zh-CN")}</span>
        ${record.stance ? `<span class="badge">${record.stance}</span>` : ""}
        <span class="badge done">总分 ${totalScore(record)}</span>
        ${record.mediaId ? `<button class="btn" data-media="${record.mediaId}" data-media-type="${record.mediaType}" type="button">回放</button>` : ""}
      </div>
      ${record.transcript ? `<p>${escapeHtml(record.transcript)}</p>` : ""}
      ${record.notes ? `<p class="muted">备注：${escapeHtml(record.notes)}</p>` : ""}
      <div class="media-stack" id="media-${record.mediaId || record.id}"></div>
    </article>
  `;
}

function emptyState() {
  return $("#emptyStateTemplate").innerHTML;
}

function randomItem(items) {
  if (!items?.length) return null;
  return items[Math.floor(Math.random() * items.length)];
}

function startPractice(kind, id) {
  if (kind === "speech") {
    state.view = "speech";
    $("#viewTitle").textContent = views.speech;
    render();
    return;
  }
  if (kind === "final") {
    state.view = "final";
    $("#viewTitle").textContent = views.final;
    render();
    return;
  }
  const items = kind === "story" ? state.storyItems : state.opinionItems;
  const item = items.find((candidate) => candidate.id === id) || randomItem(items);
  if (!item) return;
  state.view = kind;
  stopTimer();
  cleanupRecorder();
  $("#viewTitle").textContent = kind === "story" ? "看图讲故事" : "观点论述";
  $("#content").innerHTML = practiceView(item, kind);
  bindDynamicEvents();
}

function startTimer(phase) {
  const item = state.currentItem;
  const seconds = phase === "prep" ? item.prepSeconds : item.speakSeconds;
  state.timer.phase = phase;
  state.timer.remaining = seconds;
  state.timer.total = seconds;
  updateTimerDisplay();
  stopTimer(false);
  state.timer.handle = window.setInterval(() => {
    state.timer.remaining = Math.max(0, state.timer.remaining - 1);
    updateTimerDisplay();
    if (state.timer.remaining === 0) stopTimer(false);
  }, 1000);
}

function stopTimer(resetPhase = true) {
  if (state.timer.handle) window.clearInterval(state.timer.handle);
  state.timer.handle = null;
  if (resetPhase) state.timer.phase = "ready";
}

function resetTimer() {
  stopTimer(false);
  const item = state.currentItem;
  const seconds = item?.prepSeconds || item?.speakSeconds || 0;
  state.timer.remaining = seconds;
  state.timer.total = seconds;
  state.timer.phase = "ready";
  updateTimerDisplay();
}

function updateTimerDisplay() {
  const value = $("#timerValue");
  const label = $("#phaseLabel");
  if (!value || !label) return;
  value.textContent = formatTime(state.timer.remaining);
  const phaseText = state.timer.phase === "prep" ? "准备时间" : state.timer.phase === "speak" ? "表达时间" : "准备开始";
  label.textContent = phaseText;
}

async function toggleRecording() {
  if (state.recorder.recording) {
    state.recorder.mediaRecorder.stop();
    return;
  }
  const kind = $("#recordKind")?.value || "video";
  try {
    const constraints = kind === "audio" ? { audio: true } : { audio: true, video: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    const recorder = new MediaRecorder(stream);
    state.recorder.stream = stream;
    state.recorder.mediaRecorder = recorder;
    state.recorder.chunks = [];
    state.recorder.kind = kind;
    state.recorder.recording = true;
    recorder.ondataavailable = (event) => {
      if (event.data.size > 0) state.recorder.chunks.push(event.data);
    };
    recorder.onstop = () => finishRecording();
    recorder.start();
    $("#recordStatus").textContent = "正在录制";
    document.querySelector('[data-action="toggle-recording"]').textContent = "停止录制";
  } catch (error) {
    $("#recordStatus").textContent = "无法开启录制，请确认浏览器允许摄像头/麦克风。";
  }
}

function finishRecording() {
  const mime = state.recorder.kind === "audio" ? "audio/webm" : "video/webm";
  const blob = new Blob(state.recorder.chunks, { type: mime });
  if (state.recorder.url) URL.revokeObjectURL(state.recorder.url);
  state.recorder.blob = blob;
  state.recorder.url = URL.createObjectURL(blob);
  state.recorder.recording = false;
  state.recorder.stream?.getTracks().forEach((track) => track.stop());
  $("#recordStatus").textContent = "录制完成，保存练习记录时会一起保存。";
  const preview = $("#mediaPreview");
  const tag = state.recorder.kind === "audio" ? "audio" : "video";
  preview.innerHTML = `<${tag} src="${state.recorder.url}" controls></${tag}>`;
  document.querySelector('[data-action="toggle-recording"]').textContent = "重新录制";
}

function cleanupRecorder() {
  if (state.recorder.recording && state.recorder.mediaRecorder) {
    state.recorder.mediaRecorder.stop();
  }
  state.recorder.stream?.getTracks().forEach((track) => track.stop());
  if (state.recorder.url) URL.revokeObjectURL(state.recorder.url);
  state.recorder = {
    stream: null,
    mediaRecorder: null,
    chunks: [],
    recording: false,
    blob: null,
    url: null,
    kind: "video",
  };
}

async function savePractice(event) {
  event.preventDefault();
  const form = new FormData(event.target);
  const item = state.currentItem;
  const recordId = `record-${Date.now()}`;
  let mediaId = null;
  if (state.recorder.blob) {
    mediaId = `media-${recordId}`;
    await putMedia(mediaId, state.recorder.blob);
  }
  const record = {
    id: recordId,
    itemId: item.id,
    type: state.currentKind,
    title: item.title,
    date: new Date().toISOString(),
    stance: form.get("stance") || "",
    transcript: form.get("transcript") || "",
    notes: form.get("notes") || "",
    scoreA: form.get("score0") || 0,
    scoreB: form.get("score1") || 0,
    scoreC: form.get("score2") || 0,
    mediaId,
    mediaType: state.recorder.kind,
  };
  state.records.push(record);
  saveRecords();
  cleanupRecorder();
  render();
}

async function playbackMedia(id, type) {
  const blob = await getMedia(id);
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const target = $(`#media-${id}`) || $(`#media-${CSS.escape(id)}`);
  const container = target || document.querySelector(`[id="media-${id}"]`);
  if (!container) return;
  const tag = type === "audio" ? "audio" : "video";
  container.innerHTML = `<${tag} src="${url}" controls autoplay></${tag}>`;
}

function filterQuestions() {
  const setValue = $("#setFilter")?.value || "";
  const statusValue = $("#statusFilter")?.value || "";
  document.querySelectorAll(".question-row").forEach((row) => {
    const setOk = !setValue || row.dataset.set === setValue;
    const statusOk = !statusValue || row.dataset.status === statusValue;
    row.style.display = setOk && statusOk ? "" : "none";
  });
}

function exportJson() {
  const blob = new Blob([JSON.stringify(state.records, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `hope-star-practice-${todayKey()}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function bindDynamicEvents() {
  document.querySelectorAll("[data-view]").forEach((button) => {
    if (button.dataset.boundView) return;
    button.dataset.boundView = "true";
    button.addEventListener("click", () => setView(button.dataset.view));
  });
  document.querySelectorAll("[data-start]").forEach((button) => {
    button.addEventListener("click", () => startPractice(button.dataset.start, button.dataset.id));
  });
  document.querySelectorAll("[data-timer]").forEach((button) => {
    button.addEventListener("click", () => startTimer(button.dataset.timer));
  });
  document.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const action = button.dataset.action;
      if (action === "random-story") startPractice("story");
      if (action === "random-opinion") startPractice("opinion");
      if (action === "show-reference") $("#referenceArea").hidden = !$("#referenceArea").hidden;
      if (action === "pause-timer") stopTimer(false);
      if (action === "reset-timer") resetTimer();
      if (action === "toggle-recording") toggleRecording();
    });
  });
  $("#practiceForm")?.addEventListener("submit", savePractice);
  $("#setFilter")?.addEventListener("change", filterQuestions);
  $("#statusFilter")?.addEventListener("change", filterQuestions);
  document.querySelectorAll("[data-media]").forEach((button) => {
    button.addEventListener("click", () => playbackMedia(button.dataset.media, button.dataset.mediaType));
  });
  document.querySelector("[data-export]")?.addEventListener("click", exportJson);
}

async function init() {
  loadRecords();
  const [storyResponse, opinionResponse] = await Promise.all([
    fetch("data/story-items.json"),
    fetch("data/opinion-items.json"),
  ]);
  state.storyItems = await storyResponse.json();
  state.opinionItems = await opinionResponse.json();
  render();
}

init().catch((error) => {
  $("#content").innerHTML = `
    <section class="panel">
      <h3>加载失败</h3>
      <p class="muted">${escapeHtml(error.message)}</p>
      <p>请通过本地服务器打开这个网页，例如在应用目录运行 python3 -m http.server 5173。</p>
    </section>
  `;
});
