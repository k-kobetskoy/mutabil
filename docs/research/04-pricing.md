# R4. Модель ценообразования

Проект: веб-конфигуратор переезда (MVP) для компании в Cluj-Napoca. Позиционирование: качество и прозрачность, а не самая низкая цена.
Связанный файл: [`04-pricing.config.json`](./04-pricing.config.json). Это черновик `pricing.config.json`, в нём у всех чисел стоит `verified: false`.

> **Как собирались данные.** WebFetch в этой среде заблокирован egress-прокси (сайты `brig.ro`, `duba-x.ro`, `fmcsa.dot.gov`, `ecfr.gov` и другие открыть не удалось). Поэтому все цифры взяты **из сниппетов и сводок веб-поиска**, а не со страниц, открытых целиком. Ссылки ведут на страницы, из которых поисковик извлёк данные. Перед запуском каждую цифру нужно проверить вручную на самой странице или звонком «тайного покупателя». Лимит веб-поиска на эту сессию тоже исчерпан. Чего не хватило, указано в разделе «Открытые вопросы».
> Пометка **«Предположение»** означает, что источника нет и цифра выбрана экспертно.

---

## 1. Почасовая, фиксированная или гибридная цена

**Вопрос.** Как продавать переезд: по часам, фиксированной ценой или гибридом? Из чего состоит цена?

**Варианты на рынке:**

