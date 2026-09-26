import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { quizBank as quizBankData, localizeCatalogItem } from '../data/catalogs.js';
import { buildQuiz, buildQuizFeedback, matchAnswer, matchText, shuffle } from '../ai/quizEngine.js';
import { readJSON, writeJSON, STORAGE_KEYS } from '../utils/storage.js';
import { createAIProvider } from '../ai/AIProvider.js';
import { getTutorQuota, DAILY_TUTOR_LIMIT } from '../ai/tutorQuota.js';
import { useTranslation } from '../i18n/LanguageProvider.jsx';

export const QUIZ_MIN_QUANTITY = 5;
export const QUIZ_MAX_QUANTITY = 50;
export const FREE_CHAT_EXCHANGES = DAILY_TUTOR_LIMIT;

const QUIZ_CLOSING = '¿Oime gueteri mba\'e reikuaaséva? Eporandu chéve.';

function quizStatement(question) {
  if (!question) return '';
  if (question.tipo === 'vf') return question.enunciado;
  return question.pregunta;
}

function buildClosingMessage(entries) {
  const byTopic = new Map();
  for (const entry of entries) {
    if (!entry?.tema) continue;
    const stats = byTopic.get(entry.tema) ?? { correct: 0, total: 0 };
    stats.total += 1;
    if (entry.tutor?.correct) stats.correct += 1;
    byTopic.set(entry.tema, stats);
  }
  const total = entries.length;
  const acertadas = entries.filter((entry) => entry.tutor?.correct).length;
  const balance = [...byTopic.entries()]
    .map(([tema, stats]) => `${tema}: ${stats.correct} de ${stats.total}`)
    .join(' · ');
  return `¡Ikatu! Terminaste el cuestionario: ${acertadas} de ${total} acertadas.${
    balance ? ` Temas dominados — ${balance}.` : ''
  } ${QUIZ_CLOSING}`;
}

function formatMessages(chatEntries, charlaEntries) {
  const mensajes = [];
  for (const entry of chatEntries ?? []) {
    if (entry?.closing) {
      mensajes.push({ role: 'tutor', text: entry.message });
      continue;
    }
    mensajes.push({ role: 'tutor', text: entry?.statement ?? '' });
    if (entry?.studentText) {
      mensajes.push({ role: 'alumno', text: entry.studentText });
    }
    if (entry?.tutor?.message) {
      mensajes.push({ role: 'tutor', text: entry.tutor.message });
    }
  }
  for (const message of charlaEntries ?? []) {
    mensajes.push({ role: message?.role ?? 'tutor', text: message?.text ?? '' });
  }
  return mensajes.filter((message) => message.text);
}

