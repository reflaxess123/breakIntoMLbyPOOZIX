# NLP / LLM / ML Engineer Roadmap (2026)

Research compiled: 2026-02-10

---

## 1. Most Important Skills & Tools for NLP/LLM ML Engineers

### Core Technical Skills
- **Python** (advanced) -- the non-negotiable foundation
- **PyTorch** -- dominant framework for LLM/Transformer work (over TensorFlow)
- **Hugging Face Transformers** -- the standard library for working with pre-trained models
- **Model fine-tuning** -- LoRA, QLoRA, PEFT methods
- **Prompt engineering & evaluation** -- knowing when LLMs are the right/wrong solution
- **MLOps** -- model deployment, monitoring, CI/CD pipelines, containers
- **Cloud platforms** -- AWS (SageMaker), GCP (Vertex AI), Azure (Azure ML)

### Production & Deployment Skills
- Building and serving APIs (FastAPI)
- Containerization (Docker, Kubernetes)
- Model serving at scale (vLLM, Ray Serve, TGI)
- Model evaluation (precision, recall, F1, BLEU, ROUGE, perplexity)
- Cost optimization and latency management

### LLM-Specific Engineering Skills
- Retrieval-Augmented Generation (RAG) pipeline design
- Vector databases (Pinecone, Weaviate, Chroma, Qdrant, pgvector)
- Embedding models and semantic search
- Agent frameworks (LangChain, LlamaIndex, DSPy, CrewAI)
- Guardrails, safety, and alignment
- Structured output extraction (Instructor, Pydantic AI)

### Ethical AI & Safety
- Bias detection in language models
- Data anonymization
- Red-teaming and adversarial evaluation
- Responsible deployment practices

