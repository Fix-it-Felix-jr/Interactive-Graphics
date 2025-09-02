// music.js

// Variabili globali per l'audio, accessibili dallo script principale
let audioContext = null;
let audio = null;
let source = null;
let filter = null;
let isAudioReady = false;

/**
 * Inizializza e avvia la musica. 
 * Deve essere chiamata da un'interazione dell'utente (es. click su "Avvia Gioco").
 */
async function startAudio() {
    if (isAudioReady) return; // Non inizializzare due volte

    try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        audio = new Audio('music.mp3');
        audio.loop = true;
        audio.crossOrigin = "anonymous";

        source = audioContext.createMediaElementSource(audio);
        filter = audioContext.createBiquadFilter();
        filter.type = "lowpass";
        filter.frequency.setValueAtTime(22000, audioContext.currentTime);

        source.connect(filter);
        filter.connect(audioContext.destination);

        await audio.play();
        isAudioReady = true;
        console.log("Musica avviata e pronta.");

    } catch (e) {
        console.error("Errore durante l'avvio dell'audio:", e);
    }
}

/**
 * Applica l'effetto "muffled" (ovattato) abbassando la frequenza del filtro.
 * Da chiamare quando il giocatore perde.
 */
function muffleAudio() {
    if (!isAudioReady || !filter) return;
    const now = audioContext.currentTime;
    filter.frequency.exponentialRampToValueAtTime(500, now + 1); // Frequenza bassa per l'effetto
    console.log("Audio ovattato (Game Over).");
}

/**
 * Riporta l'audio alla normalità.
 * Da chiamare quando inizia una nuova partita.
 */
function unmuffleAudio() {
    if (!isAudioReady || !filter) return;
    const now = audioContext.currentTime;
    filter.frequency.exponentialRampToValueAtTime(22000, now + 1); // Frequenza normale
    console.log("Audio tornato normale (Nuova Partita).");
}
