# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Anyone in Cluj-Napoca and the nearby towns who is moving a home, an office or a few large items: residents, families, students, newcomers. No single demographic is primary. What they share: they have been burned by, or have heard about, movers of doubtful quality (vague estimates "from photos", the wrong-sized van, haggling on the spot, tape and boxes charged extra, belongings held until an extra payment), and they would rather pay more for a move that simply goes right.

## Product Purpose

Mutabil is a moving service in Cluj built around the level of service: transparency, a guarantee that the job is done well and on time, and a pleasant experience of the move itself. The web configurator is the way in: instead of calling, writing on WhatsApp or sending photos to get a vague price, a person configures the move and sees the approximate price and the time it will take, and can try options (reusable crates, packing, disassembly and assembly, full damage protection) and see what each one changes. Success: a person who has never used the service understands what they will pay, for what, and how long it takes, and trusts it enough to send a request.

## Positioning

Not the cheapest option; the one with the highest level of service and predictability. What neighbours in Cluj do not offer:
- an online configurator that explains every number (van, crew, hours, guaranteed window, price of an extra hour) instead of a quote on request;
- reusable plastic crates delivered before the move and collected a week after (no such service in Cluj today);
- a guaranteed price after a survey, with the final price capped at the confirmed estimate + a published percentage;
- speed from better equipment and method (dollies, trolleys, tools, consumables included), not from rushing.

## Operating Context

The configurator is used before the move, often days or weeks ahead, on whatever device is at hand; many visits come from Google and from phones. The person may not know details (the elevator class, the number of boxes) and must be able to answer "I don't know" without getting stuck. After the request: a survey (on-site visit, or the client's photos and video), a confirmed price, crates delivered, the move, crates collected. Languages: Romanian and English.

## Capabilities and Constraints

- Quick mode (three questions → a price range) and a detailed mode (all steps → a full estimate with line items and explanations); a shareable estimate link.
- Prices in lei with VAT; before a survey the price is always shown as a range.
- Optional photo/video upload with annotations ("we move it / it stays / careful").
- MVP has no payment, no account, no real backend; sending a request is a stub.
- All rates, coefficients and catalogs live in config; numbers are placeholders until verified.
- Surfaces: a landing page (persuade) and the configurator with its estimate screen (operate).

## Brand Commitments

- Name: Mutabil (working name, used in the interface).
- No logo, photography or brand assets exist yet; visuals are created from scratch, and option images are clearly labelled placeholders to be replaced with real photos later.
- Voice: plain words, from the user's side; buttons say what will happen ("Calculate the cost", "Book a survey"). Never promise what the pricing rules do not cover. Legal wording ("garanție") follows docs/research/06-legal.md and needs a lawyer's check.
- Must not look like a template SaaS site.

## Evidence on Hand

None yet: no customers, reviews, ratings, photos or press. Do not invent testimonials, numbers of moves, ratings or partner logos. Market comparisons and rates in config are research placeholders (`verified: false`).

## Product Principles

1. Every number is explained: what it is made of and what would change it.
2. Predictability over the lowest price: a guaranteed window and a capped final price instead of surprises.
3. "I don't know" is a valid answer with a clear, honest consequence.
4. The service is felt before the move: the configurator itself should be calm, ordered and pleasant.
5. Honest about limits: no claims beyond what the calculation and the terms support.

## Accessibility & Inclusion

Keyboard navigation with visible focus, understandable validation messages ("Enter the floor", not "Error"), touch targets that work on phones, RO and EN everywhere.