**Sources:**
- [Hiring an NLP Engineer in 2026 (HireInSouth)](https://www.hireinsouth.com/post/hiring-an-nlp-engineer-skills-to-look-for-and-average-salary)
- [Essential AI Engineer Skills 2026 (DataCamp)](https://www.datacamp.com/blog/essential-ai-engineer-skills)
- [Top LLM Engineering Frameworks 2026 (Ryz Labs)](https://learn.ryzlabs.com/ai-development/top-llm-engineering-frameworks-2026)
- [8 Key LLM Development Skills (Daily Dose of DS)](https://blog.dailydoseofds.com/p/8-key-llm-development-skills-for)

---

## 2. Key Topics for Transformer Architecture

### Foundational Concepts (Must-Know)
1. **Tokenization** -- BPE, WordPiece, SentencePiece; how text becomes tokens
2. **Word Embeddings** -- Word2Vec, GloVe, contextual embeddings
3. **Positional Encoding** -- sinusoidal encoding, rotary positional embeddings (RoPE), ALiBi
4. **Self-Attention Mechanism** -- scaled dot-product attention, Q/K/V matrices
5. **Multi-Head Attention** -- parallel attention heads capturing different relationship types
6. **Encoder-Decoder Architecture** -- original "Attention Is All You Need" design
7. **Feed-Forward Networks** -- positionwise FFN within each transformer block
8. **Residual Connections & Layer Normalization** -- stability during training
9. **Softmax & Masking** -- causal masking for autoregressive generation

### Architectural Variants
| Variant | Architecture | Key Models |
|---------|-------------|------------|
| Encoder-only | Bidirectional self-attention | BERT, RoBERTa, DeBERTa |
| Decoder-only | Causal (left-to-right) attention | GPT-2/3/4, LLaMA, Mistral |
| Encoder-Decoder | Cross-attention between encoder/decoder | T5, BART, mBART |

### Advanced / 2026 Topics
- **Grouped-Query Attention (GQA)** -- used in LLaMA 2/3, Mistral
- **Flash Attention** -- memory-efficient exact attention (Tri Dao)
- **Mixture of Experts (MoE)** -- Mixtral, Switch Transformer (sparse activation)
- **KV-Cache optimization** -- critical for inference efficiency
- **Speculative decoding** -- faster autoregressive generation
- **State Space Models (SSMs)** -- Mamba as a potential Transformer alternative
- **Ring Attention** -- for extremely long context windows
- **Post-Transformer architectures** -- active research area in 2026

### Key Papers to Read
1. "Attention Is All You Need" (Vaswani et al., 2017) -- the original
2. "BERT: Pre-training of Deep Bidirectional Transformers" (Devlin et al., 2018)
3. "Language Models are Few-Shot Learners" (GPT-3, Brown et al., 2020)
4. "LLaMA: Open and Efficient Foundation Language Models" (Touvron et al., 2023)
5. "FlashAttention: Fast and Memory-Efficient Exact Attention" (Dao et al., 2022)
6. "Mamba: Linear-Time Sequence Modeling" (Gu & Dao, 2023)

**Sources:**
- [Transformer Architecture Deep Dive 2026 (TheLinuxCode)](https://thelinuxcode.com/architecture-and-working-of-transformers-in-deep-learning-2026-deep-dive/)
- [Dive into Deep Learning - Transformer Architecture](https://d2l.ai/chapter_attention-mechanisms-and-transformers/transformer.html)
- [What Comes After Transformers (Boreal Times)](https://borealtimes.org/transformer-ai/)
- [How Transformer LLMs Work (DeepLearning.AI)](https://www.deeplearning.ai/short-courses/how-transformer-llms-work/)

---

## 3. LLM Fine-Tuning Best Practices (LoRA, QLoRA, PEFT)

### PEFT Overview
Parameter-Efficient Fine-Tuning (PEFT) trains only a tiny fraction of model parameters, dramatically reducing GPU memory and compute costs versus full fine-tuning.

### Technique Comparison

| Method | Memory | Speed | Quality | Use Case |
|--------|--------|-------|---------|----------|
| **Full Fine-Tuning** | Very High | Slow | Highest | Unlimited budget, maximum quality |
| **LoRA** | Medium | Fast | Very Good | Standard production fine-tuning |
| **QLoRA** | Low | Fast | Good | Single-GPU fine-tuning, prototyping |
| **DoRA** | Medium | Fast | Very Good+ | Weight-decomposed LoRA (emerging) |
| **Prefix Tuning** | Low | Fast | Good | Simple adaptations |
| **Adapter Layers** | Medium | Medium | Good | Modular task switching |

### LoRA (Low-Rank Adaptation) Best Practices
- Injects low-rank decomposition matrices into attention layers
- **Rank (r):** Start with 8-16, scale up to 64-128 for complex tasks
- **Alpha:** Set alpha = 2 * rank as a good default
- **Target modules:** Apply to q_proj, v_proj at minimum; add k_proj, o_proj, gate_proj for more expressiveness
- **Learning rate:** ~1e-4 to 2e-4 for LoRA (higher than full fine-tuning)
- Merged weights add zero additional inference latency

### QLoRA Best Practices
- Quantizes base model to 4-bit (NF4 quantization) while training LoRA adapters in fp16/bf16
- **Rank:** 64-128 is the production sweet spot in 2026
- **Learning rate:** ~1e-5 (lower than standard LoRA)
- **Epochs:** 3-5 for most tasks
- Enables fine-tuning 65B+ parameter models on a single 48GB GPU
- Use Hugging Face `Trainer` + `BitsAndBytes` as the standard stack

### Avoiding Catastrophic Forgetting
- Use replay buffers with samples from the original training distribution
- Careful dataset curation -- quality > quantity
- Monitor base capabilities alongside task-specific metrics
- Consider mixing general instruction data with domain-specific data

### Practical Workflow
```
1. Choose base model (LLaMA 3, Mistral, Qwen 2.5, etc.)
2. Prepare dataset (instruction format: system/user/assistant)
3. Configure QLoRA (rank=64, alpha=128, target_modules=all linear)
4. Train with Hugging Face Trainer / TRL / Axolotl
5. Evaluate with held-out test set + domain benchmarks
6. Merge adapters into base model for deployment
7. Quantize merged model (GGUF/AWQ/GPTQ) for serving
```

### Key Libraries
- `transformers` -- model loading and training
- `peft` -- LoRA/QLoRA adapter management
- `trl` -- RLHF, DPO, SFT trainers
- `bitsandbytes` -- quantization
- `axolotl` -- simplified fine-tuning configuration
- `unsloth` -- 2x faster LoRA training with lower memory

**Sources:**
- [Guide to Fine-Tuning with LoRA and QLoRA (Mercity)](https://www.mercity.ai/blog-post/guide-to-fine-tuning-llms-with-lora-and-qlora)
- [Efficient Fine-Tuning with LoRA (Databricks)](https://www.databricks.com/blog/efficient-fine-tuning-lora-guide-llms)
- [PEFT Methods (Hugging Face)](https://huggingface.co/blog/samuellimabraz/peft-methods)
- [LoRA Insights from Hundreds of Experiments (Lightning AI)](https://lightning.ai/pages/community/lora-insights/)
- [Comparing LoRA, QLoRA, DoRA, QDoRA (Encora)](https://www.encora.com/interface/comparing-fine-tuning-optimization-techniques-lora-qlora-dora-and-qdora)

---

## 4. RAG Frameworks & Patterns

### Major Frameworks (2026)

| Framework | Strength | Best For |
|-----------|----------|----------|
| **LangChain** | Orchestration, agent workflows, largest community | Prototyping, chaining, agents |
| **LlamaIndex** | Data ingestion, indexing, retrieval accuracy | Document-heavy apps, structured data |
| **LangGraph** | Stateful agent graphs, complex workflows | Multi-step agent pipelines |
| **Haystack** | Low latency (~5.9ms), regulated industries | Enterprise, compliance-heavy |
| **DSPy** | Programmatic optimization, no manual prompts | Research, automated prompt tuning |
| **Pathway** | Real-time streaming data | Live data RAG |

### Common Production Pattern
> Use **LlamaIndex** for ingestion/indexing + **LangChain/LangGraph** for orchestration. This is the most common hybrid approach in 2026.

### RAG Pattern Taxonomy

#### Basic RAG
1. Chunk documents
2. Embed chunks into vector store
3. At query time: embed query, retrieve top-k chunks, feed to LLM

#### Advanced RAG Patterns
- **Hybrid Search** -- combine dense (vector) + sparse (BM25) retrieval
- **Re-ranking** -- use cross-encoder models to re-score retrieved chunks
- **Query Transformation** -- HyDE, multi-query, step-back prompting
- **Hierarchical Retrieval** -- summary index -> detailed chunks
- **Sentence Window Retrieval** -- retrieve surrounding context of matched sentences
- **Parent-Child Chunking** -- small chunks for matching, return parent chunk for context

#### 2026 Advanced Patterns
- **Agentic RAG** -- LLM acts as reasoning engine: plans, retrieves iteratively, verifies claims before responding. "Not a pipeline but a loop." The 2026 baseline for serious applications.
- **Graph RAG** -- uses knowledge graphs to capture entity relationships, not just keyword matching. Critical for investigative, BI, and complex domain apps.
- **Corrective RAG (CRAG)** -- retrieves, generates, then self-evaluates; if answer is weak, drops low-quality sources and re-retrieves.
- **Self-RAG** -- model decides when to retrieve and when it already knows
- **Adaptive RAG** -- dynamically chooses retrieval strategy based on query complexity
- **Multi-modal RAG** -- retrieves across text, images, tables, code

### Vector Databases (2026)
| Database | Type | Notes |
|----------|------|-------|
| **Pinecone** | Managed | Easiest to start, serverless option |
| **Weaviate** | Open source | Hybrid search built-in |
| **Qdrant** | Open source | Rust-based, very fast |
| **Chroma** | Open source | Lightweight, great for prototyping |
| **pgvector** | PostgreSQL extension | If you already use Postgres |
| **Milvus** | Open source | Scales to billions of vectors |

**Sources:**
- [Production RAG 2026: LangChain vs LlamaIndex](https://rahulkolekar.com/production-rag-in-2026-langchain-vs-llamaindex/)
- [Top 5 RAG Frameworks for Enterprise 2026 (Second Talent)](https://www.secondtalent.com/resources/top-rag-frameworks-and-tools-for-enterprise-ai-applications/)
- [15 Best Open-Source RAG Frameworks 2026 (Firecrawl)](https://www.firecrawl.dev/blog/best-open-source-rag-frameworks)
- [14 Types of RAG (Meilisearch)](https://www.meilisearch.com/blog/rag-types)
- [Agentic RAG Enterprise Guide 2026 (Data Nucleus)](https://datanucleus.dev/rag-and-agentic-ai/agentic-rag-enterprise-guide-2026)
- [DSPy: Programming Language Models (Stanford)](https://dspy.ai/)
- [Ultimate RAG Blueprint 2025/2026 (LangWatch)](https://langwatch.ai/blog/the-ultimate-rag-blueprint-everything-you-need-to-know-about-rag-in-2025-2026)

---

## 5. LLM Evaluation Frameworks

### Standard Benchmarks

| Benchmark | What It Tests |
|-----------|---------------|
| **MMLU** | Multitask language understanding (57 subjects) |
| **GPQA-Diamond** | Graduate-level Q&A requiring domain expertise |
| **HellaSwag** | Commonsense reasoning / sentence completion |
| **TruthfulQA** | Factual accuracy, resistance to common misconceptions |
| **MT-Bench** | Multi-turn dialogue coherence |
| **HumanEval / MBPP** | Code generation |
| **MATH / GSM8K** | Mathematical reasoning |
| **ARC-Challenge** | Grade-school science reasoning |
| **GLUE / SuperGLUE** | General language understanding |
| **BigBench-Hard** | Challenging multi-step reasoning |

### Evaluation Frameworks & Tools

| Tool | Focus | Type |
|------|-------|------|
| **RAGAS** | RAG-specific evaluation (faithfulness, relevance, context) | Open source |
| **DeepEval** | Code-driven test automation, CI/CD integration | Open source |
| **Langfuse** | Developer-first tracing and observability | Open source |
| **OpenAI Evals** | Standard eval harness for OpenAI models | Open source |
| **lm-evaluation-harness** (EleutherAI) | Run standardized benchmarks on any model | Open source |
| **Arize AI** | Production monitoring, drift detection | Commercial |
| **Maxim** | End-to-end observability, simulation at scale | Commercial |
| **W&B Weave** | Experiment tracking + evaluation | Commercial |
| **MLflow** | Experiment tracking, model registry, evaluation | Open source |

### Evaluation Approaches for Production (2026)
- **Traceability** -- link every eval score to exact prompt version + model version + dataset version
- **LLM-as-Judge** -- use a strong LLM to evaluate outputs (correlates with human prefs but insufficient alone)
- **Human-in-the-Loop** -- required for high-stakes, nuanced evaluation
- **Continuous evaluation** -- monitor for drift, hallucination rates, latency degradation
- **Domain-specific metrics** -- beyond generic benchmarks, define task-specific rubrics

### Key Metrics for RAG Systems (via RAGAS)
- **Faithfulness** -- does the answer stick to the retrieved context?
- **Answer Relevancy** -- is the answer relevant to the question?
- **Context Precision** -- are the retrieved documents relevant?
- **Context Recall** -- were all necessary documents retrieved?
- **Hallucination Rate** -- does the model fabricate information?

**Sources:**
- [LLM Benchmarks 2026 (llm-stats.com)](https://llm-stats.com/benchmarks)
- [Top 5 LLM Evaluation Platforms 2026 (DEV)](https://dev.to/kuldeep_paul/top-5-llm-evaluation-platforms-for-2026-3g3b)
- [LLM Evaluation Landscape 2026 (AIMultiple)](https://research.aimultiple.com/llm-eval-tools/)
- [LLM Evaluation Metrics & Best Practices (Codecademy)](https://www.codecademy.com/article/llm-evaluation-metrics-benchmarks-best-practices)
- [30 LLM Evaluation Benchmarks (Evidently AI)](https://www.evidentlyai.com/llm-guide/llm-benchmarks)

---

## 6. Key Algorithms & Data Structures for ML Interviews

### Interview Format (FAANG MLE roles)
- DSA difficulty: **LeetCode Medium** (hard is rare for MLE vs SWE)
- Compensated with **ML theory, statistics, and ML system design** rounds
- Typical rounds: Coding (DSA) | ML System Design | ML Theory/Stats | Behavioral

### Must-Know Data Structures
1. **Arrays & Strings** -- sliding window, two pointers, prefix sums
2. **Hash Maps / Hash Sets** -- O(1) lookup, frequency counting
3. **Stacks & Queues** -- monotonic stack, BFS with queue
4. **Trees** -- binary trees, BST, trie (prefix trees)
5. **Graphs** -- adjacency list, BFS/DFS, topological sort
6. **Heaps (Priority Queues)** -- top-k problems, merge-k-sorted
7. **Linked Lists** -- reverse, cycle detection, merge

### Must-Know Algorithms
1. **Binary Search** -- on sorted arrays AND on answer space
2. **BFS / DFS** -- graph traversal, connected components, shortest path
3. **Dynamic Programming** -- 1D/2D DP, knapsack variants, LCS, LIS
4. **Sorting** -- merge sort, quick sort, counting sort
5. **Sliding Window** -- fixed and variable window
6. **Two Pointers** -- sorted array problems
7. **Greedy** -- interval scheduling, activity selection
8. **Topological Sort** -- DAG ordering, dependency resolution
9. **Union-Find** -- connected components

### ML-Specific Coding Topics
- Implementing gradient descent from scratch
- Implementing k-means, k-nearest neighbors
- Matrix operations (multiplication, transpose, inverse)
- Sampling algorithms (reservoir sampling, weighted sampling)
- Implementing a basic neural network forward/backward pass
- Loss function implementations (cross-entropy, MSE)
- Beam search (for NLP sequence generation)

### Recommended LeetCode Focus (Top 50 for MLE)
- Arrays/Strings: ~15 problems
- Trees/Graphs: ~10 problems
- Dynamic Programming: ~10 problems
- Binary Search: ~5 problems
- Stack/Queue/Heap: ~5 problems
- Design problems: ~5 problems

**Sources:**
- [MLE Interview Preparation (Andrew Lukyanenko / Medium)](https://artgor.medium.com/my-experience-of-interview-preparation-as-mle-fe53627ba33e)
- [2026 Meta MLE Interview Guide](https://programhelp.net/en/oa/meta-mle-oa-coding-system-design/)
- [Top 50 LeetCode for ML Interviews (Medium)](https://medium.com/@thedatabeast/top-50-leetcode-problems-for-data-scientist-and-machine-learning-interview-preparation-updated-dd889d9c31c7)
- [Crack the MLE Interview (GitHub)](https://github.com/lizichen/crack-the-mle-interview)

---

## 7. Essential Math Topics

### Linear Algebra (HIGH priority)

| Topic | Why It Matters |
|-------|---------------|
| Vectors, matrices, matrix multiplication | Foundation of neural networks (weights are matrices) |
| Dot product, cosine similarity | Attention mechanism, embedding similarity |
| Eigenvalues & eigenvectors | PCA, understanding model behavior |
| Singular Value Decomposition (SVD) | Dimensionality reduction, LoRA is literally low-rank matrix factorization |
| Matrix rank, span, linear independence | Understanding model capacity |
| Determinants | Matrix invertibility |
| Norms (L1, L2, Frobenius) | Regularization, distance metrics |
| Orthogonality & projections | Gram-Schmidt, QR decomposition |

### Probability & Statistics (HIGH priority)

| Topic | Why It Matters |
|-------|---------------|
| Bayes' theorem | Naive Bayes, Bayesian inference, posterior estimation |
| Joint, conditional, marginal probability | Foundation of probabilistic models |
| Common distributions (Normal, Bernoulli, Binomial, Poisson) | Modeling assumptions |
| Expectation, variance, covariance | Feature analysis, model behavior |
| Maximum Likelihood Estimation (MLE) | Parameter estimation, training objective |
| Maximum A Posteriori (MAP) | Regularized estimation |
| Hypothesis testing (t-test, chi-squared, p-values) | A/B testing, experiment design |
| Central Limit Theorem | Sampling, confidence intervals |
| Information theory (entropy, KL divergence, cross-entropy) | Loss functions, model evaluation |

### Calculus & Optimization (MEDIUM-HIGH priority)

| Topic | Why It Matters |
|-------|---------------|
| Partial derivatives, gradients | Backpropagation |
| Chain rule | Core of backprop algorithm |
| Gradient descent (SGD, Adam, AdamW) | Training neural networks |
| Learning rate schedules | Cosine annealing, warmup |
| Convex vs non-convex optimization | Understanding loss landscapes |
| Lagrange multipliers | Constrained optimization (SVM) |
| Taylor series approximation | Understanding approximations |

### Interview-Specific Math Questions (Common)
- Derive the backpropagation equations for a simple network
- Explain why cross-entropy loss is used for classification
- What is the relationship between MLE and cross-entropy?
- Explain the bias-variance tradeoff mathematically
- Why does L2 regularization prevent overfitting? (Ridge regression)
- Explain how SVD relates to PCA
- Derive the softmax function and its gradient

**Sources:**
- [Maths for Machine Learning (GeeksforGeeks)](https://www.geeksforgeeks.org/machine-learning/machine-learning-mathematics/)
- [Best Mathematics for ML Courses 2026 (Class Central)](https://www.classcentral.com/report/best-mathematics-for-machine-learning-courses/)
- [Mathematics for ML Specialization (DeepLearning.AI)](https://www.deeplearning.ai/courses/mathematics-for-machine-learning-and-data-science-specialization/)
- [ML Interview Questions Mathematics (GitHub)](https://github.com/Sroy20/machine-learning-interview-questions/blob/master/list_of_questions_mathematics.md)
- [How to Become an ML Engineer 2026 (InterviewQuery)](https://www.interviewquery.com/p/become-ml-engineer)

---

## 8. Best Free Resources & Courses

### Transformer / NLP / LLM Courses (FREE)

| Resource | Provider | What You Learn |
|----------|----------|---------------|
| [Hugging Face NLP Course](https://huggingface.co/learn/llm-course/chapter1/1) | Hugging Face | Transformers, fine-tuning, tokenization, full HF ecosystem |
| [CS224N: NLP with Deep Learning](https://web.stanford.edu/class/cs224n/) | Stanford | Word vectors, RNNs, Transformers, pre-training, NLP theory |
| [How Transformer LLMs Work](https://www.deeplearning.ai/short-courses/how-transformer-llms-work/) | DeepLearning.AI | Transformer internals, attention, generation |
| [LLM University](https://cohere.com/llmu) | Cohere | LLM fundamentals, RAG, embeddings, deployment |
| [Andrej Karpathy's YouTube](https://www.youtube.com/@AndrejKarpathy) | Karpathy | Build LLMs from scratch (GPT, tokenizers), neural nets zero-to-hero |
| [LangChain & Vector DBs in Production](https://learn.activeloop.ai/) | Towards AI / Activeloop | RAG pipelines, vector databases, production patterns |
| [Learn Prompting](https://learnprompting.org/) | Community | Prompt engineering techniques |

### Machine Learning Fundamentals (FREE)

| Resource | Provider | What You Learn |
|----------|----------|---------------|
| [CS229: Machine Learning](https://cs229.stanford.edu/) | Stanford | ML theory, supervised/unsupervised learning, optimization |
| [CS230: Deep Learning](https://cs230.stanford.edu/) | Stanford | Deep learning, CNNs, RNNs, training strategies |
| [fast.ai Practical Deep Learning](https://course.fast.ai/) | fast.ai | Practical top-down approach to deep learning |
| [Mathematics for ML Specialization](https://www.coursera.org/specializations/mathematics-for-machine-learning-and-data-science) | DeepLearning.AI / Coursera | Linear algebra, calculus, probability for ML (audit free) |
| [Dive into Deep Learning (d2l.ai)](https://d2l.ai/) | Community | Interactive deep learning textbook with code |

### Practice & Staying Current

| Resource | Type | What It Offers |
|----------|------|---------------|
| [Papers With Code](https://paperswithcode.com/) | Research | Latest papers with implementations |
| [Aman's AI Journal](https://aman.ai/) | Curated lists | Watch lists, read lists, paper summaries |
| [start-llms (GitHub)](https://github.com/louisfb01/start-llms) | Guide | Complete LLM learning path, updated for 2026 |
| [LeetCode](https://leetcode.com/) | Practice | DSA interview prep |
| [DataLemur](https://datalemur.com/) | Practice | SQL interview practice |
| [InterviewQuery](https://www.interviewquery.com/) | Practice | ML-specific interview questions |

**Sources:**
- [Hugging Face LLM Course](https://huggingface.co/learn/llm-course/chapter1/1)
- [Stanford CS224N](https://web.stanford.edu/class/cs224n/)
- [start-llms GitHub Guide](https://github.com/louisfb01/start-llms)
- [10 Free Resources to Learn LLMs (KDnuggets)](https://www.kdnuggets.com/10-free-resources-to-learn-llms)
- [5 Free Resources to Master LLMs (roadmap.sh)](https://roadmap.sh/guides/free-resources-to-learn-llms)

---

## 9. Essential Python Libraries Beyond Basics

### Standard Library (Must Master)

| Module | Why It Matters for ML Engineering |
|--------|----------------------------------|
| `typing` | Type hints for maintainable ML code, required by Pydantic |
| `dataclasses` | Lightweight data containers for configs, results, experiments |
| `asyncio` | Async LLM API calls, concurrent data processing, async serving |
| `pathlib` | Cross-platform file path handling |
| `collections` | `defaultdict`, `Counter`, `deque` -- frequent in data processing |
| `functools` | `lru_cache` for memoization, `partial` for callbacks |
| `itertools` | Efficient iteration patterns for data pipelines |
| `logging` | Production-grade logging for training/serving |
| `json` / `csv` | Data serialization |
| `abc` | Abstract base classes for clean ML abstractions |
| `contextlib` | Resource management (GPU contexts, file handles) |

### Data & ML Core Stack

| Library | Role |
|---------|------|
| `numpy` | Numerical computing foundation |
| `pandas` | Data manipulation and analysis |
| `scikit-learn` | Classical ML, preprocessing, evaluation metrics |
| `matplotlib` / `seaborn` | Visualization |
| `scipy` | Scientific computing, statistical tests |

### Deep Learning & LLM Stack

| Library | Role |
|---------|------|
| `torch` (PyTorch) | Primary deep learning framework |
| `transformers` | Hugging Face model hub, tokenizers, training |
| `datasets` | Hugging Face dataset loading and processing |
| `accelerate` | Distributed training, mixed precision |
| `peft` | LoRA, QLoRA, adapter management |
| `trl` | RLHF, DPO, SFT training |
| `bitsandbytes` | Quantization (4-bit, 8-bit) |
| `tokenizers` | Fast tokenizer implementations |
| `safetensors` | Safe model serialization |
| `einops` | Readable tensor operations |

### Production & Serving

| Library | Role |
|---------|------|
| `pydantic` | Data validation (used by OpenAI SDK, LangChain, FastAPI, etc.) |
| `fastapi` | High-performance API serving |
| `uvicorn` | ASGI server for FastAPI |
| `vllm` | High-throughput LLM inference serving |
| `ray` | Distributed computing, scaling |
| `docker` (SDK) | Container management |
| `httpx` / `aiohttp` | Async HTTP clients for API calls |

### LLM Application Development

| Library | Role |
|---------|------|
| `langchain` | LLM orchestration and chaining |
| `llama-index` | Data ingestion, indexing, retrieval |
| `dspy` | Programmatic LLM optimization |
| `instructor` | Structured output extraction from LLMs |
| `pydantic-ai` | Type-safe AI agent development |
| `chromadb` | Lightweight vector database |
| `openai` | OpenAI API client |
| `anthropic` | Anthropic API client |

### Monitoring & Evaluation

| Library | Role |
|---------|------|
| `wandb` | Experiment tracking |
| `mlflow` | Model registry, experiment tracking |
| `ragas` | RAG evaluation |
| `deepeval` | LLM test automation |
| `evidently` | Data/model drift monitoring |

**Sources:**
- [48 Best Open-Source Python Libraries 2026 (Anaconda)](https://www.anaconda.com/guides/open-source-python-libraries)
- [Pydantic Documentation](https://docs.pydantic.dev/latest/)
- [Pydantic AI Framework](https://ai.pydantic.dev/)
- [vLLM Documentation](https://pypistats.org/packages/vllm)

---

## 10. SQL Topics for ML Interviews

### Core SQL (Assumed Knowledge)
- SELECT, WHERE, GROUP BY, HAVING, ORDER BY
- JOINs (INNER, LEFT, RIGHT, FULL OUTER, CROSS, SELF)
- Subqueries (correlated and non-correlated)
- UNION, INTERSECT, EXCEPT
- NULL handling (COALESCE, NULLIF, IS NULL)
- CASE WHEN expressions
- Aggregate functions (COUNT, SUM, AVG, MIN, MAX)

### Window Functions (HEAVILY tested -- top priority)

| Function | Use Case | Example |
|----------|----------|---------|
| `ROW_NUMBER()` | Unique sequential numbering | De-duplication, pagination |
| `RANK()` / `DENSE_RANK()` | Ranking with ties | Top-N per group |
| `NTILE(n)` | Divide into n buckets | Percentile analysis |
| `LAG(col, n)` / `LEAD(col, n)` | Access previous/next row | Period-over-period comparison |
| `SUM() OVER(...)` | Running/cumulative totals | Cumulative revenue |
| `AVG() OVER(...)` | Moving averages | Trend analysis |
| `FIRST_VALUE()` / `LAST_VALUE()` | First/last in window | Session analysis |

```sql
-- Example: Rank users by total spend within each category
SELECT user_id, category, total_spend,
       RANK() OVER (PARTITION BY category ORDER BY total_spend DESC) as spend_rank
FROM user_purchases;
```

### CTEs (Common Table Expressions) -- frequently tested
- Single CTE for readability
- Multiple CTEs chained together
- Recursive CTEs (hierarchical data, org charts, graph traversal)
- CTEs vs subqueries -- when to use which
- Performance implications

```sql
-- Example: Multi-step CTE calculation
WITH daily_metrics AS (
    SELECT date, COUNT(*) as events, COUNT(DISTINCT user_id) as users
    FROM events GROUP BY date
),
weekly_avg AS (
    SELECT date, events, users,
           AVG(events) OVER (ORDER BY date ROWS 6 PRECEDING) as avg_7d_events
    FROM daily_metrics
)
SELECT * FROM weekly_avg WHERE date >= '2026-01-01';
```

### Advanced Interview Topics
- **Query optimization** -- EXPLAIN plans, indexing strategies, avoiding full table scans
- **Date/time manipulation** -- DATE_TRUNC, EXTRACT, interval arithmetic
- **String functions** -- LIKE, REGEXP, CONCAT, SUBSTRING
- **Pivoting data** -- CASE WHEN pivot, CROSSTAB
- **Self-joins** -- comparing rows within the same table
- **EXISTS vs IN** -- correlated subquery performance
- **Temp tables vs CTEs vs subqueries** -- tradeoffs

### ML-Specific SQL Scenarios
- Feature engineering queries (aggregations over time windows)
- Cohort analysis (retention, churn)
- A/B test analysis (computing metrics per variant, statistical significance)
- Funnel analysis (conversion rates between steps)
- Sessionization (grouping events into sessions)
- Sampling queries (random sampling, stratified sampling)

### Practice Platforms
- [DataLemur](https://datalemur.com/) -- ML/data-focused SQL problems
- [LeetCode SQL](https://leetcode.com/problemset/database/) -- classic interview problems
- [HackerRank SQL](https://www.hackerrank.com/domains/sql) -- progressive difficulty
- [StrataScratch](https://www.stratascratch.com/) -- real company interview questions

**Sources:**
- [Top 100 SQL Interview Questions 2026 (DataInterview)](https://www.datainterview.com/blog/top-100-sql-interview-questions)
- [SQL Window Functions Interview Questions (DataLemur)](https://datalemur.com/blog/sql-window-functions-interview-questions)
- [Master SQL Window Functions and CTEs (Medium)](https://medium.com/@aicoders/master-sql-window-functions-and-ctes-12-real-data-engineering-interview-questions-with-code-9b42f37c1db1)
- [100+ SQL Coding Interview Questions 2026](https://www.wecreateproblems.com/interview-questions/sql-coding-interview-questions)

---

## Suggested Learning Order (Roadmap)

### Phase 1: Foundations (Weeks 1-4)
- [ ] Python advanced features (typing, dataclasses, asyncio)
- [ ] Linear algebra fundamentals (vectors, matrices, eigenvalues, SVD)
- [ ] Probability & statistics (Bayes, distributions, MLE)
- [ ] SQL window functions and CTEs

### Phase 2: ML Fundamentals (Weeks 5-8)
- [ ] CS229 or equivalent (supervised/unsupervised learning)
- [ ] Gradient descent and optimization
- [ ] Neural network fundamentals (forward/backward pass)
- [ ] scikit-learn for classical ML
- [ ] LeetCode practice (Arrays, Trees, DP -- medium difficulty)

### Phase 3: Deep Learning & Transformers (Weeks 9-14)
- [ ] CS224N or Hugging Face NLP Course
- [ ] Transformer architecture deep dive (attention, multi-head, positional encoding)
- [ ] BERT, GPT, T5 -- understand each variant
- [ ] Karpathy's "Neural Networks: Zero to Hero" series
- [ ] Implement a basic Transformer from scratch

### Phase 4: LLM Engineering (Weeks 15-20)
- [ ] Fine-tuning with LoRA/QLoRA (hands-on with Hugging Face)
- [ ] RAG pipeline construction (LlamaIndex + LangChain)
- [ ] Agentic RAG patterns with LangGraph
- [ ] Vector databases (hands-on with Chroma or Qdrant)
- [ ] Evaluation with RAGAS and DeepEval
- [ ] DSPy for programmatic optimization

### Phase 5: Production & Interview Prep (Weeks 21-26)
- [ ] Model serving (vLLM, FastAPI, Ray Serve)
- [ ] MLOps (Docker, CI/CD, monitoring)
- [ ] ML System Design practice
- [ ] SQL interview practice (DataLemur)
- [ ] DSA practice (LeetCode medium, 50-75 problems)
- [ ] Mock interviews (ML theory + coding + system design)
