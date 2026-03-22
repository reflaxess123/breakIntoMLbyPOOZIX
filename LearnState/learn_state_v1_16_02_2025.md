# План обучения: от текущего уровня до NLP/ML Engineer

> На основе анализа пройденного материала и роадмапа из 548 вакансий hh.ru
> Текущий прогресс: Фаза 1 ~50%, Фаза 2 ~15%, общий ~10%

---

## Принципы построения плана

1. **Зависимости** — не перескакивать через темы, от которых зависят следующие
2. **Собесы** — то, что спрашивают, идёт раньше
3. **Блокеры** — то, без чего нельзя двигаться к Deep Learning и дальше
4. **Параллельность** — Python и SQL можно учить параллельно с ML-теорией

---

## Блок A: Добить математику (3–4 недели)

> Цель: закрыть пробелы в Фазе 1, довести до ~90%

### Неделя 1: Линейная алгебра — спектральная часть

**Почему сейчас:** SVD нужен для понимания PCA (Фаза 2) и LoRA (Фаза 5). Eigenvalues — фундамент SVD.

| День | Тема | Что делать |
|------|------|------------|
| 1 | Собственные значения и векторы | Определение Av = λv, геометрический смысл (растяжение/сжатие), вычисление для 2×2 матриц |
| 2 | Собственные значения — практика | Вычисление через характеристический полином det(A − λI) = 0, примеры с числами |
| 3 | SVD (сингулярное разложение) | A = UΣVᵀ — что это, зачем, связь с eigenvalues. Геометрия: поворот → растяжение → поворот |
| 4 | SVD → PCA | Как SVD разлагает данные по направлениям максимальной вариации. Low-rank approximation |
| 5 | SVD → LoRA | W = W₀ + BA, где B и A — low-rank матрицы. Почему это работает |
| 6 | Ранг матрицы | Определение, связь с линейной независимостью, связь с SVD (количество ненулевых сингулярных значений) |
| 7 | Ортогональность, проекции | Ортогональные векторы, проекция вектора на подпространство. Связь с Q, K, V в attention |

**Ресурсы:**
- 3Blue1Brown — Essence of Linear Algebra (главы про eigenvectors)
- Визуальное объяснение SVD: https://gregorygundersen.com/blog/2018/12/10/svd/
- Можем сделать интерактивное HTML-демо как с Байесом

---

### Неделя 2: Теория вероятностей — пробелы

**Почему сейчас:** hypothesis testing нужен для A/B тестирования (спрашивают на собесах), KL-дивергенция — для understanding RLHF и loss-функций в LLM.

| День | Тема | Что делать |
|------|------|------------|
| 1 | Ковариация и корреляция | Определение, формулы, связь с ковариационной матрицей. Зачем: PCA, feature selection |
| 2 | ЦПТ (Central Limit Theorem) | Средние выборок → нормальное распределение. Связь с биномиальным при большом n (ты уже видел это интуитивно) |
| 3 | Confidence intervals | Что это, как строить, связь с ЦПТ и стандартной ошибкой |
| 4 | Hypothesis testing: t-test | Нулевая гипотеза, p-value, уровень значимости α. Пример: «лучше ли модель A чем модель B?» |
| 5 | Hypothesis testing: практика | Chi-squared тест, множественная проверка гипотез, A/B тестирование |
| 6 | KL-дивергенция | DKL(P‖Q) — расстояние между распределениями. Связь с cross-entropy: H(P,Q) = H(P) + DKL(P‖Q) |
| 7 | Information theory обзор | Энтропия (повторить), mutual information, связь всего с loss-функциями |

**Ресурсы:**
- StatQuest (Josh Starmer) — видео про hypothesis testing, p-values, t-test
- Можем разобрать с числовыми примерами как обычно

---

### Неделя 3: Матанализ — оптимизаторы

**Почему сейчас:** без Adam нельзя нормально обучать нейросети в Фазе 3. Convexity — для понимания ландшафта потерь.

| День | Тема | Что делать |
|------|------|------------|
| 1 | SGD с momentum | Физическая аналогия: шарик с инерцией (как частица в Houdini). Формула: v = βv − α∇L, W += v |
| 2 | RMSprop | Адаптивный learning rate: делим на скользящее среднее квадратов градиентов |
| 3 | Adam = Momentum + RMSprop | Формулы, bias correction, почему это стандарт. AdamW — отличие |
| 4 | Learning rate schedules | Step decay, cosine annealing, warmup. Зачем: warm-up для трансформеров |
| 5 | Convex vs non-convex | Локальные минимумы, седловые точки, ландшафт потерь нейросетей |
| 6 | Bias-Variance Tradeoff | Математическая декомпозиция ошибки. Underfitting vs overfitting. Связь с регуляризацией |
| 7 | Повторение + тест себя | Попробовать ответить на все вопросы с собесов из роадмапа по математике |

