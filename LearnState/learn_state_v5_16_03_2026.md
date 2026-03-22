# LearnState v5 — Текущий уровень знаний

> Привязан к [NLP/LLM/Transformer ML Engineer Roadmap](./NLP-LLM-Transformer_ML_Engineer_Roadmap.md) (548 вакансий hh.ru)
> Обновлено: 16 марта 2026

---

## Как читать

```
✅  — знаю, могу объяснить / применить
⚠️  — обзорно (видел, понимаю концепт, но не делал руками)
❌  — не знаю / не начинал
```

**Процент фазы** = доля ✅ от общего числа пунктов в этой фазе. ⚠️ считается как 0.5.

---

## Сводка по фазам

| # | Фаза | Прогресс | Комментарий |
|---|------|----------|-------------|
| 0 | Программирование | **~25%** | Python базовый, Git/Docker/Linux рабочие, SQL и LeetCode не начаты |
| 1 | Математика | **~75%** | Сильная теорвер/стат, линал, backprop, свойства оценок. Пробелы: Adam, A/B, формальный B-V |
| 2 | Classical ML | **~35%** | LinReg/LogReg с нуля, деревья-бустинг обзорно, метрики и библиотеки — нет |
| 3 | Deep Learning | **~5%** | Backprop 1 слой. PyTorch, CNN, RNN — не начато |
| 4 | NLP / Transformers | **0%** | Не начато |
| 5 | LLM Engineering | **0%** | Не начато |
| 6 | MLOps / Production | **~15%** | Docker и Git рабочие, остальное — нет |
| 7 | Портфолио | **0%** | Нет проектов |
| 8 | Подготовка к собесам | **~10%** | Мат. вопросы частично готовы |

---

## Фаза 0: Программирование

### 0.1 Python `[76.5% вакансий]`

**Базовый Python:**
| Тема | Статус |
|------|--------|
| Типы данных, циклы, функции | ✅ |
| Comprehensions | ✅ |
| ООП (классы, наследование, dunder) | ⚠️ обзорно |
| Итераторы, генераторы (yield) | ⚠️ обзорно |
| Контекстные менеджеры (with) | ⚠️ обзорно |
| Обработка исключений | ⚠️ обзорно |
| Работа с файлами (JSON, CSV) | ⚠️ обзорно |

**Продвинутый Python (собесы):**
| Тема | Статус |
|------|--------|
| typing (Optional, Union, Generic) | ❌ |
| dataclasses | ❌ |
| asyncio | ❌ |
| Декораторы (свои, с аргументами) | ❌ |
| Метаклассы | ❌ |
| collections (defaultdict, Counter, deque) | ❌ |
| functools (lru_cache, partial, reduce) | ❌ |
| itertools (chain, product, groupby) | ❌ |
| pathlib | ❌ |
| logging | ❌ |
| GIL, multiprocessing vs threading | ❌ |
| Memory management, __slots__ | ❌ |
| Pydantic v2 | ❌ |
| pytest | ❌ |

**Библиотеки:**
| Тема | Статус |
|------|--------|
| NumPy (матрицы, broadcasting) | ✅ использовал для MNIST |
| Pandas | ❌ |
| Matplotlib / Seaborn | ❌ |
| scikit-learn | ❌ |

### 0.2 SQL `[41.4% вакансий]`

| Тема | Статус |
|------|--------|
| Базовый SQL (SELECT, JOIN, GROUP BY) | ❌ |
| Window Functions | ❌ |
| CTE | ❌ |
| ML-специфичный SQL | ❌ |
| PostgreSQL (JSONB, pgvector) | ❌ |

### 0.3 Алгоритмы и структуры данных (LeetCode)

