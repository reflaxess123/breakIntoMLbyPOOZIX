import { K } from '../../components/Latex';
import { CASINO_CLAIM } from './constants';

export function Step1() {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-accent">Шаг 1. Гипотезы</h2>

      <p className="text-text-dim leading-relaxed">
        Мы хотим проверить утверждение казино формально — через статистическую проверку гипотез.
        Для этого формулируем две гипотезы:
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-card rounded-xl p-5 border-2 border-amber/50">
          <h3 className="text-lg font-bold text-amber mb-2">
            H₀ — нулевая гипотеза
          </h3>
          <div className="text-xl my-3">
            <K m={`\\mathbb{E}[R] = ${CASINO_CLAIM}`} d />
          </div>
          <p className="text-text-dim text-sm">
            «Казино не врёт». Средний выигрыш автомата действительно равен {CASINO_CLAIM}.
            Что журналист получил меньше — просто невезение.
          </p>
        </div>

        <div className="bg-card rounded-xl p-5 border-2 border-accent/50">
          <h3 className="text-lg font-bold text-accent mb-2">
            H₁ — альтернативная гипотеза
          </h3>
          <div className="text-xl my-3">
            <K m={`\\mathbb{E}[R] \\neq ${CASINO_CLAIM}`} d />
          </div>
          <p className="text-text-dim text-sm">
            «Казино врёт». Средний выигрыш автомата НЕ равен {CASINO_CLAIM} —
            он какой-то другой (скорее всего, меньше).
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl p-5 border border-border space-y-4">
        <h3 className="text-lg font-semibold">Как это работает?</h3>

        <p className="text-text-dim leading-relaxed">
          <span className="text-accent font-semibold">Идея:</span> мы пытаемся <em>отвергнуть</em> H₀.
          Не доказать H₁, а именно показать, что H₀ плохо объясняет наши данные.
        </p>

        <p className="text-text-dim leading-relaxed">
          <span className="text-accent font-semibold">Метод:</span> отношение правдоподобий (likelihood ratio test).
          Мы сравним две «лучшие модели»:
        </p>

        <ul className="space-y-3 text-text-dim">
          <li className="flex gap-3">
            <span className="text-accent font-bold shrink-0">L₁</span>
            <span>
              — правдоподобие лучшей модели <strong>без ограничений</strong>.
              Мы просто берём частоты из данных как вероятности (MLE). Это максимально хорошо объясняет данные.
            </span>
          </li>
          <li className="flex gap-3">
            <span className="text-amber font-bold shrink-0">L₀</span>
            <span>
              — правдоподобие лучшей модели <strong>с ограничением</strong> <K m={`\\mathbb{E}[R] = ${CASINO_CLAIM}`} />.
              Ищем такие вероятности, чтобы данные объяснялись максимально хорошо, НО при этом средний выигрыш
              был ровно {CASINO_CLAIM}.
            </span>
          </li>
        </ul>

        <div className="bg-bg/50 rounded-lg p-4 text-center">
          <K m={`T = \\log L_1 - \\log L_0 \\geq 0`} d />
          <p className="text-text-dim text-sm mt-2">
            Чем больше T — тем хуже H₀ объясняет данные по сравнению со свободной моделью.
          </p>
        </div>
      </div>

      <div className="bg-card rounded-xl p-5 border border-border">
        <h3 className="text-lg font-semibold mb-3">Модель автомата</h3>
        <p className="text-text-dim leading-relaxed mb-3">
          Автомат имеет 3 независимых барабана, на каждом 7 символов. Вероятность комбинации
          <K m="(x, y, z)" /> — это произведение вероятностей каждого символа:
        </p>
        <div className="bg-bg/50 rounded-lg p-4 text-center">
          <K m={`P(x, y, z) = p^1_x \\cdot p^2_y \\cdot p^3_z`} d />
        </div>
        <p className="text-text-dim leading-relaxed mt-3">
          Мат. ожидание выигрыша — сумма по всем <K m="7^3 = 343" /> комбинациям:
        </p>
        <div className="bg-bg/50 rounded-lg p-4 text-center">
          <K m={`\\mathbb{E}[R] = \\sum_{x,y,z} \\text{reward}(x,y,z) \\cdot p^1_x \\cdot p^2_y \\cdot p^3_z`} d />
        </div>
        <p className="text-text-dim text-sm mt-3">
          Модель имеет <span className="text-accent">21 параметр</span> (7 вероятностей × 3 барабана),
          из которых <span className="text-accent">18 свободных</span> (на каждом барабане сумма = 1, это 3 ограничения).
        </p>
      </div>
    </div>
  );
}
