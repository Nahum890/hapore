import { useCallback, useEffect, useRef, useState } from 'react';
import { createLaunch, range as computeRange } from '../physics/projectileMotion.js';

export const SIM_STATUS = {
  IDLE: 'idle',
  RUNNING: 'running',
  SUCCESS: 'success',
  ERROR: 'error',
};

function parseNumber(value) {
  return Number(String(value).trim().replace(',', '.'));
}

export function useSimulator(exercise, options = {}) {
  const { targetDistance = 40, tolerance = 2.5, resolutionDelay = 900 } = options;
  const [values, setValues] = useState({ v0: '20', angle: '45' });
  const [status, setStatus] = useState(SIM_STATUS.IDLE);
  const [result, setResult] = useState(null);
  const timerRef = useRef(null);

  useEffect(() => {
    if (exercise?.values) {
      setValues({
        v0: String(exercise.values.v0 ?? 20).replace('.', ','),
        angle: String(exercise.values.angle ?? 45),
      });
      setStatus(SIM_STATUS.IDLE);
      setResult(null);
    }
  }, [exercise?.id]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const changeValues = useCallback((patch) => {
    setValues((prev) => ({ ...prev, ...patch }));
  }, []);

  const launch = useCallback(() => {
    const v0 = parseNumber(values.v0);
    const angle = parseNumber(values.angle);
    if (!Number.isFinite(v0) || v0 <= 0 || !Number.isFinite(angle) || angle <= 0 || angle >= 90) {
      setStatus(SIM_STATUS.ERROR);
      setResult({ status: SIM_STATUS.ERROR, message: 'Ingresá valores numéricos válidos (v0 > 0 y 0° < ángulo < 90°).' });
      return;
    }

    clearTimeout(timerRef.current);
    setStatus(SIM_STATUS.RUNNING);
    setResult(null);
    // TODO (motor del simulador 2D): reemplazar esta resolución demo por el
    // motor del simulador: animación, trayectoria dibujada y comparación real
    // contra el objetivo. La comparación usa el motor físico existente.
    timerRef.current = setTimeout(() => {
      const landing = computeRange(createLaunch(v0, angle));
      if (Math.abs(landing - targetDistance) <= tolerance) {
        setStatus(SIM_STATUS.SUCCESS);
        setResult({
          status: SIM_STATUS.SUCCESS,
          message: '¡Llegó al objetivo!',
          landingDistance: landing,
        });
      } else if (landing < targetDistance) {
        setStatus(SIM_STATUS.ERROR);
        setResult({
          status: SIM_STATUS.ERROR,
          message: 'El dron cayó antes del objetivo.',
          landingDistance: landing,
        });
      } else {
        setStatus(SIM_STATUS.ERROR);
        setResult({
          status: SIM_STATUS.ERROR,
          message: 'El dron pasó el punto de aterrizaje.',
          landingDistance: landing,
        });
      }
    }, resolutionDelay);
  }, [values.v0, values.angle, targetDistance, tolerance, resolutionDelay]);

  const reset = useCallback(() => {
    clearTimeout(timerRef.current);
    setStatus(SIM_STATUS.IDLE);
    setResult(null);
  }, []);

  return { values, status, result, targetDistance, changeValues, launch, reset };
}

export default useSimulator;
