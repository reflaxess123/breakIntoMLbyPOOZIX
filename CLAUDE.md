# breakIntoMLbyPOOZIX

Личная база знаний и интерактивные визуализации для изучения ML / NLP / LLM Engineering.
Название проекта: **«Тайная комната Пузикса»** / **«Секреты Пузикса»**.

## Структура репозитория

```
├── HTML/                    # Vite + React + Tailwind — интерактивные визуализации
│   └── (см. HTML/CLAUDE.md)
├── Roadmaps/                # 18 роадмапов (snake_case, английский)
├── lessonsDistilate/        # Транскрипты лекций (Николаев: базовый + продвинутый)
├── ResumeAnalysis/          # Анализ рынка: 548 вакансий, 8771 резюме с hh.ru
├── deploy.ps1               # Деплой визуализаций на nareshka.ru/poozix
└── infra/                   # Nginx-конфиг для сервера
```

## Визуализации (HTML/)

Проект «Тайная комната Пузикса» — интерактивные тренажёры по матстату и ML.

- **Stack:** Vite + React + Tailwind CSS v4 + KaTeX + Canvas + Three.js
- **Шрифт:** Fira Sans
- **Тема:** светлая, палитра Claude (терракотовый акцент `#da7756`)
- **Роутинг:** React Router v7, каждая визуализация на `/vis/<slug>/*`
- **Подробности:** [HTML/CLAUDE.md](HTML/CLAUDE.md)

### Текущие визуализации

| Раздел | Slug | Подстраницы |
|--------|------|-------------|
| Проверка гипотез: Игровой автомат | `hypothesis-testing` | data, hypotheses, likelihood, calibration, robustness, sample-size |
| SVD и PCA | `svd-pca` | theory, pca-3d, transform, square, lora, dimensionality, applications |
| Где хранится информация | `information` | (одна страница) |
| Эмпирические распределения | `glivenko-cantelli` | empirical, supremum, theorem, kolmogorov, dkw |
| Байесовская оценка | `bayesian` | intuition, beta, posterior, credible-interval, mle-vs-map, history |

### Как добавить визуализацию

1. Создать `HTML/src/vis/<slug>/index.jsx` (export default)
2. Зарегистрировать в `HTML/src/App.jsx` (массив `VISUALIZATIONS`)
3. Для подстраниц — добавить массив `pages` и внутренний `<Routes>` в компоненте
4. Автоматически появится в сайдбаре и получит роут

### Roadmaps на сайте

- MD-файлы из `Roadmaps/` копируются в `HTML/public/roadmaps/` + `manifest.json`
- Скрипт: `node HTML/scripts/sync-roadmaps.mjs`
- На сайте рендерятся через react-markdown в раскрывающемся списке сайдбара
- Новые .md автоматически подхватываются при sync + deploy

## Генерация контента через Gemini

- **API ключ:** хранится в переменных, используется в скриптах
- **Модель:** всегда `gemini-3.1-pro-preview` (НЕ 2.5 pro)
- **Кодировка:** записывать через `text.encode('utf-8')` в binary mode
- **Формат вывода:** markdown без HTML/LaTeX, русский язык
- Сгенерированные статьи кладутся в `HTML/public/` и загружаются через fetch + react-markdown

## Деплой

```powershell
.\deploy.ps1    # Билдит HTML/ и заливает на nareshka.ru/poozix/
```

- Сервер: `176.57.218.240` (тот же что nareshka.ru)
- Путь: `/var/www/nareshka/poozix/`
- URL: `https://nareshka.ru/poozix/`
- Nginx: `location ^~ /poozix/` в `/etc/nginx/sites-available/nareshka`
- deploy.ps1: `npx vite build --base=/poozix/` → tar+ssh → nginx reload

## Файлы роадмапов

Именование: `{автор}_{дисциплина}_{детали}.md` (snake_case, английский).
Общие: `general_{тема}.md`. Пример: `vorontsov_ml_foundations_roadmap.md`.

## Учебный план

Цель: Middle NLP/LLM Engineer за 12–18 месяцев.

| Фаза | Тема | Прогресс |
|------|------|----------|
| 0 | Python, SQL, Git, Docker | ~25% |
| 1 | Математика (линал, тервер, статистика, матан) | ~75% |
| 2 | Классический ML | ~35% |
| 3 | Deep Learning (PyTorch, CNN, RNN) | ~5% |
| 4 | NLP / Transformers | 0% |
| 5 | LLM Engineering | 0% |
| 6 | MLOps | ~15% |
| 7 | Портфолио | 0% |

## Конвенции

- Язык интерфейса визуализаций: **русский**
- Объяснения: простым языком, конкретные числа, не абстракции
- Формулы: KaTeX (`<K m="..." />`)
  - В `m="..."` — одинарные `\` (например `\theta`)
  - В `m={\`...\`}` (template literals) — двойные `\\` (например `\\theta`)
- Canvas для графиков, Three.js для 3D
- Все зависимости через npm, никаких CDN
- Слайдеры: светло-серый трек `#e8e6dc`, терракотовый ползунок
- Описания визуализаций — ВСЕГДА под графиком (чтобы график не прыгал)
- Мобильная адаптивность обязательна (см. HTML/CLAUDE.md)
