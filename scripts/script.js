const inputText = document.getElementById("input-text");
const outputText = document.getElementById("output-text");
const inputLang = document.getElementById("input-language");
const outputLang = document.getElementById("output-language");

const swapBtn = document.getElementById("swap-btn");
const copyBtn = document.getElementById("copy-btn");
const micBtn = document.getElementById("mic-btn");
const speakBtn = document.getElementById("speak-btn");
const clearBtn = document.getElementById("clear-btn");


// ----------- FUNCIÓN DE TRADUCIR -----------
async function translateText() {
    const text = inputText.value.trim();
    if (!text) return;

    outputText.value = "Traduciendo... ⏳";

    const from = inputLang.value === "auto" ? "auto" : inputLang.value;
    const to = outputLang.value;

    const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${from}&tl=${to}&dt=t&q=${encodeURIComponent(text)}`;

    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 4000);

        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeout);

        const data = await res.json();

        if (!Array.isArray(data) || !Array.isArray(data[0])) {
            throw new Error("Formato inesperado");
        }

        const translated = data[0]
            .filter(chunk => chunk && chunk[0])
            .map(chunk => chunk[0])
            .join("");

        if (translated.trim() === "") throw new Error("Vacío");

        outputText.value = translated;

        if (from === "auto" && data[2]) {
            inputLang.value = data[2];
        }

    } catch (err) {
        console.warn("Error traduciendo:", err);

        try {
            const resRetry = await fetch(url);
            const dataRetry = await resRetry.json();
            const translatedRetry = dataRetry[0].map(x => x[0]).join("");
            outputText.value = translatedRetry || "Error al traducir ❌";
        } catch {
            outputText.value = "Sin conexión o servicio no disponible ❌";
        }
    }
}



// --- Traducir al presionar Enter ---
inputText.addEventListener("keypress", e => {
    if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        translateText();
    }
});


// ----------- AUTO-TRADUCCIÓN AL ESCRIBIR -----------
let autoTranslateTimer;

inputText.addEventListener("input", () => {
    clearTimeout(autoTranslateTimer);
    autoTranslateTimer = setTimeout(() => {
        translateText();
    }, 500);
});


// ----------- BOTÓN INTERCAMBIAR IDIOMAS -----------
swapBtn.addEventListener("click", () => {
    const t = inputLang.value;
    inputLang.value = outputLang.value;
    outputLang.value = t;

    const t2 = inputText.value;
    inputText.value = outputText.value;
    outputText.value = t2;

    translateText();
});


// ----------- COPIAR TRADUCCIÓN -----------
copyBtn.addEventListener("click", async () => {
    if (!outputText.value.trim()) return;
    await navigator.clipboard.writeText(outputText.value);
    copyBtn.innerText = "✅ Copiado!";
    setTimeout(() => (copyBtn.innerText = "📋 Copiar"), 1500);
});


// ----------- VOZ A TEXTO (MICRÓFONO) -----------
let recognition;
let listening = false;

function setupSpeech() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        alert("Tu navegador no soporta reconocimiento de voz. Usa Google Chrome.");
        return;
    }

    recognition = new SpeechRecognition();

    // ✅ Usar idioma correcto según LOCALES
    recognition.lang = getLocale(inputLang.value);

    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => {
        listening = true;
        micBtn.innerText = "🎙️ Escuchando...";
    };

    recognition.onend = () => {
        listening = false;
        micBtn.innerText = "🎤";
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

setupSpeech();


// ✅ Actualizar reconocimiento cuando cambias idioma manualmente
inputLang.addEventListener("change", () => {
    if (recognition && listening) recognition.stop();
    setupSpeech();
});


// Botón micrófono
micBtn.addEventListener("click", () => {
    if (!recognition) return;
    if (!listening) recognition.start();
    else recognition.stop();
});


// ----------- TEXTO A VOZ (REPRODUCIR) -----------
speakBtn.addEventListener("click", () => {
    let text = outputText.value.trim();
    let lang = outputLang.value;

    if (!text) {
        alert("No hay texto para reproducir.");
        return;
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang !== "auto" ? lang : "es-ES";

    speechSynthesis.cancel();
    speechSynthesis.speak(utterance);
});


// ----------- BOTÓN LIMPIAR -----------
clearBtn.addEventListener("click", () => {
    inputText.value = "";
    outputText.value = "";

    inputText.placeholder = "Texto a traducir";

    speechSynthesis.cancel();

    if (recognition && listening) recognition.stop();
});


// ✅ Auto-traducir cuando cambias el idioma
inputLang.addEventListener("change", () => {
    if (inputText.value.trim() !== "") {
        translateText();
    }
});

outputLang.addEventListener("change", () => {
    if (inputText.value.trim() !== "") {
        translateText();
    }
});


// ----------- LOCALES PARA MICRÓFONO -----------
const LOCALES = {
    auto: "es-ES",

    af: "af-ZA",
    sq: "sq-AL",
    am: "am-ET",
    ar: "ar-SA",
    hy: "hy-AM",
    az: "az-AZ",
    eu: "eu-ES",
    bn: "bn-IN",
    bs: "bs-BA",
    bg: "bg-BG",
    ca: "ca-ES",
    ceb: "ceb-PH",
    "zh-CN": "zh-CN",
    "zh-TW": "zh-TW",
    hr: "hr-HR",
    cs: "cs-CZ",
    da: "da-DK",
    nl: "nl-NL",
    en: "en-US",
    eo: "eo",
    et: "et-EE",
    fi: "fi-FI",
    fr: "fr-FR",
    gl: "gl-ES",
    ka: "ka-GE",
    de: "de-DE",
    el: "el-GR",
    gu: "gu-IN",
    ht: "ht-HT",
    ha: "ha-NG",
    he: "he-IL",
    hi: "hi-IN",
    hmn: "hmn",
    hu: "hu-HU",
    is: "is-IS",
    ig: "ig-NG",
    id: "id-ID",
    ga: "ga-IE",
    it: "it-IT",
    ja: "ja-JP",
    jw: "jv-ID",
    kn: "kn-IN",
    kk: "kk-KZ",
    km: "km-KH",
    ko: "ko-KR",
    lo: "lo-LA",
    la: "la",
    lv: "lv-LV",
    lt: "lt-LT",
    mk: "mk-MK",
    mg: "mg-MG",
    ms: "ms-MY",
    ml: "ml-IN",
    mt: "mt-MT",
    mi: "mi-NZ",
    mr: "mr-IN",
    mn: "mn-MN",
    ne: "ne-NP",
    no: "no-NO",
    ny: "ny-MW",
    or: "or-IN",
    ps: "ps-AF",
    fa: "fa-IR",
    pl: "pl-PL",
    pt: "pt-PT",
    pa: "pa-IN",
    ro: "ro-RO",
    ru: "ru-RU",
    sm: "sm-WS",
    gd: "gd-GB",
    sr: "sr-RS",
    st: "st-LS",
    sn: "sn-ZW",
    sd: "sd-PK",
    si: "si-LK",
    sk: "sk-SK",
    sl: "sl-SI",
    so: "so-SO",
    es: "es-ES",
    su: "su-ID",
    sw: "sw-KE",
    sv: "sv-SE",
    tl: "fil-PH",
    tg: "tg-TJ",
    ta: "ta-IN",
    tt: "tt-RU",
    te: "te-IN",
    th: "th-TH",
    tr: "tr-TR",
    uk: "uk-UA",
    ur: "ur-PK",
    uz: "uz-UZ",
    vi: "vi-VN",
    cy: "cy-GB",
    xh: "xh-ZA",
    yi: "yi",
    yo: "yo-NG",
    zu: "zu-ZA"
};

function getLocale(code) {
    return LOCALES[code] || "es-ES";
}
