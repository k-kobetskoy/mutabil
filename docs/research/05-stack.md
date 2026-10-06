# R5. Стек и архитектура внутри Next.js

Дата: 2026-10-06. Стек зафиксирован: Next.js (App Router) + TypeScript. Сравнения с другими фреймворками нет.

**Как читать.** По каждому вопросу: варианты (со ссылками) → рекомендация → открытые вопросы. «Предположение» значит, что утверждение не удалось проверить по первоисточнику в этой сессии.

**Как проверяли (ограничения).** Версии взяты из реестра npm (`npm view <pkg> version`, `time`, `peerDependencies`) и Go module proxy (`proxy.golang.org/<module>/@latest`) 2026-10-06. Сайты nextjs.org, zod.dev, next-intl.dev, vercel.com, hetzner.com, ogen.dev прокси закрыл. Поэтому документацию читали из исходников: папка `docs/` репозитория `vercel/next.js` (коммит от 2026-10-06), `amannn/next-intl/docs`, `47ng/nuqs/packages/docs`, `shadcn-ui/ui/apps/v4/content/docs/changelog`, `colinhacks/zod/packages/docs`, README пакетов из npm, исходник модуля `ogen` v1.24.0. Лимит WebSearch на ход закончился после первого запроса, его делят все агенты. Цены Vercel и Hetzner поэтому помечены как «Предположение».

---

## 0. Версии (проверено 2026-10-06)

| Пакет | Последняя стабильная | Дата / заметка | Источник |
|---|---|---|---|
| next | **16.4.0** | вышла 2026-10-06; 16.3.0 — 2026-08-03; бэкпорт-ветка 15.5.27 | https://www.npmjs.com/package/next |
| react / react-dom | **19.3.0** | | https://www.npmjs.com/package/react |
| typescript | 7.0.2 (latest), **6.0.3** | `typescript-eslint@8.71.1` требует `typescript >=4.8.4 <6.1.0`, см. §0.1 | https://www.npmjs.com/package/typescript |
| zod | **4.6.5** | есть локаль `zod/v4/locales/ro` | https://www.npmjs.com/package/zod |
| next-intl | **4.14.9** | peer: `next ^12…^16` | https://www.npmjs.com/package/next-intl |
| react-hook-form | **7.89.0** | ветка `8.0.0-beta.4` в разработке | https://www.npmjs.com/package/react-hook-form |
| @hookform/resolvers | **5.9.1** | peer `zod ^3.25 \|\| ^4`, есть Standard Schema resolver | https://www.npmjs.com/package/@hookform/resolvers |
| xstate / @xstate/react | 5.33.2 / 6.1.0 | v6 в alpha | https://www.npmjs.com/package/xstate |
| @asteasolutions/zod-to-openapi | 9.1.0 | 3.0 / 3.1 / 3.2, peer `zod ^4` | https://www.npmjs.com/package/@asteasolutions/zod-to-openapi |
| zod-openapi (samchungy) | **6.0.2** | только 3.1.x, построен на нативном `.meta()` | https://www.npmjs.com/package/zod-openapi |
| vitest | **5.0.3** | | https://www.npmjs.com/package/vitest |
| @playwright/test | **1.63.0** | | https://www.npmjs.com/package/@playwright/test |
| @axe-core/playwright | 4.13.0 | | https://www.npmjs.com/package/@axe-core/playwright |
| tailwindcss | **4.3.3** | | https://www.npmjs.com/package/tailwindcss |
| shadcn (CLI) | 4.21.3 | базы: Base UI (по умолчанию с 2026-07), Radix, React Aria (с 2026-07-17) | https://www.npmjs.com/package/shadcn |
| radix-ui (мета-пакет) | 1.7.0 | `@radix-ui/react-dialog` 1.2.0 | https://www.npmjs.com/package/radix-ui |
| @base-ui/react | 1.8.0 | | https://www.npmjs.com/package/@base-ui/react |
| react-aria-components | **1.21.1** | | https://www.npmjs.com/package/react-aria-components |
| nuqs | 2.10.1 | peer `next >=14.2` | https://www.npmjs.com/package/nuqs |
| lz-string | **1.5.0** | последний релиз 2023-03, проект стабилен и не меняется | https://www.npmjs.com/package/lz-string |
| json-logic-js | **2.0.5** | последний релиз 2024-07, эталонная реализация jsonlogic.com | https://www.npmjs.com/package/json-logic-js |
| json-logic-engine | 5.0.7 | активно развивается (2026-04) | https://www.npmjs.com/package/json-logic-engine |
| json-rules-engine | 7.3.1 | 2025-02 | https://www.npmjs.com/package/json-rules-engine |
| @tanstack/react-form | 1.33.5 | | https://www.npmjs.com/package/@tanstack/react-form |
| @conform-to/react, /zod | 1.21.1 | | https://www.npmjs.com/package/@conform-to/react |
| zustand | **5.0.15** | | https://www.npmjs.com/package/zustand |
| @redocly/cli | 2.59.0 | линтер OpenAPI | https://www.npmjs.com/package/@redocly/cli |
| yaml | 2.9.1 | сериализация openapi.yaml | https://www.npmjs.com/package/yaml |
| **Go** | 1.27.1 (toolchain) | в окружении стоит Go 1.24. Для oapi-codegen 2.8 **нужен ≥1.25** | proxy.golang.org `golang.org/toolchain` |
| oapi-codegen v2 | **v2.8.0** (2026-07-17) | «initial OpenAPI 3.1 support» | https://github.com/oapi-codegen/oapi-codegen/releases/tag/v2.8.0 |
| oapi-codegen/runtime | v1.7.0 | для 2.8 нужен ≥1.6.0 | https://github.com/oapi-codegen/runtime |
| oapi-codegen/nethttp-middleware | v1.2.0 (2026-07-19) | валидация запросов через kin-openapi | https://github.com/oapi-codegen/nethttp-middleware |
| getkin/kin-openapi | v0.149.0 (2026-08-28) | 3.1 поддерживается, 3.2 частично | https://github.com/getkin/kin-openapi |
| ogen | v1.24.0 (2026-08-07) | | https://github.com/ogen-go/ogen |
| diegoholiveira/jsonlogic v3 | v3.10.1 (2026-06-16) | JSONLogic на Go | https://github.com/diegoholiveira/jsonlogic |
| go-chi/chi v5 | v5.3.2 | если понадобится роутер; основной вариант — std `net/http` | https://github.com/go-chi/chi |

### 0.1. Какой TypeScript брать

