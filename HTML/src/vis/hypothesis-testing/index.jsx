import { useCallback } from 'react';
import { Routes, Route, Navigate, useParams, useNavigate } from 'react-router-dom';
import { Step0 } from './Step0';
import { Step1 } from './Step1';
import { Step2 } from './Step2';
import { Step3 } from './Step3';
import { Step4 } from './Step4';
import { Step5 } from './Step5';
import { useState } from 'react';

const STEPS = [
  { id: 0, label: 'Данные', path: 'data' },
  { id: 1, label: 'Гипотезы', path: 'hypotheses' },
  { id: 2, label: 'Правдоподобия', path: 'likelihood' },
  { id: 3, label: 'Калибровка', path: 'calibration' },
  { id: 4, label: 'Робастность', path: 'robustness' },
  { id: 5, label: 'Размер выборки', path: 'sample-size' },
];

function StepWrapper() {
  const { stepPath } = useParams();
  const navigate = useNavigate();
  const [h0Model, setH0Model] = useState(null);
  const [tReal, setTReal] = useState(null);

  const currentIdx = STEPS.findIndex((s) => s.path === stepPath);
  const step = currentIdx >= 0 ? currentIdx : 0;

  const onStep2Computed = useCallback((data) => {
    setH0Model(data.h0Probs);
    setTReal(data.T);
  }, []);

  const goTo = (idx) => navigate(`../${STEPS[idx].path}`, { relative: 'path' });

  return (
    <div>
      {/* Step tabs */}
      <nav className="flex gap-1 overflow-x-auto pb-4 mb-6 border-b border-border scrollbar-hide flex-nowrap">
        {STEPS.map((s, i) => (
          <button
            key={s.id}
            onClick={() => goTo(i)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              step === i
                ? 'bg-accent text-white'
                : 'text-text-dim hover:text-text hover:bg-surface'
            }`}
          >
            {s.id}. {s.label}
          </button>
        ))}
      </nav>

      {/* Content */}
      {step === 0 && <Step0 />}
      {step === 1 && <Step1 />}
      {step === 2 && <Step2 onComputed={onStep2Computed} />}
      {step === 3 && <Step3 h0Model={h0Model} tReal={tReal} />}
      {step === 4 && <Step4 tReal={tReal} />}
      {step === 5 && <Step5 h0Model={h0Model} />}

      {/* Prev / Next */}
      <div className="flex justify-between mt-12 pt-6 border-t border-border">
        <button
          onClick={() => goTo(Math.max(0, step - 1))}
          disabled={step === 0}
          className="px-5 py-2 rounded-lg text-sm font-medium transition-all
            text-text-dim hover:text-text hover:bg-surface disabled:opacity-30 disabled:cursor-not-allowed"
        >
          ← Назад
        </button>
        <span className="text-text-dim text-sm self-center">
          Шаг {step} из 5
        </span>
        <button
          onClick={() => goTo(Math.min(5, step + 1))}
          disabled={step === 5}
          className="px-5 py-2 rounded-lg text-sm font-medium transition-all
            bg-accent/10 text-accent hover:bg-accent/20 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          Далее →
        </button>
      </div>
    </div>
  );
}

export default function HypothesisTesting() {
  return (
    <Routes>
      <Route index element={<Navigate to="data" replace />} />
      <Route path=":stepPath" element={<StepWrapper />} />
    </Routes>
  );
}
