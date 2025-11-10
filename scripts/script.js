// ============= REFERENCIAS DOM =============
const inputText  = document.getElementById("input-text");
const outputText = document.getElementById("output-text");
const inputLang  = document.getElementById("input-language");
const outputLang = document.getElementById("output-language");

const swapBtn  = document.getElementById("swap-btn");
const copyBtn  = document.getElementById("copy-btn");
const micBtn   = document.getElementById("mic-btn");
const speakBtn = document.getElementById("speak-btn");
const clearBtn = document.getElementById("clear-btn");

// ============= LOCALES PARA RECONOCIMIENTO DE VOZ =============
const LOCALES = {
  auto: "es-ES",
  af: "af-ZA", sq: "sq-AL", am: "am-ET", ar: "ar-SA", hy: "hy-AM",
  az: "az-AZ", eu: "eu-ES", bn: "bn-IN", bs: "bs-BA", bg: "bg-BG",
  ca: "ca-ES", ceb: "ceb-PH", "zh-CN": "zh-CN", "zh-TW": "zh-TW",
  hr: "hr-HR", cs: "cs-CZ", da: "da-DK", nl: "nl-NL", en: "en-US",
  eo: "eo", et: "et-EE", fi: "fi-FI", fr: "fr-FR", gl: "gl-ES",
  ka: "ka-GE", de: "de-DE", el: "el-GR", gu: "gu-IN", ht: "ht-HT",
  ha: "ha-NG", he: "he-IL", hi: "hi-IN", hmn: "hmn", hu: "hu-HU",
  is: "is-IS", ig: "ig-NG", id: "id-ID", ga: "ga-IE", it: "it-IT",
  ja: "ja-JP", jw: "jv-ID", kn: "kn-IN", kk: "kk-KZ", km: "km-KH",
  ko: "ko-KR", lo: "lo-LA", la: "la", lv: "lv-LV", lt: "lt-LT",
  mk: "mk-MK", mg: "mg-MG", ms: "ms-MY", ml: "ml-IN", mt: "mt-MT",
  mi: "mi-NZ", mr: "mr-IN", mn: "mn-MN", ne: "ne-NP", no: "no-NO",
  ny: "ny-MW", or: "or-IN", ps: "ps-AF", fa: "fa-IR", pl: "pl-PL",
  pt: "pt-PT", pa: "pa-IN", ro: "ro-RO", ru: "ru-RU", sm: "sm-WS",
  gd: "gd-GB", sr: "sr-RS", st: "st-LS", sn: "sn-ZW", sd: "sd-PK",
  si: "si-LK", sk: "sk-SK", sl: "sl-SI", so: "so-SO", es: "es-ES",
  su: "su-ID", sw: "sw-KE", sv: "sv-SE", tl: "fil-PH", tg: "tg-TJ",
  ta: "ta-IN", tt: "tt-RU", te: "te-IN", th: "th-TH", tr: "tr-TR",
  uk: "uk-UA", ur: "ur-PK", uz: "uz-UZ", vi: "vi-VN", cy: "cy-GB",
  xh: "xh-ZA", yi: "yi", yo: "yo-NG", zu: "zu-ZA"
};
function getLocale(code) {
  return LOCALES[code] || "es-ES";
}

// ============= TRADUCCIÓN =============
let currentAbort; // para cancelar si cambias el idioma rápido

async function translateText() {
  const text = inputText.value.trim();
  if (!text) return;

  // Cancelar solicitud previa si existe
  if (currentAbort) currentAbort.abort();

  outputText.value = "Traduciendo... ⏳";

  const from = inputLang.value === "auto" ? "auto" : inputLang.value;
  const to   = outputLang.value;

  const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;

  try {
    const controller = new AbortController();
    currentAbort = controller;
    const timeout = setTimeout(() => controller.abort(), 8000); // hasta 8s

    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    const data = await res.json();

    // Validación segura
    if (!Array.isArray(data) || !Array.isArray(data[0])) {
      throw new Error("Formato inesperado");
    }

    const translated = data[0]
      .filter(chunk => chunk && chunk[0])
      .map(chunk => chunk[0])
      .join("");

    if (!translated.trim()) throw new Error("Vacío");

    outputText.value = translated;

    // Detectar idioma solo si el usuario dejó AUTO
    if (inputLang.value === "auto" && data[2]) {
      inputLang.value = data[2];
      // actualiza el idioma del micrófono si procede
      updateRecognitionLang();
    }
  } catch (err) {
    console.warn("Error traduciendo:", err);

    // Reintento mínimo (sin abort controller)
    try {
      const resRetry = await fetch(url);
      const dataRetry = await resRetry.json();
      const translatedRetry = (dataRetry[0] || [])
        .filter(x => x && x[0])
        .map(x => x[0])
        .join("");
      outputText.value = translatedRetry || "Error al traducir ❌";
    } catch {
      outputText.value = "Sin conexión o servicio no disponible ❌";
    }
  } finally {
    // limpiar referencia del abort para la próxima llamada
    currentAbort = null;
  }
}

