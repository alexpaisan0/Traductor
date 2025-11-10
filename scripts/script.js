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
        const res = await fetch(url);
        const data = await res.json();

        // Texto traducido
        outputText.value = data[0].map(x => x[0]).join("");

        // ✅ Detectar idioma automáticamente si está en AUTO
        if (from === "auto" && data[2]) {
            const detectedLang = data[2];
            inputLang.value = detectedLang;
        }

    } catch (err) {
        console.error(err);
        outputText.value = "❌ Error traduciendo";
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

    // Idiomas candidatos cuando está en AUTO (puedes agregar más)
    const autoLangs = [
        "es-ES", "en-US", "fr-FR", "de-DE",
        "pt-PT", "it-IT", "ru-RU", "ar-SA"
    ];

    recognition.lang = inputLang.value !== "auto"
        ? inputLang.value
        : autoLangs.join(",");

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
