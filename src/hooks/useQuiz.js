import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import quizBank from '../ai/quizBank.json';
import { buildQuiz, matchAnswer, matchText, shuffle } from '../ai/quizEngine.js';
import { readJSON, writeJSON, STORAGE_KEYS } from '../utils/storage.js';
import { temaMatchesSubtemas } from '../utils/classCode.js';
import { createAIProvider } from '../ai/AIProvider.js';

export const QUIZ_MIN_QUANTITY = 5;
export const QUIZ_MAX_QUANTITY = 50;
export const FREE_CHAT_EXCHANGES = 8;

const QUIZ_CLOSING =
  '¿Oime gueteri mba\'e reikuaaséva? ¿Tenés alguna duda sobre este tema? Podés hacerme preguntas para aclarar.';

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

export function useQuiz(flashcards, { onMoveToChat, onQuizAnswer, classConfig } = {}) {
  const providerRef = useRef(null);
  if (!providerRef.current) {
    providerRef.current = createAIProvider();
  }
  const sessionRef = useRef(null);
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
  const [charlaLog, setCharlaLog] = useState([]);
  const [charlaUsed, setCharlaUsed] = useState(0);
  const [charlaText, setCharlaText] = useState('');
  const [history, setHistory] = useState(() => readJSON(STORAGE_KEYS.CHAT_HISTORY, []));

  const repasoAvailable = useMemo(() => {
    const abiertas = quizBank.filter(
      (question) =>
        question.tipo === 'abierta' &&
        temaMatchesSubtemas(question.tema, classConfig?.subtemas),
    ).length;
    const reales = (flashcards ?? []).filter((card) =>
      temaMatchesSubtemas(card.topic, classConfig?.subtemas),
    ).length;
    return abiertas + reales;
  }, [flashcards, classConfig]);

  const maxAvailable = Math.min(
    QUIZ_MAX_QUANTITY,
    Math.max(QUIZ_MIN_QUANTITY, repasoAvailable),
    Math.min(QUIZ_MAX_QUANTITY, Math.max(QUIZ_MIN_QUANTITY, classConfig?.flashcards ?? QUIZ_MAX_QUANTITY)),
  );

  const buildRepasoDeck = useCallback(
    (qty) => {
      const real = (flashcards ?? [])
        .filter((card) => temaMatchesSubtemas(card.topic, classConfig?.subtemas))
        .map((card) => ({
          id: card.id,
          tema: card.topic,
          frente: card.frente_es ?? card.front ?? '',
          jopara: card.frente_jopara ?? '',
          dorso: card.dorso_concepto ?? card.back ?? '',
          formula: card.formula ?? '',
        }));
      const teoricas = quizBank
        .filter(
          (question) =>
            question.tipo === 'abierta' &&
            temaMatchesSubtemas(question.tema, classConfig?.subtemas),
        )
        .map((question) => ({
          id: question.id,
          tema: question.tema,
          frente: question.pregunta,
          jopara: '',
          dorso: question.respuesta,
          formula: '',
        }));
      const clamped = Math.min(
        Math.max(Number(qty) || QUIZ_MIN_QUANTITY, QUIZ_MIN_QUANTITY),
        maxAvailable,
      );
      return shuffle([...real, ...teoricas]).slice(0, clamped);
    },
    [flashcards, classConfig, maxAvailable],
  );

  const chooseQuantity = useCallback(
    (qty) => {
      const clamped = Math.min(
        Math.max(Number(qty) || QUIZ_MIN_QUANTITY, QUIZ_MIN_QUANTITY),
        maxAvailable,
      );
      const newDeck = buildRepasoDeck(clamped);
      setQuantity(clamped);
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

  const startQuiz = useCallback(() => {
    const filteredBank = quizBank.filter((question) =>
      temaMatchesSubtemas(question.tema, classConfig?.subtemas),
    );
    const quizQuestions = buildQuiz(filteredBank, quantity);
    sessionRef.current = `chat-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setQuestions(quizQuestions);
    setQuestionIndex(0);
    setChat([]);
    setCharlaLog([]);
    setCharlaUsed(0);
    setAnswered(false);
    setAwaitingJustification(false);
    setJustificationText('');
    setStep('quiz');
    onMoveRef.current?.();
  }, [quantity, classConfig]);

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
    startQuiz();
  }, [startQuiz]);

  const currentQuestion = questions[questionIndex] ?? null;

  const evaluate = useCallback(
    async ({ marcadoVerdadero, justificacion }) => {
      const question = questions[questionIndex];
      if (!question || requestLock.current) return;
      requestLock.current = true;
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
        const response = await providerRef.current.evaluateQuizAnswer({
          preguntaId: question.id,
          pregunta: question.tipo === 'abierta' ? question.pregunta : question.enunciado,
          enunciado: question.enunciado ?? null,
          tema: question.tema,
          respuestaAlumno: question.tipo === 'abierta' ? (justificacion ?? '') : null,
          esCorrecta: local.correct,
          esCercana: local.close,
          coincidentes: local.coincidentes,
          esVerdadero: question.tipo === 'vf' ? Boolean(question.esVerdadero) : undefined,
          marcadoVerdadero: question.tipo === 'vf' ? Boolean(marcadoVerdadero) : undefined,
          justificacion: justificacion ?? null,
          respuestaCorrecta: question.respuesta ?? null,
          respuestaJopara: question.respuestaJopara ?? '',
          explicacion: question.explicacion ?? '',
          explicacionJopara: question.explicacionJopara ?? '',
          onToken: setStreamText,
        });
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
        persistCurrent(nextChat, charlaLog, questions.map((item) => item.tema).filter((tema, index, all) => all.indexOf(tema) === index).join(', '));
      } finally {
        requestLock.current = false;
        setStreamText('');
        setBusy(false);
      }
    },
    [questions, questionIndex, busy, chat, charlaLog, onQuizAnswer, persistCurrent],
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
      persistCurrent(nextChat, charlaLog, questions.map((item) => item.tema).filter((tema, index, all) => all.indexOf(tema) === index).join(', '));
      setStep('charla');
      return;
    }
    setQuestionIndex(next);
  }, [questionIndex, questions.length, chat, charlaLog, persistCurrent]);

  const askFreeQuestion = useCallback(async () => {
    const text = charlaText.trim();
    if (!text || requestLock.current || charlaUsed >= FREE_CHAT_EXCHANGES) return;
    requestLock.current = true;
    setBusy(true);
    setStreamText('');
    const nextLog = [...charlaLog, { role: 'alumno', text }];
    setCharlaLog(nextLog);
    setCharlaText('');
    try {
      const response = await providerRef.current.answerFreeQuestion({ message: text, onToken: setStreamText });
      const finalLog = [...nextLog, { role: 'tutor', text: response.message }];
      setCharlaLog(finalLog);
      persistCurrent(chat, finalLog, 'Charla libre');
    } finally {
      requestLock.current = false;
      setStreamText('');
      setBusy(false);
    }
    setCharlaUsed((prev) => Math.min(prev + 1, FREE_CHAT_EXCHANGES));
  }, [charlaText, busy, charlaUsed, charlaLog, chat, persistCurrent]);

  const finish = useCallback(() => {
    setStep('fin');
  }, []);

  const restart = useCallback(() => {
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
    setCharlaLog([]);
    setCharlaUsed(0);
    setCharlaText('');
    setAnswered(false);
    setAwaitingJustification(false);
    setJustificationText('');
    setStreamText('');
    requestLock.current = false;
  }, []);

  const classSignature = JSON.stringify(classConfig ?? null);
  const previousClass = useRef(classSignature);
  useEffect(() => {
    if (previousClass.current === classSignature) return;
    previousClass.current = classSignature;
    restart();
  }, [classSignature, restart]);

  const charlaLeft = Math.max(0, FREE_CHAT_EXCHANGES - charlaUsed);
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
    charlaUsed,
    charlaLeft,
    charlaText,
    setCharlaText,
    askFreeQuestion,
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
