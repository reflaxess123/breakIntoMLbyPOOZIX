import { useState, useCallback } from 'react';
import { Histogram } from '../../components/Histogram';
import { CASINO_CLAIM, N_GAMES } from './constants';
import { constrainedMLE, runSimulation } from './math';

// Three alternative slot machines with different symbol distributions
// We use different "fake" frequency profiles and constrain to E[R] = 0.92
const ALT_FREQ_PROFILES = [
  {
    name: 'Автомат A (больше семёрок)',
    desc: 'Повышены вероятности выпадения семёрок на всех барабанах',
    freqs: [
      [55, 30, 12, 6, 18, 5, 12],
      [65, 8, 18, 12, 16, 3, 16],
      [55, 28, 8, 3, 20, 8, 16],
    ],
  },
  {
    name: 'Автомат B (больше бриллиантов)',
    desc: 'Повышены вероятности выпадения бриллиантов',
    freqs: [
      [50, 25, 10, 6, 8, 5, 34],
      [60, 8, 18, 12, 6, 2, 32],
      [50, 22, 8, 3, 10, 5, 40],
    ],
  },
  {
    name: 'Автомат C (больше баров)',
    desc: 'Повышены вероятности выпадения всех видов баров',
    freqs: [
      [30, 50, 25, 15, 6, 4, 8],
      [35, 40, 28, 20, 5, 2, 8],
      [30, 48, 22, 12, 8, 6, 12],
    ],
  },
];

export function Step4({ tReal }) {
  const [results, setResults] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const N_SIM = 2000;

  const handleRun = useCallback(async () => {
    setRunning(true);
    setProgress(0);

    const allResults = [];
    for (let i = 0; i < ALT_FREQ_PROFILES.length; i++) {
      const profile = ALT_FREQ_PROFILES[i];
      const model = constrainedMLE(profile.freqs, CASINO_CLAIM);
      const simData = await runSimulation(
        model, N_SIM, N_GAMES, CASINO_CLAIM,
        (p) => setProgress((i + p) / 3)
      );
      const pVal = simData.filter(t => t >= tReal).length / simData.length;
      allResults.push({ ...profile, simData, pVal, model });
    }

    setResults(allResults);
    setRunning(false);
  }, [tReal]);

  const pValues = results?.map(r => r.pVal) || [];
  const allClose = pValues.length === 3 &&
    Math.max(...pValues) - Math.min(...pValues) < 0.1;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-accent">Шаг 4. Проверка робастности</h2>

      <p className="text-text-dim leading-relaxed">
        На шаге 3 мы взяли <em>один конкретный</em> автомат из H₀ (лучшую модель, найденную
        по данным журналиста). Но автоматов со средним {CASINO_CLAIM} — бесконечно много:
        разные вероятности символов, но E[R] одинаковый.
      </p>

      <p className="text-text-dim leading-relaxed">
        <span className="text-amber">Вопрос:</span> вдруг с другим автоматом (тоже из H₀)
        p-value был бы совсем другой? Тогда нашему результату нельзя доверять.
      </p>

      <div className="bg-card rounded-xl p-5 border border-border">
        <h3 className="text-lg font-semibold mb-2">Что делаем</h3>
        <p className="text-text-dim text-sm">
          Берём 3 разных автомата — все с E[R] = {CASINO_CLAIM}, но с разным распределением символов.
          Для каждого повторяем шаг 3 полностью ({N_SIM} симуляций). Сравниваем p-value.
        </p>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={handleRun}
          disabled={running || !tReal}
          className="px-8 py-3 rounded-xl font-semibold text-lg transition-all
            bg-accent text-bg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running
            ? `Проверяем робастность... ${Math.round(progress * 100)}%`
            : `Проверить робастность (3 × ${N_SIM} симуляций)`}
        </button>

        {running && (
          <div className="w-full max-w-md h-2 bg-card rounded-full overflow-hidden">
            <div
              className="h-full bg-accent transition-all duration-200 rounded-full"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>

      {results && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {results.map((r, i) => (
              <div key={i} className="bg-card rounded-xl p-4 border border-border">
                <h4 className="font-semibold text-sm mb-1">{r.name}</h4>
                <p className="text-text-dim text-xs mb-3">{r.desc}</p>
                <Histogram
                  data={r.simData}
                  realValue={tReal}
                  width={340}
                  height={220}
                  bins={35}
                />
                <div className="mt-2 text-center">
                  <span className="text-text-dim text-sm">p-value = </span>
                  <span className={`font-mono font-bold ${r.pVal < 0.05 ? 'text-red' : 'text-green'}`}>
                    {r.pVal.toFixed(4)}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* Comparison table */}
          <div className="bg-card rounded-xl p-5 border border-border">
            <h3 className="text-lg font-semibold mb-3">Сравнение p-value</h3>
            <div className="grid grid-cols-3 gap-4 text-center">
              {results.map((r, i) => (
                <div key={i}>
                  <p className="text-text-dim text-xs">{r.name.split('(')[0]}</p>
                  <p className={`text-xl font-mono font-bold ${r.pVal < 0.05 ? 'text-red' : 'text-green'}`}>
                    {(r.pVal * 100).toFixed(2)}%
                  </p>
                </div>
              ))}
            </div>
          </div>

          <div className={`rounded-xl p-5 border-2 ${
            allClose
              ? 'bg-green/10 border-green/50'
              : 'bg-amber/10 border-amber/50'
          }`}>
            <p className={`font-bold text-lg ${allClose ? 'text-green' : 'text-amber'}`}>
              {allClose
                ? 'Результат устойчив!'
                : 'Результат может зависеть от выбора модели'
              }
            </p>
            <p className="text-text-dim mt-2">
              {allClose
                ? `p-value для всех трёх автоматов близки друг к другу
                   (${pValues.map(p => (p * 100).toFixed(1) + '%').join(', ')}).
                   Это значит, что наш вывод не зависит от конкретного выбора модели из H₀ —
                   процедура робастна, результату можно доверять.`
                : `p-value заметно различаются между автоматами
                   (${pValues.map(p => (p * 100).toFixed(1) + '%').join(', ')}).
                   Результат может зависеть от того, какую именно модель из H₀ мы выбрали.`
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
