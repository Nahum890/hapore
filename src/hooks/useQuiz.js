import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import quizBank from '../ai/quizBank.json';
import { buildQuiz, matchAnswer, shuffle } from '../ai/quizEngine.js';
import { aiProvider } from '../ai/AIProvider.js';

export const QUIZ_MIN_QUANTITY = 5;
export const QUIZ_MAX_QUANTITY = 50;

function quizStatement(question) {
  if (!question) return '';
  if (question.tipo === 'vf') return question.enunciado;
  return question.pregunta;
}

export function useQuiz(flashcards) {
  const providerRef = useRef(null);
  if (!providerRef.current) {
    providerRef.current = aiProvider;
  }

  const [step, setStep] = useState('cantidad');
  const [quantity, setQuantity] = useState(0);
  const [deck, setDeck] = useState([]);
  const [consolidatedIds, setConsolidatedIds] = useState(() => new Set());
  const [questions, setQuestions] = useState([]);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [chat, setChat] = useState([]);
  const [answered, setAnswered] = useState(false);
  const [awaitingJustification, setAwaitingJustification] = useState(false);
  const [justificationText, setJustificationText] = useState('');
  const [busy, setBusy] = useState(false);

  const repasoAvailable = useMemo(() => {
    const abiertas = quizBank.filter((question) => question.tipo === 'abierta').length;
    return (flashcards?.length ?? 0) + abiertas;
  }, [flashcards]);

  const maxAvailable = Math.min(QUIZ_MAX_QUANTITY, Math.max(QUIZ_MIN_QUANTITY, repasoAvailable));

  const buildRepasoDeck = useCallback(
    (qty) => {
      const real = (flashcards ?? []).map((card) => ({
        id: card.id,
        tema: card.topic,
        frente: card.frente_es ?? card.front ?? '',
        jopara: card.frente_jopara ?? '',
        dorso: card.dorso_concepto ?? card.back ?? '',
        formula: card.formula ?? '',
      }));
      const teoricas = quizBank
        .filter((question) => question.tipo === 'abierta')
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
    [flashcards, maxAvailable],
  );

  const chooseQuantity = useCallback(
    (qty) => {
      const clamped = Math.min(
        Math.max(Number(qty) || QUIZ_MIN_QUANTITY, QUIZ_MIN_QUANTITY),
        maxAvailable,
      );
      setQuantity(clamped);
      setDeck(buildRepasoDeck(clamped));
      setStep('repaso');
    },
    [buildRepasoDeck, maxAvailable],
  );

  const startQuiz = useCallback(() => {
    const quizQuestions = buildQuiz(quizBank, quantity);
    setQuestions(quizQuestions);
    setQuestionIndex(0);
    setChat([]);
    setAnswered(false);
    setAwaitingJustification(false);
    setJustificationText('');
    setStep('quiz');
  }, [quantity]);

  useEffect(() => {
    if (step === 'repaso' && deck.length === 0 && consolidatedIds.size > 0) {
      startQuiz();
    }
  }, [step, deck, consolidatedIds, startQuiz]);

  const currentCard = deck[0] ?? null;

  const consolidateCard = useCallback((flashcardId) => {
    setConsolidatedIds((prev) => new Set(prev).add(flashcardId));
    setDeck((prev) => prev.filter((card) => card.id !== flashcardId));
  }, []);

  const reviewLaterCard = useCallback(() => {
    setDeck((prev) => {
      if (prev.length <= 1) return prev;
      const [current, ...rest] = prev;
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
      if (!question || busy) return;
      setBusy(true);
      try {
        let local = { correct: false, close: false, score: 0, coincidentes: [] };
        if (question.tipo === 'abierta') {
          local = matchAnswer(question, justificacion ?? '');
        }
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
        });
        setChat((prev) => [
          ...prev,
          {
            statement: quizStatement(question),
            tipo: question.tipo,
            studentText:
              question.tipo === 'abierta'
                ? (justificacion ?? '')
                : marcadoVerdadero
                  ? 'Verdadero'
                  : `Falso${justificacion ? ` — ${justificacion}` : ''}`,
            tutor: response,
          },
        ]);
        setAnswered(true);
        setAwaitingJustification(false);
        setJustificationText('');
      } finally {
        setBusy(false);
      }
    },
    [questions, questionIndex, busy],
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
      setStep('fin');
      return;
    }
    setQuestionIndex(next);
  }, [questionIndex, questions.length]);

  const restart = useCallback(() => {
    setStep('cantidad');
    setQuantity(0);
    setDeck([]);
    setConsolidatedIds(new Set());
    setQuestions([]);
    setQuestionIndex(0);
    setChat([]);
    setAnswered(false);
    setAwaitingJustification(false);
    setJustificationText('');
  }, []);

  return {
    step,
    quantity,
    deck,
    currentCard,
    consolidatedIds,
    questions,
    questionIndex,
    currentQuestion,
    chat,
    answered,
    awaitingJustification,
    justificationText,
    setJustificationText,
    busy,
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
