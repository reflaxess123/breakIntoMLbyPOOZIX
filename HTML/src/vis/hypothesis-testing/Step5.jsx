import { useState, useCallback } from 'react';
import { Histogram } from '../../components/Histogram';
import { CASINO_CLAIM, OBSERVED_FREQ } from './constants';
import { runSimulation, testStatistic } from './math';

export function Step5({ h0Model }) {
  const [nGames, setNGames] = useState(138);
  const [simData, setSimData] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);
  const [scaledTReal, setScaledTReal] = useState(null);

  const N_SIM = 2000;

  const handleRun = useCallback(async () => {
    if (!h0Model) return;
    setRunning(true);
    setProgress(0);

    // Scale the observed frequencies proportionally to new sample size
    const N = nGames;
    const scaledFreqs = OBSERVED_FREQ.map(reel =>
      reel.map(n => Math.round((n / 138) * N))
    );
    // Adjust to ensure each reel sums to N
    for (let w = 0; w < 3; w++) {
      const sum = scaledFreqs[w].reduce((a, b) => a + b, 0);
      const diff = N - sum;
      // Add/subtract from the largest bin
      const maxIdx = scaledFreqs[w].indexOf(Math.max(...scaledFreqs[w]));
      scaledFreqs[w][maxIdx] += diff;
    }

    // Compute T for scaled real data
    const T = testStatistic(scaledFreqs, CASINO_CLAIM);
    setScaledTReal(T);

    // Run simulation with new sample size
    const results = await runSimulation(h0Model, N_SIM, N, CASINO_CLAIM, setProgress);
    setSimData(results);
    setRunning(false);
  }, [h0Model, nGames]);

  const pValue = simData && scaledTReal != null
    ? simData.filter(t => t >= scaledTReal).length / simData.length
    : null;

  const meanT = simData ? simData.reduce((a, b) => a + b, 0) / simData.length : null;
  const stdT = simData ? Math.sqrt(simData.reduce((s, t) => s + (t - meanT) ** 2, 0) / simData.length) : null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-accent">Шаг 5. Влияние размера выборки</h2>

      <p className="text-text-dim leading-relaxed">
        Что если бы журналист сыграл не 138, а больше (или меньше) игр?
        Как это влияет на нашу способность обнаружить ложь казино?
      </p>

      <div className="bg-card rounded-xl p-5 border border-border">
        <h3 className="text-lg font-semibold mb-3">Ожидания</h3>
        <ul className="text-text-dim text-sm space-y-2">
          <li>
            <span className="text-accent">Больше данных</span> → гистограмма уже (меньше дисперсия) →
            легче отличить настоящий T от шума → p-value меньше
          </li>
          <li>
            <span className="text-coral">Меньше данных</span> → гистограмма шире →
            труднее отвергнуть H₀ → p-value больше
          </li>
        </ul>
      </div>

      {/* Slider */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <div className="flex items-center gap-4 mb-2">
          <label className="text-text-dim text-sm shrink-0">Количество игр:</label>
          <input
            type="range"
            min={20}
            max={2000}
            step={10}
            value={nGames}
            onChange={e => setNGames(Number(e.target.value))}
            className="flex-1 accent-accent"
          />
          <span className="text-2xl font-mono text-coral font-bold w-20 text-right">{nGames}</span>
        </div>
        <div className="flex justify-between text-text-dim text-xs">
          <span>20</span>
          <span>↑ 138 (реальное)</span>
          <span>2000</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <button
          onClick={handleRun}
          disabled={running || !h0Model}
          className="px-8 py-3 rounded-xl font-semibold text-lg transition-all
            bg-accent text-bg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running
            ? `Симуляция для N=${nGames}... ${Math.round(progress * 100)}%`
            : `Запустить для N = ${nGames}`}
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

      {simData && (
        <div className="space-y-4">
          <div className="flex justify-center">
            <Histogram
              data={simData}
              realValue={scaledTReal}
              width={720}
              height={320}
              bins={50}
              label={`N = ${nGames} игр (${N_SIM} симуляций)`}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-card rounded-xl p-4 border border-border text-center">
              <p className="text-text-dim text-sm">N (игр)</p>
              <p className="text-2xl font-mono text-coral">{nGames}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border text-center">
              <p className="text-text-dim text-sm">T</p>
              <p className="text-2xl font-mono text-coral">{scaledTReal?.toFixed(3)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border text-center">
              <p className="text-text-dim text-sm">p-value</p>
              <p className={`text-2xl font-mono ${pValue < 0.05 ? 'text-red' : 'text-green'}`}>
                {pValue?.toFixed(4)}
              </p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border text-center">
              <p className="text-text-dim text-sm">std(T) под H₀</p>
              <p className="text-2xl font-mono text-accent">{stdT?.toFixed(3)}</p>
            </div>
          </div>

          <div className="bg-card rounded-xl p-5 border border-border">
            <h3 className="text-lg font-semibold mb-2">Интерпретация</h3>
            <p className="text-text-dim leading-relaxed">
              При <span className="text-coral font-bold">N = {nGames}</span>:
              {pValue < 0.05
                ? ` p-value = ${pValue.toFixed(4)} < 0.05 — хватает данных, чтобы отвергнуть H₀.`
                : ` p-value = ${pValue.toFixed(4)} ≥ 0.05 — данных недостаточно для отвержения H₀.`
              }
              {' '}Стандартное отклонение T под H₀ равно {stdT?.toFixed(3)} —
              {nGames > 138
                ? ' это меньше, чем при 138 играх, потому что больше данных → меньше шума.'
                : nGames < 138
                  ? ' это больше, чем при 138 играх — меньше данных → больше неопределённости.'
                  : ' примерно как в оригинальном эксперименте.'
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
