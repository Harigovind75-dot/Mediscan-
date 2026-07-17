/* ═══════════════════════════════════════════════════
   CONSULT.JS — MediScan AI Chat Logic
   Handles: UI rendering, API calls to Python backend,
            emergency detection, conversation history
═══════════════════════════════════════════════════ */

const BACKEND = "http://localhost:5000";

const QUICK_SYMPTOMS = [
  { icon: "🤕", label: "Headache & fatigue" },
  { icon: "🤒", label: "Fever & chills" },
  { icon: "🤢", label: "Nausea & vomiting" },
  { icon: "😮‍💨", label: "Shortness of breath" },
  { icon: "🫁", label: "Chest pain or tightness" },
  { icon: "🦴", label: "Joint or muscle pain" },
  { icon: "🩹", label: "Skin rash or itching" },
  { icon: "😴", label: "Extreme fatigue" },
  { icon: "💊", label: "Stomach pain" },
  { icon: "😵", label: "Dizziness or vertigo" },
];

// ── State ──
let history = [];
let busy    = false;

// ── Init ──
(async function init() {
  buildSidebarChips();
  await checkServer();
  addWelcome();
})();

// ─────────────────────────────────────────────────
//  BUILD UI
// ─────────────────────────────────────────────────
function buildSidebarChips() {
  const container = document.getElementById("sb-chips");
  if (!container) return;
  QUICK_SYMPTOMS.forEach(({ icon, label }) => {
    const btn = document.createElement("button");
    btn.className = "sb-chip";
    btn.innerHTML = `<span class="sb-chip-icon">${icon}</span> ${label}`;
    btn.onclick = () => sendWith(label);
    container.appendChild(btn);
  });
}

// ─────────────────────────────────────────────────
//  SERVER CHECK
// ─────────────────────────────────────────────────
async function checkServer() {
  const dot    = document.getElementById("srv-dot");
  const name   = document.getElementById("srv-name");
  const banner = document.getElementById("srv-banner");
  try {
    const r = await fetch(`${BACKEND}/api/health`, {
      signal: AbortSignal.timeout(3000)
    });
    const ok = r.ok;
    dot.className  = "srv-dot" + (ok ? "" : " off");
    name.textContent = ok ? "Server Online ✓" : "Server Offline ✗";
    if (!ok) banner.classList.add("show");
    else     banner.classList.remove("show");
    return ok;
  } catch {
    dot.className    = "srv-dot off";
    name.textContent = "Server Offline ✗";
    banner.classList.add("show");
    return false;
  }
}

// ─────────────────────────────────────────────────
//  WELCOME MESSAGE
// ─────────────────────────────────────────────────
function addWelcome() {
  addMsg("assistant",
    `Hello! I'm MediScan AI 👋\n\nI'm your AI-powered health assistant, here to help you understand your symptoms.\n\nPlease tell me:\n• What symptoms are you experiencing?\n• When did they start?\n• How severe are they (1–10)?\n\nYou can also click a quick symptom from the sidebar, or type anything below.\n\n⚠️ For emergencies, always call 911 immediately.`
  );
}

// ─────────────────────────────────────────────────
//  RENDER MESSAGES
// ─────────────────────────────────────────────────
function addMsg(role, text) {
  const wrap = document.getElementById("messages");
  const isEmg = /emergency|911|call.*ambulance|immediately.*hospital|urgent.*care/i.test(text);

  const row = mk("div", `msg-row${role === "user" ? " user" : ""}`);

  const av = mk("div", `m-av ${role === "user" ? "usr" : "ai"}`);
  av.textContent = role === "user" ? "👤" : "🩺";

  const bub = mk("div", `m-bub ${role === "user" ? "usr" : "ai"}${isEmg && role === "assistant" ? " emg" : ""}`);
  bub.innerHTML = esc(text).replace(/\n/g, "<br>");

  if (isEmg && role === "assistant") {
    const ban = mk("div", "emg-banner");
    ban.textContent = "🚨 If this is an emergency, call 911 immediately";
    bub.appendChild(ban);
  }

  const timeEl = mk("div", "msg-time");
  timeEl.textContent = now();

  const col = mk("div");
  col.style.display = "flex"; col.style.flexDirection = "column";
  col.appendChild(bub); col.appendChild(timeEl);

  row.appendChild(av); row.appendChild(col);
  wrap.appendChild(row);
  wrap.scrollTop = wrap.scrollHeight;
}

