import { useMemo } from 'react';
import { K } from '../../components/Latex';
import { OBSERVED_FREQ, MLE_PROBS, CASINO_CLAIM, N_GAMES } from './constants';
import { logLikelihood, expectedReward, constrainedMLE } from './math';

export function Step2({ onComputed }) {
  const results = useMemo(() => {
    const mleER = expectedReward(MLE_PROBS[0], MLE_PROBS[1], MLE_PROBS[2]);
    const mleLL = logLikelihood(OBSERVED_FREQ, MLE_PROBS);

    const h0Probs = constrainedMLE(OBSERVED_FREQ, CASINO_CLAIM);
    const h0ER = expectedReward(h0Probs[0], h0Probs[1], h0Probs[2]);
    const h0LL = logLikelihood(OBSERVED_FREQ, h0Probs);

    const T = mleLL - h0LL;

    // Notify parent
    if (onComputed) {
      setTimeout(() => onComputed({ h0Probs, T, mleLL, h0LL, mleER, h0ER }), 0);
    }

    return { mleER, mleLL, h0Probs, h0ER, h0LL, T };
  }, [onComputed]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-accent">Шаг 2. Два правдоподобия</h2>

      <p className="text-text-dim leading-relaxed">
        Берём данные журналиста ({N_GAMES} игр) и считаем два числа — насколько хорошо
        каждая из двух моделей объясняет эти данные.
      </p>

      {/* L1 - Unconstrained */}
      <div className="bg-card rounded-xl p-5 border border-accent/30">
        <h3 className="text-lg font-semibold text-accent mb-2">
          L₁ — свободная модель (без ограничений)
        </h3>
        <p className="text-text-dim text-sm mb-3">
          Просто берём частоты из данных как вероятности. Это MLE — максимально хорошо объясняет данные.
        </p>
        <div className="bg-bg/50 rounded-lg p-4">
          <K m={`\\hat{p}_k^w = \\frac{n_k^w}{${N_GAMES}}`} d />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-text-dim text-sm">log L₁</p>
            <p className="text-xl font-mono text-accent">{results.mleLL.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-text-dim text-sm">E[R] модели</p>
            <p className="text-xl font-mono text-accent">{results.mleER.toFixed(4)}</p>
          </div>
        </div>
      </div>

      {/* L0 - Constrained */}
      <div className="bg-card rounded-xl p-5 border border-amber/30">
        <h3 className="text-lg font-semibold text-amber mb-2">
          L₀ — ограниченная модель (E[R] = {CASINO_CLAIM})
        </h3>
        <p className="text-text-dim text-sm mb-3">
          Ищем такие вероятности символов, чтобы:
          (1) данные объяснялись максимально хорошо;
          (2) при этом E[R] = {CASINO_CLAIM}.
          Это задача оптимизации — MLE с ограничением.
        </p>
        <div className="bg-bg/50 rounded-lg p-4">
          <K m={`\\max_{p} \\log L(p) \\quad \\text{при} \\quad \\mathbb{E}_p[R] = ${CASINO_CLAIM}`} d />
        </div>
        <div className="grid grid-cols-2 gap-4 mt-4">
          <div>
            <p className="text-text-dim text-sm">log L₀</p>
            <p className="text-xl font-mono text-amber">{results.h0LL.toFixed(4)}</p>
          </div>
          <div>
            <p className="text-text-dim text-sm">E[R] модели</p>
            <p className="text-xl font-mono text-amber">{results.h0ER.toFixed(4)}</p>
          </div>
        </div>
      </div>

      {/* Test statistic */}
      <div className="bg-card rounded-xl p-5 border-2 border-coral/50">
        <h3 className="text-lg font-semibold text-coral mb-2">Статистика T</h3>
        <div className="bg-bg/50 rounded-lg p-4 text-center">
          <K m={`T = \\log L_1 - \\log L_0 = ${results.mleLL.toFixed(4)} - (${results.h0LL.toFixed(4)}) = ${results.T.toFixed(4)}`} d />
        </div>
        <p className="text-text-dim mt-4 leading-relaxed">
          <span className="text-coral font-bold">T = {results.T.toFixed(4)}</span> — это число показывает,
          насколько свободная модель объясняет данные лучше, чем модель с ограничением E[R] = {CASINO_CLAIM}.
        </p>
        <p className="text-text-dim mt-2 leading-relaxed">
          Но мы пока не знаем: <span className="text-amber">это много или мало?</span> Может быть,
          даже если казино говорит правду, из-за случайности данных T всё равно получится таким большим?
          Чтобы ответить, нужна <span className="text-accent">калибровка</span> — переходим к шагу 3.
        </p>
      </div>

      {/* Explanation */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <h3 className="text-lg font-semibold mb-3">Почему L₀ ≤ L₁?</h3>
        <p className="text-text-dim leading-relaxed">
          Потому что L₁ — это максимум правдоподобия <em>вообще</em>, без ограничений.
          А L₀ — максимум на <em>подмножестве</em> (только модели с E[R] = {CASINO_CLAIM}).
          Максимум на подмножестве не может быть больше максимума на всём множестве.
          Поэтому <K m="T \\geq 0" /> всегда.
        </p>
      </div>
    </div>
  );
}