**Ресурсы:**
- Andrej Karpathy — статья про training neural networks
- Ruder — обзор gradient descent оптимизаторов: https://ruder.io/optimizing-gradient-descent/

---

## Блок B: Классический ML (4–5 недель)

> Цель: Фаза 2 с 15% до ~85%. Включая алгоритмы для собесов.

### Неделя 4–5: Алгоритмы ML — теория + scikit-learn

| Тема | Дней | Приоритет | Что делать |
|------|------|-----------|------------|
| Метрики классификации | 2 | КРИТИЧЕСКИЙ | Precision, Recall, F1, AUC-ROC, PR curve, confusion matrix. На собесах спрашивают ВСЕГДА |
| Cross-validation | 1 | КРИТИЧЕСКИЙ | k-fold, stratified, train/val/test split. Зачем, когда, как |
| Decision Trees (CART) | 2 | ВЫСОКИЙ | Gini impurity, information gain, pruning. Кодить с нуля |
| Random Forest | 1 | ВЫСОКИЙ | Bagging + деревья, out-of-bag error, feature importance |
| Gradient Boosting | 3 | КРИТИЧЕСКИЙ | Boosting vs bagging, XGBoost/LightGBM/CatBoost. CatBoost — обязателен для рынка РФ |
| SVM | 1 | СРЕДНИЙ | Концептуально: разделяющая гиперплоскость, kernel trick. Без глубокого погружения |
| KNN | 0.5 | СРЕДНИЙ | Просто: ближайшие соседи, curse of dimensionality |
| Feature engineering | 1 | ВЫСОКИЙ | Encoding (one-hot, label, target), scaling, imputation, feature selection |

### Неделя 6: Unsupervised + Ensemble

| Тема | Дней | Приоритет | Что делать |
|------|------|-----------|------------|
| K-Means | 1 | ВЫСОКИЙ | Алгоритм, выбор k (elbow method), кодить с нуля |
| PCA | 2 | ВЫСОКИЙ | Связь с eigenvalues/SVD (уже будешь знать). Scree plot, explained variance |
| DBSCAN | 0.5 | СРЕДНИЙ | Концептуально: density-based clustering |
| t-SNE, UMAP | 0.5 | СРЕДНИЙ | Визуализация высокомерных данных, когда использовать |
| Bagging vs Boosting vs Stacking | 1 | ВЫСОКИЙ | Разница, когда что, ensemble methods обзор |

### Неделя 7: Data Science библиотеки

| Библиотека | Дней | Что делать |
|------------|------|------------|
| Pandas | 2 | DataFrame, groupby, merge, pivot, time series. Решать задачи |
| Matplotlib/Seaborn | 1 | EDA визуализация: histograms, scatter, heatmaps |
| scikit-learn | 2 | Pipeline, GridSearchCV, metrics, preprocessing. Собрать проект |
| NumPy (углубить) | 1 | Broadcasting, advanced indexing, vectorization |

### Неделя 8: Проект «Классический ML»

**Цель:** первый проект в портфолио

- Табличные данные (Kaggle dataset)
- EDA с Pandas + визуализация
- Feature engineering
- Несколько моделей: LogReg, RandomForest, CatBoost
- Cross-validation, подбор гиперпараметров
- Метрики, сравнение моделей
- Чистый код, README на GitHub

---

## Блок C: Параллельный трек — Python + SQL + LeetCode

> Это идёт ПАРАЛЛЕЛЬНО с блоками A и B, по 1–1.5 часа в день

### Python advanced (по ходу всего обучения)

| Приоритет | Темы | Когда |
|-----------|------|-------|
| СЕЙЧАС | typing, dataclasses, декораторы, pytest | Параллельно с Блоком A |
| Через 2 нед | asyncio, collections, functools, itertools | Параллельно с Блоком B |
| Через 4 нед | GIL, memory management, Pydantic v2 | Параллельно с Блоком B |

**Метод:** читать Fluent Python + сразу применять в ML-проектах

### SQL (параллельно, 30 мин/день)

