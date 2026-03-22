import { K } from '../../components/Latex';
import { SYMBOL_NAMES, OBSERVED_FREQ, MLE_PROBS, N_GAMES, SAMPLE_MEAN, CASINO_CLAIM } from './constants';

export function Step0() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-accent">Шаг 0. Данные</h2>

      <p className="text-text-dim leading-relaxed">
        Журналист сыграл <span className="text-coral font-bold">{N_GAMES} игр</span> на
        игровом автомате с тремя барабанами. На каждом барабане — 7 возможных символов.
        После каждой игры он записал, какой символ выпал на каждом барабане.
      </p>

      {/* Frequency table */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <h3 className="text-lg font-semibold mb-3">Абсолютные частоты (сколько раз выпал каждый символ)</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2 text-left text-text-dim">Барабан</th>
                {SYMBOL_NAMES.map(s => (
                  <th key={s} className="p-2 text-center">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {OBSERVED_FREQ.map((row, w) => (
                <tr key={w} className="border-b border-border/30">
                  <td className="p-2 font-medium text-text-dim">{w + 1}</td>
                  {row.map((n, k) => (
                    <td key={k} className={`p-2 text-center font-mono ${n === 0 ? 'text-red' : 'text-coral'}`}>
                      {n}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* MLE Probabilities */}
      <div className="bg-card rounded-xl p-5 border border-border">
        <h3 className="text-lg font-semibold mb-2">Вероятности (MLE = частоты / {N_GAMES})</h3>
        <p className="text-text-dim text-sm mb-3">
          Это наилучшая оценка вероятностей по методу максимального правдоподобия — просто делим
          количество выпадений на общее число игр.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="p-2 text-left text-text-dim">Барабан</th>
                {SYMBOL_NAMES.map(s => (
                  <th key={s} className="p-2 text-center">{s}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MLE_PROBS.map((row, w) => (
                <tr key={w} className="border-b border-border/30">
                  <td className="p-2 font-medium text-text-dim">{w + 1}</td>
                  {row.map((p, k) => (
                    <td key={k} className={`p-2 text-center font-mono text-sm ${p === 0 ? 'text-red' : 'text-accent'}`}>
                      {p.toFixed(3)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Key numbers */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-card rounded-xl p-5 border border-border">
          <p className="text-text-dim text-sm mb-1">Среднее по выборке</p>
          <p className="text-3xl font-bold text-coral">{SAMPLE_MEAN}</p>
          <p className="text-text-dim text-xs mt-1">
            <K m={`\\frac{0 \\times 125 + 2 \\times 4 + 5 \\times 9}{138}`} />
          </p>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border">
          <p className="text-text-dim text-sm mb-1">Казино утверждает</p>
          <p className="text-3xl font-bold text-amber">{CASINO_CLAIM}</p>
          <p className="text-text-dim text-xs mt-1">средний выигрыш автомата</p>
        </div>
        <div className="bg-card rounded-xl p-5 border border-border">
          <p className="text-text-dim text-sm mb-1">Результаты журналиста</p>
          <div className="text-sm mt-1 space-y-1">
            <p><span className="text-text-dim">Награда 0:</span> <span className="text-coral font-mono">125 раз</span></p>
            <p><span className="text-text-dim">Награда 2:</span> <span className="text-coral font-mono">4 раза</span></p>
            <p><span className="text-text-dim">Награда 5:</span> <span className="text-coral font-mono">9 раз</span></p>
          </div>
        </div>
      </div>

      <div className="bg-accent-light/40 rounded-xl p-5 border border-amber/30">
        <p className="text-amber font-semibold mb-1">Вопрос:</p>
        <p className="text-text-dim">
          Казино утверждает, что средний выигрыш равен <span className="text-amber font-bold">0.92</span>,
          но журналист за 138 игр получил среднее только <span className="text-coral font-bold">0.384</span>.
          Может быть, автомат просто «не везучий» и казино не врёт? Или данные говорят, что казино лжёт?
          Чтобы ответить — нужна <span className="text-accent">проверка гипотез</span>.
        </p>
      </div>
    </div>
  );
}