// Enter para traducir (Shift+Enter hace salto de línea)
inputText.addEventListener("keypress", e => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    translateText();
  }
});

// Auto-traducción al escribir (debounce)
let autoTranslateTimer;
inputText.addEventListener("input", () => {
  clearTimeout(autoTranslateTimer);
  autoTranslateTimer = setTimeout(translateText, 500);
});

// Intercambiar idiomas y contenidos
swapBtn.addEventListener("click", () => {
  const langTmp = inputLang.value;
  inputLang.value = outputLang.value;
  outputLang.value = langTmp;

  const textTmp = inputText.value;
  inputText.value = outputText.value;
  outputText.value = textTmp;

  updateRecognitionLang();
  translateText();
});

// Copiar traducción
copyBtn.addEventListener("click", async () => {
  if (!outputText.value.trim()) return;
  await navigator.clipboard.writeText(outputText.value);
  copyBtn.innerText = "✅ Copiado!";
  setTimeout(() => (copyBtn.innerText = "📋"), 1500);
});

// ============= RECONOCIMIENTO DE VOZ =============
let recognition;
let listening = false;

function setupSpeech() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    // Evita romper la UI si el navegador no lo soporta
    console.warn("Reconocimiento de voz no soportado en este navegador.");
    return;
  }

  recognition = new SpeechRecognition();
  updateRecognitionLang();

  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    listening = true;
    if (micBtn) micBtn.innerText = "🎙️";
  };

  recognition.onend = () => {
    listening = false;
    if (micBtn) micBtn.innerText = "🎤";
  };

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    inputText.value = transcript;
    translateText();
  };

  recognition.onerror = (event) => {
    alert("Error de micrófono: " + event.error);
  };
}

function updateRecognitionLang() {
  if (!recognition) return;
  recognition.lang = getLocale(inputLang.value);
}

setupSpeech();

// Cambiar idiomas => retraducir y actualizar micrófono
function handleLangChange() {
  updateRecognitionLang();
  if (inputText.value.trim() !== "") translateText();
}

// Listeners robustos para cambios en selects (algunos navegadores disparan input/changedistinto)
inputLang.addEventListener("change", handleLangChange);
inputLang.addEventListener("input", handleLangChange);

outputLang.addEventListener("change", () => {
  if (inputText.value.trim() !== "") translateText();
});
outputLang.addEventListener("input", () => {
  if (inputText.value.trim() !== "") translateText();
});

// Botón micrófono
if (micBtn) {
  micBtn.addEventListener("click", () => {
    if (!recognition) {
      alert("Tu navegador no soporta reconocimiento de voz. Usa Google Chrome.");
      return;
    }
    if (!listening) recognition.start();
    else recognition.stop();
  });
}

// ============= TEXTO A VOZ (TTS) =============
speakBtn.addEventListener("click", () => {
  const text = outputText.value.trim();
  const lang = outputLang.value;

  if (!text) {
    alert("No hay texto para reproducir.");
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang !== "auto" ? getLocale(lang) : "es-ES";

  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
});

// ============= LIMPIAR =============
clearBtn.addEventListener("click", () => {
  inputText.value = "";
  outputText.value = "";
  inputText.placeholder = "Texto a traducir";
  speechSynthesis.cancel();
  if (recognition && listening) recognition.stop();
});

// Seguridad extra: retraducir si hay texto al cargar selects desde caché del navegador (autofill)
window.addEventListener("load", () => {
  if (inputText.value.trim()) translateText();
});