export function useQuiz(flashcards, { onMoveToChat, onQuizAnswer, classConfig, includeTheory = true } = {}) {
  const providerRef = useRef(null);
  if (!providerRef.current) {
    providerRef.current = createAIProvider();
  }
  const { language } = useTranslation();
  // Se localiza acá (no en el JSON fuente) para que cambiar de idioma en
  // pleno cuestionario solo cambie los textos, sin tocar id/tipo/respuesta.
  const quizBank = useMemo(() => quizBankData.map(item => localizeCatalogItem(item, language)), [language]);
  const localizedFlashcards = useMemo(() => (flashcards ?? []).map(item => localizeCatalogItem(item, language)), [flashcards, language]);
  const sessionRef = useRef(null);
  const freeSessionRef = useRef(null);
  const onMoveRef = useRef(onMoveToChat);
  onMoveRef.current = onMoveToChat;

  const [step, setStep] = useState('cantidad');
  const [quantity, setQuantity] = useState(0);
  const [deck, setDeck] = useState([]);
  const [deckSize, setDeckSize] = useState(0);
  const [seenIds, setSeenIds] = useState(() => new Set());
  const [consolidatedIds, setConsolidatedIds] = useState(() => new Set());
  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [chat, setChat] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [awaitingJustification, setAwaitingJustification] = useState(false);
  const [justificationText, setJustificationText] = useState('');
  const [busy, setBusy] = useState(false);
  const [streamText, setStreamText] = useState('');
  const requestLock = useRef(false);
  const generationRef = useRef(0);
  const [charlaLog, setCharlaLog] = useState([]);
  const [tutorQuota, setTutorQuota] = useState(() => getTutorQuota());
  const [charlaText, setCharlaText] = useState('');
  const [history, setHistory] = useState(() => {
    const stored = readJSON(STORAGE_KEYS.CHAT_HISTORY, []);
    return Array.isArray(stored) ? stored : [];
  });

  useEffect(() => {
    const syncHistory = (event) => {
      if (event.key !== null && event.key !== STORAGE_KEYS.CHAT_HISTORY && !event.key?.endsWith(`:${STORAGE_KEYS.CHAT_HISTORY}`)) return;
      const stored = readJSON(STORAGE_KEYS.CHAT_HISTORY, []);
      setHistory(Array.isArray(stored) ? stored : []);
    };
    window.addEventListener('storage', syncHistory);
    return () => window.removeEventListener('storage', syncHistory);
  }, []);

  useEffect(() => {
    const refreshQuota = () => {
      const next = getTutorQuota();
      setTutorQuota((current) => current.used === next.used && current.remaining === next.remaining ? current : next);
    };
    window.addEventListener('tutor-quota-change', refreshQuota);
    window.addEventListener('storage', refreshQuota);
    window.addEventListener('focus', refreshQuota);
    const interval = setInterval(refreshQuota, 60000);
    return () => {
      window.removeEventListener('tutor-quota-change', refreshQuota);
      window.removeEventListener('storage', refreshQuota);
      window.removeEventListener('focus', refreshQuota);
      clearInterval(interval);
    };
  }, []);

  // Si el docente eligió las tarjetas de su clase, el mazo usa solo esas.
  const theoryCards = useMemo(
    () => (includeTheory ? quizBank.filter((question) => question.tipo === 'abierta') : []),
    [includeTheory, quizBank],
  );

  const repasoAvailable = useMemo(() => {
    return new Set([...theoryCards.map((question) => question.id), ...localizedFlashcards.map((card) => card.id)]).size;
  }, [localizedFlashcards, theoryCards]);

  const maxAvailable = Math.min(
    QUIZ_MAX_QUANTITY,
    repasoAvailable,
    Math.min(QUIZ_MAX_QUANTITY, Math.max(QUIZ_MIN_QUANTITY, classConfig?.flashcards ?? QUIZ_MAX_QUANTITY)),
  );

  const buildRepasoDeck = useCallback(
    (qty) => {
      const real = localizedFlashcards.map((card) => ({
        id: card.id,
        tema: card.topic,
        frente: card.frente_es ?? card.front ?? '',
        dorso: card.dorso_concepto ?? card.back ?? '',
        formula: card.formula ?? '',
      }));
      const teoricas = theoryCards
        .map((question) => ({
          id: question.id,
          tema: question.tema,
          frente: question.pregunta,
          dorso: question.respuesta,
          formula: '',
        }));
      const clamped = Math.min(Math.max(Math.floor(Number(qty) || QUIZ_MIN_QUANTITY), QUIZ_MIN_QUANTITY), maxAvailable);
      const unique = [...new Map([...real, ...teoricas].map((card) => [card.id, card])).values()];
      return shuffle(unique).slice(0, clamped);
    },
    [localizedFlashcards, theoryCards, maxAvailable],
  );

  const chooseQuantity = useCallback(
    (qty) => {
      if (maxAvailable < QUIZ_MIN_QUANTITY) return;
      const clamped = Math.min(
        Math.max(Math.floor(Number(qty) || QUIZ_MIN_QUANTITY), QUIZ_MIN_QUANTITY),
        maxAvailable,
      );
      const newDeck = buildRepasoDeck(clamped);
      if (!newDeck.length) return;
      setQuantity(newDeck.length);
      setDeck(newDeck);
      setDeckSize(newDeck.length);
      setSeenIds(new Set());
      setConsolidatedIds(new Set());
      setStep('repaso');
    },
    [buildRepasoDeck, maxAvailable],
  );

  const persistCurrent = useCallback((chatEntries, charlaEntries, tema) => {
    const id = sessionRef.current;
    if (!id) return;
    const mensajes = formatMessages(chatEntries, charlaEntries);
    const now = new Date().toISOString();
    const entry = {
      id,
      fecha: now.slice(0, 10),
      hora: now,
      tema: tema || 'Cuestionario',
      mensajes,
    };
    setHistory((prev) => {
      const exists = prev.some((item) => item.id === id);
      const next = exists ? prev.map((item) => (item.id === id ? entry : item)) : [...prev, entry];
      writeJSON(STORAGE_KEYS.CHAT_HISTORY, next);
      return next;
    });
  }, []);

  const persistFreeConversation = useCallback((messages) => {
    if (!freeSessionRef.current) freeSessionRef.current = `free-chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const id = freeSessionRef.current;
    const now = new Date().toISOString();
    const firstQuestion = messages.find(message => message.role === 'alumno')?.text ?? '';
    const title = firstQuestion.trim().slice(0, 48) || 'Chat libre';
    const entry = { id, fecha: now.slice(0, 10), hora: now, tema: title, tipo: 'chat-libre', mensajes: messages };
    setHistory(prev => {
      const exists = prev.some(item => item.id === id);
      const next = exists ? prev.map(item => item.id === id ? entry : item) : [...prev, entry];
      writeJSON(STORAGE_KEYS.CHAT_HISTORY, next);
      return next;
    });
  }, []);

  const startQuiz = useCallback(() => {
    const quizQuestions = buildQuiz(quizBank, quantity);
    if (!quizQuestions.length) return;
    generationRef.current += 1;
    requestLock.current = false;
    setBusy(false);
    setStreamText('');
    sessionRef.current = `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setQuestions(quizQuestions);
    setQuestionIndex(0);
    setChat([]);
    setAnswered(false);
    setAwaitingJustification(false);
    setJustificationText('');
    setStep('quiz');
    onMoveRef.current?.();
  }, [quantity, quizBank]);

  useEffect(() => {
    if (step === 'repaso' && deck.length === 0 && consolidatedIds.size > 0) {
      startQuiz();
    }
  }, [step, deck, consolidatedIds, startQuiz]);

  const currentCard = deck[0] ?? null;

  const consolidateCard = useCallback((flashcardId) => {
    setSeenIds((prev) => new Set(prev).add(flashcardId));
    setConsolidatedIds((prev) => new Set(prev).add(flashcardId));
    setDeck((prev) => prev.filter((card) => card.id !== flashcardId));
  }, []);

  const reviewLaterCard = useCallback((flashcardId) => {
    setSeenIds((prev) => new Set(prev).add(flashcardId));
    setDeck((prev) => {
      if (prev.length <= 1) return prev;
      const current = prev.find((card) => card.id === flashcardId) ?? prev[0];
      const rest = prev.filter((card) => card.id !== current.id);
      return [...rest, current];
    });
  }, []);

  const skipToQuiz = useCallback(() => {
    if (deckSize > 0 && seenIds.size >= deckSize) startQuiz();
  }, [deckSize, seenIds, startQuiz]);

  const currentQuestion = questions[questionIndex] ?? null;

  const evaluate = useCallback(
    async ({ marcadoVerdadero, justificacion }) => {
      const question = questions[questionIndex];
      if (!question || requestLock.current) return;
      requestLock.current = true;
      const generation = generationRef.current;
      setBusy(true);
      setStreamText('');
      try {
        let local = { correct: false, close: false, score: 0, coincidentes: [] };
        if (question.tipo === 'abierta') {
          local = matchAnswer(question, justificacion ?? '');
        } else {
          local = matchText(justificacion ?? '', question.explicacion ?? '');
        }
        const verdict = question.tipo === 'vf'
          ? marcadoVerdadero
            ? Boolean(question.esVerdadero)
            : Boolean(!question.esVerdadero) && Boolean(local.correct)
          : Boolean(local.correct);
        const feedbackContext = {
          preguntaId: question.id,
          pregunta: question.tipo === 'abierta' ? question.pregunta : question.enunciado,
          enunciado: question.enunciado ?? null,
          tema: question.tema,
          respuestaAlumno: question.tipo === 'abierta' ? (justificacion ?? '') : null,
          esCorrecta: verdict,
          esCercana: local.close,
          coincidentes: local.coincidentes,
          esVerdadero: question.tipo === 'vf' ? Boolean(question.esVerdadero) : undefined,
          marcadoVerdadero: question.tipo === 'vf' ? Boolean(marcadoVerdadero) : undefined,
          justificacion: justificacion ?? null,
          respuestaCorrecta: question.respuesta ?? null,
          respuestaJopara: question.respuestaJopara ?? '',
          explicacion: question.explicacion ?? '',
          explicacionJopara: question.explicacionJopara ?? '',
          language,
          onToken: (text) => {
            if (generation === generationRef.current) setStreamText(text);
          },
        };
        let response;
        try {
          response = await providerRef.current.evaluateQuizAnswer(feedbackContext);
        } catch {
          response = { message: buildQuizFeedback(feedbackContext), source: 'local-fallback', available: true };
        }
        if (generation !== generationRef.current) return;
        const entry = {
          statement: quizStatement(question),
          tipo: question.tipo,
          tema: question.tema,
          studentText:
            question.tipo === 'abierta'
              ? (justificacion ?? '')
              : marcadoVerdadero
                ? 'Verdadero'
                : `Falso${justificacion ? ` — ${justificacion}` : ''}`,
          tutor: { ...response, correct: verdict },
        };
        const nextChat = [...chat, entry];
        setChat(nextChat);
        setAnswered(true);
        setAwaitingJustification(false);
        setJustificationText('');
        onQuizAnswer?.({ questionId: question.id, correct: verdict });
        persistCurrent(nextChat, [], questions.map((item) => item.tema).filter((tema, index, all) => all.indexOf(tema) === index).join(', '));
      } finally {
        if (generation === generationRef.current) {
          requestLock.current = false;
          setStreamText('');
          setBusy(false);
        }
      }
    },
    [questions, questionIndex, chat, onQuizAnswer, persistCurrent, language],
  );

  const answerOpen = useCallback(
    (text) => evaluate({ marcadoVerdadero: undefined, justificacion: text }),
    [evaluate],
  );

  const markTrue = useCallback(() => evaluate({ marcadoVerdadero: true }), [evaluate]);

  const markFalse = useCallback(() => {
    setAwaitingJustification(true);
  }, []);

  const sendJustification = useCallback(() => {
    const text = justificationText.trim();
    if (!text) return;
    evaluate({ marcadoVerdadero: false, justificacion: text });
  }, [justificationText, evaluate]);

  const cancelJustification = useCallback(() => {
    setAwaitingJustification(false);
    setJustificationText('');
  }, []);

  const nextQuestion = useCallback(() => {
    setAwaitingJustification(false);
    setJustificationText('');
    setAnswered(false);
    const next = questionIndex + 1;
    if (next >= questions.length) {
      const closing = buildClosingMessage(chat);
      const nextChat = [...chat, { closing: true, message: closing }];
      setChat(nextChat);
      persistCurrent(nextChat, [], questions.map((item) => item.tema).filter((tema, index, all) => all.indexOf(tema) === index).join(', '));
      setStep('charla');
      return;
    }
    setQuestionIndex(next);
  }, [questionIndex, questions.length, chat, persistCurrent]);

  const askFreeQuestion = useCallback(async () => {
    const text = charlaText.trim();
    if (!text || requestLock.current || tutorQuota.remaining <= 0) return;
    requestLock.current = true;
    const generation = generationRef.current;
    setBusy(true);
    setStreamText('');
    const nextLog = [...charlaLog, { role: 'alumno', text }];
    if (!freeSessionRef.current) freeSessionRef.current = 'free-chat-' + Date.now() + '-' + Math.random().toString(36).slice(2);
    setCharlaLog(nextLog);
    setCharlaText('');
    try {
      let response;
      try {
        response = await providerRef.current.answerFreeQuestion({
          message: text,
          history: charlaLog.slice(-8),
          language,
          onToken: (token) => {
            if (generation === generationRef.current) setStreamText(token);
          },
        });
        if (typeof response?.message !== 'string' || !response.message.trim()) throw new Error('Respuesta vacía');
      } catch {
        response = { message: 'No pude completar la consulta. Volvé a intentarlo cuando el tutor esté disponible.', available: false, source: null };
      }
      if (generation !== generationRef.current) return;
      const finalLog = [...nextLog, { role: 'tutor', text: response.message, source: response.source ?? null, available: response.available !== false }];
      setCharlaLog(finalLog);
      persistFreeConversation(finalLog);
      setTutorQuota(getTutorQuota());
    } finally {
      if (generation === generationRef.current) {
        requestLock.current = false;
        setStreamText('');
        setBusy(false);
      }
    }
  }, [charlaText, tutorQuota.remaining, charlaLog, persistFreeConversation, language]);

  const newFreeConversation = useCallback(() => {
    if (requestLock.current) return;
    freeSessionRef.current = null;
    setCharlaLog([]);
    setCharlaText('');
    setStreamText('');
  }, []);

  const openFreeConversation = useCallback((session) => {
    if (!session || requestLock.current) return;
    generationRef.current += 1;
    freeSessionRef.current = session.id;
    setCharlaLog(Array.isArray(session.mensajes) ? session.mensajes : []);
    setCharlaText('');
    setStreamText('');
    setBusy(false);
  }, []);

  const finish = useCallback(() => {
    setStep('fin');
  }, []);

  const restart = useCallback(() => {
    generationRef.current += 1;
    sessionRef.current = null;
    setStep('cantidad');
    setQuantity(0);
    setDeck([]);
    setDeckSize(0);
    setSeenIds(new Set());
    setConsolidatedIds(new Set());
    setQuestions([]);
    setQuestionIndex(0);
    setChat([]);
    setAnswered(false);
    setAwaitingJustification(false);
    setJustificationText('');
    setStreamText('');
    setBusy(false);
    requestLock.current = false;
  }, []);

  const classSignature = JSON.stringify(classConfig ?? null);
  const previousClass = useRef(classSignature);
  useEffect(() => {
    if (previousClass.current === classSignature) return;
    previousClass.current = classSignature;
    restart();
  }, [classSignature, restart]);

  const charlaLeft = tutorQuota.remaining;
  const seenAll = deckSize > 0 && seenIds.size >= deckSize;

  return {
    step,
    quantity,
    deck,
    currentCard,
    consolidatedIds,
    seenIds,
    seenAll,
    questions,
    questionIndex,
    currentQuestion,
    chat,
    answered,
    awaitingJustification,
    justificationText,
    setJustificationText,
    busy,
    streamText,
    charlaLog,
    charlaUsed: tutorQuota.used,
    charlaLeft,
    tutorQuota,
    charlaText,
    setCharlaText,
    askFreeQuestion,
    newFreeConversation,
    openFreeConversation,
    finish,
    history,
    maxAvailable,
    repasoAvailable,
    chooseQuantity,
    consolidateCard,
    reviewLaterCard,
    skipToQuiz,
    answerOpen,
    markTrue,
    markFalse,
    sendJustification,
    cancelJustification,
    nextQuestion,
    restart,
  };
}

export default useQuiz;