**Структуры данных:**
| Тема | Статус |
|------|--------|
| Массивы / строки (sliding window, two pointers, prefix sums) | ⚠️ смотрел обзоры |
| Hash Map / Set | ⚠️ смотрел обзоры |
| Стек / очередь | ⚠️ смотрел обзоры |
| Деревья (binary tree, BST, DFS, BFS) | ⚠️ смотрел обзоры |
| Trie | ❌ |
| Графы | ❌ |
| Heap | ❌ |
| Linked List | ❌ |

**Алгоритмы:**
| Тема | Статус |
|------|--------|
| Binary Search | ⚠️ смотрел обзоры |
| BFS / DFS | ⚠️ смотрел обзоры |
| Dynamic Programming | ⚠️ смотрел обзоры |
| Сортировки (merge, quick — сложности) | ⚠️ смотрел обзоры |
| Sliding Window | ⚠️ смотрел обзоры |
| Two Pointers | ⚠️ смотрел обзоры |
| Greedy | ❌ |
| Union-Find | ❌ |
| Backtracking | ⚠️ смотрел обзоры |

**Решённые задачи: 0 / 55**

### 0.4 Git `[key_skills: 33]`

| Тема | Статус |
|------|--------|
| add, commit, push, pull, merge | ✅ использую в проекте |
| Branching, feature branches | ✅ |
| Merge conflicts | ✅ базово |
| git log, diff, stash | ⚠️ |
| .gitignore | ✅ |
| Pull Requests, code review | ⚠️ |
| Rebase, cherry-pick, bisect | ❌ |
| Pre-commit hooks | ❌ |

### 0.5 Linux `[key_skills: 39]`

| Тема | Статус |
|------|--------|
| Bash, пайпы, основные утилиты | ✅ (Arch Linux + Hyprland) |
| Файловая система, монтирование | ✅ |
| TTY, как грузится ядро | ✅ |
| Userspace vs kernelspace | ✅ |
| Wayland / композиторы | ✅ настраивал Hyprland |
| Процессы (ps, top, kill, tmux) | ⚠️ |
| Сеть (curl, ssh, scp) | ⚠️ |
| Переменные окружения, .bashrc | ✅ |
| GPU: nvidia-smi, CUDA | ❌ |

### 0.6 Docker `[key_skills: 63]`

| Тема | Статус |
|------|--------|
| Dockerfile, build, run | ✅ использую в проекте |
| Docker Compose | ⚠️ |
| Volumes, networking | ⚠️ |
| Multi-stage builds | ❌ |
| GPU support (nvidia-docker) | ❌ |
| Оптимизация образов | ❌ |

---

## Фаза 1: Математика `[58.8% вакансий]`

### 1.1 Линейная алгебра

| Тема | Статус | Детали |
|------|--------|--------|
| Векторы, скалярное произведение | ✅ | — |
| Матричное умножение | ✅ | Практика: 784×10, 64×784 |
| Транспонирование | ✅ | X.T @ error = dW |
| Нормы L1, L2 | ✅ | Формулы + регуляризация |
| Eigenvalues / eigenvectors | ✅ | Av = λv, геом. смысл |
| SVD | ✅ | A = UΣVᵀ, low-rank, связь с PCA |
| PCA | ✅ | Через SVD, направления макс. вариации |
| Косинусное сходство | ✅ | Для эмбеддингов |
| Ранг матрицы, лин. независимость | ❌ | — |
| Ортогональность, проекции | ❌ | — |

### 1.2 Теория вероятностей и статистика

