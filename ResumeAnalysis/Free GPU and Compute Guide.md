# Бесплатные GPU и ресурсы для ML проектов

> Все проекты из роадмапа (fine-tuning, RAG, agents) можно сделать за $0.

---

## Бесплатные GPU для Fine-tuning

| Платформа | GPU | VRAM | Лимит бесплатно | Хватит на |
|-----------|-----|------|-----------------|-----------|
| **Google Colab Free** | T4 | 15 GB | ~4-5 ч/сессия, disconnect | QLoRA 7B (Mistral, LLaMA 3 8B) |
| **Kaggle Notebooks** | T4 x2 / P100 | 15-16 GB | **30 ч GPU/неделю** | QLoRA 7B, 13B с трудом |
| **Lightning.ai** | T4 / A10G | 15-24 GB | 22 GPU-часа/мес | QLoRA 7B |
| **Hugging Face Spaces** | T4 | 15 GB | inference only | Демо/serving готовой модели |
| **Saturn Cloud** | T4 | 15 GB | 30 ч/мес | Training и notebooks |

### Что реально поместится на T4 (15 GB)

```
Mistral 7B  в 4-bit (QLoRA)  → ~5 GB VRAM  ✅ с запасом
LLaMA 3 8B  в 4-bit (QLoRA)  → ~6 GB VRAM  ✅ с запасом
LLaMA 13B   в 4-bit (QLoRA)  → ~9 GB VRAM  ✅ впритык
LLaMA 70B   в 4-bit (QLoRA)  → ~38 GB VRAM ❌ не влезет
```

### Сколько времени нужно на fine-tuning

```
1000 примеров,  Mistral 7B QLoRA, T4:  ~30-60 минут
5000 примеров,  Mistral 7B QLoRA, T4:  ~2-3 часа
10000 примеров, LLaMA 3 8B QLoRA, T4:  ~4-5 часов
```

С **Unsloth** — в 2 раза быстрее и меньше памяти.

---

## Бесплатные LLM API для Agents

| Провайдер | Модель | Бесплатная квота | Скорость |
|-----------|--------|-----------------|----------|
| **Google Gemini API** | Gemini 1.5 Flash / Pro | 15 req/min, 1500 req/day | Быстро |
| **Groq** | LLaMA 3, Mistral, Mixtral | Бесплатный tier, rate limits | Очень быстро (LPU) |
| **Hugging Face Inference API** | Разные open-source | Rate limited, но бесплатно | Средне |
| **Cloudflare Workers AI** | LLaMA, Mistral и др. | 10K токенов/день бесплатно | Быстро |
| **Together.ai** | Разные | $5 бесплатных кредитов при регистрации | Быстро |
| **OpenRouter** | Агрегатор | Есть бесплатные модели | Зависит от модели |

---

## Локальный запуск (свой комп, $0)

### Ollama — самый простой вариант

```bash
# Установка (Linux/Mac/Windows)
curl -fsSL https://ollama.com/install.sh | sh

# Скачать и запустить модель
ollama pull mistral          # 4.1 GB, работает на 8 GB RAM
ollama pull llama3.2:3b      # 2 GB, работает на 4 GB RAM
ollama pull qwen2.5:7b       # 4.4 GB

# Запустить чат
ollama run mistral

# API для интеграции с LangChain/LangGraph
# http://localhost:11434/api/generate
```

### Минимальные требования для локального запуска

| Модель | RAM (CPU) | VRAM (GPU) | Скорость CPU | Скорость GPU |
|--------|-----------|------------|-------------|-------------|
| LLaMA 3.2 3B (Q4) | 4 GB | 3 GB | ~5-8 tok/s | ~30+ tok/s |
| Mistral 7B (Q4) | 8 GB | 5 GB | ~2-5 tok/s | ~25+ tok/s |
| LLaMA 3 8B (Q4) | 8 GB | 6 GB | ~2-4 tok/s | ~20+ tok/s |
| Mistral 7B (Q8) | 12 GB | 8 GB | ~1-3 tok/s | ~20+ tok/s |

