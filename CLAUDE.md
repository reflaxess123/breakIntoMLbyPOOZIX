# breakIntoMLbyPOOZIX

Личная база знаний и интерактивные визуализации для изучения ML / NLP / LLM Engineering.

## Структура репозитория

```
├── HTML/                    # Vite + React + Tailwind — интерактивные визуализации
│   └── (см. HTML/CLAUDE.md)
├── Formulas/                # Справочники (греческие буквы, комбинаторика)
├── LearnState/              # Трекинг прогресса обучения (v1–v5, февраль–март 2026)
├── ResumeAnalysis/          # Анализ рынка: 548 вакансий, 8771 резюме с hh.ru
├── Roadmaps/                # 26+ роадмапов по курсам (Воронцов, Шамин, Райгородский, и др.)
├── images/                  # 50+ PNG-визуализаций учебного плана
├── bananaImages/            # Личные заметки и скриншоты
├── lessonsDistilate/        # Конспекты лекций
├── deploy.ps1               # Деплой визуализаций на nareshka.ru/poozix
└── infra/                   # Nginx-конфиг для сервера
```

## Визуализации (HTML/)

Проект «Тайная комната Пузикса» — интерактивные тренажёры по матстату и ML.

- **Stack:** Vite + React + Tailwind CSS v4 + KaTeX + Canvas
- **Шрифт:** Fira Sans
- **Тема:** светлая, палитра Claude (терракотовый акцент `#da7756`)
- **Роутинг:** React Router v7, каждая визуализация на `/vis/<slug>/*`
- **Подробности:** [HTML/CLAUDE.md](HTML/CLAUDE.md)

### Как добавить визуализацию

1. Создать `HTML/src/vis/<slug>/index.jsx` (export default)
2. Зарегистрировать в `HTML/src/App.jsx` (массив `VISUALIZATIONS`)
3. Автоматически появится в сайдбаре и получит роут

## Деплой

```powershell
.\deploy.ps1    # Билдит HTML/ и заливает на nareshka.ru/poozix/
```

- Сервер: `176.57.218.240` (тот же что nareshka.ru)
- Путь: `/var/www/nareshka/poozix/`
- URL: `https://nareshka.ru/poozix/`
- Nginx: `location ^~ /poozix/` в `/etc/nginx/sites-available/nareshka`

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

Прогресс отслеживается в `LearnState/learn_state_v5_16_03_2026.md`.

## Конвенции

- Язык интерфейса визуализаций: **русский**
- Объяснения: простым языком, конкретные числа, не абстракции
- Формулы: KaTeX (`<K m="..." />`), Canvas для графиков
- Все зависимости через npm, никаких CDN