| Тема | Статус | Детали |
|------|--------|--------|
| Аксиоматика Колмогорова | ✅ | Ω, σ-алгебра, мера P, парадокс Банаха-Тарского |
| Операции над множествами | ✅ | де Морган, связь с булевой алгеброй |
| Комбинаторика | ✅ | Перестановки, сочетания, задача о ДР |
| Биномиальное распределение | ✅ | Формула + смысл каждой части |
| Теорема Байеса | ✅ | Prior × likelihood = posterior |
| MLE | ✅ | Полный вывод: произведение → log → CE |
| MAP | ✅ | L2 = нормальный prior, L1 = лапласовский |
| Распределения | ✅ | Normal, Bernoulli, Binomial подробно; Poisson, Geometric, Exponential, Student, Beta, Uniform обзорно |
| Cross-entropy | ✅ | Полный вывод из MLE, связь с H(P) |
| E(X), Var(X) | ✅ | Формулы, выборочная оценка |
| CDF, квантили, боксплот | ✅ | IQR, выбросы |
| Ковариация, корреляция | ✅ | Ковариационная матрица |
| ЦПТ | ✅ | Средние → Normal |
| Bootstrap | ✅ | Ресемплинг, CI, OOB |
| Свойства оценок (несмещ., сост., эфф.) | ✅ | Коррекция Бесселя (n−1) |
| Метод моментов | ✅ | — |
| Нормальное распр-е (стандартизация) | ✅ | Z-score, правило 68-95-99.7 |
| Энтропия Шеннона | ✅ | H = −Σ p·ln(p) |
| Hypothesis testing (p-value, H₀/H₁) | ✅ | Ошибки I и II рода |
| Доверительные интервалы | ✅ | z, t, χ²; ширина ∝ 1/√n |
| Z-тест, t-тест | ✅ | Одно- и двухвыборочный |
| Распределение Стьюдента | ✅ | n мало + σ неизвестно |
| Вилкоксон | ✅ | Непараметрический |
| Bias-Variance Tradeoff | ⚠️ | Концептуально ✅, формальный вывод ❌ |
| KL-дивергенция | ⚠️ | Знаю связь H(P,Q) = H(P) + D_KL, формально не разбирал |
| Хи-квадрат тест | ⚠️ | Распределение знаю, тест — нет |
| F-тест / распределение Фишера | ❌ | — |
| A/B-тестирование | ❌ | Sample size, Bonferroni |
| Совместные распр-я, маргинализация | ❌ | — |

### 1.3 Матанализ и оптимизация

| Тема | Статус | Детали |
|------|--------|--------|
| Частные производные, градиент | ✅ | Направление макс. роста |
| Chain rule | ✅ | 3 звена для softmax regression, якобиан |
| Backpropagation | ✅ | Полный вывод: dL/dW = (1/m)·Xᵀ·(P−Y) |
| Gradient descent (SGD) | ✅ | Реализация с нуля, mini-batch |
| Adam optimizer | ❌ | Momentum + RMSprop |
| Learning rate schedules | ❌ | Warmup, cosine annealing |
| Convex vs non-convex | ❌ | — |

---

## Фаза 2: Classical ML

### 2.1 Модели

**Реализовал с нуля:**
| Модель | Статус | Детали |
|--------|--------|--------|
| Softmax Regression (MNIST) | ✅ | Forward, CE loss, backprop, SGD |
| Линейная регрессия | ✅ | Closed form + gradient descent |
| Логистическая регрессия | ✅ | Бинарная (BCE) + мультиклассовая (CE) |

**Разобрал обзорно (формулы на бумаге, понимаю механику, не кодил):**
| Модель | Статус | Что понимаю |
|--------|--------|-------------|
| Decision Trees (CART) | ⚠️ | Gini, Entropy, Information Gain, pruning |
| Random Forest | ⚠️ | Bagging, √M признаков, OOB, feature importance |
| Gradient Boosting | ⚠️ | Последовательное обучение на остатках |
| XGBoost vs LightGBM vs CatBoost | ⚠️ | Level-wise / leaf-wise / symmetric; категории; регуляризация |
| SVM | ⚠️ | Гиперплоскость, kernel trick |
| KNN | ⚠️ | k ближайших соседей |
| K-Means | ❌ | — |
| DBSCAN | ❌ | — |
| PCA (как алгоритм, не только матем.) | ❌ | — |
| t-SNE, UMAP | ❌ | — |

### 2.2 Теория ML

