# LearnState v2 — Текущий уровень знаний

> Что я УЖЕ знаю, привязанное к роадмапу из 548 вакансий hh.ru
> Обновлено: 17 февраля 2026

---

## Общий прогресс

| Фаза | Прогресс | Описание |
|------|----------|----------|
| Фаза 0: Программирование | ~15% | Python базовый — рабочий. SQL, LeetCode, Git — не начато |
| Фаза 1: Математика | ~65% | Сильное ядро (MLE, Байес, backprop, SVD/PCA, CLT), пробелы в стат. тестах и оптимизаторах |
| Фаза 2: Classical ML | ~15% | LinReg + LogReg с нуля. Деревья, бустинг, метрики — не начато |
| Фаза 3: Deep Learning | ~5% | Backprop для 1 слоя. MLP, CNN, RNN — не начато |
| Фаза 4: NLP/Transformers | 0% | Не начато |
| Фаза 5: LLM Engineering | 0% | Не начато |
| Фаза 6: MLOps | 0% | Не начато |

---

## Фаза 0: Программирование

### Python
**Уровень:** Рабочий базовый

**Что умею:**
- Базовые типы данных, циклы, функции
- NumPy: матричные операции, broadcasting (использовал для MNIST)
- Могу разобрать и переписать ML-код строка за строкой

**Чего не умею:**
- typing, dataclasses, декораторы, asyncio
- collections, functools, itertools
- GIL, memory management, Pydantic
- pytest
- Pandas, Matplotlib/Seaborn, scikit-learn

### SQL — не начато
### LeetCode — не начато
### Git — не начато
### Linux — не начато

---

## Фаза 1: Математика для ML (~50%)

### 1.1 Линейная алгебра (~75%)

**✅ Знаю:**
- Векторы, скалярное произведение, cosine через угол
- Матричное умножение — практическое владение с конкретными размерностями (784×10, 64×784)
- Транспонирование — зачем и когда (X.T @ error = dW)
- Нормы L1, L2 — формулы и интерпретация через регуляризацию

**✅ Знаю:**
- Собственные значения/векторы (eigenvalues) — Av = λv, геометрический смысл
- SVD (сингулярное разложение) — A = UΣVᵀ, связь с eigenvalues, low-rank approximation
- PCA — связь с SVD, направления максимальной вариации
- Косинусное сходство для эмбеддингов — два слова → эмбеддинги → cosine показывает насколько вектора направлены в одну сторону → похожие слова = близкие вектора

**❌ Не знаю:**
- Ранг матрицы, линейная независимость
- Ортогональность, проекции

### 1.2 Теория вероятностей и статистика (~65%)

**✅ Знаю глубоко:**
- **Теорема Байеса** — интерактивные демо, prior × likelihood = posterior, числовые примеры, сценарии с сильным/слабым prior
- **MLE (Maximum Likelihood)** — полный путь: от монетки через произведение → логарифм → сумма → cross-entropy. Связь MLE→CE, Normal→MSE, Categorical→CE
- **MAP (Maximum A Posteriori)** — вывод L2 = нормальный prior, L1 = лапласовский prior, интерактивное демо
- **Распределения** — Normal, Bernoulli, Binomial подробно; Poisson, Geometric, Exponential, Student, Beta, Uniform на уровне обзора; категориальное — подробно через softmax
- **Cross-entropy** — полный вывод из MLE, связь с энтропией Шеннона, формула H(P,Q) = -Σ P·ln(Q), понимание как E_P[-ln Q]
- **Мат.ожидание, дисперсия** — E(X) как взвешенная сумма, Var = E(X²) − E(X)², выборочная оценка
- **CDF, квантили, перцентили** — эмпирическая CDF, Q1/Q2/Q3, боксплот, выбросы через IQR

**✅ Знаю базово:**
- **Нормальное распределение** — стандартизация Z = (X−μ)/σ, z-таблица (Φ), правило 68-95-99.7, примеры с ростом
- **Энтропия Шеннона** — мера неопределённости, формула H = -Σ p·ln(p)
- **Ковариация и корреляция** — пройдено
- **ЦПТ (Central Limit Theorem)** — пройдено, средние выборок → нормальное распределение

**⚠️ Частично:**
- Условная вероятность — через Байеса, но формально совместные распределения и маргинализацию не разбирал

**❌ Не знаю:**
- Confidence intervals (доверительные интервалы)
- Hypothesis testing (t-test, p-value, ошибки I/II рода)
- KL-дивергенция — знаю что связана с CE через H(P,Q) = H(P) + D_KL, но формально не разбирал
- A/B-тестирование
- Bootstrap

### 1.3 Матанализ и оптимизация (~55%)

**✅ Знаю глубоко:**
- **Частные производные, градиент** — градиент как вектор частных производных, направление максимального роста через cos θ, визуализация для матриц весов
- **Chain rule** — три звена для softmax regression: dL/dP · якобиан softmax (10×10) · dZ/dW = Xᵀ. Понимаю что chain rule = основной клей backprop
- **Backpropagation** — полный вывод для softmax regression: dL/dW = (1/m)·Xᵀ·(P−Y). Якобиан, сокращение, элегантная финальная формула
- **Gradient descent (SGD)** — W -= lr·dW, реализация с нуля, mini-batch, усреднение по батчу