> 2-5 tok/s на CPU — медленно для юзера, но **нормально для разработки** агентов. Ты не тысячи запросов шлёшь, а десятки при тестировании.

### Игровые видеокарты

| GPU | VRAM | Что влезет | Можно fine-tune? |
|-----|------|-----------|-----------------|
| RTX 3060 | 12 GB | 7B Q4/Q8 | ✅ QLoRA 7B |
| RTX 3070/3080 | 8-10 GB | 7B Q4 | ✅ QLoRA 7B (впритык) |
| RTX 3090 / 4090 | 24 GB | 13B Q4, 7B FP16 | ✅ QLoRA до 13B |
| RTX 4060 Ti 16GB | 16 GB | 7B-13B Q4 | ✅ QLoRA 7B |
| Нет GPU, только CPU | 16+ GB RAM | 7B Q4 через Ollama | ❌ слишком медленно |

---

## Бесплатный стек для каждого проекта

### Проект 4: LLM Fine-tuning → $0

```
Платформа:    Kaggle Notebooks (30 ч GPU/нед) или Google Colab Free
Модель:       Mistral 7B или LLaMA 3 8B
Метод:        QLoRA (rank=64, alpha=128)
Ускорение:    Unsloth (2x быстрее, меньше памяти)
Dataset:      Hugging Face Hub (тысячи бесплатных)
Tracking:     Weights & Biases (бесплатный tier)
Serving:      Ollama локально или HF Spaces
Время:        1-3 часа на обучение

Библиотеки (все open source):
- transformers, peft, trl, bitsandbytes, unsloth
- datasets, evaluate, accelerate
```

### Проект 5: LLM Agent → $0

```
LLM:          Ollama локально (Mistral 7B)
              или Google Gemini API (бесплатная квота)
              или Groq API (бесплатный tier)
Framework:    LangGraph (open source)
Vector DB:    Chroma in-memory (open source)
Embeddings:   sentence-transformers локально (open source)
Eval:         ragas + deepeval (open source)
UI:           Streamlit / Gradio (open source)

Всё крутится на ноутбуке без GPU.
```

### RAG проект → $0

```
Ingestion:    LlamaIndex (open source)
Vector DB:    Qdrant (Docker, локально) или Chroma (in-memory)
Embeddings:   sentence-transformers/all-MiniLM-L6-v2 (384d, быстрый, локальный)
LLM:          Ollama (Mistral 7B) или Gemini API free
Search:       Hybrid (dense + BM25 через rank_bm25 pip пакет)
Re-ranking:   cross-encoder/ms-marco-MiniLM-L-6-v2 (локально)
Eval:         ragas (open source)
API:          FastAPI (open source)
Deploy:       Docker Compose локально
```

---

## Платные опции (если нужно больше)

| Сервис | Цена | Зачем |
|--------|------|-------|
| **Google Colab Pro** | ~$10/мес | A100 40GB, дольше сессии, приоритет |
| **vast.ai** (спот) | $0.20-0.50/ч за A100 | Разовый fine-tune большой модели |
| **RunPod** (спот) | $0.30-0.70/ч за A100 | То же самое |
| **Lambda Labs** | $0.50/ч за A100 | Стабильнее чем споты |
| **Modal** | $30 бесплатных кредитов | Serverless GPU, удобно |

> Для роадмапа достаточно **$0**. Colab Pro за $10/мес — это comfort, не необходимость.

---

## Бесплатные датасеты для fine-tuning

| Датасет | Размер | Задача | Ссылка |
|---------|--------|--------|--------|
| OpenAssistant/oasst1 | 66K conversations | Instruction following | HF Hub |
| tatsu-lab/alpaca | 52K instructions | General assistant | HF Hub |
| teknium/OpenHermes-2.5 | 1M instructions | High quality instruct | HF Hub |
| HuggingFaceH4/ultrachat_200k | 200K dialogues | Chat | HF Hub |
| mlabonne/guanaco-llama2-1k | 1K | Quick fine-tune demo | HF Hub |
| Любой свой | 500-5000 | Domain-specific | Собрать самому |

> 1000-5000 качественных примеров достаточно для domain adaptation через QLoRA.

---

*Обновлено: февраль 2026*
