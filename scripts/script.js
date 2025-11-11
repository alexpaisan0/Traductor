// === DOM ===
const inputText = document.getElementById("input-text");
const outputText = document.getElementById("output-text");
const inputLang = document.getElementById("input-language");
const outputLang = document.getElementById("output-language");
const swapBtn = document.getElementById("swap-btn");
const copyBtn = document.getElementById("copy-btn");
const micBtn = document.getElementById("mic-btn");
const speakBtn = document.getElementById("speak-btn");
const clearBtn = document.getElementById("clear-btn");

// === LOCALES ===
const LOCALES = {
  auto: "es-ES", af: "af-ZA", sq: "sq-AL", am:"am-ET", ar:"ar-SA", hy:"hy-AM",
  az:"az-AZ", eu:"eu-ES", bn:"bn-IN", bs:"bs-BA", bg:"bg-BG", ca:"ca-ES",
  ceb:"ceb-PH", "zh-CN":"zh-CN", "zh-TW":"zh-TW", hr:"hr-HR", cs:"cs-CZ",
  da:"da-DK", nl:"nl-NL", en:"en-US", eo:"eo", et:"et-EE", fi:"fi-FI",
  fr:"fr-FR", gl:"gl-ES", ka:"ka-GE", de:"de-DE", el:"el-GR", gu:"gu-IN",
  ht:"ht-HT", ha:"ha-NG", he:"he-IL", hi:"hi-IN", hmn:"hmn", hu:"hu-HU",
  is:"is-IS", ig:"ig-NG", id:"id-ID", ga:"ga-IE", it:"it-IT", ja:"ja-JP",
  jw:"jv-ID", kn:"kn-IN", kk:"kk-KZ", km:"km-KH", ko:"ko-KR", lo:"lo-LA",
  la:"la", lv:"lv-LV", lt:"lt-LT", mk:"mk-MK", mg:"mg-MG", ms:"ms-MY",
  ml:"ml-IN", mt:"mt-MT", mi:"mi-NZ", mr:"mr-IN", mn:"mn-MN", ne:"ne-NP",
  no:"no-NO", ny:"ny-MW", or:"or-IN", ps:"ps-AF", fa:"fa-IR", pl:"pl-PL",
  pt:"pt-PT", pa:"pa-IN", ro:"ro-RO", ru:"ru-RU", sm:"sm-WS", gd:"gd-GB",
  sr:"sr-RS", st:"st-LS", sn:"sn-ZW", sd:"sd-PK", si:"si-LK", sk:"sk-SK",
  sl:"sl-SI", so:"so-SO", es:"es-ES", su:"su-ID", sw:"sw-KE", sv:"sv-SE",
  tl:"fil-PH", tg:"tg-TJ", ta:"ta-IN", tt:"tt-RU", te:"te-IN", th:"th-TH",
  tr:"tr-TR", uk:"uk-UA", ur:"ur-PK", uz:"uz-UZ", vi:"vi-VN", cy:"cy-GB",
  xh:"xh-ZA", yi:"yi", yo:"yo-NG", zu:"zu-ZA"
};

const getLocale = c => LOCALES[c] || "es-ES";

// ======= QUICK TAB UPDATE =======
function updateQuickTab(side, langCode) {
  const wrap = document.querySelector(`.quick-tabs[data-side="${side}"]`);
  const btn = wrap.querySelector(".qt");

  const select = side === "source" ? inputLang : outputLang;
  btn.textContent = select.options[select.selectedIndex].textContent;
  btn.dataset.lang = langCode;
}

// === TRADUCIR ===
let currentAbort = null;

async function translateText() {
  const text = inputText.value.trim();
  if (!text) return;

  if (currentAbort) currentAbort.abort();

  outputText.value = "Traduciendo... ⏳";

  const from = inputLang.value === "auto" ? "auto" : inputLang.value;
  const to = outputLang.value;
  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;

  try {
    const ctrl = new AbortController();
    currentAbort = ctrl;
    const timeout = setTimeout(() => ctrl.abort(), 8000);

    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(timeout);
    const data = await res.json();

    const translation = data[0].map(seg => seg[0]).join("");
    outputText.value = translation;

  } catch {
    outputText.value = "Error al traducir ❌";
  }
}

// Input escribe
inputText.addEventListener("input", () => {
  clearTimeout(window.tt);
  window.tt = setTimeout(translateText, 500);
});

// Enter traduce
inputText.addEventListener("keypress", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    translateText();
  }
});

// === SWAP ===
swapBtn.addEventListener("click", () => {
  const temp = inputLang.value;
  inputLang.value = outputLang.value;
  outputLang.value = temp;

  const textTemp = inputText.value;
  inputText.value = outputText.value;
  outputText.value = textTemp;

  updateQuickTab("source", inputLang.value);
  updateQuickTab("target", outputLang.value);

  translateText();
});

// === COPY ===
copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(outputText.value);
  copyBtn.textContent = "✅";
  setTimeout(() => copyBtn.textContent = "📋", 1000);
});

// === VOICE INPUT ===
let recognition, listening = false;

function setupSpeech() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return;

  recognition = new SR();
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.lang = getLocale(inputLang.value);

  recognition.onstart = () => {
    listening = true;
    micBtn.textContent = "🎙️";
  };

  recognition.onend = () => {
    listening = false;
    micBtn.textContent = "🎤";
  };

  recognition.onresult = e => {
    inputText.value = e.results[0][0].transcript;
    translateText();
  };
}
setupSpeech();

micBtn.addEventListener("click", () => {
  if (!recognition) return;
  listening ? recognition.stop() : recognition.start();
});

// === SPEAK ===
speakBtn.addEventListener("click", () => {
  const t = outputText.value.trim();
  if (!t) return;
  const u = new SpeechSynthesisUtterance(t);
  u.lang = getLocale(outputLang.value);
  speechSynthesis.cancel();
  speechSynthesis.speak(u);
});

// === CLEAR ===
clearBtn.addEventListener("click", () => {
  inputText.value = "";
  outputText.value = "";
});

// === CUANDO CAMBIA SELECT: actualizar quick tab ===
inputLang.addEventListener("change", () => {
  updateQuickTab("source", inputLang.value);
  translateText();
});

outputLang.addEventListener("change", () => {
  updateQuickTab("target", outputLang.value);
  translateText();
});

// === LOAD ===
window.addEventListener("load", () => {
  updateQuickTab("source", inputLang.value);
  updateQuickTab("target", outputLang.value);
});