| Модель | Как работает | Где встречается | Плюсы / минусы для нас |
|---|---|---|---|
| Почасовая | (машина + N грузчиков) × часы, минимум 2 ч | Почти все фирмы Cluj и Бухареста: «transport 75–100 lei/oră, personal 50 lei/oră/muncitor» ([mutaribucuresti.ro](https://www.mutaribucuresti.ro/pret-transport-mutare.html)); «3.5t — 200 lei până la 2 ore; echipă 2 oameni — 140 lei/oră» ([homerun.ro, Cluj](https://homerun.ro/costuri-preturi/cluj-transport-marfa_475_494)); у Mutanții (Cluj) убывающая ставка: 1-й час 300 lei, 2-й 250, далее 200 lei ([mutantii.ro](https://mutantii.ro/servicii/)) | Честно по отношению к затратам. Но клиент не знает итог заранее и боится «растягивания» работы. |
| Фиксированная «за квартиру» | garsonieră 300–700, 2 camere 500–1300, 3 camere 800–2000 lei ([brig.ro Cluj](https://brig.ro/mutari/cluj-napoca), [mutaribucuresti.ro](https://www.mutaribucuresti.ro/pret-transport-mutare.html)) | Агрегаторы, реклама | Понятно, но это скорее маркетинговая «вилка». Упаковка и разборка всегда идут отдельно ([brig.ro](https://brig.ro/mutari/cluj-napoca)). |
| Фиксированная после осмотра | «Specialistul vine… oferta de preț fixă și finală» (бесплатная оценка на месте) ([firmademutari-bucuresti.ro](https://www.firmademutari-bucuresti.ro/), [mutantii.ro](https://mutantii.ro/servicii/)) | Премиум-фирмы | Даёт уверенность, но требует визита. |
| Гибрид (США) | Почасовая база + письменная смета: non-binding / binding / not-to-exceed (см. §5) | Регулируется FMCSA | Модель, которую мы и переносим. |

**Из чего состоит цена (на рынке RO):**
- **Транспорт.** Почасовая ставка за машину с водителем. Растёт с классом: 3.5t «mică» ≈100 lei/ч, 3.5t «mare» ≈150 lei/ч, 5t ≈250 lei/ч (в Cluj 200/300/500 lei за первые 2 ч) ([homerun.ro](https://homerun.ro/costuri-preturi-in/cluj-napoca-mutari-mobila_24857_10480)).
- **Люди.** 50–70 lei/ч на грузчика ([mutaribucuresti.ro](https://www.mutaribucuresti.ro/pret-transport-mutare.html), [homerun.ro](https://homerun.ro/costuri-preturi/cluj-transport-marfa_475_494)). В Бухаресте пакеты: «dubă + șofer» 180–195, «+1 ajutor» 345–380, «+2 ajutoare» 460–495 lei/ч ([mutarisigure.ro](https://mutarisigure.ro/cat-costa-o-mutare-bucuresti/)). В других источниках «dubă + 2 oameni» стоит 150–250 lei/ч, дополнительный человек 50–100 lei/ч ([brig.ro](https://brig.ro/mutari/cluj-napoca)).
- **Этажи без лифта.** Часто это отдельная строка: 15 RON/этаж за диван ([homerun.ro](https://homerun.ro/costuri-preturi-in/cluj-napoca-mutari-mobila_24857_10480)) или 30–60 RON/этаж на грузчика (сводка поиска по Cluj).
- **Материалы.** Короба, плёнка, коробки-гардеробы (§3).
- **Упаковка.** 30 lei + TVA за упакованный короб ([mutantii.ro](https://mutantii.ro/servicii/)); «de la 200 lei pentru 2–4 ore», в среднем +200–500 lei ([ofertemutare.ro](https://ofertemutare.ro/mutari/bucuresti)).
- **Демонтаж и монтаж.** Отдельно (§3).
- **Осмотр.** У конкурентов почти всегда бесплатный ([mutantii.ro](https://mutantii.ro/servicii/), [firmademutari-bucuresti.ro](https://www.firmademutari-bucuresti.ro/)).
- **Минимум часов.** 2 ч: «200 lei până la 2 ore» ([homerun.ro](https://homerun.ro/costuri-preturi/cluj-transport-marfa_475_494)). В США минимум 2 ч, дальше шаг 15 мин ([heavenlymove.com](https://heavenlymove.com/services/hourly-movers)).
- **Время в пути («ora de deplasare»).** Публичных правил в RO не нашли. Обычно время считается «de la sosirea echipei la încărcare până la finalizare» ([сводка по Бухаресту](https://www.olxtransportmobila.ro/)), а подача машины включена в первый час или в убывающую ставку (как у Mutanții). В Калифорнии время подачи регулируется: «double drive time», и других travel fees брать нельзя ([SmartMoving help](https://help.smartmoving.com/en/articles/8426385-drive-time-and-double-drive-time), [Two Men and a Truck](https://twomenandatruck.com/es/node/26658)).
- **Выходные.** +15–20% ([seoads.org](https://www.seoads.org/de-ce-ajung-unii-sa-plateasca-dublu-pentru-mutari-de-weekend-si-ce-trebuie-sa-verifici-mereu-inainte-8898/)). Конец месяца ещё +15–20% (там же).
- **Межгород.** 1.5–5 lei/км + манипуляции ([brig.ro](https://brig.ro/mutari/cluj-napoca)).

**Рекомендация.** Гибрид, **почасовая логика внутри, итоговая цена снаружи**:
1. Конфигуратор считает часы из объёма, доступа и расстояния. Клиент видит **сумму** (диапазон или гарантию), а не «ставку × неизвестные часы».
2. Ставки (машина/ч, грузчик/ч, сверхчас) показываются открыто, потому что это и есть прозрачность.
3. Подача машины — **фиксированная строка по зоне** (`dispatch.zones`), а не «час дороги»: так нет спора о пробках.
4. Этажи и пронос не выносим в отдельные строки, а закладываем во время (`time.floorNoElevatorPenaltyPerFloor`). Иначе получается «нарезка» мелких доплат, а это как раз то, что раздражает клиентов.

---

## 2. Рыночные ориентиры: Cluj-Napoca и Румыния

| Позиция | Значения рынка | Источник | Плейсхолдер из брифа | Наш выбор (config) |
|---|---|---|---|---|
| Транспорт, lei/ч | ~100 (3.5t), ~150 (3.5t большой), ~250 (5t), считая от «за 2 ч» | [homerun.ro Cluj](https://homerun.ro/costuri-preturi/cluj-transport-marfa_475_494), [homerun.ro](https://homerun.ro/costuri-preturi-in/cluj-napoca-mutari-mobila_24857_10480) | 75–100 | van-6 90, van-12 110, van-16 130, van-20 150 |
| Транспорт, lei/ч (Бухарест) | 75–100; «dubă + șofer» 180–195 | [mutaribucuresti.ro](https://www.mutaribucuresti.ro/pret-transport-mutare.html), [mutarisigure.ro](https://mutarisigure.ro/cat-costa-o-mutare-bucuresti/) | | |
| Грузчик, lei/ч | 70 (Cluj, «2 oameni — 140 lei/oră»), от 50 (Бухарест) | [homerun.ro Cluj](https://homerun.ro/costuri-preturi/cluj-transport-marfa_475_494), [mutaribucuresti.ro](https://www.mutaribucuresti.ro/pret-transport-mutare.html) | 50 | **70** |
| Комплект «машина + 2», lei/ч | 150–250 (RO), 250 и 460–495 (Бухарест) | [brig.ro](https://brig.ro/mutari/cluj-napoca), [mutarisigure.ro](https://mutarisigure.ro/cat-costa-o-mutare-bucuresti/) | | 230–290 в зависимости от машины |
| Mutanții (Cluj, с 2007 г.) | 1-й ч 300, 2-й 250, далее 200 lei (состав бригады в сниппете не указан); внешний лифт 350 + TVA первый час, 250 + TVA далее | [mutantii.ro](https://mutantii.ro/servicii/) | | ориентир для «качественного» сегмента |
| 2-комн. квартира в черте города | 500–1300 (Cluj, brig); 800–1800 за 2–3 комн. (homerun Cluj); 400–900 (Бухарест); 550–700 без упаковки и 900–1300 с упаковкой и разборкой (Бухарест) | [brig.ro](https://brig.ro/mutari/cluj-napoca), [homerun.ro](https://homerun.ro/costuri-preturi-in/cluj-napoca-mutari-mobila_24857_10480), [ofertemutare.ro](https://ofertemutare.ro/mutari/bucuresti) | 500–1300 | Транспорт и люди ≈1260; всё вместе ≈3000 (§9) |
| Монтаж мебели, lei/ч | 30–80 | [homerun.ro Cluj](https://homerun.ro/costuri-preturi/cluj-montaj-mobila_34056_494) | | мастер 110 |

**Вывод.** Плейсхолдер транспорта (75–100 lei/ч) подтверждается для маленьких машин. Для фургона 16–20 m³ рынок Cluj берёт ≈150 lei/ч и больше. Плейсхолдер грузчика 50 lei/ч — это нижняя граница. Для Cluj и для позиционирования «качество» правильнее 70 lei/ч. Вилку 500–1300 lei за 2-комн. квартиру подтверждают несколько источников, но она описывает **голый** перенос (транспорт, погрузка, разгрузка) без упаковки, разборки и защиты.

**Цены с НДС или без?** В большинстве сниппетов не указано. Mutanții прямо пишет «+ TVA». Mutare-bucuresti: «210 LEI (TVA inclus)» за доставку. **Предположение:** агрегаторы (brig, homerun) показывают цены как есть, без нормализации по НДС. Мелкие фирмы-неплательщики НДС (§4) выглядят «дешевле» на 21%.

---

## 3. Материалы, многоразовые ящики, монтаж

### 3.1 Картон и упаковка (RO)

| Материал | Рынок | Источник | Наш выбор |
|---|---|---|---|
| Короб ~60×40×40 | 8.24 lei (Hornbach 49×46×36); ~8.3 lei/шт (eMAG, 5 шт. 60×40×40 за 41.38); 15–18.50 lei (mutare-bucuresti); 20 lei + TVA (Mutanții, Cluj); 4.95 lei за 50 л (Action, тонкий) | [Hornbach](https://www.hornbach.ro/p/cutie-carton-packpoint-500x400x360-mm-pentru-transport-colete/5493276/), [eMAG](https://www.emag.ro/search/cutie+carton+mutare), [mutare-bucuresti.ro](https://mutare-bucuresti.ro/en/product-category/cutii-carton/), [mutantii.ro](https://mutantii.ro/servicii/), [Action](https://www.action.com/ro-ro/p/2532075/cutie-de-mutat-action/) | 15 lei |
| Короб для книг (малый) | 12.10 lei (40×32×28.7) | [Hornbach](https://www.hornbach.ro/p/cutie-carton-depozitare-si-mutare-230x320x235mm/12152795/) (сниппет) | 10 lei |
| Коробка-гардероб со штангой | 305.50 lei (0.52×0.60×1.35 м) | [mutare-bucuresti.ro](https://mutare-bucuresti.ro/product/cutie-garderoba-pentru-haine-pe-umeras/) | аренда 35 lei, продажа 120 lei (**Предположение**) |
| Мешок для матраса | Не найдено. Поиск выдал только наматрасники за 33–129 lei | — | 35 / 45 lei (**Предположение**) |
| Защита ТВ, защита зеркала/картины | Не найдено (закончился лимит поиска) | — | 60 / 40 lei (**Предположение**) |
| Стретч-плёнка | ~7–60 lei за рулон | [Leroy Merlin](https://www.leroymerlin.ro/produse/feronerie-si-securitate/lize-carucioare-si-produse-ambalare/produse-ambalare-pentru-mutare/) | включено бесплатно |
| Доставка материалов | 210 lei с НДС (Бухарест/Ilfov) | [mutare-bucuresti.ro](https://mutare-bucuresti.ro/en/product-category/cutii-carton/) | 75 lei, бесплатно при заказе переезда |

### 3.2 Многоразовые ящики

| Рынок | Цена | Источник |
|---|---|---|
| RO, Rent A Box (объявление 2015 г., устарело) | 345 lei за 25 ящиков на неделю = **13.8 lei/ящик/нед.** | [okazii.ro](https://www.okazii.ro/cutii-pentru-mutare-relocare-depozitare-distributie-inchiriere-25-cutii-pe-o-perioada-de-o-saptamana-a167708181) |
| RO, WEMOVE (Бухарест) | аренда пластиковых ящиков есть, цена в сниппете не указана | [wemove.ro](https://www.wemove.ro/) |
| DE, Knusperkiste (Берлин) | €4 первая неделя, ~€1 каждая следующая (модель M: €3.50 / €0.50) | [kleinanzeigen.de/pro/knusperkiste](https://www.kleinanzeigen.de/pro/knusperkiste) |
| AT, GoFoxBox | от €0.75/нед., доставка включена | [pressetext.com](https://www.pressetext.com/news/im-trend-kunststoffboxen-zum-bersiedeln.html) |
| UK, B2B | 35p–£1.96 за ящик в неделю | [cratehireexpress.co.uk](https://cratehireexpress.co.uk/), [cratehirecompany.co.uk](https://www.cratehirecompany.co.uk/hire-crates), [teacrate.co.uk](https://teacrate.co.uk/) |
| UK, пакеты для дома | £22.99/нед. (small home, Teacrate); £27.15 (1-bed) … £86 (5-bed) в неделю | [teacrate.co.uk](https://teacrate.co.uk/), сводка поиска |
| Покупка аналога (RO) | ящик 60×40×44 с крышкой, 71.07 lei | [Hornbach](https://www.hornbach.ro/p/cutie-plastic-cu-capac-jelenia-plast-600x400x440-mm-transparenta-capac-colorat-cu-roti/6386992/) |

> Данные по LoveCrate и Hirecrates найти не удалось: закончился лимит поиска.

**Рекомендация (бизнес-правило «7 дней включено»):**
- 12 lei за ящик за первые 7 дней. Это **дешевле картона (15 lei)**, чтобы клиенту было выгодно выбрать многоразовые ящики.
- 1 lei за ящик за каждый следующий день (≈7 lei/нед., чуть выше DE/UK из-за маленького парка и логистики).
- Минимум 20 ящиков. Доставка заранее бесплатна при заказе переезда (иначе 75 lei). Забор 75 lei, бесплатно, если ящики сдаются бригаде в день переезда.
- Утеря или порча: 90 lei за ящик (розница 71 lei + логистика). Залога в MVP нет.
- **Предположение:** окупаемость ящика (закупка ~50–70 lei оптом) примерно за 5–6 аренд.

### 3.3 Демонтаж и монтаж

Рынок Cluj по сводке [homerun.ro](https://homerun.ro/costuri-preturi/cluj-montaj-mobila_34056_494):
- работа 30–80 lei/ч;
- комод или тумба 50–100 lei, кровать 100–200 lei, шкаф 150–350 lei, гостиная 350–450 lei, кухня 500–1500 lei;
- рыночные цены: простой шкаф 80–120 lei, большой PAX 150–250 lei, кровать 100–150 lei, вся квартира 400–1200 lei;
- 2-комн. квартира: 3–5 ч на разборку и сборку вдвоём.

У Napoca Mutari монтаж и демонтаж от 100 RON ([homerun.ro](https://homerun.ro/costuri-preturi-in/cluj-napoca-mutari-mobila_24857_10480), [napoca-mutari.ro](https://www.napoca-mutari.ro/montari-demontari-mobilier-cluj.html)).

**Рекомендация.**
- **Цена за предмет** (демонтаж и монтаж вместе): кровать 100, шкаф малый 120, шкаф большой 220, стол 40, комод 50, навеска ТВ 120 lei.
- Работу выполняет **мастер параллельно с бригадой** (наценка `masterOnMovingDayFee` 100 lei за выезд в день переезда). Так время бригады не растёт, и клиент не платит дважды: за предмет и за простой бригады.
- Кухни — только после осмотра.

---

## 4. НДС и отображение цены

- **Ставка.** Стандартная ставка НДС поднята с 19% до **21% с 1 августа 2025** (Legea 141/2025, Monitorul Oficial 25.07.2025). Сниженные ставки 5% и 9% объединены в одну, 11% ([PwC Romania](https://www.pwc.ro/en/tax-legal/alerts/law-no--141-2025-on-some-fiscal-budgetary-measures.html), [EY](https://taxnews.ey.com/news/2025-1622-romanian-tax-changes-introduced-by-new-fiscal-and-budgetary-measures), [TVR Info](https://tvrinfo.ro/romania-intra-in-august-cu-tva-de-21-si-accize-mai-mari-scumpiri-la-transport-comunicatii-si-alimente/)). **Проверено поиском.** Услуги переезда по нашей оценке идут по ставке 21% (в перечне 11% их нет).
- **Порог освобождения** для малых предприятий поднят с 300 000 до **395 000 lei** оборота с 1 сентября 2025 ([capital.ro](https://www.capital.ro/plafonul-national-de-scutire-de-tva-pentru-intreprinderile-mici-va-creste-de-la-300-000-de-lei-la-395-000-de-lei-de-la-1-septembrie.html), [g4media](https://www.g4media.ro/plafonul-national-de-scutire-de-tva-pentru-intreprinderile-mici-va-creste-de-la-300-000-de-lei-la-395-000-de-lei-incepand-cu-data-de-1-septembrie-2025.html)). Если компания не плательщик НДС, ставим `tax.vatRegistered = 0`.
- **Как показывать.** Физлицам показываем **цены с НДС** (`pricesIncludeVat: true`), под итогом пишем «din care TVA 21%: X lei». **Предположение / проверить в R6:** Директива 2011/83/EU (ст. 5–6, в RO транспонирована OUG 34/2014) требует сообщать потребителю «total price inclusive of taxes». Цена «+ TVA», как у части конкурентов, — это тоже повод отличаться в лучшую сторону.
- Для B2B (переезд офиса, MVP не покрывает) позже можно добавить переключатель «fără TVA».

---

## 5. Смета: non-binding, binding, not-to-exceed (США) и что из этого перенести

**Правила FMCSA** (49 CFR Part 375; действуют только для **межштатных** перевозок домашнего имущества в США):
- **Binding estimate** (§375.403). Клиент платит ровно сумму сметы, если не добавились вещи или услуги. Если добавились, перевозчик должен составить новую binding-смету ([FMCSA: What is a binding estimate](https://www.fmcsa.dot.gov/consumer-protection/protect-your-move/what-binding-move-estimate), сниппет).
- **Non-binding estimate** (§375.405). Это «разумно точная» оценка. Итог считается по тарифу за фактический вес и услуги. В смете обязана быть фраза о том, что клиент не заплатит при доставке больше 110% ([J. J. Keller, 375.405](https://jjkellercompliancenetwork.com/regsense/375405-375405-how-must-i-provide-a-non-binding-estimate)).
- **Правило 110%** (§375.407). При оплате 110% non-binding-сметы перевозчик **обязан отдать вещи** в момент доставки. Остаток сверх 110% (а также услуги, ставшие необходимыми в пути) выставляется счётом **не ранее чем через 30 дней** после доставки ([J. J. Keller, 375.407](https://jjkellercompliancenetwork.com/regsense/375407-under-what-circumstances-must-i-relinquish-possession-of-a-collect-on-delivery-shipment-transported-under-a-non-binding-estimate)). При частичной доставке берётся пропорция от 110% по весу.
- **Binding not-to-exceed** («guaranteed not to exceed»). Клиент платит меньшую из двух сумм: фактическую или сметную. Это **отраслевая практика**, отдельной категории в Part 375 нет (**Предположение**: проверить по тексту [Appendix A, Cornell LII](https://www.law.cornell.edu/cfr/text/49/appendix-A_to_part_375)). Упоминание есть на [csipros.org](https://csipros.org/?p=360).
- Буклет **«Your Rights and Responsibilities When You Move»** перевозчик обязан выдать клиенту ([49 CFR Appendix A to Part 375](https://www.law.cornell.edu/cfr/text/49/appendix-A_to_part_375), [FMCSA: avoid unexpected costs](https://www.fmcsa.dot.gov/consumer-protection/protect-your-move/how-can-i-avoid-unexpected-moving-costs)).

**Что переносимо в RO/EU.** Аналога Part 375 в Румынии нет. Есть общее право: Codul civil (договор перевозки, ст. 1955 и далее) и защита потребителей (см. R6). Значит, всё перечисленное ниже — **добровольное публичное обязательство**, оформленное в договоре/T&C. Мы можем взять:
1. **Три типа цены**, которые прямо соответствуют брифу:
   - «Interval preliminar» (без осмотра) ≈ non-binding, но без 110%-гарантии;
   - «Preț garantat după evaluare» ≈ binding с допуском;
   - (опция на будущее) «nu mai mult decât» ≈ not-to-exceed.
2. **Правило «+X%».** Итог ≤ подтверждённая смета × (1 + X), если объём работ не менялся. X = **5% после визита специалиста**, **10% после видео** (прямой аналог правила 110%).
3. **Механику «не держим вещи в заложниках».** Если по факту вышло больше потолка, клиент платит потолок, а разницу компания берёт на себя. Если вышло больше из-за добавленного клиентом (новые вещи, другой этаж, нет лифта), бригадир фиксирует изменения в приложении и получает согласие клиента **до** начала дополнительной работы. Это аналог «new binding estimate before loading».
4. **Памятку клиенту** «Drepturile tale» на одну страницу — аналог буклета FMCSA.

---

## 6. Уровни защиты от повреждений

**США** ([FMCSA Valuation](https://www.fmcsa.dot.gov/protect-your-move/valuation-insurance), [PDF «Understanding Valuation»](https://www.fmcsa.dot.gov/sites/fmcsa.dot.gov/files/2023-07/PYM_Understanding%20Valuation_March23%20%28002%29.pdf)):
- **Released Value Protection.** Бесплатно, перевозчик отвечает **не более чем на $0.60 за фунт за предмет**. Пример: ТВ 50″ весом 25 lb → $15. Вариант нужно выбрать явно, иначе по умолчанию действует Full Value.
- **Full (Replacement) Value Protection.** Перевозчик «at its option» **ремонтирует, заменяет на аналог или выплачивает стоимость ремонта/замены** в пределах заявленной стоимости. Если стоимость не заявлена, она считается равной **$6.00 × вес (lb), минимум $6,000** ([FMCSA SafetyPlanner](https://csa.fmcsa.dot.gov/SafetyPlanner/GetFile.aspx?d=207), сниппет). Цена у разных перевозчиков разная, бывают франшизы.
- **Цена Full Value на рынке.** Обычно 1–3% от заявленной стоимости. Пример: $1.84 за $100. Франшизы $0 / $500 / $1000 ([csipros.org](https://csipros.org/full-value-protection-the-thing-carriers-love-right-up-until-they-have-to-use-it/), [greekmoving.com](https://greekmoving.com/7-questions-about-moving-insurance/)). В тарифе одного перевозчика: минимум $3.50/lb, но не меньше $10,000 ([сниппет csipros](https://csipros.org/?p=3054)).

**Европа и Румыния:**
- **CMR** (только международные перевозки). Лимит **8.33 SDR за кг брутто** (ст. 23(3), протокол 1978 г.) ([UN Treaty Series](https://treaties.un.org/doc/Publication/UNTS/Volume%201208/volume-1208-A-19487-English.pdf), [spectator.sme.sk](https://spectator.sme.sk/business/c/full-compensation-for-loss-or-damage-in-international-carriage-of-goods-by-road-according-to-the-cmr-convention)). **Предположение:** 1 SDR ≈ €1.2, тогда лимит ≈ €10/кг ≈ 50 lei/кг.
- **Codul civil.**
  - Ст. 1984: перевозчик отвечает за полную или частичную утрату, порчу и просрочку.
  - Ст. 1985: при утрате возмещается **реальная стоимость**, при порче — **потеря стоимости**; стоимость берётся на месте и в момент доставки ([notari.pro, art. 1984](https://notari.pro/noul-cod-civil-legea-287-2009/art-1984-raspunderea-transportatorului-contractul-de-transport-de-bunuri-contractul-de-transport), [art. 1985](https://notari.pro/noul-cod-civil-legea-287-2009/art-1985-repararea-prejudiciului-contractul-de-transport-de-bunuri-contractul-de-transport)).
  - **Ст. 1959(1): перевозчик не может исключить или ограничить свою ответственность, кроме случаев, предусмотренных законом** ([notari.pro, art. 1959](https://notari.pro/noul-cod-civil-legea-287-2009/art-1959-raspunderea-transportatorului-dispozitii-generale-contractul-de-transport)).
  - Ст. 1355: ответственность за умысел и грубую неосторожность ограничить нельзя ([codulcivil.ro](https://www.codulcivil.ro/art-1355-clauze-privind-raspunderea/)).
  - ⇒ **Модель «$0.60/lb» напрямую в RO для потребителя, скорее всего, не работает.** Базовая ответственность и так равна реальной стоимости. Нужна проверка юриста (R6).
- **Asigurare marfă / CMR-страховка перевозчика.** Премия ≈ **0.5–1‰ от стоимости груза** ([asigurari.ro](https://www.asigurari.ro/asigurare/cmr)), с франшизой дешевле. То есть себестоимость страхования для компании мала. Цена «полной защиты» для клиента — в основном самострахование, оценка и сервис урегулирования.

**Рекомендация (как показать клиенту просто):**

| | **Standard — inclus** | **Completă — +1.2% din valoarea declarată** |
|---|---|---|
| Что покрыто | Повреждения по нашей доказанной вине, по реальной стоимости с учётом износа | Ремонт, замена или выплата (на наш выбор) до заявленной стоимости, **без учёта износа** |
| Коробки, упакованные клиентом | Только при видимом повреждении короба | То же. Наша упаковка покрывается полностью |
| Особые предметы | — | Отдельная строка «Ambalare întărită» (бизнес-правило) |
| Франшиза | — | 0 lei (или 500 lei → ставка 0.8%) |
| Минимум | — | 150 lei; заявленная стоимость ≥ max(10 000 lei, 1000 lei/m³) |
| Предметы > 5000 lei | — | Обязательно в описи |

Формулировка в UI (RO): «Protecție standard: răspundem pentru daunele cauzate din vina noastră, la valoarea reală. Protecție completă: reparăm, înlocuim sau plătim valoarea declarată — fără discuții despre uzură.»
Поля `protection.basic.liabilityPerKg` и `perItemCap` в конфиге оставлены по требованию ТЗ. Они помечены как **юридически рискованные** (ст. 1959) и не должны показываться клиенту до заключения юриста.

---

## 7. Сверхурочные, шаг тарификации, гарантированное окно

- **Как показывают заранее.** В США стоимость сверхчаса указывают в тарифе и в смете: «moves exceeding minimum charged in 15-minute increments», округление вверх до следующей четверти часа ([Kansas Moving Center tariff](https://www.kcc.ks.gov/images/PDFs/tariff-hg/kansas_moving_center_inc.pdf), [heavenlymove.com](https://heavenlymove.com/services/hourly-movers), [Yale moving rates](https://your.yale.edu/workplace-services/moving-storage/office-equipment-moves/moving-and-relocation-rates): там есть отдельная overtime-ставка ×1.5 за нерабочие часы).
- **Окно прибытия.** HireAHelper считает исполнителя опоздавшим, если он не приехал в течение часа после начала окна. Компенсация **5% за каждый полный час опоздания**, максимум 100% ([HireAHelper Service Guarantee](https://www.hireahelper.com/legal/guarantee)).

**Рекомендация:**
1. В итоговом блоке отдельной строкой: **«Fiecare oră suplimentară: 360 lei (se facturează la 30 min: 180 lei)»**. Значение берётся из состава бригады (`overtime.perHourByComposition`, вычисляется в коде). Коэффициент 1.0: **сверхчас стоит столько же, сколько обычный**, без штрафа.
2. Шаг тарификации 30 мин после минимума в 2 ч, 10 мин «грации».
3. **Гарантированное окно:** прибытие в 30-минутный слот (08:00–08:30) и расчётное окно окончания = старт + часы × 1.15. При опоздании сверх слота компенсация 50 lei за каждые начатые 30 мин.
4. При гарантированной цене сверхчасы оплачиваются только до потолка «+X%». Дальше их несёт компания (кроме изменений объёма, согласованных клиентом).
5. Если работа уходит за окно больше чем на 30 мин, бригадир запрашивает подтверждение клиента.

---

## 8. Предлагаемая ФОРМУЛА ЦЕНЫ

Обозначения: `V` — объём (m³) по описи конфигуратора (мебель по справочнику + ящики/короба × 0.08 m³); `M` — число грузчиков (`crewSizeRules` по V, клиент может увеличить); `R_veh`, `R_mov` — ставки из конфига. Все цены с НДС.

**Шаг 1. Время (часы):**
```
H_handling = V / (M × handlingRateM3PerMoverHour)                       // 2.5 m³/грузчик·ч, погрузка+разгрузка
          × (0.5 × K_origin + 0.5 × K_dest)                             // K = 1 + этажи_без_лифта×0.08 + малый_лифт×0.05 + пронос
H_drive    = distance_km / urbanAvgSpeedKmh                             // позже: Routes API
H_trips    = (ceil(V / (capacity × fillFactor)) − 1) × 2 × H_drive       // доп. рейсы
H          = H_handling + H_drive + H_trips + setupProtectionHours (+ H_packing, если упаковка бригадой)
H_billed   = max(minimumBillableHours, ceil_to_30min(H))
```

**Шаг 2. Строки сметы (каждая округляется до 1 lei):**
```
Transport         = R_veh × H_billed × (1 + weekendSurcharge)
Echipă            = M × R_mov × H_billed × (1 + weekendSurcharge)      // + eveningAfter18 только на часы после 18:00
Deplasare         = dispatch.zones[zone].fee
Ambalare (muncă)  = boxesPackedByUs × perBoxPackingFee
Materiale         = Σ qty × unitPrice (картон, гардероб, мешки, ТВ, зеркала)
Lăzi reutilizabile= crates × pricePerCrateIncludedPeriod
                  + crates × max(0, days − 7) × extraPerCratePerDay
                  + (deliveryFreeWithMove ? 0 : deliveryFee) + (returnedOnMoveDay ? 0 : pickupFee)
Demontare/montare = Σ perItem + (items>0 ? masterOnMovingDayFee : 0)
Ambalare întărită = Σ specialItems.reinforcedPackingFee                 // отдельной строкой, если protection = full
Protecție         = full ? max(minFee, declaredValue × rate) : 0
                    where declaredValue ≥ max(minDeclaredValue, V × minDeclaredValuePerM3)
Evaluare          = survey.price − (deductibleFromOrder ? survey.price : 0)   // в итоговой смете 0, если засчитана
```

**Шаг 3. Итог и тип цены:**
```
E = max(minimumOrder, Σ строк)
survey = onSite | video  →  "Preț garantat":   Total = ceil_to_10(E);  Plafon = ceil_to_10(Total × (1 + guaranteeTolerance))
survey = none            →  "Interval preliminar":
      V_low  = V × (1 − rangeWidth.none.low)       V_high = V × (1 + rangeWidth.none.high)
      H_low  = H(V_low)                           H_high = H(V_high) × (1 + timeUncertaintyHigh)
      Low  = floor_to_50( E с H_low )             High = ceil_to_50( E с H_high )
      // фиксированные строки (материалы, ящики, монтаж, защита) одинаковы в обеих границах
VAT display: din care TVA = Total × vatRate / (1 + vatRate)
Overtime display: (R_veh + M × R_mov) × overtime.multiplier lei/oră, шаг 30 мин
```

**Правила:**
- Без осмотра цена всегда диапазон (бизнес-правило). С видео до подтверждения оценщиком показывается узкий диапазон (`rangeWidth.video`), после подтверждения — гарантия +10%.
- Особые предметы при полной защите — отдельная строка.
- Минимальный заказ переезда 500 lei. Минимум 2 оплачиваемых часа.
- Полный день: 8 ч × (машина + грузчики) × 0.9. Дальше — сверхчасы.

---

## 9. Пример расчёта: 2-комнатная квартира

**Вводные.** Mănăștur → Gheorgheni, 6 км, будний день, старт 08:00. Откуда: 4-й этаж, нормальный лифт. Куда: 2-й этаж, лифта нет. Объём по описи **18 m³** (включая 40 ящиков). Машина **van-20** (20 × 0.9 = 18 m³, один рейс), бригада **3 грузчика**.
Опции: 40 многоразовых ящиков (вернут через неделю, забор нужен), 2 коробки-гардероба (аренда), 2 мешка для матрасов (двуспальный и односпальный), защита ТВ, защита 1 зеркала. Разборка и сборка: шкаф малый, двуспальная кровать, стол. Полная защита, заявленная стоимость 40 000 lei. Оценка — видео (бесплатно).

**Время:**
- H_handling = 18 / (3 × 2.5) = 2.40 ч × (0.5 × 1 + 0.5 × 1.16) = 2.59 ч
- H_drive = 6 / 20 = 0.30 ч; setup = 0.25 ч
- H = 3.14 ч → H_billed = **3.5 ч**

| Строка | Расчёт | lei |
|---|---|---|
| Transport (van-20) | 150 × 3.5 | 525 |
| Echipă (3 oameni) | 3 × 70 × 3.5 | 735 |
| Deplasare (Cluj-Napoca) | зона | 80 |
| Materiale | 2 × 35 (гардероб) + 45 + 35 (мешки) + 60 (ТВ) + 40 (зеркало) | 250 |
| Lăzi reutilizabile (40 шт., 7 дней) | 40 × 12 + доставка 0 + забор 75 | 555 |
| Demontare/montare | 120 + 100 + 40 + мастер 100 | 360 |
| Protecție completă | 40 000 × 1.2% | 480 |
| Evaluare video | | 0 |
| **Inclus gratuit** | скотч, стретч, одеяла, тележки, защита пола и дверных проёмов | 0 |
| **Сумма** | | **2985** |
| **Preț garantat** | ceil_to_10 | **2 990 lei** (din care TVA 21%: 519 lei) |
| **Plafon garantat (+10%)** | 2990 × 1.10 | **≤ 3 290 lei** |
| Oră suplimentară | 150 + 3 × 70 | **360 lei/oră** (180 lei за 30 мин) |
| Fereastră | прибытие 08:00–08:30; окончание ~12:30 (3.5 ч × 1.15) | |

**Тот же заказ без осмотра** (диапазон −15% / +35%):
- V_low = 15.3 m³ → H = 2.75 → 3.0 ч → 1080 + 1725 (фиксированные строки) = 2805 → **2 800 lei**.
- V_high = 24.3 m³ → нужен второй рейс (+0.6 ч), × 1.1 → 5.11 → 5.5 ч → 1980 + 1725 = 3705 → **3 750 lei**.
- Клиенту показывается: **«Interval preliminar: 2 800 – 3 750 lei. Comandă o evaluare video gratuită pentru preț garantat.»**

**Варианты:**
- Видео до подтверждения (−7% / +15%): 2 800 – 3 550 lei.
- Суббота: +15% на транспорт и людей (+189) → 3 180 lei.
- Полный день van-20 + 3: 360 × 8 × 0.9 = 2 592 lei.

**Сравнение с рынком.** «Голый» переезд (транспорт + люди) у нас **1 260 lei**. Это верхняя граница рыночной вилки 500–1300 lei, что соответствует позиционированию. Остальные ~1 700 lei — опции, которые у конкурентов идут «отдельно, по запросу» и обычно не видны заранее.

---

## 10. Открытые вопросы

1. **Проверить ставки вручную.** WebFetch был заблокирован, поэтому нужно открыть сайты [duba-x.ro](https://www.duba-x.ro/mutari-cluj/), [transportamobilacluj.ro](https://www.transportamobilacluj.ro/), [transportdemarfacluj.ro](https://www.transportdemarfacluj.ro/), [napoca-mutari.ro](https://www.napoca-mutari.ro/transport-mobila-cluj.html), [mutantii.ro](https://mutantii.ro/servicii/), [brig.ro](https://brig.ro/mutari/cluj-napoca) и сделать 3–5 звонков «тайного покупателя» с одним сценарием (§9). Уточнить, с НДС ли цены и какой у Mutanții состав бригады за 300/250/200 lei/ч.
2. **Себестоимость.** Зарплата грузчика (брутто), амортизация и топливо фургона, страховка. Ставка 70 lei/ч должна давать маржу. Нужны цифры владельца.
3. **Юридическое (R6).** Действительна ли базовая ограниченная ответственность (lei/кг, лимит на предмет) при ст. 1959 Codul civil. Как правильно назвать «полную защиту»: собственная гарантия компании или страховой продукт (если это страховка, нужен посредник, регулируемый ASF). Формулировки «preț garantat» и «+X%» в T&C. Требование показывать потребителю цену с НДС.
4. **Калибровка времени.** Нормы 2.5 m³/грузчик·ч, +8% за этаж, 20 км/ч — это предположения. Записывать факт по первым 20–30 заказам и пересчитывать `rangeWidth`.
5. **Цены на мешки для матрасов, защиту ТВ и зеркал** в RO не найдены (лимит поиска). Узнать у поставщиков упаковки (например, Rogri, Evopacking, Rik) оптовые цены.
6. **Многоразовые ящики.** Закупочная цена ящика оптом, размер парка, кто моет и ремонтирует. Есть ли в Cluj конкурент по аренде ящиков (не найден).
7. **Осмотр 150 lei при бесплатных осмотрах у конкурентов.** Не отпугнёт ли? Альтернатива: бесплатно, но только после видео-предоценки или от суммы заказа > X.
8. **Убывающая ставка** (как у Mutanții: 300/250/200) против плоской. Мы выбрали плоскую, она прозрачнее. Нужно решение владельца.
9. **Наценка за конец месяца** (+15–20% на рынке): включать ли (сейчас 0)?
10. **Курс EUR/RON и SDR** для пересчёта иностранных ориентиров не проверены.