| Тема | Статус |
|------|--------|
| Bagging vs Boosting | ⚠️ обзорно |
| Cross-validation (k-fold, LOO) | ⚠️ обзорно |
| Stratified k-fold, nested CV | ❌ |
| Метрики классификации (Precision, Recall, F1, AUC-ROC) | ❌ |
| Confusion matrix | ❌ |
| Метрики регрессии (RMSE, MAE, R²) | ❌ |
| Feature engineering / encoding / scaling | ❌ |
| Feature selection (correlation, mutual info) | ❌ |
| Stacking, blending | ❌ |
| Overfitting / Underfitting — диагностика | ⚠️ через Bias-Variance |

### 2.3 Библиотеки

| Библиотека | Статус |
|------------|--------|
| scikit-learn | ❌ |
| Pandas | ❌ |
| Matplotlib / Seaborn | ❌ |
| SciPy | ❌ |

---

## Фаза 3: Deep Learning

### 3.1 Основы нейросетей

| Тема | Статус |
|------|--------|
| Backprop для 1 слоя (softmax regression) | ✅ |
| Forward pass / backward pass (концепт) | ✅ |
| MLP = «мой код + скрытые слои» (понимаю) | ⚠️ |
| Multi-layer backprop | ❌ |
| Активации: ReLU, sigmoid, tanh, GELU | ❌ |
| Loss: MSE, CE, BCE (знаю CE, остальное — нет в коде) | ⚠️ |
| Adam, AdamW | ❌ |
| LR schedules (warmup, cosine) | ❌ |
| Regularization: Dropout, BatchNorm, LayerNorm | ❌ |
| Weight init: Xavier, He | ❌ |

### 3.2 PyTorch `[29.0% вакансий]`

| Тема | Статус |
|------|--------|
| Всё | ❌ |

### 3.3 CNN

| Тема | Статус |
|------|--------|
| Свёртки, пулинг, stride, padding | ❌ |
| ResNet, VGG (концептуально) | ❌ |
| Transfer learning | ❌ |

### 3.4 RNN / LSTM / GRU

| Тема | Статус |
|------|--------|
| Vanilla RNN, vanishing gradients | ❌ |
| LSTM — gates, cell state | ❌ |
| Seq2Seq with Attention | ❌ |

---

## Фаза 4: NLP / Transformers `[42.7% вакансий]`

| Тема | Статус |
|------|--------|
| Tokenization (BPE, WordPiece) | ❌ |
| Word Embeddings (Word2Vec, GloVe) | ❌ |
| Self-Attention (Q/K/V) | ❌ |
| Multi-Head Attention | ❌ |
| Positional Encoding (RoPE, ALiBi) | ❌ |
| Encoder-only (BERT) | ❌ |
| Decoder-only (GPT, LLaMA) | ❌ |
| Encoder-Decoder (T5) | ❌ |
| GQA, Flash Attention, MoE, KV-Cache | ❌ |
| Hugging Face Transformers | ❌ |
| NLP задачи (NER, QA, summarization) | ❌ |

---

## Фаза 5: LLM Engineering

| Тема | Статус |
|------|--------|
| Fine-tuning (LoRA, QLoRA, PEFT) | ❌ |
| RAG pipeline | ❌ |
| Vector databases | ❌ |
| Prompt engineering | ❌ |
| LLM Evaluation (RAGAS, бенчмарки) | ❌ |
| LLM Serving (vLLM, TGI) | ❌ |
| Agent frameworks (LangChain, LangGraph) | ❌ |

---

## Фаза 6: MLOps / Production

| Тема | Статус | Детали |
|------|--------|--------|
| Docker (базовый) | ✅ | Использую в проекте |
| Docker Compose | ⚠️ | — |
| Docker (продвинутый: multi-stage, GPU) | ❌ | — |
| Kubernetes | ❌ | — |
| CI/CD (GitHub Actions / GitLab CI) | ❌ | — |
| Airflow | ❌ | — |
| MLflow | ❌ | — |
| FastAPI | ❌ | — |
| Kafka | ❌ | — |
| PySpark / Big Data | ❌ | — |

