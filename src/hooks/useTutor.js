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

  useEffect(() => {
    let active = true;
    providerRef.current
      .respond({ type: 'welcome' })
      .then((response) => {
        if (active) setTutor(response);
      })
      .catch(() => {
        if (active) setTutor(TUTOR_UNAVAILABLE);
      });
    return () => {
      active = false;
    };
  }, []);

  const ask = useCallback(async (context) => {
    try {
      const response = await providerRef.current.respond(context);
      setTutor(response);
      return response;
    } catch {
      setTutor(TUTOR_UNAVAILABLE);
      return TUTOR_UNAVAILABLE;
    }
  }, []);

  return { tutor, ask };
}

export default useTutor;