**❌ Не знаю:**
- Adam optimizer (momentum + RMSprop)
- Learning rate schedules (warmup, cosine annealing)
- Convex vs non-convex оптимизация
- Bias-Variance Tradeoff (математическая декомпозиция MSE = Bias² + Var + Noise)

---

## Фаза 2: Classical ML (~15%)

### 2.1 Модели

**✅ Реализовал с нуля:**
- **Softmax Regression на MNIST** — полный pipeline: forward pass (X@W+b → softmax → probs), loss (cross-entropy), backward pass (P−Y → X.T@error → dW), update (W -= lr·dW). Разбирал строчка за строчкой, понимаю каждую матричную операцию
- **Линейная регрессия** — closed form + gradient descent, исторический контекст (Гаусс, Лежандр)
- **Логистическая регрессия** — бинарная (Bernoulli→BCE) и мультиклассовая (Categorical→CE)

**❌ Не знаю (алгоритмы):**
- Decision Trees (CART, Gini, Entropy, pruning)
- Random Forest (bagging, bootstrap, feature importance)
- Gradient Boosting (XGBoost, LightGBM, CatBoost)
- SVM (разделяющая гиперплоскость, kernel trick)
- KNN
- K-Means, DBSCAN
- PCA (как алгоритм, связь с SVD) — пройдено
- t-SNE, UMAP — пройдено базово

### 2.2 Теория ML

**⚠️ Частично:**
- Overfitting/Underfitting — интуитивно через регуляризацию (демо с полиномами), но формальная диагностика — нет

**❌ Не знаю:**
- Bias-Variance Tradeoff
- Cross-validation (k-fold, stratified)
- Метрики классификации (Precision, Recall, F1, AUC-ROC, confusion matrix)
- Метрики регрессии (RMSE, MAE, R²)
- Feature engineering / selection
- Bagging vs Boosting vs Stacking

### 2.3 Библиотеки

**⚠️ NumPy** — рабочий уровень для матричных операций, но систематически не прокачан

**❌ Не знаю:** Pandas, scikit-learn, Matplotlib/Seaborn

---

## Фаза 3: Deep Learning (~5%)

**✅ Фундамент есть:**
- Backprop для 1 слоя (softmax regression)
- Понимание forward pass / backward pass
- Знаю что MLP = «мой код + скрытые слои»

**❌ Не знаю:**
- MLP (multi-layer backprop)
- Функции активации: ReLU, sigmoid, tanh (знаю conceptually, не реализовывал)
- Weight initialization (Xavier, He)
- Dropout, BatchNorm
- CNN (свёртки, pooling, stride)
- ResNet (skip connections)
- RNN, LSTM, GRU
- Autoencoders, VAE, GAN
- Transfer Learning
- PyTorch

---

## Фаза 4: NLP / Transformers (0%)

Не начато. Word2Vec, Attention, Transformer, BERT, GPT — всё впереди.

---

## Фаза 5: LLM Engineering (0%)

Не начато. LoRA, RAG, RLHF, Tokenization — всё впереди.
(Фундамент для LoRA = SVD ✅ закрыт. Для RLHF = KL-дивергенция — ещё не закрыт)

---

## Готовность к собесу

### Математика — могу ответить:

| Вопрос | Готовность |
|--------|-----------|
| Выведите backprop для простой сети | ✅ |
| Связь MLE и cross-entropy | ✅ подробно |
| Почему cross-entropy, а не MSE для классификации? | ✅ (Normal→MSE, Categorical→CE) |
| Softmax и его градиент | ✅ (якобиан, полный вывод) |
| L2-регуляризация как байесовский prior | ✅ (L2 = Normal, L1 = Laplace) |
| Что такое gradient descent | ✅ |

### Математика — НЕ могу ответить:

| Вопрос | Статус |
|--------|--------|
| Bias-variance tradeoff математически | ❌ |
| Связь SVD и PCA | ✅ |
| Почему Adam лучше SGD | ❌ |
| Что такое p-value | ❌ |
| Как устроен A/B-тест | ❌ |

### Classical ML — НЕ могу ответить:

| Вопрос | Статус |
|--------|--------|
| Precision vs Recall — когда что | ❌ |
| Как работает Gradient Boosting | ❌ |
| RF vs GB — когда что | ❌ |
| PCA — что делает | ❌ |
| K-Means — алгоритм | ❌ |

### Deep Learning / NLP — НЕ могу ответить:

| Вопрос | Статус |
|--------|--------|
| Как работает CNN | ❌ |
| LSTM — зачем гейты | ❌ |
| Self-Attention формула | ❌ |
| Transformer архитектура | ❌ |
| BERT vs GPT | ❌ |

---

## Главная сила

Подход через **реализацию с нуля**: не заучиваю формулы, а разбираю код строчка за строчкой и параллельно учу математику, которая за ним стоит. Softmax regression на MNIST дал: матричное умножение, softmax, cross-entropy, MLE, chain rule, backprop, SGD, якобиан — всё через одну модель.

Бэкграунд в VFX (Houdini) даёт интуитивное понимание симуляций, частиц, итеративных процессов — это переносится на gradient descent и оптимизацию.

---

*Обновить после прохождения следующего блока материала.*
