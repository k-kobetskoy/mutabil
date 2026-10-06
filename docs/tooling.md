# Шаг 0. Инструменты для Claude Code в этой задаче

Статус (обновлено):
- Одобрено: Context7, Playwright MCP — карточка установки показана, включаются на аккаунте claude.ai (начнут работать в новых сессиях).
- **Impeccable 4.5.0** (вместо frontend-design) — установлен в `.claude/skills/impeccable` и `.claude/agents/impeccable-*.md` **без хуков**. Источник: `github.com/pbakaus/impeccable` @ `cf3d2fa`, каталог `plugin/` (Apache 2.0). Официальный `npx impeccable install` не прошёл через прокси (403 на подписанный бандл), поэтому файлы скопированы вручную. Бинарник движка скачивается лаунчером при первом запуске в `~/.impeccable/bin/`. Обновление: повторить копирование из нового коммита или `npx impeccable update --no-hooks`.
- frontend-design не ставим (Impeccable его надмножество).
- Axe: вместо плагина — `@axe-core/playwright` в e2e.

Что уже есть в окружении (ставить не нужно):

- Node 22, npm 10, pnpm 10, Go 1.24 — хватает для Next.js, тестов и проверки генерации Go-кода (oapi-codegen).
- Chromium для Playwright уже лежит в `/opt/pw-browsers`. Значит, `@playwright/test` можно добавить как обычную dev-зависимость проекта и снимать скриншоты/гонять e2e без плагинов.
- Встроенные WebSearch/WebFetch — ими пользуются сабагенты исследования.
- Встроенные skills: `engineering:testing-strategy`, `engineering:architecture` (ADR), `engineering:code-review`, `security-review`, `simplify`, `run` (запуск приложения и скриншоты).

## Предлагаю (по убыванию пользы)

| # | Что | Тип | Зачем в этой задаче | Как установить | Рекомендация |
|---|-----|-----|---------------------|----------------|--------------|
| 1 | **frontend-design** (Anthropic) | skill-плагин | Руководство по нешаблонной вёрстке: типографика, палитра, композиция, анти-паттерны «SaaS-карточек». Прямо отвечает требованию «не делать шаблонный вид». | claude.ai → Plugins → Anthropic Directory → `frontend-design` → Enable (или `/plugin install frontend-design` в CLI) | **Да** |
| 2 | **Context7** (Upstash) | MCP | Актуальная документация по версиям: Next.js App Router, next-intl, Zod 4, React Hook Form, oapi-codegen. Снижает риск, что я напишу код под устаревший API. | Plugins → `context7` (удалённый MCP `https://mcp.context7.com/mcp`, нужна авторизация Context7) | **Да** |
| 3 | **Playwright MCP** (Microsoft) | MCP | Интерактивная самопроверка: открыть страницу, пройти конфигуратор, сделать скриншоты на 375px и 1280px, проверить фокус с клавиатуры. Дополняет `@playwright/test` (тот — для автоматических e2e в CI). | Plugins → `playwright` | **Да**, но можно обойтись `@playwright/test` + скриптами скриншотов |
| 4 | **Axe Accessibility** (Deque) | MCP + skills | Автоматический аудит WCAG (контраст, label, клавиатура) с циклом «скан → правка → проверка». Требование доступности в ТЗ есть. | Plugins → `Axe Accessibility` | Опционально. Альтернатива без плагина: `@axe-core/playwright` в e2e-тестах — **предлагаю именно её** |
| 5 | **Design** (Anthropic) | skills | `ux-copy` (тексты кнопок «от лица пользователя»), `design-critique`, `accessibility-review`. Тянет за собой много MCP-коннекторов (Slack, Notion и т.д.), которые здесь не нужны. | Plugins → `Design` | Опционально, скорее нет |
| 6 | **Vercel** | MCP | Деплой и логи, если по итогам R5 выберем Vercel. | Connectors → Vercel | Отложить до решения по хостингу |

## Не предлагаю

- Figma MCP — макетов в Figma нет, дизайн-план сделаю текстом и ASCII.
- v0 — генерирует как раз шаблонный shadcn-вид, против требований.
- Плагины контрактного тестирования (Pact/42crunch) — избыточно для MVP: контракт проверяем генерацией OpenAPI + diff в CI.

## Что будет добавлено как зависимости проекта (не плагины, решается в R5)

`vitest` (юнит-тесты расчёта), `@playwright/test` + `@axe-core/playwright` (e2e, скриншоты, a11y), генератор OpenAPI из Zod, `oapi-codegen` (вызывается через `go run`, без глобальной установки).

## Замечание по окружению

Часть ранее подключённых MCP-серверов в этой сессии не подключилась (GitHub-плагин engineering, Slack, Notion и т.п. — ошибка прокси 403; desktop-commander — таймаут), а Datadog требует авторизации в настройках коннекторов claude.ai. Для этой задачи они не нужны.
