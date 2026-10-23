import { useEffect, useRef, useState } from 'react';

export default function VoiceChatControls({ language, onTranscript, disabled = false, speechText = '' }) {
  const [listening, setListening] = useState(false);
  const [message, setMessage] = useState('');
  const recognitionRef = useRef(null);
  const SpeechRecognitionApi = typeof window !== 'undefined' ? window.SpeechRecognition ?? window.webkitSpeechRecognition : null;

  useEffect(() => () => {
    recognitionRef.current?.abort?.();
    if (typeof window !== 'undefined') window.speechSynthesis?.cancel?.();
  }, []);

  const toggleDictation = () => {
    if (!SpeechRecognitionApi) { setMessage('Este navegador no ofrece dictado por voz.'); return; }
    if (listening) { recognitionRef.current?.stop?.(); setListening(false); return; }
    const recognition = new SpeechRecognitionApi();
    recognition.lang = 'es-PY';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = event => {
      const transcript = [...event.results].map(result => result[0]?.transcript ?? '').join(' ').trim();
      if (transcript) { onTranscript?.(transcript); setMessage('Revisá el texto reconocido antes de enviarlo.'); }
    };
    recognition.onerror = event => setMessage(event.error === 'not-allowed' ? 'Permití el micrófono en el navegador para dictar.' : 'No se entendió el audio. Podés intentarlo otra vez o escribir.');
    recognition.onend = () => { setListening(false); recognitionRef.current = null; };
    recognitionRef.current = recognition;
    setMessage(language === 'es' ? 'Escuchando en español de Paraguay…' : 'Escuchando en español de Paraguay; el Jopara puede reconocerse de forma imprecisa…');
    setListening(true);
    try { recognition.start(); } catch { setListening(false); setMessage('No se pudo iniciar el micrófono.'); }
  };

  const speak = () => {
    if (!speechText || typeof window === 'undefined' || !window.speechSynthesis || !window.SpeechSynthesisUtterance) {
      setMessage('La lectura en voz alta no está disponible en este navegador.'); return;
    }
    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(speechText.slice(0, 5000));
    utterance.lang = 'es-PY';
    window.speechSynthesis.speak(utterance);
    setMessage('PyFis está leyendo la respuesta en voz alta.');
  };

  return <div className="voice-chat-controls">
    <button type="button" className="btn btn-secondary" onClick={toggleDictation} disabled={disabled || !SpeechRecognitionApi} aria-pressed={listening} title={!SpeechRecognitionApi ? 'El reconocimiento de voz no está disponible en este navegador' : undefined}>{listening ? 'Detener dictado' : 'Dictar pregunta'}</button>
    <button type="button" className="btn btn-secondary" onClick={speak} disabled={!speechText}>Escuchar última respuesta</button>
    {message && <small className="voice-chat-note" role="status">{message}</small>}
    {!SpeechRecognitionApi && <small className="voice-chat-note">El dictado no está disponible en este navegador.</small>}
    <small className="voice-chat-note">El dictado usa reconocimiento de español de Paraguay; revisá palabras en Jopara antes de enviar.</small>
  </div>;
}