function showTyping() {
  const wrap = document.getElementById("messages");
  const row  = mk("div", "typing-row"); row.id = "typing";
  const av   = mk("div", "m-av ai"); av.textContent = "🩺";
  const bub  = mk("div", "t-bub");
  bub.innerHTML = `<span class="td"></span><span class="td"></span><span class="td"></span>`;
  row.appendChild(av); row.appendChild(bub);
  wrap.appendChild(row); wrap.scrollTop = wrap.scrollHeight;
}
function removeTyping() { document.getElementById("typing")?.remove(); }

function setStatus(isBusy) {
  const dot = document.getElementById("ct-dot");
  const txt = document.getElementById("ct-status-txt");
  if (!dot || !txt) return;
  dot.className     = "ct-dot" + (isBusy ? " busy" : "");
  txt.textContent   = isBusy ? "Analysing your symptoms…" : "Ready to help";
}

// ─────────────────────────────────────────────────
//  INPUT HANDLING
// ─────────────────────────────────────────────────
function onInput() {
  const ta  = document.getElementById("inp");
  const btn = document.getElementById("send-btn");
  ta.style.height = "auto";
  ta.style.height = Math.min(ta.scrollHeight, 120) + "px";
  btn.className = ta.value.trim() && !busy ? "on" : "";
}

function onKey(e) {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMsg(); }
}

function sendMsg() {
  const ta  = document.getElementById("inp");
  const txt = ta.value.trim();
  if (!txt || busy) return;
  ta.value = ""; ta.style.height = "auto"; onInput();
  sendWith(txt);
}

// ─────────────────────────────────────────────────
//  SEND TO PYTHON BACKEND
// ─────────────────────────────────────────────────
async function sendWith(text) {
  history.push({ role: "user", content: text });
  addMsg("user", text);

  busy = true; setStatus(true); showTyping();
  document.getElementById("send-btn").className = "";

  try {
    const res = await fetch(`${BACKEND}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages: history }),
      signal: AbortSignal.timeout(30000),
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error || `Error ${res.status}`);

    const reply = data.reply || "I'm sorry, I couldn't process that. Please try again.";
    history.push({ role: "assistant", content: reply });
    removeTyping();
    addMsg("assistant", reply);

  } catch (err) {
    removeTyping();
    let msg;
    if (err.name === "TimeoutError") {
      msg = "⏱️ Request timed out. Please try again.";
    } else if (err.message.toLowerCase().includes("failed to fetch") || err.message.includes("fetch")) {
      msg = "🔌 Cannot connect to the Python backend.\n\nSteps to fix:\n1. Open a terminal\n2. cd backend\n3. python app.py\n\nMake sure you created your .env file with your ANTHROPIC_API_KEY.";
      document.getElementById("srv-banner").classList.add("show");
      document.getElementById("srv-dot").className = "srv-dot off";
      document.getElementById("srv-name").textContent = "Server Offline ✗";
    } else {
      msg = `⚠️ Error: ${err.message}`;
    }
    addMsg("assistant", msg);
  } finally {
    busy = false; setStatus(false);
  }
}

// ─────────────────────────────────────────────────
//  NEW SESSION
// ─────────────────────────────────────────────────
function newSession() {
  history = [];
  document.getElementById("messages").innerHTML = "";
  checkServer();
  addWelcome();
}

// ─────────────────────────────────────────────────
//  UTILITIES
// ─────────────────────────────────────────────────
function mk(tag, cls = "") {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

function esc(s) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function now() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
