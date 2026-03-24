# ML Visualizations Project

Интерактивные тренажёры и визуализации для изучения ML / математической статистики.

## Stack

- **Vite + React** (JSX, no TypeScript)
- **React Router v7** — клиентский роутинг
- **Tailwind CSS v4** (config via `@theme` in `src/index.css`) + `@tailwindcss/typography`
- **KaTeX** для LaTeX-формул
- **Canvas API** для графиков/гистограмм
- **Three.js** + `@react-three/fiber` + `@react-three/drei` для 3D визуализаций
- **react-markdown** + `remark-gfm` для рендеринга MD-файлов
- **Fira Sans** — основной шрифт (`@fontsource/fira-sans`)

## Deploy

- **Локальный PowerShell** — `.\deploy.ps1` из корня репозитория
- Билдит `npx vite build --base=/poozix/` → tar+ssh → nginx reload
- Сервер: `176.57.218.240` (nareshka.ru)
- URL: `https://nareshka.ru/poozix/`
- Nginx: `location ^~ /poozix/` в `/etc/nginx/sites-available/nareshka`

## Роутинг

```
/                                          → redirect на первую визуализацию
/vis/<slug>                                → визуализация (redirect на первый шаг)
/vis/<slug>/<step-path>                    → конкретный шаг визуализации
/vis/hypothesis-testing/data               → Шаг 0 "Данные"
/vis/hypothesis-testing/calibration        → Шаг 3 "Калибровка"
```

Каждая визуализация сама определяет свои sub-routes внутри `index.jsx` через вложенный `<Routes>`.

## Тема / Design System

Светлая тема на основе палитры Claude (Anthropic):

| Переменная | Цвет | Назначение |
|---|---|---|
| `--color-bg` | `#faf9f5` | Фон страницы (тёплый кремовый) |
| `--color-surface` | `#ffffff` | Сайдбар, всплывающие панели |
| `--color-card` | `#ffffff` | Карточки контента |
| `--color-border` | `#e8e6dc` | Границы |
| `--color-text` | `#1a1a19` | Основной текст |
| `--color-text-dim` | `#6b6b66` | Вторичный текст |
| `--color-accent` | `#da7756` | Акцент (Claude terracotta) |
| `--color-coral` | `#c15f3c` | Данные, значения |
| `--color-red` | `#c0392b` | Ошибки, отвержение H₀ |
| `--color-green` | `#588157` | Успех, принятие |
| `--color-amber` | `#b8860b` | Предупреждения |

В Tailwind используются как: `bg-bg`, `text-accent`, `border-border`, `bg-card` и т.д.

## Структура проекта

```
HTML/
  index.html            # SPA redirect-скрипт для GitHub Pages
  vite.config.js        # base: '/breakIntoMLbyPOOZIX/'
  public/
    404.html            # SPA fallback для GitHub Pages
  src/
    main.jsx            # Entry: BrowserRouter + шрифты + KaTeX CSS
    index.css           # Tailwind + @theme (цветовая палитра)
    App.jsx             # Routes + реестр визуализаций (lazy loading)
    components/         # Общие переиспользуемые компоненты
      Layout.jsx        # Сайдбар (NavLink) + контент-область
      Latex.jsx         # Обёртка KaTeX: <K m="формула" d />
      Histogram.jsx     # Canvas-гистограмма с p-value
    vis/                # Визуализации (каждая в своей папке)
      hypothesis-testing/
        index.jsx       # Вложенные Routes по шагам
        constants.js    # Данные, таблица выигрышей
        math.js         # Log-likelihood, MLE, Монте-Карло
        Step0.jsx–Step5.jsx
```

## Как добавить новую визуализацию

1. Создать папку `src/vis/<slug>/`
2. Создать `index.jsx` — компонент с `export default`
   - Внутри определить свои `<Routes>` для шагов/подстраниц
3. Данные и утилиты визуализации кладутся рядом в ту же папку
4. Зарегистрировать в `src/App.jsx`:

```jsx
const VISUALIZATIONS = [
  // ... существующие
  {
    id: '<slug>',
    title: 'Название визуализации',
    component: lazy(() => import('./vis/<slug>/index.jsx')),
  },
];
```

Визуализация появится в сайдбаре и получит роут `/vis/<slug>/*`. Lazy loading из коробки.

## Общие компоненты

### `<K m="LaTeX" d />` (Latex.jsx)
- `m` — LaTeX-строка
- `d` — display mode (block, по умолчанию inline)

### `<Histogram data={[]} realValue={T} bins={50} />` (Histogram.jsx)
- `data` — массив числовых значений
- `realValue` — вертикальная линия + p-value
- `height`, `bins`, `label` — опциональные
- **Ширина автоматическая** — компонент занимает 100% контейнера и ресайзится при изменении окна. НЕ передавать `width`.

## Адаптивность (mobile-first)

Layout уже адаптивный: на мобилке (<768px) сайдбар скрывается, появляется бургер-меню на весь экран. Контент получает `pt-20` на мобилке для отступа от фиксированного хедера.

**Правила для всех визуализаций:**

| Что | Как делать | Пример |
|---|---|---|
| Гриды | Всегда начинать с 1 колонки, расширять через брейкпоинты | `grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3` |
| Таблицы | Оборачивать в `overflow-x-auto` | `<div className="overflow-x-auto"><table>...` |
| Горизонтальные табы | `flex flex-nowrap overflow-x-auto scrollbar-hide` | Табы шагов в hypothesis-testing |
| Canvas/графики | Использовать `<Histogram>` без width — он авторесайзный | `<Histogram data={...} height={300} />` |
| Кнопки | На мобилке полная ширина | `w-full sm:w-auto` |
| Паддинги | Меньше на мобилке | `px-4 md:px-8` |
| Фиксированные размеры | **Запрещены**. Никаких `width={720}` | Только `max-w-*` или `w-full` |

**Брейкпоинты Tailwind:**
- `sm:` — 640px+
- `md:` — 768px+ (тут появляется десктопный сайдбар)
- `lg:` — 1024px+

**CSS-утилита:** класс `scrollbar-hide` (определён в `index.css`) — скрывает скроллбар, но скролл работает.

## Конвенции

- Язык интерфейса: **русский**
- Объяснения: простым языком, не академическим
- Формулы: через `<K m="..." />`, конкретные числа, не абстрактные переменные
- Все тяжёлые вычисления (Монте-Карло) — async с `setTimeout(0)` для отзывчивости UI
- Кнопки для запуска симуляций, прогресс-бар во время вычислений
- Canvas для графиков (не SVG, не библиотеки)
- Никаких внешних CDN — всё через npm
- **Мобильная адаптивность обязательна** для каждой визуализации

## Генерация контента через Gemini API

- **Модель:** всегда `gemini-3.1-pro-preview` (НИКОГДА не 2.5 pro)
- **Кодировка:** записывать файл через `text.encode('utf-8')` в binary mode (`'wb'`)
- **Результат:** MD-файлы кладутся в `public/`, загружаются через `fetch()` + `react-markdown`
- Текущие сгенерированные файлы:
  - `public/bayesian-history.md` — история байесовской статистики
  - `public/mle-map-mean.md` — MLE vs MAP vs Posterior Mean

## Команды

```bash
cd HTML
npm install       # установка зависимостей
npm run dev       # dev-сервер (localhost:5173)
npm run build     # production сборка → dist/
npm run preview   # preview production build
```
