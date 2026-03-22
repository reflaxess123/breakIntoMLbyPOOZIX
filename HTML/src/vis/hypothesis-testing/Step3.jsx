import { useState, useCallback } from 'react';
import { K } from '../../components/Latex';
import { Histogram } from '../../components/Histogram';
import { CASINO_CLAIM, N_GAMES } from './constants';
import { runSimulation } from './math';

export function Step3({ h0Model, tReal }) {
  const [simData, setSimData] = useState(null);
  const [running, setRunning] = useState(false);
  const [progress, setProgress] = useState(0);

  const N_SIM = 3000;

  const handleRun = useCallback(async () => {
    if (!h0Model) return;
    setRunning(true);
    setProgress(0);
    const results = await runSimulation(h0Model, N_SIM, N_GAMES, CASINO_CLAIM, setProgress);
    setSimData(results);
    setRunning(false);
  }, [h0Model]);

  const pValue = simData ? simData.filter(t => t >= tReal).length / simData.length : null;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-accent">Шаг 3. Калибровка (Монте-Карло)</h2>

      <p className="text-text-dim leading-relaxed">
        На шаге 2 мы получили <K m={`T = ${tReal?.toFixed(4) ?? '?'}`} />.
        Но <span className="text-amber">много это или мало?</span> Нужен масштаб.
      </p>

      <div className="bg-card rounded-xl p-5 border border-border">
        <h3 className="text-lg font-semibold mb-3">Идея калибровки</h3>
        <p className="text-text-dim leading-relaxed mb-3">
          Представим, что H₀ верна (казино не врёт). Берём нашу лучшую модель с E[R] = {CASINO_CLAIM}
          и генерируем из неё {N_SIM} «фейковых» выборок по {N_GAMES} игр.
        </p>
        <p className="text-text-dim leading-relaxed mb-3">
          Для <strong>каждой</strong> фейковой выборки заново считаем T — точно так же,
          как мы считали для настоящих данных на шаге 2. Получаем {N_SIM} значений T.
        </p>
        <p className="text-text-dim leading-relaxed">
          Потом смотрим: <span className="text-coral font-semibold">какая доля фейковых T ≥ нашего настоящего T?</span> Это
          и есть p-value — вероятность получить такой же или более экстремальный результат,
          если казино говорит правду.
        </p>
      </div>

      <div className="bg-card rounded-xl p-5 border border-border">
        <h3 className="text-lg font-semibold mb-3">Процедура (для каждой из {N_SIM} симуляций)</h3>
        <ol className="list-decimal list-inside space-y-2 text-text-dim text-sm">
          <li>Генерируем {N_GAMES} игр из H₀-модели (автомат с E[R] = {CASINO_CLAIM})</li>
          <li>Считаем частоты символов на каждом барабане</li>
          <li>Находим MLE без ограничений → log L₁</li>
          <li>Находим MLE с ограничением E[R] = {CASINO_CLAIM} → log L₀</li>
          <li>
            <K m="T_i = \\log L_1 - \\log L_0" />
          </li>
        </ol>
        <p className="text-amber text-sm mt-3">
          Важно: числитель и знаменатель считаются ЗАНОВО для каждой выборки!
          Каждая выборка порождает свою пару моделей.
        </p>
      </div>

      {/* Run button */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={handleRun}
          disabled={running || !h0Model}
          className="px-8 py-3 rounded-xl font-semibold text-lg transition-all
            bg-accent text-bg hover:bg-accent/80 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {running ? `Генерируем... ${Math.round(progress * 100)}%` : `Запустить симуляцию (${N_SIM} выборок)`}
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

      {/* Results */}
      {simData && (
        <div className="space-y-4">
          <Histogram
            data={simData}
            realValue={tReal}
            height={320}
            bins={50}
            label={`Распределение T под H₀ (${N_SIM} симуляций)`}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-card rounded-xl p-4 border border-border text-center">
              <p className="text-text-dim text-sm">T (настоящие данные)</p>
              <p className="text-2xl font-mono text-coral">{tReal?.toFixed(4)}</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border text-center">
              <p className="text-text-dim text-sm">p-value</p>
              <p className={`text-2xl font-mono ${pValue < 0.05 ? 'text-red' : 'text-green'}`}>
                {pValue.toFixed(4)}
              </p>
              <p className="text-text-dim text-xs">{(pValue * 100).toFixed(2)}%</p>
            </div>
            <div className="bg-card rounded-xl p-4 border border-border text-center">
              <p className="text-text-dim text-sm">Порог (α = 5%)</p>
              <p className="text-2xl font-mono text-text">0.05</p>
            </div>
          </div>

          <div className={`rounded-xl p-5 border-2 ${
            pValue < 0.05
              ? 'bg-red/10 border-red/50'
              : 'bg-green/10 border-green/50'
          }`}>
            <p className={`font-bold text-lg ${pValue < 0.05 ? 'text-red' : 'text-green'}`}>
              {pValue < 0.05
                ? `p-value = ${pValue.toFixed(4)} < 0.05 → Отвергаем H₀!`
                : `p-value = ${pValue.toFixed(4)} ≥ 0.05 → Не можем отвергнуть H₀`
              }
            </p>
            <p className="text-text-dim mt-2">
              {pValue < 0.05
                ? `Только ${(pValue * 100).toFixed(1)}% симуляций дали T ≥ ${tReal?.toFixed(3)}.
                   Это значит, что если бы казино не врало, такой результат был бы крайне маловероятен.
                   Вывод: данные противоречат утверждению казино.`
                : `${(pValue * 100).toFixed(1)}% симуляций дали T ≥ ${tReal?.toFixed(3)}.
                   Это достаточно часто — данные не противоречат утверждению казино.`
              }
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
