# Roadmap: NLP / LLM / Transformer ML Engineer

> Составлен на основе анализа **548 вакансий** и **8 771 резюме** с hh.ru (февраль 2026).
> Каждый навык привязан к реальному % упоминания в вакансиях.

---

## Как читать этот роадмап

```
[76.5%] — процент вакансий, где навык упоминается (из 548)
[key_skills: 185] — сколько раз навык встречается в поле key_skills вакансий
Приоритет: КРИТИЧЕСКИЙ > ВЫСОКИЙ > СРЕДНИЙ > НИЗКИЙ
```

**Целевой профиль:** Middle NLP/LLM ML Engineer
**Целевая зарплата:** 200-400K RUR (Middle), 350-600K (Senior)
**Ниша:** NLP/LLM/Transformers — 42.7% всех ML-вакансий, самый горячий тренд на рынке

---

## Фаза 0: Фундамент программирования

### 0.1 Python — продвинутый уровень
**Приоритет: КРИТИЧЕСКИЙ** `[76.5% вакансий]` `[key_skills: 185]`

Python — абсолютный стандарт. Без продвинутого Python вход невозможен.

#### Базовый Python (если ещё не уверен)
- [ ] Типы данных: `list`, `dict`, `set`, `tuple`, `frozenset`
- [ ] Comprehensions: list, dict, set, nested
- [ ] Функции: `*args`, `**kwargs`, lambda, closures
- [ ] ООП: классы, наследование, `__dunder__` методы, `@property`
- [ ] Итераторы и генераторы (`yield`, `yield from`)
- [ ] Контекстные менеджеры (`with`, `__enter__`/`__exit__`)
- [ ] Обработка исключений: кастомные exceptions, exception chaining
- [ ] Работа с файлами: текст, JSON, CSV, binary

#### Продвинутый Python (то, что спрашивают на собесах)
- [ ] **`typing`** — `Optional`, `Union`, `TypeVar`, `Generic`, `Protocol`, `TypeAlias`
- [ ] **`dataclasses`** — `@dataclass`, `field()`, `__post_init__`, frozen
- [ ] **`asyncio`** — `async/await`, `asyncio.gather`, `asyncio.Queue`, event loop
- [ ] **Декораторы** — написание своих, декораторы с аргументами, стек декораторов
- [ ] **Метаклассы** — `type()`, `__new__` vs `__init__`, ABCMeta
- [ ] **`collections`** — `defaultdict`, `Counter`, `deque`, `OrderedDict`, `namedtuple`
- [ ] **`functools`** — `lru_cache`, `partial`, `reduce`, `wraps`
- [ ] **`itertools`** — `chain`, `product`, `combinations`, `groupby`, `islice`
- [ ] **`pathlib`** — `Path`, `.glob()`, `.read_text()`, `/` operator
- [ ] **`logging`** — уровни, форматирование, handlers, loggers hierarchy
- [ ] **GIL** — что это, когда мешает, `multiprocessing` vs `threading` vs `asyncio`
- [ ] **Memory management** — reference counting, garbage collector, `__slots__`, weak refs
- [ ] **Pydantic v2** — `BaseModel`, validators, serialization, настройка model_config
- [ ] **Testing** — `pytest`, fixtures, parametrize, mocking, conftest