`next build` по умолчанию запускает локальный `tsc` и поэтому поддерживает TypeScript 7 ([docs: useTypeScriptCli](https://github.com/vercel/next.js/blob/canary/docs/01-app/03-api-reference/05-config/01-next-config-js/useTypeScriptCli.mdx)). Но у TS 7 пока нет JavaScript compiler API, а `typescript-eslint@8.71.1` объявляет peer `typescript <6.1.0`. **Рекомендация: TypeScript 6.0.3.** На 7.x переходить, когда typescript-eslint его поддержит.

---

## 1. Рендеринг: SSG, клиентский конфигуратор, static export или Node

### Варианты

**A. `output: 'export'` (чистая статика: Nginx, S3, любой CDN).** По документации Next не работают ([static-exports.mdx](https://nextjs.org/docs/app/guides/static-exports)):
- Proxy (бывший middleware);
- `headers` / `redirects` / `rewrites` в `next.config`;
- ISR;
- Image Optimization с loader по умолчанию;
- Server Actions;
- Route Handlers, которые читают Request;
- cookies;
- динамические маршруты без `generateStaticParams`.

Для next-intl в режиме static export ([next-intl: Usage without proxy](https://github.com/amannn/next-intl/blob/main/docs/src/pages/docs/routing/middleware.mdx)) отдельно: префикс локали обязателен, локаль на сервере не определяется, **`pathnames` (локализованные пути) недоступны**, потому что им нужны rewrites на сервере.

**B. Node-сервер (`next start` или `output: 'standalone'` в Docker).** Таблица в [Deploying](https://nextjs.org/docs/app/getting-started/deploying): Node.js и Docker — «Feature support: All», static export — «Limited». Страницы без динамических данных всё равно пререндерятся при сборке в HTML и отдаются как статика. Скорость для SEO не страдает, сервер просто отдаёт готовый файл.

**C. Cache Components и Partial Prerendering.** `cacheComponents` стабилен с Next 16.0 и включает PPR как поведение по умолчанию. Флаги `experimental.ppr` и `experimental_ppr` удалены ([cacheComponents.mdx](https://nextjs.org/docs/app/api-reference/config/next-config-js/cacheComponents)). `create-next-app` с рекомендуемыми настройками уже включает Cache Components и `partialPrefetching` ([caching.mdx](https://nextjs.org/docs/app/getting-started/caching), [installation.mdx](https://nextjs.org/docs/app/getting-started/installation)). При Cache Components Next держит недавно посещённые маршруты в React `<Activity>` в скрытом состоянии. Поэтому состояние UI сохраняется при переходах назад и вперёд, но эффекты пересоздаются. Это надо учитывать в шагах мастера ([Preserving UI state](https://nextjs.org/docs/app/guides/preserving-ui-state)).

**Что такое клиентский компонент конфигуратора.** Компонент с `'use client'` тоже **пререндерится в HTML** при сборке, а затем гидрируется. Значит, первый экран мастера есть в HTML и для Google, и для LCP. `useSearchParams` на пререндеренной странице переводит дерево до ближайшего `<Suspense>` в клиентский рендеринг ([use-search-params.mdx](https://nextjs.org/docs/app/api-reference/functions/use-search-params)). Компоненты, которые читают URL, нужно оборачивать в `<Suspense>`.

### Что получаем и что теряем

| | Static export | Node standalone (Docker) |
|---|---|---|
| Хостинг | любой статический или CDN, почти бесплатно | контейнер на VPS, нужно обслуживать |
| `/ro/estimare` ↔ `/en/estimate` (локализованные пути) | **нет** | да (next-intl `pathnames`) |
| Редирект `/` → `/ro` по Accept-Language, hreflang в заголовке `Link` | нет (только клиентский redirect) | да (proxy next-intl) |
| CSP и security-заголовки, 301-редиректы старых URL | только на уровне Nginx | `next.config` + proxy |
| `next/image` с оптимизацией | только внешний loader | работает сразу (sharp) |
| Route Handler как BFF к Go API (скрыть origin, CORS, rate-limit) | нет | да |
| ISR для блога или FAQ из CMS | нет | да (кэш на диске, одна инстанция) |

### Рекомендация

- **Node-сервер, `output: 'standalone'`, Docker.** Все маркетинговые страницы и оболочка конфигуратора — статические (SSG через `generateStaticParams` по локалям и шагам).
- Конфигуратор — клиентский «остров» внутри серверной страницы. На сервере остаются H1, SEO-текст, FAQ, JSON-LD. В клиенте — мастер и расчёт.
- **Cache Components оставить включённым, как в create-next-app.** У нас нет динамических данных, поэтому статическая оболочка равна всей странице, а `'use cache'` в MVP не нужен.
- Главный довод — требование R1 «у каждого шага свой URL `/ro/estimate/acces`, `/en/estimate/access`». Без сервера локализованные пути next-intl не работают.
- Бюджет JS для маршрута конфигуратора проверять через `@next/bundle-analyzer` 16.4.0.

### Открытые вопросы
- Совместимость next-intl 4.14 и Cache Components. В документации next-intl рекомендован `next/root-params` (по умолчанию с Next 16.3), явного раздела про `cacheComponents` нет. Проверить на прототипе (Предположение: работает, root-params для этого и сделан).
- React Compiler (`reactCompiler: true`) в рекомендуемых настройках create-next-app выключен. В MVP не включаем.

---

## 2. Логика шагов: XState или декларативный конфиг шагов с условиями

### Варианты

1. **XState v5 (5.33.2).** Полноценные statecharts: иерархия, параллельные состояния, actors, визуализатор.
   - Плюсы: явные переходы, удобно для асинхронных процессов (бронирование слота, оплата, повторы запросов).
   - Минусы: высокий порог входа; машину описывает TS-код с guards и actions, Go её не исполнит. Правило «ящики → только выезд оценщика» всё равно пришлось бы дублировать для сервера.
2. **Декларативный конфиг шагов + чистые функции навигации.** Шаг — это данные: `id`, слаги по локалям, `modes`, поля, `visibleIf`. Навигация — чистые функции `visibleSteps(state, cfg)`, `nextStep`, `prevStep`, `firstIncomplete`. По сути это линейный автомат, где порядок задан массивом, а условия — данными. Тестируется обычными unit-тестами.
3. **Механизм правил, общий для TS и Go:**
   - **JSONLogic** — `json-logic-js` 2.0.5 (эталон, около 65 КБ в распакованном виде) или `json-logic-engine` 5.0.7 (быстрее, есть изолированные инстансы, около 380 КБ). На Go — `github.com/diegoholiveira/jsonlogic/v3` v3.10.1: `Apply(logic, data, &result)`, свои операторы через `AddOperator`. В README предупреждение: часть его операторов (`contains_all` и др.) не входит в спецификацию.
   - **json-rules-engine** 7.3.1 — асинхронный, с фактами и событиями. Совместимой реализации на Go нет, так что для общих правил не подходит.

### Рекомендация

**XState в MVP не берём.** Шаги — декларативный конфиг (`config/steps.json`). Правила — JSON: условие на JSONLogic плюс список **эффектов** из небольшого закрытого словаря. Эффекты исполняет наш собственный интерпретатор, около 100 строк в TS и столько же в Go.

```jsonc
// config/rules.json
[
  { "id": "crates-onsite-survey",
    "when": { "==": [ { "var": "packing.reusableCrates" }, true ] },
    "then": [ { "type": "restrictOptions", "field": "survey.type", "allow": ["onsite"] },
              { "type": "hint", "key": "rules.crates.onsiteOnly" } ] },

  { "id": "elevator-unknown",
    "when": { "==": [ { "var": "from.elevator" }, "unknown" ] },
    "then": [ { "type": "assume", "field": "from.elevatorEffective", "value": "small" },
              { "type": "addTask", "code": "CLARIFY_ELEVATOR" },
              { "type": "explain", "key": "rules.elevator.assumedSmall" } ] }
]
```

```jsonc
// config/steps.json (фрагмент)
{ "id": "access-from", "slug": { "ro": "acces", "en": "access" },
  "modes": ["detailed"], "fields": ["from.floor", "from.elevator"],
  "visibleIf": { "!=": [ { "var": "from.type" }, "house" ] } }
```

- **Словарь эффектов:** `hideStep`, `restrictOptions`, `setDefault`, `assume` (консервативное допущение для расчёта), `addTask` (задача диспетчеру), `hint` и `explain` (ключи i18n для «почему эта цифра»), `requireField`.
- **Подмножество JSONLogic:** `var`, `==`, `!=`, `<`, `<=`, `>`, `>=`, `and`, `or`, `!`, `in`, `missing`. Остальное запрещено валидатором правил. Строгое `===` не используем, данные заранее типизированы Zod.
- **Совместимость TS и Go проверяется тестами.** Файл `contract/fixtures/rules/*.json` с полями `{ rule, data, expected }` прогоняется и в Vitest, и в `go test`. Расхождения библиотек в приведении типов и truthiness ловятся автоматически. Предположение: в выбранном подмножестве расхождений нет, тесты это подтвердят или опровергнут.
- **Порядок применения:** `rules(order) → effectiveOrder + tasks + explanations`, затем `pricing(effectiveOrder, cfg)`. Ценообразование не знает о правилах и получает уже нормализованный заказ.
- **XState рассмотреть позже**, если появятся асинхронные процессы: резерв слота с таймаутом, оплата, повторная отправка. Даже тогда XState только оркестрирует UI, а бизнес-правила остаются в JSON.

### Открытые вопросы
- `json-logic-js` или `json-logic-engine`. Рекомендую `json-logic-js`: меньше по размеру, эталонная семантика, и Go-реализация ориентирована на ту же спецификацию. `add_operation` в нём глобальный, но свои операторы нам не нужны.
- Кто редактирует правила: разработчик в PR или владелец бизнеса. Во втором случае позже понадобится админка, в MVP её нет.

---

## 3. Формы и валидация

### Варианты
- **React Hook Form 7.89 + `@hookform/resolvers` 5.9 (`zodResolver`, Zod 4).** Неуправляемые поля, мало ре-рендеров, лучше всех поддерживается в экосистеме. Официальный рецепт есть в документации shadcn ([forms/react-hook-form](https://github.com/shadcn-ui/ui/tree/main/apps/v4/content/docs/forms)). v8 пока в beta.
- **TanStack Form 1.33.** Строже по типам, поддерживает Standard Schema, но многословнее, и материалов для новичка в React меньше.
- **Conform 1.21.** Заточен под прогрессивное улучшение через Server Actions и FormData. У нас Server Actions нет (submit идёт в будущий Go API), так что его главное преимущество не пригодится.

### Рекомендация
- **RHF + Zod 4.**
- Источник правды для черновика заказа — **store** (Zustand, §4).
- Каждый шаг — отдельный небольшой `useForm`: `defaultValues` из store, `resolver: zodResolver(stepSchema)`, где `stepSchema = OrderDraftSchema.pick({...})`. По «Далее» форма валидируется, затем `store.commit(stepValues)`.
- Межшаговые условия считаются правилами (§2) по store, а не внутри формы.

**Локализация ошибок.** В схемах пишем **ключи**, а не тексты: `z.number().int().min(0).max(30, { error: 'validation.floor.max' })`. Для стандартных ошибок задаём `z.config(z.locales.ro())` или `en()` по текущей локали. В Zod 4.6.5 есть `v4/locales/ro`. UI переводит ключ через `next-intl` `t(issue.message)`. Будущий Go API возвращает ошибки как RFC 9457 `problem+json` с теми же ключами. Так одни и те же сообщения работают на клиенте и на сервере.

**Разделение схем:**
- `contract/` — «проводные» схемы без transform и coerce;
- форма — тонкий слой поверх: `z.coerce.number()` для `<input type=number>`, пустые строки превращаются в `undefined`.

Подробнее в §8.

### Открытые вопросы
- Размер Zod 4 в клиентском бандле. Если маршрут конфигуратора не уложится в бюджет, проверить `zod/mini` для клиентских схем шагов, а полный Zod оставить в `contract/`. Измерить анализатором бандла.

---

## 4. Состояние заказа, URL, «поделиться сметой», сохранение черновика

### Варианты
- **nuqs 2.10.1.** Типизированное состояние в query string. `parseAsJson` принимает Standard Schema (Zod), есть `createSerializer`, `createLoader`, троттлинг History API (50 мс, для Safari 120 мс), отдельные парсеры на Zod codecs ([docs/limits](https://github.com/47ng/nuqs/blob/next/packages/docs/content/docs/limits.mdx), [parsers/built-in](https://github.com/47ng/nuqs/tree/next/packages/docs/content/docs/parsers)). Но nuqs работает только с **query**, а не с `#hash`.
- **Свой кодек в `#fragment`.** Фрагмент не уходит на сервер, не пишется в логи Nginx и Next и не попадает в `Referer`. Для приватности это лучше query.
- **Сжатие:**
  - `lz-string.compressToEncodedURIComponent`: синхронное, выдаёт строку, безопасную для URL, без зависимостей в рантайме;
  - нативный `CompressionStream('deflate-raw')` + base64url: асинхронный, без зависимости;
  - компактный JSON (короткие ключи, enum → индекс, значения по умолчанию не пишутся) + base64url.
- **Длина URL** (nuqs/limits): Chrome технически до примерно 2 МБ, но около 2000 символов — практический предел. Мессенджеры и почта обрезают ещё раньше.

### Рекомендация
1. **Шаг — в пути** (`/ro/estimare/acces`), как требует R1. Режим (`?mode=quick`) читаем через `useSearchParams`. nuqs в MVP не нужен; добавим, если появятся сложные query-фильтры.
2. **Ссылка на смету:** `/{locale}/{estimate-slug}/rezultat#s=<v>.<token>`, где `token = compressToEncodedURIComponent(JSON.stringify(toCompact(orderInput)))`.
   - В `<v>` — версия схемы токена. В компактном объекте есть `cv` — версия конфига цен.
   - Декодирование: `fromCompact` → `migrations[v]` → `OrderInputSchema.safeParse`. Если не прошло — понятное сообщение «ссылка устарела, начните заново», без падения.
   - Unit-тест: «максимально заполненный» заказ даёт токен не длиннее **1000 символов**.
3. **В URL не кладём цену.** При открытии ссылки смета пересчитывается текущим конфигом. Если `cv` не совпадает, показываем «тарифы обновились, цена пересчитана». Решение за бизнесом, см. открытые вопросы.
4. **Приватность.** В токене **нет** контактов (имя, телефон, email), **точного адреса** (только зона, район или расстояние; улица и дом — персональные данные) и **свободного текста** (комментарий может содержать персональные данные). Аналитику настроить так, чтобы hash не отправлялся (Предположение: в GA4 и аналогах это делается настройкой или фильтром page_location).
5. **Черновик:**
   - Zustand 5 `persist` → `localStorage['mutabil:draft']`, формат `{ v, savedAt, data }`, TTL 14 дней. При несовпадении `v` черновик мигрируется или сбрасывается.
   - Контактные поля храним **только в `sessionStorage`** и только до отправки.
   - Всё чтение и запись — в `try/catch`: приватный режим, переполнение квоты.
   - Гидрация store после монтирования (`skipHydration` + `rehydrate()` в `useEffect`), иначе возникнет hydration mismatch между HTML с сервера и localStorage.
6. **Back и Reload.**
   - Store живёт в `layout.tsx` раздела `estimate/`. Layout не размонтируется при переходах между шагами, поэтому состояние сохраняется.
   - Reload поднимает черновик из localStorage.
   - Cache Components с `<Activity>` дополнительно сохраняет локальное состояние скрытых маршрутов.

### Открытые вопросы
- Что показывать по старой ссылке после смены тарифов: новую цену или «цена на дату X» (снимок цены в токене)? Юридически безопаснее новая цена с пометкой. Сверить с R6 (06-legal).
- Короткие ссылки (`/e/abc123`) с хранением на сервере — после появления Go API.

---

## 5. i18n RO/EN

### Варианты
- **Встроенный подход Next** ([internationalization.mdx](https://nextjs.org/docs/app/guides/internationalization)):
  - сегмент `app/[lang]`;
  - свой `proxy.ts` с `@formatjs/intl-localematcher` и `negotiator`;
  - словари `getDictionary()`;
  - `next/root-params` для чтения локали в любом серверном коде (по умолчанию с 16.3).

  Нет ICU-плюрализации, форматирования, типизированных `Link`, сопоставления локализованных путей, hreflang. В той же статье Next сам перечисляет next-intl среди библиотек.
- **next-intl 4.14.9** ([routing/configuration](https://github.com/amannn/next-intl/blob/main/docs/src/pages/docs/routing/configuration.mdx)):
  - `defineRouting({ locales, defaultLocale, localePrefix: 'always' | 'as-needed' | 'never', pathnames, localeDetection, localeCookie, alternateLinks })`;
  - proxy сам добавляет заголовок `Link: <…/en>; rel="alternate"; hreflang="en", …; hreflang="x-default"`;
  - статический рендеринг через `next/root-params` + `generateStaticParams`; `setRequestLocale` теперь legacy;
  - типизированные `Link`, `redirect`, `usePathname` из `createNavigation(routing)`;
  - ICU MessageFormat, `useFormatter` для `ro-RO` (числа, валюта lei, даты).

### Рекомендация
**next-intl:**
- `locales: ['ro', 'en']`, `defaultLocale: 'ro'`, `localePrefix: 'always'` (симметричные `/ro/...` и `/en/...`).
- `pathnames`: `'/estimate': { ro: '/estimare', en: '/estimate' }` и шаги.
- `/` → 307 на лучшую локаль; `x-default` = `/`.

**hreflang продублировать в HTML** (`generateMetadata().alternates.languages` + `canonical`) и в `sitemap.ts` с `alternates`. Заголовок `Link` может потеряться за CDN или прокси (Предположение), а HTML-теги надёжнее.

**Файлы сообщений:** `messages/ro.json`, `messages/en.json`. Ключи ошибок валидации и объяснений сметы лежат там же (`validation.*`, `rules.*`, `pricing.lines.*`).

### Открытые вопросы
- Cookie `NEXT_LOCALE`. Нужно ли ей согласие по ePrivacy (Legea 506/2004)? Скорее «функциональная» (Предположение). Проще всего `localeCookie: false` и определять язык только по пути и `Accept-Language`. Сверить с R6.
- Нужен ли третий язык (RU или HU для Клужа)? Архитектура это позволяет без изменений.

---

## 6. UI-компоненты и стили

### Варианты
- **shadcn/ui (CLI 4.21).** Код копируется в проект. С 2026-07-02 **база по умолчанию — Base UI** (`@base-ui/react` 1.8.0), Radix поддерживается полностью. С 2026-07-17 появилась база **React Aria** (`npx shadcn@latest init --base aria`) ([changelog](https://github.com/shadcn-ui/ui/tree/main/apps/v4/content/docs/changelog)). Плюс — быстрый старт. Минус — узнаваемый «SaaS-вид» по умолчанию (8 стилей пресетов). Его придётся переписывать почти целиком, иначе нарушим требование «не шаблонно».
- **Radix Primitives (radix-ui 1.7.0).** Проверенные headless-диалоги, popover, radio. Слабее в полях ввода: нет NumberField, DatePicker, ComboBox с локализацией.
- **React Aria Components 1.21.1 (Adobe).** Самая сильная доступность и i18n:
  - `NumberField` с локалью `ro-RO`;
  - `DatePicker` и `Calendar` с румынским календарём и первым днём недели;
  - `ComboBox`, `RadioGroup` (плитки выбора), `Slider`;
  - корректный touch на мобильных;
  - состояния через `data-*` атрибуты, удобно стилизовать в Tailwind v4.
- **Свой дизайн-слой целиком с нуля.** Дорого и рискованно для доступности.
- **Стили:** Tailwind v4.3 (по умолчанию в create-next-app, токены через `@theme` и CSS-переменные, без рантайма) или CSS Modules (без зависимостей, но токены и состояния пишутся вручную).

### Рекомендация
**Свой дизайн-слой `src/ui/*` поверх React Aria Components + Tailwind v4.**
- Токены (цвет, типографика, радиусы, отступы) — в `@theme`.
- Свои компоненты: `ChoiceTile`, `Stepper`, `BottomSheet`, `PriceRange`, `EstimateLine`.
- Отдельные компоненты можно взять из shadcn с базой `aria` как исходный код и полностью перестилизовать.
- Иконки — только нужные (lucide-react 1.52, импорт по одной).
- a11y-проверки: `@axe-core/playwright` в e2e (см. docs/tooling.md).

### Открытые вопросы
- Фирменный стиль компании (шрифт, цвета) — входные данные для дизайн-плана (Impeccable).

---

## 7. Хостинг

### Варианты
- **Vercel.**
  - Лучший DX: preview на каждый PR, глобальный CDN, Next поддерживается полностью (verified adapter).
  - Минусы: американская компания, передача данных идёт по DPF/SCC; в Hobby запрещено коммерческое использование, нужен Pro (Предположение: около $20 за участника в месяц плюс плата сверх лимитов; vercel.com недоступен).
  - Go API всё равно будет жить в другом месте.
- **Свой сервер в ЕС (Hetzner Cloud, Falkenstein или Nuremberg; или румынский хостинг) + Docker.**
  - По документации Next: Docker даёт все функции. Image Optimization работает с `next start`, на glibc может потребоваться настройка аллокатора для sharp. ISR и кэш хранятся на локальном диске одной инстанции. Рекомендован reverse proxy перед Node ([self-hosting.mdx](https://nextjs.org/docs/app/guides/self-hosting), [output.mdx](https://nextjs.org/docs/app/api-reference/config/next-config-js/output)).
  - Для standalone нужно скопировать `public/` и `.next/static/`.
  - Цена: Предположение — самый дешёвый x86 или ARM инстанс Hetzner стоит порядка 4–8 €/мес.
  - Данные остаются в ЕС, у немецкого провайдера, по DPA. Будущий Go API и БД можно разместить там же, в `docker compose`.
  - Задержка до Клужа — Предположение, около 25–40 мс из Германии.
- **Румынский хостинг.** Данные в Румынии. Обычно меньше автоматизации (API, снапшоты); проверить поддержку Docker и IPv6. Конкретных провайдеров в этой сессии не проверяли.

### Рекомендация
**Hetzner Cloud (DE) + Docker:**
- Next `standalone` + Caddy (автоматический TLS, HTTP/3, сжатие);
- деплой из GitHub Actions: образ → GHCR → `ssh docker compose pull && up -d`;
- позже — в тот же compose Go API (+ Postgres).

Почему не Vercel: в проекте всё равно появится свой сервер для Go; GDPR проще, когда всё в одном месте ЕС; стоимость предсказуемая. При необходимости спереди ставится EU-CDN для статики (Предположение: Bunny CDN, компания из ЕС). Preview-окружения в MVP не делаем или делаем отдельным compose-проектом на поддомене.

**Важно про ARM.** Если выбрать ARM-инстанс (Hetzner CAX), посмотрите §8.6 про FMA в Go. Тесты golden vectors нужно гонять на той же архитектуре.

### Открытые вопросы
- Бюджет и кто будет обслуживать сервер (обновления, бэкапы, мониторинг). Если ops-ресурса нет совсем, Vercel Pro для фронта — допустимый компромисс: MVP не хранит персональные данные, submit — заглушка.
- Нужен ли хостинг именно в Румынии по требованиям заказчика?

---

## 8. Контракт: Zod → OpenAPI → Go

### 8.1. Генератор OpenAPI из Zod

| | `z.toJSONSchema()` (встроен в Zod 4) | `zod-openapi` 6.0.2 (samchungy) | `@asteasolutions/zod-to-openapi` 9.1.0 |
|---|---|---|---|
| Что выдаёт | JSON Schema: draft-2020-12 (по умолчанию), draft-07, draft-04, `openapi-3.0` | Полный OpenAPI-документ (paths, components) | Полный OpenAPI-документ через `OpenAPIRegistry` |
| Версии OpenAPI | только схемы, без документа | **3.1.0 / 3.1.1** (минимум 3.1) | 3.0 (`OpenApiGeneratorV3`), 3.1 (`V31`), 3.2 (`V32`) |
| Метаданные | `.meta({ id, description, examples })`, `z.globalRegistry` | нативный `.meta()`, без monkey-patch; построен на `z.toJSONSchema` | `.openapi()` после `extendZodWithOpenApi(z)`; с v8 читает и `.meta()` |
| Вход и выход (default, pipe) | опция `io: 'input' \| 'output'` | **автоматически**: request → input, response → output; суффикс `Output` для схем, которые есть в обоих | вручную |
| Discriminated union | `oneOf` | `oneOf` + `discriminator.mapping`, если у вариантов есть `id` | `discriminator` mapping, если все варианты зарегистрированы |

Источники: [zod docs/json-schema.mdx](https://github.com/colinhacks/zod/blob/main/packages/docs/content/json-schema.mdx), README [zod-openapi](https://www.npmjs.com/package/zod-openapi), README [zod-to-openapi](https://www.npmjs.com/package/@asteasolutions/zod-to-openapi).

**Ограничения, общие для всех трёх** (Zod строит JSON Schema сам, остальные — поверх него или по той же логике):
- **Непредставимые типы бросают ошибку:** `transform`, `z.date()`, `bigint`, `int64`, `map`, `set`, `undefined`, `void`, `custom`, `nan`. Обходится опцией `unrepresentable: 'any'` или своим обработчиком, но лучше вообще не использовать их в контракте.
- **`refine` и `superRefine` в схему не попадают.** Это кросс-полевые правила, их не видит ни OpenAPI, ни Go-генератор.
- **`pipe` и `default`** различаются на входе и выходе. В input-схеме поле с `.default()` необязательное и имеет `default`, в output — обязательное.
  - Предположение: oapi-codegen не подставляет `default` в Go-структуру, сервер обязан применять значения по умолчанию сам.
- **`z.coerce.*`** — тип входа не совпадает с типом выхода. В контракте не используем, только в слое формы.
- **Условные поля** («если лифт есть — укажи размер»). В JSON Schema `if/then` есть, но генераторы Go их не понимают. Выражаем через **discriminated union по тегу**, например `access: { kind: 'house' } | { kind: 'apartment'; floor; elevator: 'none' | 'small' | 'large' | 'unknown' }`. Если тегом не выразить — через правила (§2) и валидацию на сервере.
- `z.object()` даёт `additionalProperties: false` в output. В input-режиме это поле не выставляется.

**Рекомендация: `zod-openapi` 6.x, `openapi: '3.1.0'`.**
- Использует тот же движок, что `z.toJSONSchema`, поэтому семантика совпадает с Zod.
- Работает через нативный `.meta()`, без глобального патча `z`.
- Сам разделяет схемы на вход и выход.

Запасной вариант, если oapi-codegen не справится с 3.1-спекой: перейти на `@asteasolutions/zod-to-openapi` с `OpenApiGeneratorV3` (3.0) — меняется только скрипт генерации, схемы остаются те же.

**«Безопасное подмножество» Zod для `contract/`** (проверяем тестом-линтером и тем, что генератор бросает ошибку):
- без `transform`, `preprocess`, `coerce`, `date`, `custom`;
- даты — `z.iso.date()` и `z.iso.datetime()` (строки);
- деньги — `z.int()` в бани (1 RON = 100 bani);
- везде `.meta({ id })` для стабильных имён компонентов;
- `optional` вместо `nullable`, где возможно.

### 8.2. OpenAPI 3.1 или 3.0 и поддержка в Go

- **oapi-codegen v2.8.0 (2026-07-17):** «After several years of requests… adding OpenAPI 3.1 support». Есть webhooks, callbacks, nullability `type: [T, "null"]`, enum через `oneOf`. При этом «This is initial support». Требуется **Go 1.25** и runtime ≥1.6.0. Scopes безопасности по умолчанию больше не генерируются ([release v2.8.0](https://github.com/oapi-codegen/oapi-codegen/releases/tag/v2.8.0)).
  - Генерирует модели, `std-http-server` (net/http, Go ≥1.22 mux), chi, echo, gin, fiber и **strict-server**: типизированные `RequestObject` и `ResponseObject`, без ручного разбора JSON.
- **ogen v1.24.0.** Валидация генерируется в код, есть sum-типы для `oneOf` с discriminator, обёртки `OptNilT`, свой роутер и быстрый JSON. Из 3.1 по исходникам v1.24.0 поддерживает как минимум `type: ["T", "null"]` (сводится к `Nullable`) и `const`. Заявления о полной поддержке 3.1 в README нет, полный объём не проверен.
- **kin-openapi v0.149.0** поддерживает 3.1 (3.2 частично). На нём работает `oapi-codegen/nethttp-middleware` v1.2.0 — валидация входящих запросов по встроенной спеке (`openapi3filter`).

**Рекомендация.**
- **OpenAPI 3.1 + oapi-codegen v2.8 (`models` + `std-http-server` + `strict-server` + `embedded-spec`) + `nethttp-middleware`** для структурной валидации запросов.
- Обновить Go в окружении и CI до ≥1.25 (рекомендуется 1.27.x).
- С **первого дня** в CI есть job «сгенерировать Go и `go build`», чтобы несовместимость генератора с нашей спекой всплыла сразу, а не через полгода.
- ogen — запасной вариант, если «initial support» 3.1 окажется недостаточным (например, `oneOf` с discriminator).

### 8.3. Кросс-полевые правила: где они живут

- **Вариант A** — декларативные правила в общем JSON (JSONLogic), исполняются и в TS, и в Go.
- **Вариант B** — сервер единственный авторитет и перепроверяет всё сам.

**Рекомендация: B как принцип, A как механизм.**
- Сервер — единственный источник истины. Цена, задачи и допущения с клиента **не принимаются**: клиент отправляет только `OrderRequest` (ввод), сервер пересчитывает всё сам.
- Правила, которые влияют на расчёт («лифт неизвестен → маленький + задача»), сервер обязан применять **так же**, как клиент, иначе цены разойдутся. Поэтому `config/rules.json` и `config/steps.json` общие, Go исполняет их через `diegoholiveira/jsonlogic` и тот же словарь эффектов.
- Совпадение гарантируют rules-fixtures и golden vectors.
- Чисто UI-подсказки (`hint`) Go просто игнорирует.

### 8.4. Пересчёт цены на сервере

| | (1) Общие JSON-конфиги + формула на Go + golden vectors | (2) Один TS pricing-сервис на Node, Go его вызывает |
|---|---|---|
| Источник формулы | две реализации (TS и Go) | одна (TS) |
| Риск расхождения | есть, ловится golden vectors в CI | нет |
| Эксплуатация | один Go-бинарник | дополнительный Node-сервис, сетевой вызов, его отказ = отказ заказа |
| Сложность формулы | умеренная: объём → время → бригада × ставки + надбавки, есть в R3 и R4 | — |

**Рекомендация (1).** Формула — это сотни строк чистой арифметики по конфигу. Дублировать её дешевле, чем держать отдельный Node-рантайм рядом с Go. Golden vectors:
- `contract/fixtures/pricing/*.json` = `{ name, input: OrderRequest, configVersion, expected: Estimate }`. Около 30 случаев: быстрый и детальный режим, граничные этажи, лифт unknown, ящики, минимальный заказ, округления.
- Генерируются скриптом из TS (`pnpm vectors:gen`), **коммитятся** и проходят ревью в PR как снимки. Ключевые 5–7 случаев сверяются вручную с таблицей из R4.
- Vitest проверяет `estimate(input) deepEqual expected`. `go test` читает те же файлы (`os.ReadFile("../contract/fixtures/...")`; `go:embed` не умеет читать родительские каталоги) и сверяет точно, **без допусков**.
- Смета включает `configVersion` и `rulesVersion`, чтобы понимать, каким конфигом посчитана цена.

### 8.5. Конфиги
- R3 и R4 хранят числа в обёртке `{ value, unit, source, verified, note }`. Это удобно для аудита.
- Zod-схема `PricingConfigSchema` в `contract/config/` валидирует файл. Из неё же генерируется `contract/jsonschema/pricing-config.schema.json` для Go (валидация при старте) и для подсказок в редакторе (`$schema`).
- Расчёт работает с «развёрнутым» объектом (`unwrap(cfg)` → только `value`). На Go — структура с полем `Value`.

### 8.6. Числовая детерминированность TS и Go (важно)
- Все суммы — **целые бани**. Коэффициенты — дроби из конфига.
- Округления явные и в одном месте: `roundHalfUp`, `ceilTo(step)`. Реализации идентичны в TS и Go, у каждой свой тест.
- JS `Math.round` округляет .5 вверх (к +∞), Go `math.Round` — от нуля. Для положительных чисел результат одинаковый, но лучше иметь свою функцию.
- **Go может сливать `x*y + z` в одну FMA-инструкцию**: спецификация это разрешает. На arm64 так и происходит; на amd64 с базовым `GOAMD64=v1` — нет, при `v3` — возможно (Предположение). Тогда результат отличается от JS в последнем бите, а после округления иногда на 1 лей. Защита: явное приведение `float64(x*y) + z` (по спецификации Go оно запрещает слияние) и прогон golden tests на целевой архитектуре сервера.
  - Предположение: в GitHub Actions есть `ubuntu-24.04-arm` раннеры для этой проверки.

### 8.7. CI: проверка контракта

```yaml
# .github/workflows/ci.yml (набросок)
name: ci
on: [push, pull_request]
jobs:
  web:
    runs-on: ubuntu-24.04
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with: { node-version: 24, cache: pnpm }   # Предположение: Node 24 = Active LTS
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint && pnpm typecheck
      - run: pnpm test                      # vitest: domain, rules, golden vectors, codec size
      - name: Contract is up to date
        run: |
          pnpm contract:gen                 # tsx scripts/gen-openapi.ts → contract/openapi.yaml + jsonschema/*
          pnpm vectors:check                # пересчитать fixtures и сравнить, без перезаписи
          git diff --exit-code -- contract/
      - run: pnpm dlx @redocly/cli@2 lint contract/openapi.yaml
      - run: pnpm build
      - run: pnpm exec playwright install --with-deps chromium && pnpm e2e   # + @axe-core/playwright

  go-contract:
    needs: web
    strategy: { matrix: { os: [ubuntu-24.04, ubuntu-24.04-arm] } }
    runs-on: ${{ matrix.os }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-go@v5
        with: { go-version: '1.27.x' }
      - working-directory: api
        run: |
          go generate ./...                 # go tool oapi-codegen -config oapi.yaml ../contract/openapi.yaml
          git diff --exit-code -- .         # сгенерированный Go тоже закоммичен
          go vet ./... && go test ./...     # golden vectors + rules fixtures
```

До появления Go-бэкенда job `go-contract` может состоять только из `api/contractcheck/`: модуль, который генерирует код и компилирует его вместе с тестом golden vectors на эталонной Go-реализации формулы. Предположение: заводим его вместе с первым эндпоинтом.

**Детерминированный вывод `openapi.yaml`.** Ключи сортировать, `yaml.stringify(doc, { sortMapEntries: true })`, без дат и версий сборки внутри. Иначе `git diff` будет «шуметь».

---

## 9. Итог: рекомендуемый стек

| Пакет | Версия | Зачем |
|---|---|---|
| next | 16.4.x | App Router, SSG, `output: 'standalone'`, Cache Components (по умолчанию) |
| react / react-dom | 19.3.x | |
| typescript | 6.0.x | 7.x пока не поддержан typescript-eslint |
| next-intl | 4.14.x | RO/EN, локализованные пути, hreflang, ICU, форматирование `ro-RO` |
| zod | 4.6.x | единый источник схем: контракт, формы, конфиги; локаль `ro` |
| react-hook-form + @hookform/resolvers | 7.89.x + 5.9.x | формы шагов, `zodResolver` |
| zustand | 5.0.x | store черновика + `persist` (localStorage и sessionStorage) |
| json-logic-js | 2.0.5 | условия правил и видимости шагов (TS); в Go — jsonlogic v3.10 |
| lz-string | 1.5.0 | сжатие токена «поделиться сметой» в `#fragment` |
| react-aria-components | 1.21.x | headless-компоненты с сильной a11y и i18n |
| tailwindcss | 4.3.x | токены дизайн-системы через `@theme`, без рантайма |
| lucide-react | 1.52.x | иконки (по одной) |
| zod-openapi | 6.0.x | Zod → OpenAPI 3.1 (`openapi.yaml`) |
| yaml, tsx | 2.9.x, 4.23.x | скрипты генерации |
| @redocly/cli | 2.59.x | линт OpenAPI в CI |
| vitest | 5.0.x | unit: domain, rules, golden vectors, кодек |
| @playwright/test + @axe-core/playwright | 1.63.x + 4.13.x | e2e, скриншоты 375/1280, a11y |
| @next/bundle-analyzer | 16.4.x | бюджет JS маршрута конфигуратора |
| Go | ≥1.25 (1.27.x) | будущий API |
| oapi-codegen v2 + runtime | v2.8.0 + v1.7.0 | Go-модели + std net/http strict server |
| oapi-codegen/nethttp-middleware (+ kin-openapi) | v1.2.0 (+ v0.149.0) | валидация запросов по спеке |
| diegoholiveira/jsonlogic/v3 | v3.10.1 | те же правила на Go |

Не берём в MVP: XState (вернуться при появлении асинхронных процессов), nuqs (нет сложного query-состояния), shadcn как основу (только как донор кода с базой `aria`), Vercel.

---

## 10. Структура проекта

```
mutabil/
├─ config/                         # ДАННЫЕ, общие для TS и Go (единственный источник ставок)
│  ├─ pricing.json                 # из R4 (value/unit/source/verified/note)
│  ├─ time.json                    # из R3
│  ├─ catalog.items.json           # мебель/предметы → объём
│  ├─ steps.json                   # шаги мастера, слаги ro/en, visibleIf (JSONLogic)
│  └─ rules.json                   # when (JSONLogic) → then (эффекты)
├─ contract/                       # КОНТРАКТ (Zod — источник правды)
│  ├─ schemas/                     # order-request.ts, estimate.ts, slots.ts, problem.ts, common.ts
│  ├─ config/                      # pricing-config.ts, time-config.ts, rules.ts, steps.ts (Zod для config/*.json)
│  ├─ openapi.ts                   # createDocument({ openapi: '3.1.0', paths })
│  ├─ openapi.yaml                 # СГЕНЕРИРОВАН, закоммичен, проверяется git diff
│  ├─ jsonschema/                  # СГЕНЕРИРОВАН: *.schema.json для конфигов
│  └─ fixtures/
│     ├─ pricing/*.json            # golden vectors: input → expected Estimate
│     └─ rules/*.json              # rule + data → expected effects
├─ messages/
│  ├─ ro.json                      # UI + validation.* + rules.* + pricing.lines.*
│  └─ en.json
├─ scripts/                        # gen-openapi.ts, gen-vectors.ts, check-vectors.ts
├─ src/
│  ├─ app/
│  │  ├─ [locale]/
│  │  │  ├─ layout.tsx             # <html lang>, NextIntlClientProvider, generateStaticParams
│  │  │  ├─ page.tsx               # лендинг (Server Component, SEO)
│  │  │  ├─ (marketing)/…          # услуги, районы Клужа, FAQ — SSG
│  │  │  └─ estimate/              # путь локализуется: /ro/estimare, /en/estimate
│  │  │     ├─ layout.tsx          # <ConfiguratorProvider> (store + OrderService) — живёт между шагами
│  │  │     ├─ [[...step]]/page.tsx  # оболочка шага (SSG по всем слагам), клиентский остров
│  │  │     └─ result/page.tsx     # смета + декодирование #s=
│  │  ├─ sitemap.ts, robots.ts
│  ├─ proxy.ts                     # next-intl (бывший middleware.ts)
│  ├─ i18n/                        # routing.ts (defineRouting, pathnames), request.ts, navigation.ts
│  ├─ domain/                      # ЧИСТЫЙ TS: без react/next/window (ESLint no-restricted-imports)
│  │  ├─ pricing/                  # estimate(), lines, rounding (bani), explain-keys
│  │  ├─ time/                     # формула времени (R3)
│  │  ├─ rules/                    # jsonlogic subset + интерпретатор эффектов
│  │  ├─ flow/                     # visibleSteps, nextStep, firstIncomplete
│  │  └─ share/                    # codec (compact ↔ JSON ↔ lz), migrations
│  ├─ services/
│  │  ├─ order-service.ts          # interface OrderService
│  │  ├─ mock-order-service.ts     # console/log + задержка + фейковый id
│  │  ├─ http-order-service.ts     # fetch к Go API (позже), ответы через Zod safeParse
│  │  └─ index.ts                  # фабрика по NEXT_PUBLIC_ORDER_API=mock|http
│  ├─ state/                       # order-store.ts (zustand), persistence.ts
│  ├─ features/configurator/       # Step*.tsx, EstimateView, QuickMode, ShareButton
│  ├─ ui/                          # дизайн-система поверх react-aria-components
│  └─ styles/globals.css           # @import "tailwindcss"; @theme { токены }
├─ tests/
│  ├─ unit/                        # domain/*, codec size ≤ 1000 символов
│  ├─ golden/                      # прогон contract/fixtures/**
│  └─ e2e/                         # playwright + axe, 375px и 1280px
└─ api/                            # будущий Go-модуль (или отдельный репозиторий — открытый вопрос)
   ├─ oapi.yaml                    # конфиг oapi-codegen
   ├─ internal/gen/                # СГЕНЕРИРОВАН
   ├─ internal/pricing/            # формула на Go (читает ../config/*.json)
   └─ internal/rules/              # jsonlogic + эффекты
```

Интерфейс сервиса (Go API подключается заменой реализации, UI не меняется):

```ts
// src/services/order-service.ts
import type { OrderRequest, SubmitResult, SlotQuery, Slot } from '@/contract/schemas';
export interface OrderService {
  submitOrder(req: OrderRequest, opts?: { signal?: AbortSignal }): Promise<SubmitResult>;
  getSlots(q: SlotQuery, opts?: { signal?: AbortSignal }): Promise<Slot[]>;
}
```

---

## 11. Конвейер контракта

```
                      ┌──────────────── contract/schemas/*.ts (Zod 4) ─────────────────┐
                      │  OrderRequest · Estimate · Slot · Problem   (.meta({ id }))    │
                      └───────┬───────────────────────┬─────────────────────┬──────────┘
                              │ z.infer               │ zod-openapi         │ z.toJSONSchema
                              ▼                       ▼                     ▼
               TS-типы: формы, store,        contract/openapi.yaml   contract/jsonschema/
               OrderService, safeParse        (OpenAPI 3.1)           *.schema.json (конфиги)
                                                      │  CI: git diff --exit-code
                                                      ▼
                                        oapi-codegen v2.8 (go generate)
                                   ┌──────────────────┴───────────────────┐
                                   ▼                                      ▼
                       Go models + strict server              embedded spec → nethttp-middleware
                       (std net/http handlers)                (kin-openapi: структура запроса)

   config/pricing.json · time.json · catalog.json · rules.json · steps.json   (ОБЩИЕ ДАННЫЕ)
          │                                                     │
          ▼                                                     ▼
   src/domain (TS, чистый)                                api/internal (Go)
   rules → effectiveOrder → estimate()                    rules → effectiveOrder → estimate()
          │                                                     │
          └──────────► contract/fixtures/{pricing,rules}/*.json ◄┘
                       golden vectors: Vitest и go test, точное равенство, amd64 + arm64
```

## 12. Где живут бизнес-правила

| Что | Где | Кто исполняет |
|---|---|---|
| Ставки, коэффициенты, округления, минималки | `config/pricing.json`, `config/time.json` | TS `domain/pricing` и Go `internal/pricing` |
| Структура данных (типы, enum, диапазоны, обязательность) | `contract/schemas` (Zod) → OpenAPI | клиент (Zod), сервер (middleware + strict types) |
| Условные поля, выражаемые тегом | discriminated union в Zod | обе стороны через схему |
| Кросс-полевые и процессные правила (ящики → выезд; лифт unknown → small + задача) | `config/rules.json` (JSONLogic + эффекты) | TS `domain/rules` (UI и предпросмотр) и Go (**авторитетно**) |
| Видимость и порядок шагов | `config/steps.json` | только TS (`domain/flow`) |
| Тексты объяснений и ошибок | `messages/*.json` (ключи из правил и схем) | UI; сервер возвращает ключи |
| Итоговая цена | пересчитывается **только** сервером при submit; на клиенте — предпросмотр | Go (после MVP); в MVP — mock |

---

## 13. Заметки для Angular / .NET-разработчика

- **Server Components и Client Components.** Server Component похож на шаблон, который рендерится при сборке или на сервере, как Razor-страница или Angular SSR/prerender без гидрации. В браузер его JS не уходит, хуков и событий в нём нет. `'use client'` отмечает границу интерактивного «острова». Такой компонент **тоже** рендерится в HTML при сборке и затем гидрируется, примерно как Angular hydration. Правило: страница — серверная, мастер — клиентский.
- **Хуки и сервисы.** Хук (`useX()`) — функция, которую вызывают только в теле компонента. Это ближе к `inject()` в Angular 14+, чем к классу-сервису. Состояние хука принадлежит конкретному экземпляру компонента.
- **Context, store и DI.**
  - `React.createContext` + `<Provider value>` в layout аналогичен `providers: [...]` на уровне маршрута или компонента, а `useContext(Ctx)` — `inject(TOKEN)`. Так подключаем `OrderService` (mock или http) — это та же идея, что `InjectionToken` + `useClass` или `services.AddScoped<IOrderService, MockOrderService>()` в .NET.
  - Zustand-store похож на `@Injectable({ providedIn: 'root' })` с signals. Компоненты подписываются селектором: `useOrderStore(s => s.from.floor)`, ре-рендер происходит только при изменении этого значения.
- **Ре-рендер.** Аналога zone.js нет. Компонент перерисовывается, когда меняются его state, props или context. `useMemo` и `useCallback` похожи на `computed()` и мемоизацию; React Compiler умеет делать это автоматически, но в MVP он выключен.
- **layout.tsx** похож на родительский компонент с `<router-outlet>`: при переходах между дочерними маршрутами он **не пересоздаётся**, поэтому store мастера живёт там.
- **proxy.ts** (бывший middleware) похож на ASP.NET middleware или Angular HTTP interceptor, но на уровне входящего HTTP-запроса к Next: редирект на локаль, заголовки.
- **`generateStaticParams`** похож на список маршрутов для Angular prerender (`routes.txt` / `getPrerenderParams`).
- **Zod** заменяет сразу DTO-классы + DataAnnotations/FluentValidation + генерацию Swagger. Тип выводится из схемы (`z.infer`), а не наоборот.
- **RHF** — аналог Reactive Forms, но поля по умолчанию неуправляемые: значение живёт в DOM, а не в `FormControl`. Поэтому ре-рендеров при наборе нет.

---

## 14. Сводные открытые вопросы
1. Go-бэкенд в этом же репозитории (`api/`) или в отдельном? От этого зависят пути к `config/` и `contract/fixtures/` и CI. Рекомендую монорепозиторий.
2. Старые ссылки на смету после смены тарифов: новая цена с пометкой или снимок цены?
3. Хостинг: Hetzner DE, румынский провайдер или Vercel Pro (если нет ops-ресурса). Кто обслуживает сервер?
4. Cookie локали и аналитика: нужен ли баннер согласия (R6)?
5. Бюджет JS маршрута конфигуратора. Предположение: ≤150 КБ gzip. Если не укладываемся — `zod/mini` на клиенте и ленивые шаги.
6. На прототипе проверить совместимость next-intl 4.14 и `cacheComponents` в Next 16.4, а также генерацию oapi-codegen 2.8 по нашей 3.1-спеке с discriminated union.