---

## Фаза 7: Портфолио

| Проект | Статус |
|--------|--------|
| Проект 1: Классический ML (EDA + CatBoost + MLflow) | ❌ |
| Проект 2: NLP Classification (BERT fine-tune + FastAPI) | ❌ |
| Проект 3: RAG-система (главный проект) | ❌ |
| Проект 4: LLM Fine-tuning (QLoRA) | ❌ |
| Проект 5: LLM Agent (LangGraph) | ❌ |

---

## Фаза 8: Подготовка к собесам

### ML Theory Round

| Вопрос | Готовность |
|--------|-----------|
| Выведите backprop для простой сети | ✅ |
| Связь MLE и cross-entropy | ✅ |
| Почему CE, а не MSE для классификации | ✅ |
| Softmax и его градиент (якобиан) | ✅ |
| L2-регуляризация как байесовский prior | ✅ |
| Что такое gradient descent | ✅ |
| Связь SVD и PCA | ✅ |
| Аксиомы Колмогорова | ✅ |
| Что такое bootstrap | ✅ |
| Почему n−1, а не n (несмещённость) | ✅ |
| Bias-variance tradeoff (концепт) | ⚠️ (формальный вывод ❌) |
| Как работает Decision Tree / Gini | ⚠️ обзорно |
| Random Forest — устройство | ⚠️ обзорно |
| Gradient Boosting — принцип | ⚠️ обзорно |
| XGB vs LGBM vs CatBoost | ⚠️ обзорно |
| Cross-entropy и KL-дивергенция | ⚠️ обзорно |
| Bias-variance — формальный вывод | ❌ |
| Почему Adam лучше SGD | ❌ |
| Как устроен A/B-тест | ❌ |
| Precision vs Recall — когда что | ❌ |
| K-Means — алгоритм | ❌ |

### Coding Round (LeetCode)

| Категория | Решено / Цель |
|-----------|---------------|
| Arrays / Strings | 0 / 15 |
| Hash Maps | 0 / 10 |
| Trees / Graphs | 0 / 10 |
| Dynamic Programming | 0 / 10 |
| Binary Search | 0 / 5 |
| Stack / Queue / Heap | 0 / 5 |
| **Итого** | **0 / 55** |

### SQL Round

| Статус | Детали |
|--------|--------|
| DataLemur задачи | 0 / 20 |

### System Design Round

| Тема | Статус |
|------|--------|
| Все темы | ❌ |

---

## Сильные стороны

1. **Реализация с нуля** — не заучиваю формулы, а разбираю код строчка за строчкой. Softmax Regression на MNIST = матмул + softmax + CE + MLE + chain rule + backprop + SGD через одну модель.

2. **Глубокий математический фундамент** — аксиоматика Колмогорова, σ-алгебра, полный вывод MLE → CE, якобиан softmax, MAP → регуляризация.

3. **Linux / инфра бэкграунд** — Arch + Hyprland, bash, файловая система, ядро, Wayland. Git + Docker через реальный проект.

4. **VFX бэкграунд (Houdini)** — интуиция для симуляций, частиц, итеративных процессов → переносится на gradient descent и оптимизацию.

---

## Ближайшие приоритеты

1. K-Means, DBSCAN — закрыть кластеризацию
2. Метрики (Precision, Recall, F1, AUC-ROC, RMSE, MAE, R²)
3. Pandas, Matplotlib — начать работать с данными
4. scikit-learn — закрепить Classical ML на практике
5. Adam optimizer — разобрать формулы
6. A/B-тестирование
7. SQL — начать с базового, потом window functions

---

*Следующее обновление: после закрытия Фазы 2 (Classical ML).*