#### Ресурсы
- [Fluent Python, 2nd Ed. (Luciano Ramalho)](https://www.oreilly.com/library/view/fluent-python-2nd/9781492056348/) — лучшая книга
- [Python docs — typing](https://docs.python.org/3/library/typing.html)
- [Real Python — Advanced](https://realpython.com/tutorials/advanced/)

---

### 0.2 SQL
**Приоритет: КРИТИЧЕСКИЙ** `[41.4% вакансий]` `[key_skills: 61]`

SQL — второй обязательный навык. Нельзя игнорировать даже ML-инженерам.

#### Базовый SQL
- [ ] `SELECT`, `WHERE`, `GROUP BY`, `HAVING`, `ORDER BY`, `LIMIT`
- [ ] `JOIN` — `INNER`, `LEFT`, `RIGHT`, `FULL OUTER`, `CROSS`, `SELF`
- [ ] Агрегатные функции: `COUNT`, `SUM`, `AVG`, `MIN`, `MAX`
- [ ] `CASE WHEN` выражения
- [ ] Подзапросы: коррелированные и некоррелированные
- [ ] `UNION`, `INTERSECT`, `EXCEPT`
- [ ] `NULL` — `COALESCE`, `NULLIF`, `IS NULL`

#### Window Functions (главный фокус на собесах)
- [ ] `ROW_NUMBER()` — дедупликация, пагинация
- [ ] `RANK()` / `DENSE_RANK()` — ранжирование с учётом ties
- [ ] `NTILE(n)` — разбивка на бакеты (перцентили)
- [ ] `LAG(col, n)` / `LEAD(col, n)` — доступ к предыдущей/следующей строке
- [ ] `SUM() OVER(...)` — нарастающие итоги
- [ ] `AVG() OVER(ROWS N PRECEDING)` — скользящее среднее
- [ ] `FIRST_VALUE()` / `LAST_VALUE()` — первое/последнее в окне
- [ ] `PARTITION BY` + `ORDER BY` — комбинирование

#### CTE (Common Table Expressions)
- [ ] Одиночный CTE для читаемости
- [ ] Цепочки CTE (multi-step calculations)
- [ ] Рекурсивные CTE (иерархии, графы)
- [ ] CTE vs подзапросы — когда что

#### ML-специфичный SQL
- [ ] Feature engineering: агрегации по временным окнам
- [ ] Когортный анализ (retention, churn)
- [ ] A/B тест: метрики по вариантам, статзначимость
- [ ] Воронка конверсий (funnel analysis)
- [ ] Сессионизация (группировка событий)
- [ ] Семплирование (random, stratified)

#### Продвинутый SQL
- [ ] `EXPLAIN` / `EXPLAIN ANALYZE` — чтение планов запросов
- [ ] Индексы: B-tree, Hash, GIN, GiST, когда создавать
- [ ] Оптимизация: избегание full table scan, index-only scan
- [ ] `DATE_TRUNC`, `EXTRACT`, интервальная арифметика
- [ ] `LIKE`, `REGEXP`, `CONCAT`, `SUBSTRING`
- [ ] Pivot через `CASE WHEN`

#### PostgreSQL специфика `[key_skills: 43]`
- [ ] `JSONB` — операторы `->`, `->>`, `@>`, `?`
- [ ] `pgvector` — хранение и поиск эмбеддингов
- [ ] Партицирование таблиц
- [ ] Материализованные представления

#### Ресурсы
- [DataLemur](https://datalemur.com/) — задачи с реальных собесов (лучший ресурс)
- [LeetCode SQL](https://leetcode.com/problemset/database/) — классика
- [StrataScratch](https://www.stratascratch.com/) — вопросы из FAANG
- [Mode Analytics SQL Tutorial](https://mode.com/sql-tutorial/)

---

### 0.3 Алгоритмы и структуры данных
**Приоритет: ВЫСОКИЙ** (на собесах MLE — LeetCode Medium, Hard редко)

#### Must-know структуры данных
- [ ] **Массивы / строки** — sliding window, two pointers, prefix sums
- [ ] **Hash Map / Set** — O(1) lookup, частотный подсчёт, two sum
- [ ] **Стек / очередь** — monotonic stack, BFS с очередью, валидные скобки
- [ ] **Деревья** — binary tree, BST, DFS (inorder/preorder/postorder), BFS (level order)
- [ ] **Trie (префиксное дерево)** — автодополнение, поиск по префиксу
- [ ] **Графы** — adjacency list, BFS, DFS, connected components
- [ ] **Heap (приоритетная очередь)** — top-k задачи, merge k sorted
- [ ] **Linked List** — reverse, cycle detection, merge

#### Must-know алгоритмы
- [ ] **Binary Search** — по отсортированному массиву И по пространству ответов
- [ ] **BFS / DFS** — обход графов, shortest path, topological sort
- [ ] **Dynamic Programming** — 1D/2D DP, knapsack, LCS, LIS
- [ ] **Сортировки** — merge sort, quick sort, counting sort (знать сложности)
- [ ] **Sliding Window** — фиксированное и переменное окно
- [ ] **Two Pointers** — задачи на отсортированные массивы
- [ ] **Greedy** — interval scheduling, activity selection
- [ ] **Union-Find** — connected components

#### ML-специфичные алгоритмы (кодить с нуля)
- [ ] Gradient descent (SGD, mini-batch)
- [ ] K-means clustering
- [ ] K-nearest neighbors
- [ ] Линейная регрессия (closed form + gradient)
- [ ] Логистическая регрессия
- [ ] Decision tree (ID3/CART)
- [ ] Beam search (для NLP sequence generation)
- [ ] Matrix multiplication, transpose
- [ ] Softmax, cross-entropy loss
- [ ] Forward/backward pass простой нейросети

#### План решения LeetCode
- [ ] Arrays/Strings: 15 задач Medium
- [ ] Hash Maps: 10 задач
- [ ] Trees/Graphs: 10 задач
- [ ] Dynamic Programming: 10 задач
- [ ] Binary Search: 5 задач
- [ ] Stack/Queue/Heap: 5 задач
**Итого: ~55 задач — достаточно для MLE собеса**

#### Ресурсы
- [NeetCode 150](https://neetcode.io/) — лучшая подборка с видеоразборами
- [LeetCode Patterns](https://seanprashad.com/leetcode-patterns/) — задачи по паттернам
- [Grokking the Coding Interview](https://www.designgurus.io/course/grokking-the-coding-interview)

---

### 0.4 Git
**Приоритет: ВЫСОКИЙ** `[key_skills: 33]`

- [ ] `add`, `commit`, `push`, `pull`, `fetch`, `merge`, `rebase`
- [ ] Branching: feature branches, gitflow
- [ ] Merge conflicts: разрешение, стратегии
- [ ] `git log`, `git diff`, `git stash`, `git cherry-pick`
- [ ] `.gitignore` для ML проектов (данные, модели, checkpoints)
- [ ] Pull Requests, code review workflow
- [ ] Pre-commit hooks

### 0.5 Linux
**Приоритет: ВЫСОКИЙ** `[key_skills: 39]`

- [ ] Навигация: `cd`, `ls`, `pwd`, `find`, `grep`, `which`
- [ ] Процессы: `ps`, `top`, `htop`, `kill`, `nohup`, `screen`/`tmux`
- [ ] Файловая система: `chmod`, `chown`, `ln`, `df`, `du`
- [ ] Работа с текстом: `cat`, `head`, `tail`, `wc`, `sort`, `uniq`, `awk`, `sed`
- [ ] Сеть: `curl`, `wget`, `ssh`, `scp`, `rsync`
- [ ] Переменные окружения: `export`, `.bashrc`, `.env`
- [ ] Пакетные менеджеры: `apt`, `pip`, `conda`
- [ ] GPU: `nvidia-smi`, CUDA, мониторинг памяти

---

## Фаза 1: Математика для ML

**Приоритет: КРИТИЧЕСКИЙ** `[58.8% вакансий требуют математику]`

### 1.1 Линейная алгебра (наивысший приоритет)

| Тема | Зачем в ML |
|------|-----------|
| Векторы, скалярное произведение | Attention = dot product |
| Матрицы, умножение матриц | Нейросети = умножения матриц |
| Косинусное сходство | Поиск эмбеддингов, семантический поиск |
| Собственные значения/векторы | PCA, спектральный анализ |
| **SVD (сингулярное разложение)** | **LoRA = low-rank matrix factorization** |
| Ранг матрицы, линейная независимость | Понимание ёмкости модели |
| Нормы (L1, L2, Frobenius) | Регуляризация, метрики расстояния |
| Ортогональность, проекции | Gram-Schmidt, QR-разложение |

- [ ] Операции с векторами и матрицами
- [ ] Dot product, cosine similarity — понимание и реализация
- [ ] Transpose, inverse, determinant
- [ ] Eigenvalues & eigenvectors — вычисление, интерпретация
- [ ] SVD — разложение, связь с PCA, связь с LoRA
- [ ] Нормы: L1, L2, Frobenius — формулы, применение в регуляризации

### 1.2 Теория вероятностей и статистика

| Тема | Зачем в ML |
|------|-----------|
| Теорема Байеса | Naive Bayes, байесовский вывод |
| Условная/совместная вероятность | Фундамент вероятностных моделей |
| Распределения (Normal, Bernoulli, Poisson) | Предположения моделей |
| Мат.ожидание, дисперсия, ковариация | Анализ фич, поведение модели |
| MLE (Maximum Likelihood Estimation) | Целевая функция обучения |
| MAP (Maximum A Posteriori) | Регуляризированная оценка |
| Гипотезы (t-test, chi-squared, p-value) | A/B тестирование |
| ЦПТ (Central Limit Theorem) | Семплирование, доверительные интервалы |
| **Энтропия, KL-дивергенция, cross-entropy** | **Loss-функции, оценка моделей** |

- [ ] Формула Байеса — вывод, примеры
- [ ] Основные распределения — Normal, Bernoulli, Binomial, Poisson, Exponential
- [ ] MLE — вывод для Normal, Bernoulli
- [ ] Hypothesis testing — t-test, p-value, confidence intervals
- [ ] Information theory — entropy, KL divergence, cross-entropy
- [ ] Связь cross-entropy loss и MLE

### 1.3 Мат. анализ и оптимизация

| Тема | Зачем в ML |
|------|-----------|
| Частные производные, градиент | Backpropagation |
| **Chain rule** | **Ядро backprop** |
| Gradient descent (SGD, Adam, AdamW) | Обучение нейросетей |
| Learning rate schedules | Cosine annealing, warmup |
| Convex vs non-convex оптимизация | Ландшафт потерь |

- [ ] Частные производные — вычисление
- [ ] Chain rule — вывод для композиции функций
- [ ] Gradient descent — реализация с нуля
- [ ] Adam optimizer — формулы, интуиция
- [ ] Backpropagation — вывод для 2-layer сети

### Типичные вопросы с собесов по математике
- [ ] Выведите backprop для простой сети
- [ ] Почему cross-entropy для классификации, а не MSE?
- [ ] Связь MLE и cross-entropy?
- [ ] Bias-variance tradeoff — математически
- [ ] Почему L2-регуляризация предотвращает overfitting?
- [ ] Связь SVD и PCA?
- [ ] Выведите softmax и его градиент

### Ресурсы
- [Mathematics for ML Specialization (Coursera / DeepLearning.AI)](https://www.coursera.org/specializations/mathematics-for-machine-learning-and-data-science) — бесплатно audit
- [3Blue1Brown — Essence of Linear Algebra](https://www.youtube.com/playlist?list=PLZHQObOWTQDPD3MizzM2xVFitgF8hE_ab) — визуализация
- [3Blue1Brown — Essence of Calculus](https://www.youtube.com/playlist?list=PLZHQObOWTQDMsr9K-rj53DwVRMYO3t5Yr)
- [StatQuest (Josh Starmer)](https://www.youtube.com/c/joshstarmer) — статистика с нуля

---

## Фаза 2: Классический ML

### 2.1 Теория ML

- [ ] Supervised vs Unsupervised vs Reinforcement Learning
- [ ] Bias-Variance Tradeoff
- [ ] Overfitting / Underfitting — диагностика, решения
- [ ] Cross-validation: k-fold, stratified, leave-one-out
- [ ] Метрики классификации: accuracy, precision, recall, F1, AUC-ROC, PR curve
- [ ] Метрики регрессии: MSE, RMSE, MAE, R²
- [ ] Feature engineering: encoding, scaling, imputation
- [ ] Feature selection: correlation, mutual information, importance

### 2.2 Алгоритмы (scikit-learn) `[15.3% вакансий]` `[key_skills: 14]`

**Supervised:**
- [ ] Linear Regression / Ridge / Lasso
- [ ] Logistic Regression
- [ ] Decision Trees (CART)
- [ ] Random Forest
- [ ] **Gradient Boosting** — XGBoost `[6.4%]`, LightGBM `[4.6%]`, **CatBoost** `[7.7%]`
- [ ] SVM (Support Vector Machines)
- [ ] KNN (K-Nearest Neighbors)

**Unsupervised:**
- [ ] K-Means clustering
- [ ] DBSCAN
- [ ] PCA (Principal Component Analysis)
- [ ] t-SNE, UMAP — визуализация

**Ensemble methods:**
- [ ] Bagging vs Boosting — разница
- [ ] Stacking
- [ ] Blending

> **CatBoost — российская специфика** (7.7% вакансий). На западных рынках встречается реже. Обязательно для собесов в СБЕР, Яндекс, Ozon.

### 2.3 Data Science библиотеки

- [ ] **NumPy** `[key_skills: 26]` — array operations, broadcasting, vectorization
- [ ] **Pandas** `[key_skills: 31]` — DataFrame, groupby, merge, pivot, time series
- [ ] **Matplotlib / Seaborn** — визуализация, EDA
- [ ] **SciPy** — статистические тесты, оптимизация

### Ресурсы
- [CS229: Machine Learning (Stanford)](https://cs229.stanford.edu/) — теория
- [scikit-learn User Guide](https://scikit-learn.org/stable/user_guide.html) — лучшая документация
- [Hands-On ML with Scikit-Learn (Aurélien Géron)](https://www.oreilly.com/library/view/hands-on-machine-learning/9781098125967/) — книга

---

## Фаза 3: Deep Learning

### 3.1 Основы нейросетей

- [ ] Perceptron, multi-layer perceptron
- [ ] Activation functions: ReLU, Sigmoid, Tanh, GELU, SiLU/Swish
- [ ] Loss functions: MSE, Cross-Entropy, Binary Cross-Entropy
- [ ] Backpropagation — полный вывод, реализация
- [ ] Optimizers: SGD, Momentum, Adam, AdamW
- [ ] Learning rate schedules: step, cosine annealing, warmup + cosine
- [ ] Regularization: L1, L2, Dropout, Batch Normalization, Layer Normalization
- [ ] Weight initialization: Xavier, He, Kaiming

### 3.2 PyTorch `[29.0% вакансий]` `[key_skills: 51]`

PyTorch победил TensorFlow в соотношении 1.9:1 (29% vs 15%). Учи PyTorch первым.

- [ ] **Tensors** — создание, операции, GPU перенос, broadcasting
- [ ] **Autograd** — `requires_grad`, `.backward()`, computation graph
- [ ] **`nn.Module`** — создание кастомных слоёв и моделей
- [ ] **`nn.Linear`, `nn.Conv2d`, `nn.LSTM`, `nn.Transformer`**
- [ ] **Loss functions** — `nn.CrossEntropyLoss`, `nn.MSELoss`, `nn.BCEWithLogitsLoss`
- [ ] **Optimizers** — `torch.optim.Adam`, `AdamW`, learning rate schedulers
- [ ] **`DataLoader`** — `Dataset`, `DataLoader`, batch collation, `num_workers`
- [ ] **Training loop** — forward, loss, backward, step, zero_grad
- [ ] **Saving/Loading** — `state_dict`, checkpointing
- [ ] **Mixed precision** — `torch.cuda.amp`, `autocast`, `GradScaler`
- [ ] **Distributed training** — `DataParallel`, `DistributedDataParallel`
- [ ] **`torch.compile`** — оптимизация графа (PyTorch 2.x)
- [ ] **Debugging** — gradient checking, `torch.no_grad()`, memory profiling

### 3.3 CNN (для общего понимания)
- [ ] Свёртки, пулинг, stride, padding
- [ ] Архитектуры: ResNet, VGG (концептуально)
- [ ] Transfer learning

### 3.4 RNN / LSTM / GRU (для понимания истории NLP)
- [ ] Vanilla RNN, проблема vanishing gradients
- [ ] LSTM — gates, cell state
- [ ] GRU — упрощённая версия
- [ ] Bidirectional RNN
- [ ] Seq2Seq with Attention (предшественник Transformer)

### Ресурсы
- [Andrej Karpathy — Neural Networks: Zero to Hero](https://www.youtube.com/@AndrejKarpathy) — лучший курс
- [fast.ai — Practical Deep Learning](https://course.fast.ai/)
- [d2l.ai — Dive into Deep Learning](https://d2l.ai/) — интерактивный учебник
- [PyTorch Official Tutorials](https://pytorch.org/tutorials/)

---

## Фаза 4: Transformers и NLP

**Приоритет: КРИТИЧЕСКИЙ** `[NLP/LLM/Transformers: 42.7% вакансий]`

### 4.1 Фундамент NLP

- [ ] Tokenization — BPE, WordPiece, SentencePiece, Unigram
- [ ] Word Embeddings — Word2Vec (Skip-gram, CBOW), GloVe
- [ ] Contextual Embeddings — почему статические embeddings недостаточны
- [ ] Text preprocessing — лемматизация, стемминг, стоп-слова, n-граммы
- [ ] TF-IDF, Bag of Words
- [ ] Language modeling — perplexity

### 4.2 Архитектура Transformer (ядро знаний)

**Обязательно понимать на уровне реализации:**

- [ ] **Self-Attention** — scaled dot-product attention, Q/K/V матрицы
- [ ] **Multi-Head Attention** — параллельные heads, конкатенация
- [ ] **Positional Encoding** — синусоидальные, RoPE, ALiBi
- [ ] **Feed-Forward Network** — positionwise FFN
- [ ] **Residual Connections + Layer Normalization** — Pre-LN vs Post-LN
- [ ] **Causal Masking** — для авторегрессивной генерации
- [ ] **Cross-Attention** — encoder-decoder interaction
- [ ] **Softmax и temperature** — влияние на распределение

#### Архитектурные варианты

| Тип | Внимание | Модели | Задачи |
|-----|----------|--------|--------|
| Encoder-only | Bidirectional | BERT, RoBERTa, DeBERTa | Классификация, NER, extraction |
| **Decoder-only** | **Causal (left-to-right)** | **GPT, LLaMA, Mistral, Qwen** | **Генерация, чат, reasoning** |
| Encoder-Decoder | Cross-attention | T5, BART, mBART | Перевод, суммаризация |

> В 2026 decoder-only доминирует. LLaMA, Mistral, Qwen — основные open-source модели.

#### Продвинутые архитектурные концепции (2026)
- [ ] **Grouped-Query Attention (GQA)** — LLaMA 2/3, Mistral
- [ ] **Flash Attention** — memory-efficient exact attention
- [ ] **Mixture of Experts (MoE)** — Mixtral, sparse activation
- [ ] **KV-Cache** — оптимизация инференса
- [ ] **Speculative Decoding** — ускорение генерации
- [ ] **State Space Models (Mamba)** — потенциальная альтернатива Transformer
- [ ] **Ring Attention** — для очень длинного контекста

### 4.3 Ключевые модели (знать архитектуру и отличия)

- [ ] **BERT** (2018) — bidirectional, MLM + NSP, fine-tuning для downstream
- [ ] **GPT-2/3** (2019-2020) — autoregressive, few-shot, emergent abilities
- [ ] **T5** (2019) — text-to-text framework, encoder-decoder
- [ ] **LLaMA 1/2/3** (2023-2024) — open-source foundation, RoPE, GQA
- [ ] **Mistral / Mixtral** (2023-2024) — efficient, MoE
- [ ] **Qwen 2.5** (2024) — multilingual, strong on benchmarks

### 4.4 Hugging Face Ecosystem `[10.4% вакансий]` `[key_skills: ~57]`

- [ ] **`transformers`** — `AutoModel`, `AutoTokenizer`, `pipeline()`, `Trainer`
- [ ] **`datasets`** — загрузка, фильтрация, map/filter, streaming
- [ ] **`tokenizers`** — быстрая токенизация
- [ ] **`accelerate`** — distributed training, mixed precision
- [ ] **`evaluate`** — стандартные метрики
- [ ] **Hugging Face Hub** — загрузка/публикация моделей, Model Cards
- [ ] **Spaces** — деплой демо (Gradio, Streamlit)

### 4.5 Классические NLP задачи `[NLP key_skills: 28]`

- [ ] Text Classification (sentiment, topic)
- [ ] Named Entity Recognition (NER)
- [ ] Question Answering (extractive, generative)
- [ ] Text Summarization (extractive, abstractive)
- [ ] Machine Translation
- [ ] Text Generation
- [ ] Semantic Similarity / Sentence Embeddings

### Обязательные статьи
1. "Attention Is All You Need" (Vaswani et al., 2017)
2. "BERT" (Devlin et al., 2018)
3. "Language Models are Few-Shot Learners" (GPT-3, Brown et al., 2020)
4. "LLaMA" (Touvron et al., 2023)
5. "FlashAttention" (Dao et al., 2022)

### Ресурсы
- [Hugging Face NLP/LLM Course](https://huggingface.co/learn/llm-course/chapter1/1) — лучший практический курс
- [CS224N: NLP with Deep Learning (Stanford)](https://web.stanford.edu/class/cs224n/) — теория
- [The Illustrated Transformer (Jay Alammar)](https://jalammar.github.io/illustrated-transformer/) — визуализация
- [Karpathy — Let's build GPT from scratch](https://www.youtube.com/watch?v=kCc8FmEb1nY) — must watch

---

## Фаза 5: LLM Engineering

**Приоритет: КРИТИЧЕСКИЙ** `[LLM key_skills: 35]` `[RAG key_skills: 10]` `[LangChain key_skills: 8]`

### 5.1 Fine-tuning LLM

#### Методы PEFT (Parameter-Efficient Fine-Tuning)

| Метод | Память | Скорость | Качество | Когда использовать |
|-------|--------|----------|----------|--------------------|
| Full Fine-Tuning | Огромная | Медленно | Максимум | Неограниченный бюджет |
| **LoRA** | Средняя | Быстро | Отлично | Стандартный production |
| **QLoRA** | Низкая | Быстро | Хорошо | Single-GPU, прототипы |
| DoRA | Средняя | Быстро | Отлично+ | Emerging, weight decomposition |
| Prefix Tuning | Низкая | Быстро | Хорошо | Простые адаптации |

#### LoRA — гиперпараметры
- **Rank (r):** начать с 8-16, масштабировать до 64-128
- **Alpha:** `alpha = 2 * rank` (хороший default)
- **Target modules:** `q_proj, v_proj` минимум; `+ k_proj, o_proj, gate_proj` для больше выразительности
- **Learning rate:** ~1e-4 для LoRA, ~1e-5 для QLoRA

#### Практический workflow
```
1. Выбрать base model (LLaMA 3, Mistral, Qwen 2.5)
2. Подготовить dataset (instruction format: system/user/assistant)
3. Настроить QLoRA (rank=64, alpha=128, target=all linear)
4. Обучить: HF Trainer / TRL / Axolotl / Unsloth
5. Evaluate на held-out + domain benchmarks
6. Merge адаптеры в base model
7. Квантизировать (GGUF/AWQ/GPTQ) для serving
```

- [ ] Fine-tuning с LoRA/QLoRA — hands-on
- [ ] SFT (Supervised Fine-Tuning) с `trl.SFTTrainer`
- [ ] DPO (Direct Preference Optimization) — альтернатива RLHF
- [ ] RLHF — концептуально (PPO + reward model)
- [ ] Catastrophic forgetting — диагностика и предотвращение
- [ ] Dataset curation — quality > quantity

#### Библиотеки fine-tuning
- [ ] `peft` — LoRA/QLoRA adapter management
- [ ] `trl` — SFT, DPO, RLHF trainers
- [ ] `bitsandbytes` — 4-bit/8-bit quantization
- [ ] `unsloth` — 2x ускорение LoRA training
- [ ] `axolotl` — simplified fine-tuning config

### 5.2 RAG (Retrieval-Augmented Generation)

#### Базовый RAG pipeline
```
Document → Chunk → Embed → Vector Store
Query → Embed → Retrieve Top-K → Prompt + Context → LLM → Answer
```

- [ ] Chunking стратегии: fixed-size, recursive, semantic
- [ ] Embedding models: `sentence-transformers`, OpenAI, Cohere
- [ ] Vector databases: **Qdrant**, **Chroma**, pgvector, Pinecone, Weaviate, Milvus
- [ ] Retrieval: dense (vector), sparse (BM25), **hybrid**
- [ ] Re-ranking: cross-encoder models

#### Продвинутые RAG паттерны (2026)
- [ ] **Hybrid Search** — dense + sparse (BM25)
- [ ] **Re-ranking** — cross-encoder re-scoring
- [ ] **Query Transformation** — HyDE, multi-query, step-back prompting
- [ ] **Hierarchical Retrieval** — summary index → detailed chunks
- [ ] **Parent-Child Chunking** — маленькие chunks для matching, parent для контекста
- [ ] **Agentic RAG** — LLM как reasoning engine: планирует, ищет итеративно, верифицирует
- [ ] **Graph RAG** — knowledge graphs для захвата связей сущностей
- [ ] **Corrective RAG (CRAG)** — self-evaluation + re-retrieval
- [ ] **Self-RAG** — модель решает когда искать
- [ ] **Multi-modal RAG** — текст + изображения + таблицы

#### Фреймворки
- [ ] **LlamaIndex** — ingestion, indexing, retrieval (лучший для document apps)
- [ ] **LangChain** — orchestration, chaining, agents (largest community)
- [ ] **LangGraph** — stateful agent graphs, complex workflows
- [ ] **DSPy** — programmatic optimization без ручных промптов

### 5.3 Prompt Engineering

- [ ] Zero-shot, Few-shot, Chain-of-Thought (CoT)
- [ ] System prompts, role prompts
- [ ] Structured output (JSON mode, function calling)
- [ ] **Instructor / Pydantic AI** — type-safe extraction
- [ ] Temperature, top-p, top-k — влияние на генерацию
- [ ] Prompt injection — атаки и защита

### 5.4 LLM Evaluation

#### Бенчмарки
| Бенчмарк | Что тестирует |
|----------|--------------|
| MMLU | 57 предметов, знания |
| HumanEval / MBPP | Генерация кода |
| MATH / GSM8K | Математический reasoning |
| TruthfulQA | Фактологическая точность |
| MT-Bench | Многоходовый диалог |

#### RAG метрики (RAGAS)
- [ ] **Faithfulness** — ответ соответствует контексту?
- [ ] **Answer Relevancy** — ответ релевантен вопросу?
- [ ] **Context Precision** — найденные документы релевантны?
- [ ] **Context Recall** — все нужные документы найдены?
- [ ] **Hallucination Rate** — модель выдумывает?

#### Инструменты
- [ ] `ragas` — RAG evaluation
- [ ] `deepeval` — CI/CD LLM testing
- [ ] `langfuse` — tracing и observability
- [ ] `mlflow` — experiment tracking
- [ ] `wandb` — experiment tracking

### 5.5 LLM Serving & Inference

- [ ] **vLLM** — high-throughput serving, PagedAttention
- [ ] **TGI (Text Generation Inference)** — Hugging Face serving
- [ ] **Ollama** — локальный запуск моделей
- [ ] Quantization: GGUF, AWQ, GPTQ — трейдоффы
- [ ] Batching strategies: continuous batching
- [ ] KV-cache management
- [ ] Streaming responses

### Ресурсы
- [Hugging Face LLM Course — Fine-tuning](https://huggingface.co/learn/llm-course/)
- [LLM University (Cohere)](https://cohere.com/llmu)
- [DeepLearning.AI Short Courses](https://www.deeplearning.ai/short-courses/) — RAG, LangChain, Fine-tuning
- [LangChain docs](https://python.langchain.com/docs/)
- [LlamaIndex docs](https://docs.llamaindex.ai/)

---

## Фаза 6: MLOps и Production

### 6.1 Docker `[~42% вакансий]` `[key_skills: 63]`

- [ ] Dockerfile: `FROM`, `RUN`, `COPY`, `CMD`, `ENTRYPOINT`
- [ ] Multi-stage builds (для ML: отделить train от serve)
- [ ] Docker Compose: multi-container apps
- [ ] Volumes: persistent storage для моделей и данных
- [ ] Networking: bridge, host, container linking
- [ ] GPU support: `nvidia-docker`, `--gpus all`
- [ ] Оптимизация размера образа
- [ ] `.dockerignore`

### 6.2 Kubernetes `[~27% вакансий]` `[key_skills: 34]`

- [ ] Pods, Deployments, Services
- [ ] ConfigMaps, Secrets
- [ ] Horizontal Pod Autoscaler
- [ ] GPU scheduling
- [ ] Helm charts
- [ ] kubectl basics

### 6.3 CI/CD `[key_skills: 22]`

- [ ] GitHub Actions / GitLab CI
- [ ] Автоматические тесты при PR
- [ ] Model validation pipeline
- [ ] Automated deployment

### 6.4 Orchestration

- [ ] **Apache Airflow** `[key_skills: 26]` — DAGs, operators, scheduling
- [ ] **MLflow** `[key_skills: 21]` — experiment tracking, model registry, serving
- [ ] **Apache Kafka** `[key_skills: 13]` — streaming, event-driven ML

### 6.5 API Development

- [ ] **FastAPI** `[key_skills: 15]` — routes, Pydantic models, async, middleware
- [ ] OpenAPI / Swagger documentation
- [ ] Authentication, rate limiting
- [ ] Health checks, monitoring endpoints
- [ ] Async request handling для LLM inference

### 6.6 Big Data (опционально) `[key_skills: 17]`

- [ ] **PySpark** `[key_skills: 9]` — DataFrame API, transformations
- [ ] Spark ML — pipeline, feature engineering at scale
- [ ] Hadoop ecosystem — HDFS, Hive (концептуально)

### Ресурсы
- [Docker Official Getting Started](https://docs.docker.com/get-started/)
- [FastAPI Tutorial](https://fastapi.tiangolo.com/tutorial/)
- [MLflow docs](https://mlflow.org/docs/latest/)
- [Made With ML — MLOps](https://madewithml.com/)

---

## Фаза 7: Портфолио и проекты

### Проект 1: Классический ML (показать фундамент)
- [ ] Табличные данные, EDA, feature engineering
- [ ] CatBoost/XGBoost, hyperparameter tuning
- [ ] MLflow для tracking экспериментов
- [ ] Чистый код, README, reproducibility

### Проект 2: NLP Classification / NER
- [ ] Fine-tuning BERT/RoBERTa на кастомном датасете
- [ ] Training pipeline с PyTorch + HF Transformers
- [ ] Метрики: F1, classification report
- [ ] Деплой через FastAPI + Docker

### Проект 3: RAG-система (главный проект)
- [ ] End-to-end RAG pipeline
- [ ] Document ingestion + chunking + embedding
- [ ] Vector store (Qdrant или Chroma)
- [ ] Hybrid search (dense + BM25)
- [ ] Re-ranking
- [ ] Evaluation с RAGAS
- [ ] FastAPI endpoint + Streamlit/Gradio UI
- [ ] Docker Compose для всего стека

### Проект 4: LLM Fine-tuning
- [ ] QLoRA fine-tuning модели (LLaMA/Mistral)
- [ ] Dataset preparation (instruction format)
- [ ] Training с unsloth/axolotl
- [ ] Evaluation на domain-specific бенчмарке
- [ ] Quantization + vLLM serving

### Проект 5: LLM Agent (продвинутый)
- [ ] Multi-step reasoning agent
- [ ] Tool use (function calling)
- [ ] LangGraph state machine
- [ ] Memory management
- [ ] Evaluation pipeline

---

## Фаза 8: Подготовка к собесам

### ML Theory Round
- [ ] Bias-variance tradeoff
- [ ] Gradient descent виды и отличия
- [ ] Regularization (L1 vs L2 vs Dropout)
- [ ] Batch Normalization vs Layer Normalization
- [ ] Attention mechanism — математика
- [ ] LoRA — математика (low-rank decomposition)
- [ ] Cross-entropy loss — вывод
- [ ] Backpropagation — вывод

### ML System Design Round
- [ ] Рекомендательная система (RecSys)
- [ ] Search ranking
- [ ] Spam/fraud detection
- [ ] LLM-based chatbot architecture
- [ ] RAG system design
- [ ] Feature store design
- [ ] A/B testing pipeline
- [ ] ML pipeline architecture

### Coding Round (LeetCode Medium)
- [ ] 55 задач по категориям (см. Фазу 0.3)

### SQL Round
- [ ] 20 задач на DataLemur
- [ ] Window functions — отработать до автоматизма

### Behavioral Round
- [ ] STAR формат (Situation, Task, Action, Result)
- [ ] "Расскажите о сложном проекте"
- [ ] "Как вы справлялись с неопределённостью?"
- [ ] "Конфликт в команде — как решали?"

---

## Timeline: 26 недель (6 месяцев)

| Недели | Фаза | Фокус |
|--------|------|-------|
| **1-4** | Фаза 0 + 1 | Python advanced, SQL, основы математики |
| **5-8** | Фаза 2 | Classical ML, scikit-learn, CatBoost, LeetCode |
| **9-12** | Фаза 3 | Deep Learning, PyTorch, CNN/RNN основы |
| **13-16** | Фаза 4 | Transformers, NLP, Hugging Face, BERT/GPT |
| **17-20** | Фаза 5 | LLM fine-tuning, RAG, LangChain, agents |
| **21-23** | Фаза 6 | Docker, MLOps, FastAPI, деплой |
| **24-26** | Фаза 7 + 8 | Портфолио, подготовка к собесам, mock interviews |

---

## Целевые компании (без требования ВО, с удалёнкой)

> Из анализа 548 вакансий: 74.5% не требуют диплом явно.

**Первая волна** (проще пройти):
- Стартапы и аутсорс: ИЦ АЙ-ТЕКО, RedLab, Selecty, Bell Integrator

**Вторая волна** (продуктовые компании):
- Т-Банк, Ozon, HeadHunter, X5 Tech, VK, Cloud.ru

**Третья волна** (BigTech, после опыта):
- СБЕР (~60 ML-вакансий), Яндекс, МТС

---

## Зарплатные ориентиры (RUR)

| Этап | Зарплата | Когда |
|------|----------|-------|
| Стажировка / Junior | 80-180K | 0-6 мес опыта |
| Middle | 200-300K | 6-18 мес |
| Middle+ | 280-400K | 18-36 мес |
| Senior | 350-600K+ | 3+ года |
| Lead/Head | 500K-950K | 5+ лет |

---

*На основе: Vacancy Report (548 вакансий hh.ru) + Resume Report (8 771 резюме) + web research, февраль 2026*
