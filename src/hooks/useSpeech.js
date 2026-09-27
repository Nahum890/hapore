import { useCallback, useEffect, useRef, useState } from 'react';

// Reconocimiento y lectura por voz con las API nativas del navegador: sin
// modelo, sin conexión, sin costo. No hay reconocimiento de voz en guaraní
// en los navegadores actuales, así que en los dos idiomas de la app se usa
// español (es-PY); una consulta en Jopara puede reconocerse mal o nada,
// según el navegador — se avisa en la interfaz.
const RECOGNITION_LANG = 'es-PY';

export function useSpeechRecognition() {
  const [supported] = useState(() => typeof window !== 'undefined' && Boolean(window.SpeechRecognition || window.webkitSpeechRecognition));
  const [listening, setListening] = useState(false);
  const [error, setError] = useState('');
  const recognitionRef = useRef(null);

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const start = useCallback((onResult) => {
    if (!supported || listening) return;
    const Ctor = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new Ctor();
    recognition.lang = RECOGNITION_LANG;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    setError('');
    recognition.onresult = event => {
      const text = event.results?.[0]?.[0]?.transcript ?? '';
      if (text.trim()) onResult(text.trim());
    };
    recognition.onerror = event => {
      // Clave de traducción; el componente la muestra en el idioma activo.
      setError(event?.error === 'not-allowed' ? 'free.micPermission' : 'free.micFailed');
    };
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    try { recognition.start(); setListening(true); } catch { setListening(false); }
  }, [supported, listening]);

  useEffect(() => () => recognitionRef.current?.stop(), []);

  return { supported, listening, error, start, stop };
}

export function useSpeechSynthesis() {
  const [supported] = useState(() => typeof window !== 'undefined' && 'speechSynthesis' in window);
  const [speakingId, setSpeakingId] = useState(null);

  const stop = useCallback(() => {
    if (supported) window.speechSynthesis.cancel();
    setSpeakingId(null);
  }, [supported]);

  const speak = useCallback((text, id) => {
    if (!supported || !text) return;
    window.speechSynthesis.cancel();
    if (speakingId === id) { setSpeakingId(null); return; }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'es-PY';
    utterance.rate = 0.98;
    utterance.onend = () => setSpeakingId(current => (current === id ? null : current));
    utterance.onerror = () => setSpeakingId(current => (current === id ? null : current));
    setSpeakingId(id);
    window.speechSynthesis.speak(utterance);
  }, [supported, speakingId]);

  useEffect(() => () => { if (supported) window.speechSynthesis.cancel(); }, [supported]);

  return { supported, speakingId, speak, stop };
}
