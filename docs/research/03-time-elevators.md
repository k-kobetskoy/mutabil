# R3. Оценка времени и лифты

> Статус: черновик исследования, все числа — плейсхолдеры (`"verified": false`).
> Конфиги: [`03-time.config.json`](./03-time.config.json) (коэффициенты формулы), [`03-elevators.config.json`](./03-elevators.config.json) (классы лифтов).
>
> **Ограничения исследования.** WebFetch в этой среде заблокирован прокси (egress), поэтому страницы целиком не открывались. Все факты ниже взяты из **сниппетов поисковой выдачи** (WebSearch) по указанным URL, а лимит поисковых запросов на сессию был исчерпан до конца работы. Значит: (1) таблицу ISO 4190-1 целиком прочитать не удалось, (2) часть значений помечена «по памяти, не подтверждено», (3) перед релизом каждую ссылку надо открыть вручную и сверить. Своё мнение и расчёты помечены **Предположение**.

---

## 1. Скорость погрузки и выгрузки

**Вопрос.** Сколько м³ в час переносит один грузчик (или вся бригада) при нормальных условиях?

**Варианты из источников**

| Источник | Что сказано | Перевод в м³/чел·ч |
|---|---|---|
| [ConsumerAffairs](https://www.consumeraffairs.com/movers/how-long-does-it-take-movers-to-load-a-truck.html) | Studio/1-bedroom: погрузка 2–3 ч бригадой из 2; 2-bedroom: 3–4 ч бригадой из 2; бригада из 3–4 работает на 25–50% быстрее; +20–30 мин на каждый пролёт лестницы, +15–30 мин на дальнюю парковку, буфер 30–60 мин | 2-bedroom ≈ 20–28 м³ (Предположение) → **~3–4 м³/чел·ч, только погрузка** |
| [HireAHelper](https://blog.hireahelper.com/tag/3-bedroom-house/) | 2–3-bedroom (800–1200 sq ft): погрузка 2 грузчика × 3 ч, выгрузка 2 × 2 ч | погрузка ~4, выгрузка ~6 м³/чел·ч; **выгрузка в ~1,3–1,5 раза быстрее** |
| [movingscam forum](https://www.movingscam.com/forum/viewtopic.php?p=30465) | «500 фунтов в час на человека — погрузка и выгрузка» (бригада из 4, один всё время в кузове) | при стандартной плотности 7 lb/ft³ (по памяти) ≈ 71 ft³ ≈ **2,0 м³/чел·ч на полный цикл** |
| [First Rate Moving, тариф MA](https://www.mass.gov/doc/first-rate-moving-32036-tariff/download) | 40 ft³/ч на человека, если от двери до машины ≤ 50 ft | ≈ **1,13 м³/чел·ч** (консервативно, вероятно полный цикл с упаковкой) |
| [Caddy Moving](https://www.caddymoving.com/blogs/caddy-shack-blog/how-many-movers-do-i-need-the-complete-guide-for-every-move-size) | «1000–1500 ft³ в час на грузчика» | явно завышено или ошибка единиц — **не использовать** |
| [Bellhops](https://www.getbellhops.com/blog/?p=106133), [YouMoveMe](https://youmoveme.com/how-many-movers-2-bedroom-apartment/) | 2-bedroom: 2 грузчика 6–8 ч, 3 грузчика 4–6 ч (весь переезд) | ~1,5–2 м³/чел·ч на полный цикл |
| [brig.ro (Клуж)](https://brig.ro/mutari/cluj-napoca) | Studio 2–3 ч, «apartament 2 camere» 4–6 ч, 3–4 комнаты 6–10 ч; 20–50 lei за этаж без лифта | ориентир местного рынка (весь заказ) |

Важно: румынская «2 camere» — это гостиная плюс одна спальня, то есть примерно американский 1-bedroom. Американские примеры для «2-bedroom» соответствуют румынским «3 camere».

**Рекомендация.** Считать погрузку и выгрузку отдельно, в чел·ч:
- `loadRatePerMover = 3.5 м³/чел·ч`, `unloadRatePerMover = 4.5 м³/чел·ч`. Это базовые условия: parter или большой лифт, переноска ≤ 10 м, мебель бригада упаковывает в одеяла, коробки собрал клиент.
- На полный цикл получается 1/(1/3.5+1/4.5) ≈ **1,97 м³/чел·ч**. Это сходится с правилом «500 lb/чел·ч» и лежит внутри вилки 1,1–2 м³ из других источников.
- **Предположение:** после первых 20–30 заказов откалибровать по факту, записывая для каждого заказа объём, бригаду, этажи и время погрузки и выгрузки.

## 2. Размер бригады и убывающая отдача

**Варианты**
- В примере [Bellhops](https://www.getbellhops.com/blog/?p=106133): 2 грузчика — 7 ч, 3 — 5 ч, 4 — 4 ч. Это 14, 15 и 16 чел·ч, то есть эффективность 1,0 / 0,93 / 0,875.
- [ConsumerAffairs](https://www.consumeraffairs.com/movers/how-long-does-it-take-movers-to-load-a-truck.html): бригада из 3–4 на 25–50% быстрее, чем из 2.
- [MoveitPro](https://help.moveitpro.com/en/articles/4952352-moving-hours-and-crew-size-calculation) складывает «время одного грузчика» по каждому предмету инвентаря, делит на размер бригады, а сам размер бригады выбирает по сумме чел·ч (0–10 чел·ч → 2 человека).

**Рекомендация.** `crewEfficiency = {1: 0.9, 2: 1.0, 3: 0.93, 4: 0.875, 5: 0.8, 6: 0.75}`. Эффективная бригада считается как `n × eff(n)`. Значения для 5–6 человек — экстраполяция (**Предположение**). Конфигуратор может предложить бригаду, при которой окно минимально при сопоставимой цене: Bellhops отмечает, что большая бригада часто стоит столько же или дешевле.

## 3. Этажи, лестницы, лифт, переноска, парковка

### 3.1 Этаж без лифта
- ConsumerAffairs: **+20–30 мин на пролёт** при погрузке 2-bedroom за 3–4 ч, то есть ≈ +10–12% на этаж.
- Германия: **+5–10% к цене за этаж без лифта**, а за 4-й этаж набегает 300–500 € ([meister-job.de](https://meister-job.de/was-kostet-umzugsunternehmen/)).
- [Storage Scholars](https://www.storagescholars.com/blog/how-many-hours-for-moving-help): «каждый пролёт добавляет час». Это верхняя граница.
- США: в одних тарифах этаж «включён в почасовую ставку», в других стоит $50–250 за пролёт, 7 ступеней = 1 пролёт ([Fast & Quality](https://www.mass.gov/doc/fast-quality-tariff-25hg50-tpd/download), [Pink Zebra](https://www.mass.gov/doc/pink-zebra-moving-of-boston-24hg09-tariff/download)). Тариф 400N на межштатных переездах отменил отдельные stair/elevator charges и заменил их средним по zip-коду ([movingscam](https://www.movingscam.com/forum/viewtopic.php?p=30634)).
- Клуж: 20–50 lei за этаж ([brig.ro](https://brig.ro/mutari/cluj-napoca)).

**Рекомендация:** `floorPenaltyNoLift = 0.10` за этаж к времени переноски на этом конце. Выше 4-го этажа штраф умножается на 1,5 из-за усталости (**Предположение**). Этаж считаем по-румынски: parter = 0. Если у входа ступени, «parter înalt» или лифт останавливается на полуплощадках, добавляем +0,5 этажа (**Предположение**: это часто встречается в панельных блоках, проверить на месте).

### 3.2 Тип лестницы
Числовых коэффициентов в источниках не нашлось. **Предположение:** `stairTypeFactor = normal 1.0 / narrow 1.2 / winding 1.35`, применяется к этажному штрафу. Узкая лестница — это марш примерно < 1 м или отсутствие просвета, через который можно поднять диван. Винтовая — старый фонд в центре Клужа.

### 3.3 Дистанция переноски (машина → подъезд)
- В тарифах США первые 75 ft (~23 м) бесплатны, дальше $75 за каждые 75 ft ([Fast & Quality](https://www.mass.gov/doc/fast-quality-tariff-25hg50-tpd/download)) или «каждые 50 ft сверх 75» × ставка за cwt ([movingscam](https://www.movingscam.com/forum/viewtopic.php?p=30634)). В Германии за переноску свыше 30 м берут доплату ([meister-job.de](https://meister-job.de/was-kostet-umzugsunternehmen/)).
- **Оценка (Предположение):** 20 м³ — это около 100 ходок по ~0,2 м³ с тележкой. Лишние 10 м в одну сторону дают 20 м туда-обратно, примерно +20 с на ходку, то есть ≈ 0,55 чел·ч, или 6–7% от ~8 чел·ч.
- **Рекомендация:** `freeCarryM = 10`, `carryPenaltyPer10m = 0.06`.

### 3.4 Парковка
ConsumerAffairs даёт +15–30 мин, если машину нельзя поставить у входа. **Рекомендация:** выбор в UI — `atEntrance / nearby / far / unknown / restrictedZone`. Каждый вариант задаёт предполагаемую дистанцию переноски (5/25/50/30 м), если клиент не указал её сам, и фиксированные минуты на конец заказа (0/0/15/10/20). Правила въезда в пешеходный центр Клужа в R3 не исследовались, их надо уточнить.

### 3.5 Лифт как фактор времени
**Рекомендация (Предположение):** множитель класса лифта к времени переноски `timeFactor`: small 1.20 / medium 1.10 / large 1.05, плюс `0.01 × этаж`. Обоснование: узкая дверь, ручные двери старых лифтов, грузчик едет вместе с грузом. Отдельно проверяем, не станет ли лифт узким местом (раздел 7.5).

## 4. Езда по Клужу
- По данным TomTom Traffic Index 2025, Клуж опустился на 7 позиций из-за долгих стройплощадок, а самые низкие скорости теперь не в 8:00 и 17:00, а **в 11:00–14:00** ([playtech.ro](https://playtech.ro/2025/indexul-de-trafic-2025-cum-arata-mobilitatea-oraselor-din-romania-orele-de-varf-pe-sosele/), [wall-street.ro](https://www.wall-street.ro/articol/auto/bucuresti-timisoara-cluj-napoca-si-iasi-orasele-cu-cel-mai-aglomerat-trafic.html)). Точной цифры «мин на 10 км» для Клужа в сниппетах не нашлось.
- **Предположение:** средняя скорость фургона 3,5 т по городу — 20 км/ч, дорожный км = км по прямой × 1,35, в пик × 1,3, минимум 15 мин.
- **Рекомендация:** в MVP считать по этим формулам, в v2 перейти на routing API с трафиком (OSRM, Google Distance Matrix) с прогнозом на время отъезда. Подачу машины с базы включать в окно или нет — бизнес-решение (`depotLegBillable`).

## 5. Разборка и сборка мебели

**Источники (время сборки из коробки):**
- PAX — 2–5 ч ([IKEA ID](https://www.ikea.co.id/en/inspirations/how-to-assemble-ikea-pax-wardrobe)), 2-дверный шкаф ~3 ч, большой 4–5 ч ([Airtasker UK](https://www.airtasker.com/uk/assembly/wardrobe-assembly/england)). Угловой PAX — 743 детали, ~10,5 ч ([рейтинг сложности](https://tagteam.harvard.edu/hub_feeds/2087/feed_items/18649502)).
- Кровать — 30–60 мин ([HomeGnome](https://homegnome.com/blog/assembly/how-long-does-furniture-assembly-take/)) или 60–90 мин, ottoman ближе к верху ([trade2base](https://www.trade2base.com/blog/flat-pack-assembly-costs-uk)). Стол — ~30 мин, стол с надстройкой 60–90 мин. KALLAX 4×4 — 45–60 мин плюс 15–20 мин на крепление к стене.
- Разборка: «примерно полчаса на предмет», для кровати с шкафом — от 30 мин до 1,5 ч ([MyJobQuote](https://www.myjobquote.co.uk/questions/dismantle-furniture)).

**Рекомендация.** Каталог в `itemWork.catalog` хранит `dis` и `asm` в чел·мин для бригады, которая видит модель повторно. Повторная сборка занимает около 50–70% от сборки из коробки (**Предположение**). Значения: двуспальная кровать 20/30, кровать с подъёмником 35/50, двухъярусная 40/60, PAX 100 — 45/90, PAX 150–200 — 70/140, классический 3-дверный шкаф 40/60, простой стол 15/20, стол с надстройкой 30/45, обеденный стол 10/10, угловой диван 10/10, стиральная машина 15/15, кронштейн ТВ 15/25. KALLAX по умолчанию возим целиком, без разборки.

Эти чел·ч идут в общий котёл бригады. Ограничение: если работы с мебелью много, нижняя граница времени — `ΣitemManH / maxParallelAssemblers(=2)`.

## 6. Буфер, гарантированное окно, сверхурочные

**Как это делают в отрасли.**
- В США ([FMCSA](https://www.fmcsa.dot.gov/consumer-protection/protect-your-move/what-binding-move-estimate)) есть три вида оценок. *Binding* — платите ровно оценку. *Binding not-to-exceed* — может выйти меньше, но не больше. *Non-binding* — при доставке можно потребовать не больше 110% оценки. Правило 110% не распространяется на услуги, которые клиент заказал после погрузки, и на услуги, «not reasonably contemplated» в оценке ([Senate doc](https://www.commerce.senate.gov/services/files/D1C7CB8E-7F7E-431F-AD92-703F0CC46D0C), [Maryland AG](https://www.marylandattorneygeneral.gov/CPD%20Documents/Tips-Publications/102.pdf)).
- ConsumerAffairs советует закладывать буфер 30–60 мин. Минимальный заказ обычно 2 ч ([Storage Scholars](https://www.storagescholars.com/blog/how-many-hours-for-moving-help)).

**Варианты буфера**
1. Мультипликативный: окно = оценка × 1,25. Просто, но малые заказы получают слишком узкое окно.
2. Аддитивный: оценка + 1 ч. Большие заказы получают слишком узкое окно.
3. **Квантиль логнормального распределения**. Если `ln(факт/оценка) ~ N(0, σ)`, то `Pq = оценка × exp(z_q·σ)`. При σ = 0,25 получаем P80 ×1,23, P85 ×1,30, P90 ×1,38. При σ = 0,30 — P85 ×1,37, P90 ×1,47.

**Рекомендация.**
- Используем вариант 3 с нижней границей варианта 2: `W = ceil_1h( max(T × exp(z·σ), T + 0.5, minBillable) )`, где z = 1,036 (P85), σ = 0,25 (**Предположение**).
- Неизвестность расширяет σ. Лифт неизвестен — +0,10, инвентарь задан только комнатами — +0,15, неизвестен тип лестницы или парковки — по +0,05.
- После 30+ заказов заменить σ на фактическое `std(ln(факт/оценка))`, лучше в разрезе типов заказов.
- Цель P85 — компромисс: P90 даёт слишком широкие окна, которые отпугивают, а P80 — частые споры о сверхурочных.

**Как сообщать (продуктовое предложение).** «Оценка: 6,5 ч. **Гарантируем: не дольше 8 ч** для указанного состава вещей и условий. Платите по факту с шагом 30 мин, но не больше чем за 8 ч. Если на месте окажется больше вещей, лифт не работает или нужна незаявленная разборка — каждые следующие 30 мин стоят X lei. Бригада предупредит до начала работ». Это аналог binding not-to-exceed с исключениями, как у правила 110%. Окно показываем в целых часах, оценку — с шагом 0,5 ч.

## 7. Лифты

### 7.1 Стандарты
- **ISO 4190-1:2010** задаёт размеры пассажирских лифтов классов I, II, III, VI ([ISO](https://www.iso.org/standard/43194.html), [iteh](https://iteh.es/catalog/standards/iso/c4535298-8394-4622-9941-c9b8514ff495/iso-4190-1-2010)). Полный текст платный, превью ANSI заблокировано. Межгосударственный аналог — ГОСТ 5746-2015 (= ISO 4190-1:2010), его предшественник — ГОСТ 5746-2003 (= ISO 4190-1:1999) ([prg.kz](https://prg.kz/m/amp/document/30088448)).
- **EN 81-20** (§5.4.2): площадь кабины ограничена по номинальной нагрузке (Table 6) ([Elevator World](https://elevatorworld.com/article/rated-load-and-maximum-available-car-area)). Внутренняя высота кабины ≥ 2 м, светлая высота дверей у типовых систем 2000–2400 мм ([KONE EN 81-20](https://www.kone.com.au/Images/pdf_Safety%20Standard%20EN81-20%20Fact%20Sheet_tcm46-29613.pdf), [Slycma](https://www.slycma.com/wp-content/uploads/jet-s-2voc-gb.pdf)). Число пассажиров = нагрузка / 75 кг с округлением вниз — **по памяти, не подтверждено поиском**.
- **Табличка в кабине.** По Директиве 2014/33/EU (в UK — Lifts Regulations 2016, Sch.1 §6) в каждой кабине обязательна хорошо видимая табличка с номинальной нагрузкой в кг и максимальным числом пассажиров ([legislation.gov.uk](https://legislation.gov.uk/uksi/2016/1093/schedule/1/paragraph/6/data.xht)). На этом стоит идентификация по фото (раздел 8).
- **EN 81-70** (доступность) задаёт типы кабин:

| Тип EN 81-70 | Нагрузка | Кабина (Ш×Г), мм | Дверь, мм | Источник |
|---|---|---|---|---|
| Type 1 | 450 кг | 1000×1250 (в ред. 2018 — 1000×1300) | ≥ 800 | [TKE fact sheet](https://www.tkelevator.com/media/austria/brochures_tke/tke-en8170-fact-sheet-atch-de-v082021.pdf), [Elevator World](https://elevatorworld.com/?p=71343) |
| Type 2 | 630 кг | 1100×1400 | ≥ 800; по местным правилам часто ≥ 900 | [KONE UK](https://kone.co.uk/tools-downloads/codes-and-standards/en81-70-compliant-solutions) |
| Type 3 | 1000 кг | 1100×2100 (носилки) | ≥ 900 | там же |
| Type 5 | 1275 кг | 1400×2000 или 2000×1400 | ≥ 1100 | там же |

**Проверка значений из задания:**
- 450 кг / 6 чел — 1000×1250, дверь 800: **подтверждено** (EN 81-70 Type 1).
- 630 кг / 8 чел — 1100×1400, дверь 800: **подтверждено** как ISO 4190-1 Class I, вход ≥ 800 по узкой стороне ([dnaop](https://dnaop.com/html/61164_12.html)). У EN 81-70 Type 2 в сниппете KONE стоит дверь ≥ 900.
- 1000 кг / 13 чел — 1100×2100, дверь 900: **подтверждено** (EN 81-70 Type 3; лист данных SL1000: 13 чел, 1100×2100, проём 900×2100–2200, [NBS](https://source.thenbs.com/product/evacuation-lift/2UdXdM9bDybEB9EPhnR3eY/vhCbWGyawyV2hLAUtgic9r)).
- 320 кг / 4 чел — ~900×1000, дверь 700: **не подтверждено** таблицей ISO. Близкий реальный пример — тендерная модель ECO4AA (300 кг, 4 чел, дверь 700, кабина 900×1000; сниппет [ecolift pdf](https://construnews.com/archivos/87239/ascensor_ecolift.pdf)). По памяти, в ISO 4190-1 класса I для 320 кг указано 1100×950 / дверь 800, но это не сходится с ограничением площади EN 81-20 (~0,95 м² для 320 кг) — **открытый вопрос**.
- В ГОСТ 5746-83 (СССР): 400 кг, кабина 1100×950, дверь 800, скорость 0,71 и 1,0 м/с ([dnaop](https://dnaop.com/html/42632_2.html)).

### 7.2 Румынский жилой фонд
- В домах P+3/P+4 до 1989 г. лифтов, как правило, нет. Без лифта живут около 3,5 млн румын в ~88 000 зданий. Для них принята программа «Lift pentru viață», строительный норматив 2008 г. требует лифт уже в 4-этажных домах ([ziarulprofit](https://www.ziarulprofit.ro/proiect-cu-mare-impact-social-adoptat-in-parlament-lift-pentru-viata-un-program-care-prevede-constructia-de-lifturi-in-exteriorul-blocurilor-vechi-sau-rampe-de-acces/), [capital.ro](https://www.capital.ro/schimbare-in-blocurile-cu-trei-sau-patru-etaje-veste-buna-pentru-milioane-de-romani-care-stau-la-bloc.html), [capital.ro — закон промульгирован](https://www.capital.ro/nicusor-dan-a-promulgat-legea-pentru-montarea-lifturilor-in-blocurile-fara-ascensor-milioane-de-romani-ar-putea-beneficia-de-acest-program.html)).
- По сниппетам: 9 из 10 блоков с лифтом построены в 1960–80-х, и почти ни одна асоциация не заменила лифт целиком; в одной из статей говорится, что >95% лифтов выработали ресурс ([adevarul](https://adevarul.ro/stiri-locale/buzau/lifturile-buzoiene-adevarate-custi-ale-groazei-806927.html), [capital.ro](https://www.capital.ro/romania-sta-pe-o-bomba-cu-ceas-romanii-care-stau-la-bloc-sunt-in-pericol.html)). Типичный лифт таких блоков (P+8/P+10) — **на 4 человека, 300–400 кг, дверь ~700 мм, кабина ~0,9–1,0 × 1,0–1,1 м**. Источник — спецификации модернизации старых блоков (дверь 700×2000, кабина ≥ 1005×1085, h 2200; [mtender](https://storage.mtender.gov.md/get/b3d5c2be-4ad9-4e69-b723-fe7ebaa128af-1563990892595), Молдова — тот же советский и восточноевропейский фонд). Ручные распашные шахтные двери плюс складные кабинные — **Предположение**, проверить фото в Клуже.
- **NP 057-02** (норматив проектирования жилых зданий, Ord. 1383/2002): от P+3 нужен минимум 1 лифт, выше P+5 — минимум 2, причём «так, чтобы можно было перевозить крупногабаритную мебель» ([avocatnet](https://www.avocatnet.ro/forum/discutie_475950/Regim-de-inaltime-al-unei-cladiri-si-dotarea-cu-ascensoare.html), по сниппету). Поэтому в новостройках выше P+5 часто есть второй, большой лифт. Обычно 630 кг / 8 чел или 1000 кг — **Предположение**, проверить по новостройкам Клужа (Florești, Borhanci, Sopor).
- **Правила дома.** Регламент асоциации (Legea 196/2018) может запрещать перевозку громоздких предметов лифтом и требовать защиты кабины. Штрафы по Legea 61/1991 — 500–1500 lei ([capital.ro](https://www.capital.ro/amenda-de-pana-la-1-500-de-lei-pentru-cei-care-folosesc-liftul-e-interzis-la-bloc-proprietarii-si-chiriasii-au-interdictie.html), [Legea 196/2018](https://www.avocatnet.ro/act-normativ-LEGE-nr-196-2018_225.html*15)). В UI нужен вопрос «Asociația permite mobila în lift? da / nu / nu știu». Ответ «nu» — крупное по лестнице.

### 7.3 Классы для конфигуратора

| id | Нагрузка / чел | Кабина Ш×Г×В, см | Дверь, см | Объём брутто, м³ | timeFactor | Ящиков за рейс | м³ за рейс (эфф.) |
|---|---|---|---|---|---|---|---|
| none | — | — | — | — | этажный штраф | — | — |
| small | 300–400 кг / 4–5 | 90×100×200 | 70×200 | 1,80 | 1,20 | 10 | 0,6 |
| medium | 450–800 кг / 6–10 | 100×125×210 | 80×200 | 2,63 | 1,10 | 15 | 1,1 |
| large | ≥1000 кг / 13+ | 110×210×210 | 90×200 | 4,85 | 1,05 | 30 | 2,2 |
| unknown | → small | | | | small + σ +0,10 | | |

Внутри класса берём самый маленький вариант, то есть оцениваем консервативно. Ящики считаем по 60×40×35 см (~0,08 м³) в стопках по 5 на тележке, с местом для грузчика (**Предположение**).

### 7.4 Что физически влезает
Геометрия (расчёт `node`): диагональ пола small/medium/large = 135/160/237 см. Пространственная диагональ = 241/264/317 см. Для тонкого предмета толщиной c диагональ пола даёт максимальную ширину: c=5 → 129/155/233; c=20 → 115/141/222; c=40 → 100/125/210 см.

**Алгоритм** (`fitAlgorithm` в конфиге). Габариты сортируем a ≥ b ≥ c, запас 5 см на дверь и высоту, 3 см на пол.
1. Предмет проходит дверь, если `c ≤ doorW − 5` и `b ≤ doorH − 5`.
2. Он помещается в кабину, если есть ориентация, где одна сторона v ≤ высоты кабины − 5, а две другие вписываются в прямоугольник пола с поворотом (проверка по углу θ).
3. Тонкие длинные предметы (c ≤ 5, b ≤ 60): панели шкафа, столешницы — ставим наклонно, если a ≤ `maxLongThinItemCm` (220/245/290).
4. Мягкие предметы (пенный матрас) — флаг `flexible`, +10% к длине.

Ограничение алгоритма: он не учитывает разворот в тамбуре перед лифтом. Для этого в UI вопрос «есть ли поворот перед дверью».

**Результат проверки** (скрипт по алгоритму):

| Предмет | small | medium | large |
|---|---|---|---|
| Холодильник 60×65×185 стоя | ✅ | ✅ | ✅ |
| Диван 2-местный 200×90×85 | ❌ дверь | ❌ дверь | ✅ впритык |
| Диван 3-местный 230×95×90 | ❌ дверь | ❌ дверь | ❌ дверь (85 < 90) |
| Матрас 160×200×25 | ❌ | ❌ | ✅ |
| Матрас 90×200×20 | ❌ (если не гнётся) | ✅ | ✅ |
| Каркас PAX 236×100×58 | ❌ | ❌ | ❌ → разбирать |
| KALLAX 4×4 147×147×39 | ❌ | ❌ | ✅ |
| Панель шкафа 200×58×2 | ✅ наклонно | ✅ | ✅ |
| Столешница 160×90×4 | ✅ | ✅ | ✅ |
| Стопка 5 ящиков на тележке | 2 стопки | 3 | 6 |

Вывод: в старом малом лифте диваны, двуспальные матрасы, KALLAX и собранные шкафы почти всегда идут **по лестнице**. В лифт уходят коробки, техника, стулья, разобранная мебель.

### 7.5 Рейсы и время рейса (проверка узкого места)
`trips = ceil(V_lift / m3PerTripEffective)`. Цикл рейса = загрузка и выгрузка кабины (90/120/180 с) + 2 × этажи × 2,75 м / 0,7 м/с + 2 × цикл дверей (15 с ручные, 8 с автоматические). Все параметры — **Предположение** (`liftThroughputCheck`). Пример: small, 4-й этаж, 17 м³ → 29 рейсов × 151 с ≈ **1,2 ч**. Время на конце не может быть меньше времени лифта. Для бригады до 4 человек лифт узким местом обычно не становится, для 5–6 человек на малом лифте — становится.

## 8. Как определить лифт, если клиент не знает
1. **Фото таблички в кабине** — основной способ. На ней обязательно указаны кг и число людей (Директива 2014/33/EU, EN 81-20). Класс: < 450 кг → small, 450–800 → medium, ≥ 1000 → large. Если видно только число людей, кг = чел × 75. В v2 можно распознавать фото OCR.
2. **Ширина двери рулеткой** — надёжнее AR. Подходит и AR-приложение: «Measure» на iOS или аналоги на Android; погрешность ±1–2 см — по памяти, не подтверждено. Правило: < 75 см → small, 75–89 → medium, ≥ 90 → large. Если глубина кабины ≥ 180 см → large. Полезно фото двери с листом A4 для масштаба.
3. **Администратор асоциации** знает тип лифта, разрешено ли возить мебель, нужна ли защита кабины и бронирование времени.
4. **Своя база адресов** — после каждого заказа бригада записывает: адрес (улица, номер, bloc, scara), класс лифта, ширину двери, фото таблички, работает ли лифт, остановки на полуэтажах, ступени у входа, парковку, дату и кто подтвердил. При повторном адресе форма заполняется сама, а неопределённость σ не добавляется.
5. Если ничего не известно — `unknown`: считаем как small и расширяем окно. Клиенту пишем: «Сфотографируйте табличку — окно станет короче».

## 9. Формула времени

Обозначения: e ∈ {orig, dest}; n — бригада; V — объём, м³. Все коэффициенты — из `03-time.config.json` и `03-elevators.config.json`.

```
eff        = crewEfficiency[n]
rate_e     = loadRatePerMover (orig) | unloadRatePerMover (dest)          # м³/чел·ч
floors_e   = этаж (parter = 0) + raisedGroundFloorEquivalent·[ступени/полуэтаж]

F_stairs_e = 1 + floorPenaltyNoLift · stairTypeFactor[type] ·
             ( min(floors, progressiveFromFloor) + max(0, floors − progressiveFromFloor) · progressiveMultiplier )
F_lift_e   = class.timeFactor + liftPerFloorPenalty · floors + floorPenaltyNoLift · raised   # если лифт есть и разрешён
F_carry_e  = 1 + carryPenaltyPer10m · max(0, carry_m − freeCarryM) / 10   # carry_m по умолчанию из parking.assumedCarryM

V_nofit_e  = Σ объёмов предметов, где fits(item, class) = false        # идут по лестнице
V_lift_e   = V − V_nofit_e                                               # (если лифта нет: V_lift = 0, V_nofit = V)

moveManH_e  = (V_lift_e · F_lift_e + V_nofit_e · F_stairs_e) · F_carry_e / rate_e
bulkyManH_e = N_bulky_by_stairs_e · bulkyStairsExtraManMinPerFloor · floors_e / 60
itemManH_e  = Σ catalog[item].dis (orig) | .asm (dest) / 60

T_e = max( (moveManH_e + bulkyManH_e + itemManH_e) / (n · eff),
           liftTrips_e · liftCycle_e,                     # узкое место лифта
           itemManH_e / maxParallelAssemblers )           # узкое место сборки

T_drive = max(minDriveMin/60, km_road / avgUrbanSpeedKmh · peakFactor)      # km_road = routing или прямая · detourFactor
T_fixed = (setupMin + teardownMin + liftProtectionMinPerLiftEnd · N_концов_с_лифтом + Σ parking.fixedMinutes) / 60

T  = T_orig + T_dest + T_drive + T_fixed                                     # ожидаемое (медиана)
σ  = sigmaLn + Σ uncertaintyAdders
W  = ceil_1h( max( T · exp(targetQuantileZ · σ), T + minBufferH, minBillableH ) )   # гарантированное окно
Показ: «≈ ceil_0.5h(T) ч, гарантируем до W ч; далее overtimeStepH × ставка»
```

Каждое слагаемое объяснимо, и в UI его можно развернуть в строку: «Погрузка 20 м³ · этаж 4 (малый лифт ×1,24) · переноска 15 м (×1,03) = 7,4 чел·ч».

## 10. Пример: «2 camere», ~20 м³, 4-й этаж с малым лифтом → 3-й этаж без лифта

Исходные данные (**Предположение**):
- Мебель: двуспальная кровать, 3-дверный шкаф, простой стол, обеденный стол (разборка 85 чел·мин, сборка 120 чел·мин); диван 2-местный и матрас 160×200 в лифт не входят.
- Объём, который не влезает в лифт: диван 1,5 + матрас 0,8 + длинные детали 0,7 = **3 м³**.
- Переноска: 15 м у старого дома, 25 м у нового. Парковка у входа или рядом.
- Дистанция 7 км, не в пик. Лестницы обычные.

| Шаг | Расчёт | Бригада 3 | Бригада 4 |
|---|---|---|---|
| Старый адрес: факторы | F_lift = 1,20 + 0,01·4 = 1,24; F_stairs = 1 + 0,10·4 = 1,40; F_carry = 1 + 0,06·0,5 = 1,03 | | |
| Переноска, чел·ч | (17·1,24 + 3·1,40)·1,03 / 3,5 | 7,44 | 7,44 |
| Крупное по лестнице | 2 предмета · 3 мин · 4 эт / 60 | 0,40 | 0,40 |
| Разборка | 85 / 60 | 1,42 | 1,42 |
| **T_orig** | 9,26 / (n·eff): 2,79 \| 3,50 | **3,32 ч** | **2,64 ч** |
| Проверка лифта | 29 рейсов × 151 с = 1,22 ч < 3,3 ч — лифт не узкое место | ok | ok |
| Новый адрес: факторы | F_stairs = 1 + 0,10·3 = 1,30; F_carry = 1 + 0,06·1,5 = 1,09 | | |
| Переноска, чел·ч | 20·1,30·1,09 / 4,5 | 6,30 | 6,30 |
| Крупное по лестнице | 2 · 3 · 3 / 60 | 0,30 | 0,30 |
| Сборка | 120 / 60 | 2,00 | 2,00 |
| **T_dest** | 8,60 / (n·eff) | **3,08 ч** | **2,46 ч** |
| Езда | 7 км / 20 км/ч | 0,35 ч | 0,35 ч |
| Фиксированное | 15 + 15 + 10 (защита лифта) мин | 0,67 ч | 0,67 ч |
| **T (ожидаемое)** | | **7,42 → «≈ 7,5 ч»** | **6,12 → «≈ 6,5 ч»** |
| Буфер P85, σ = 0,25 | × 1,296 | 9,61 | 7,93 |
| **Гарантированное окно W** | ceil до часа | **до 10 ч** | **до 8 ч** |
| Если лифт «не знаю» (σ = 0,35) | × 1,437 | до 11 ч | до 9 ч |
| Если разборку и сборку делает клиент | T = 6,19 / 5,15 | до 9 ч | до 7 ч |

Выводы:
1. Для такого заказа конфигуратор должен рекомендовать бригаду из 4 человек: окно на 2 ч короче, а чел·ч почти столько же (24,5 против 22).
2. Ожидаемое время выше рыночного ориентира Клужа «2 camere 4–6 ч» ([brig.ro](https://brig.ro/mutari/cluj-napoca)), потому что пример тяжёлый: этажи на обоих концах плюс 3,4 чел·ч мебельных работ. Если после калибровки на простых заказах (parter или лифт, без разборки) модель систематически даёт больше рынка, нужно поднимать `loadRatePerMover`.

## 11. «Предмет не влезает в лифт → по лестнице»
1. Для каждого предмета из каталога (габариты a×b×c и флаг `flexible`) считаем `fits(item, class)` для каждого конца отдельно.
2. Если не влезает, конфигуратор предлагает варианты.
   - Если предмет разбирается, предлагаем разборку: добавляем `dis/asm` из каталога, а детали уходят в лифт как тонкие панели. Пример — PAX.
   - Иначе предмет идёт по лестнице: его объём переходит в `V_nofit` со штрафом `F_stairs`, плюс `bulkyStairsExtraManMinPerFloor` × этажи.
   - Клиент видит обе цены и выбирает дешевле или быстрее.
3. В объяснении показываем: «Диван 200×90×85 не проходит в дверь лифта 70 см → несём по лестнице 4 этажа: +0,4 чел·ч».
4. Если предмет не проходит и по лестнице (узкий марш, винтовая лестница при длине > ~2 м) — флаг «нужен осмотр / такелаж / через окно», такой заказ без подтверждения менеджера не гарантируется.
5. Если асоциация запрещает мебель в лифте — всё крупное идёт как при `none`, коробки — лифтом.

## 12. Открытые вопросы
1. **Полная таблица ISO 4190-1:2010 (класс I, 320/400 кг)** — купить или найти ГОСТ 5746-2015 / SR ISO 4190-1 и сверить small-класс. Сейчас он основан на тендерных спецификациях и ГОСТ 5746-83.
2. **Реальные лифты блоков Клужа**: собрать 20–30 фото табличек и замеров дверей (Mănăștur, Gheorgheni, Mărăști, Grigorescu) и определить долю ручных дверей и остановок на полуэтажах.
3. Высота кабины старых лифтов: если < 200 см, холодильник 185 см и `maxUprightHeight` под вопросом.
4. Калибровка `loadRatePerMover`/`unloadRatePerMover`, `floorPenaltyNoLift`, `timeFactor` и σ по первым 30 заказам. Нужно логировать время по фазам.
5. Как считать окно: от прибытия на первый адрес или от выезда с базы (`depotLegBillable`)?
6. Правила въезда фургона в центр Клужа и платная парковка — отдельное исследование.
7. Стандартный ящик компании: размеры и стопка — влияют на `cratesPerTrip`.
8. Юридическая формулировка «гарантированного окна» по румынскому праву защиты потребителей (OG 21/1992) и что считать «изменением условий» — проверить с юристом.
9. Нужен ли в MVP отдельный класс «xlarge» (1275–2500 кг, грузовые и больничные). Сейчас он вариант внутри large.

## 13. Источники (все открыты только через поисковые сниппеты, нужна ручная проверка)
- Скорость погрузки: [ConsumerAffairs](https://www.consumeraffairs.com/movers/how-long-does-it-take-movers-to-load-a-truck.html) · [HireAHelper](https://blog.hireahelper.com/tag/3-bedroom-house/) · [movingscam](https://www.movingscam.com/forum/viewtopic.php?p=30465) · [First Rate Moving tariff](https://www.mass.gov/doc/first-rate-moving-32036-tariff/download) · [Bellhops](https://www.getbellhops.com/blog/?p=106133) · [YouMoveMe](https://youmoveme.com/how-many-movers-2-bedroom-apartment/) · [MoveitPro](https://help.moveitpro.com/en/articles/4952352-moving-hours-and-crew-size-calculation) · [Storage Scholars](https://www.storagescholars.com/blog/how-many-hours-for-moving-help)
- Тарифы, этажи, переноска: [Fast & Quality tariff](https://www.mass.gov/doc/fast-quality-tariff-25hg50-tpd/download) · [Pink Zebra tariff](https://www.mass.gov/doc/pink-zebra-moving-of-boston-24hg09-tariff/download) · [movingscam tariffs](https://www.movingscam.com/forum/viewtopic.php?p=30634) · [HireAHelper stairs](https://www.hireahelper.com/advice/do-movers-charge-extra-for-stairs/) · [meister-job.de](https://meister-job.de/was-kostet-umzugsunternehmen/) · [brig.ro Cluj](https://brig.ro/mutari/cluj-napoca)
- Сборка мебели: [IKEA ID PAX](https://www.ikea.co.id/en/inspirations/how-to-assemble-ikea-pax-wardrobe) · [Airtasker UK](https://www.airtasker.com/uk/assembly/wardrobe-assembly/england) · [trade2base](https://www.trade2base.com/blog/flat-pack-assembly-costs-uk) · [HomeGnome](https://homegnome.com/blog/assembly/how-long-does-furniture-assembly-take/) · [HomeAdvisor](https://www.homeadvisor.com/cost/home-design-and-decor/assemble-furniture) · [MyJobQuote](https://www.myjobquote.co.uk/questions/dismantle-furniture) · [IKEA complexity ranking](https://tagteam.harvard.edu/hub_feeds/2087/feed_items/18649502)
- Оценки и гарантии: [FMCSA binding estimate](https://www.fmcsa.dot.gov/consumer-protection/protect-your-move/what-binding-move-estimate) · [Maryland AG](https://www.marylandattorneygeneral.gov/CPD%20Documents/Tips-Publications/102.pdf)
- Трафик: [playtech.ro TomTom 2025](https://playtech.ro/2025/indexul-de-trafic-2025-cum-arata-mobilitatea-oraselor-din-romania-orele-de-varf-pe-sosele/) · [wall-street.ro](https://www.wall-street.ro/articol/auto/bucuresti-timisoara-cluj-napoca-si-iasi-orasele-cu-cel-mai-aglomerat-trafic.html)
- Лифты, стандарты: [ISO 4190-1](https://www.iso.org/standard/43194.html) · [ГОСТ 5746-2003](https://prg.kz/m/amp/document/30088448) · [ГОСТ 5746-83](https://dnaop.com/html/42632_2.html) · [ДСТУ/ISO 4190-1 фрагмент](https://dnaop.com/html/61164_12.html) · [TKE EN 81-70](https://www.tkelevator.com/media/austria/brochures_tke/tke-en8170-fact-sheet-atch-de-v082021.pdf) · [KONE EN 81-70](https://kone.co.uk/tools-downloads/codes-and-standards/en81-70-compliant-solutions) · [Elevator World EN 81-70](https://elevatorworld.com/?p=71343) · [Elevator World EN 81-20 Table 6](https://elevatorworld.com/article/rated-load-and-maximum-available-car-area) · [KONE EN 81-20](https://www.kone.com.au/Images/pdf_Safety%20Standard%20EN81-20%20Fact%20Sheet_tcm46-29613.pdf) · [UK Lifts Regulations 2016](https://legislation.gov.uk/uksi/2016/1093/schedule/1/paragraph/6/data.xht) · [NBS SL1000](https://source.thenbs.com/product/evacuation-lift/2UdXdM9bDybEB9EPhnR3eY/vhCbWGyawyV2hLAUtgic9r) · [ECO4AA (ecolift)](https://construnews.com/archivos/87239/ascensor_ecolift.pdf) · [mtender caiet de sarcini](https://storage.mtender.gov.md/get/b3d5c2be-4ad9-4e69-b723-fe7ebaa128af-1563990892595)
- Румыния: [adevarul](https://adevarul.ro/stiri-locale/buzau/lifturile-buzoiene-adevarate-custi-ale-groazei-806927.html) · [capital.ro лифты](https://www.capital.ro/romania-sta-pe-o-bomba-cu-ceas-romanii-care-stau-la-bloc-sunt-in-pericol.html) · [capital.ro P+4](https://www.capital.ro/schimbare-in-blocurile-cu-trei-sau-patru-etaje-veste-buna-pentru-milioane-de-romani-care-stau-la-bloc.html) · [ziarulprofit Lift pentru viață](https://www.ziarulprofit.ro/proiect-cu-mare-impact-social-adoptat-in-parlament-lift-pentru-viata-un-program-care-prevede-constructia-de-lifturi-in-exteriorul-blocurilor-vechi-sau-rampe-de-acces/) · [avocatnet NP 057-02](https://www.avocatnet.ro/forum/discutie_475950/Regim-de-inaltime-al-unei-cladiri-si-dotarea-cu-ascensoare.html) · [capital.ro штрафы/лифт](https://www.capital.ro/amenda-de-pana-la-1-500-de-lei-pentru-cei-care-folosesc-liftul-e-interzis-la-bloc-proprietarii-si-chiriasii-au-interdictie.html) · [Legea 196/2018](https://www.avocatnet.ro/act-normativ-LEGE-nr-196-2018_225.html*15)
- Геометрия «влезет ли»: [itemfits](https://itemfits.com/blog/will-couch-fit-apartment-elevator) · [Pottery Barn measure guide](https://www.potterybarn.com/netstorage/images/pdfs/guide/PotteryBarnHowToMeasureGuide.pdf)
