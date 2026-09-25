import { useCallback, useEffect, useRef, useState } from 'react';
import { createAIProvider } from '../ai/AIProvider.js';

const TUTOR_UNAVAILABLE = {
  message: 'El tutor no está disponible ahora.',
  source: null,
  available: false,
};

export function useTutor() {
  const providerRef = useRef(null);
  if (!providerRef.current) {
    providerRef.current = createAIProvider();
  }
  const [tutor, setTutor] = useState({ ...TUTOR_UNAVAILABLE, message: 'Cargando tutor...' });
  const requestId = useRef(0);

  useEffect(() => {
    let active = true;
    const id = ++requestId.current;
    providerRef.current
      .respond({ type: 'welcome' })
      .then((response) => {
        if (active && id === requestId.current) setTutor(response);
      })
      .catch(() => {
        if (active && id === requestId.current) setTutor(TUTOR_UNAVAILABLE);
      });
    return () => {
      active = false;
    };
  }, []);

  const ask = useCallback(async (context) => {
    const id = ++requestId.current;
    const onToken = (message) => { if (id === requestId.current) setTutor({ message, source: 'gemini', available: true, streaming: true }); };
    try {
      const response = await providerRef.current.respond({ ...context, onToken });
      if (id === requestId.current) setTutor(response);
      return response;
    } catch {
      if (id === requestId.current) setTutor(TUTOR_UNAVAILABLE);
      return TUTOR_UNAVAILABLE;
    }
  }, []);

  return { tutor, ask };
}

export default useTutor;