| Неделя | Фокус |
|--------|-------|
| 1–2 | Базовый SQL: SELECT, JOIN, GROUP BY, HAVING. DataLemur Easy |
| 3–4 | Window Functions: ROW_NUMBER, RANK, LAG/LEAD. DataLemur Medium |
| 5–6 | CTE, подзапросы, EXPLAIN. DataLemur Medium-Hard |
| 7–8 | ML-специфичный SQL: когортный анализ, A/B тест, feature engineering |

### LeetCode (параллельно, 30–45 мин/день)

| Неделя | Фокус | Задач |
|--------|-------|-------|
| 1–2 | Arrays/Strings: two pointers, sliding window | 8 |
| 3–4 | Hash Maps, Stacks | 8 |
| 5–6 | Trees, BFS/DFS | 8 |
| 7–8 | Dynamic Programming (1D/2D) | 8 |
| 9–10 | Binary Search, Heaps, Graphs | 8 |
| 11+ | Смешанные, ML-специфичные | 15 |

**Итого: ~55 задач** — достаточно для MLE собеса по роадмапу

---

## Блок D: Git + Linux (1 неделя, в начале)

> Если ещё не знаешь — пройти в первую неделю

| Тема | Дней | Что делать |
|------|------|------------|
| Git | 2 | add/commit/push/pull, branches, merge, gitflow, PR workflow |
| Linux | 2 | Навигация, процессы, текст (grep/awk/sed), ssh, tmux, nvidia-smi |
| Практика | 1 | Создать GitHub репо, настроить .gitignore для ML, сделать первый PR |

---

## Сводный таймлайн (первые 8 недель)

```
Неделя 1:  [Блок A: Линалг — eigen/SVD/PCA]     + [Git/Linux]     + [SQL Easy]      + [LC Easy]
Неделя 2:  [Блок A: Теорвер — hyp.testing/KL]     + [Python adv]    + [SQL Easy]      + [LC Easy]
Неделя 3:  [Блок A: Оптимизаторы/Bias-Variance]   + [Python adv]    + [SQL Window]    + [LC Medium]
Неделя 4:  [Блок B: Метрики/CV/Decision Trees]     + [Python adv]    + [SQL Window]    + [LC Medium]
Неделя 5:  [Блок B: Random Forest/Boosting]        + [Python adv]    + [SQL CTE]       + [LC Medium]
Неделя 6:  [Блок B: Unsupervised/PCA/Ensemble]     + [Pandas]        + [SQL CTE]       + [LC Medium]
Неделя 7:  [Блок B: sklearn/Matplotlib/NumPy]      + [Pydantic]      + [SQL ML-спец]   + [LC Medium]
Неделя 8:  [Блок B: Проект «Классический ML»]      + [pytest]        + [SQL ML-спец]   + [LC Mixed]
```

**Ежедневное распределение времени (при 3–4 часах/день):**

```
Основная тема (Блок A или B):    1.5–2 часа
Python advanced или библиотеки:   30–45 мин
SQL (DataLemur):                  30 мин
LeetCode:                         30–45 мин
```

---

## После Блока B: что дальше

После 8 недель ты будешь на уровне:
- Фаза 0: ~60% (Python advanced + SQL + алгоритмы в процессе)
- Фаза 1: ~90% (математика почти закрыта)
- Фаза 2: ~85% (классический ML закрыт)

Далее переход к **Фазе 3: Deep Learning** — это прямое продолжение:
- MLP с нуля (расширение твоего softmax regression)
- PyTorch
- CNN обзорно
- RNN/LSTM → вход в NLP

Но это уже следующий план. Сначала — эти 8 недель.

---

## Чеклист: что ты сможешь после этого плана

### На собесе по математике:
- [x] Вывести backprop ← уже можешь
- [x] Связь MLE и cross-entropy ← уже можешь
- [x] Softmax и его градиент ← уже можешь
- [ ] → Bias-variance tradeoff математически
- [ ] → Связь SVD и PCA
- [ ] → Почему Adam лучше SGD
- [ ] → L2-регуляризация = нормальный prior ← уже можешь, но добавится формальность

### На собесе по классическому ML:
- [ ] → Объяснить разницу precision vs recall, когда что важнее
- [ ] → Gradient Boosting: как работает, XGBoost vs CatBoost
- [ ] → Random Forest vs Gradient Boosting: когда что
- [ ] → PCA: что делает, связь с SVD, scree plot
- [ ] → K-Means: алгоритм, выбор k

### На coding round:
- [ ] → 55 задач LeetCode Medium
- [ ] → 20 задач SQL на DataLemur

---

*План актуален на февраль 2026. Пересмотреть после завершения Блока B.*

