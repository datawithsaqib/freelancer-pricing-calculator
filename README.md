# PriceMyProject — Freelancer Pricing Calculator

Free static site. One calculator page, no backend, no ads, no accounts, no
payments. All maths runs in the visitor's browser. Nothing is uploaded.

Live site: https://datawithsaqib.github.io/freelancer-pricing-calculator/
Repo: https://github.com/datawithsaqib/freelancer-pricing-calculator

## Files

- `index.html` — calculator, quotation details, client quotation sheet
- `about/`, `contact/`, `privacy/`, `terms/` — information pages
- `assets/style.css` — shared styles, green design, dark theme, A4 print layout
- `assets/app.js` — calculation + validation + quotation logic, no dependencies
- `sitemap.xml`, `robots.txt` — search engine files
- `google6d26cb5763088e4b.html` — Google Search Console verification file (do not delete)

## Calculation — corrected formulas

All amounts are in the currency the user selects (formatting only, no
exchange rates). Money is rounded to 2 decimal places for display only,
never during intermediate maths.

- Total hours = Discovery + Design + Development + Content & CMS + Testing + Launch
- Labour = total hours × hourly rate
- Revision cost = revision rounds × hours per round × hourly rate
- Expenses = Hosting + Domain + Software + Stock + Subcontractors + Other
- Total costs = labour + revision cost + expenses + contingency
  (contingency = % of labour + revision + expenses)
- True profit margin: selling price before fees = total costs ÷ (1 − margin).
  This is a margin, not a markup. Markup would be costs × (1 + margin%):
  costs $1,000, 20% markup = $1,200, profit $200 = 16.7% of the price.
  True 20% margin = $1,250, profit $250 = 20% of the price.
- Platform fee is grossed up on the **pre-tax** price:
  price before tax = price before fee ÷ (1 − fee%). The freelancer keeps
  the price before the fee. No fee is charged on tax.
- Tax = price before tax × tax%. Tax is added last, shown separately,
  and is never counted as profit. The user must choose the correct rate.
- Total customer payment = price before tax + tax.
- Extra revision round (client price, before tax) =
  hours per round × rate ÷ (1 − margin) ÷ (1 − fee).
- Milestones are % of the total customer payment and must total exactly 100%.

## Validation

No input is silently capped. Negative hours, rate, expenses, revision
hours or tax, a fractional revision round, margin ≥ 100%, fee ≥ 100%,
or milestones not totalling 100% all show a clear error beside the field,
block the quotation, and never produce NaN or Infinity. Empty numeric
fields count as 0.

## Quotation

Two views: a private calculation view (rate, costs, profit, fee, amount
kept) and a client quotation view (scope, deliverables, price, tax
separately, milestones, included revisions, extra round price, exclusions,
payment terms, signature area). Private costs are never in the client
quotation. User text is inserted with `textContent` only, never as HTML.

Print / Save as PDF uses the browser's native print function. In print,
only the client quotation is shown, in clean A4 layout. There is no
direct PDF download — the button is honestly labelled "Print / Save as PDF".

## Test results (6 Nov 2026, Node test of assets/app.js)

- Test 1: 20h × $50, 2 rounds × 2h, $0 expenses, 20% margin, 10% fee, 0% tax
  → labour $1,000, revision $200, costs $1,200, price $1,666.67,
  fee $166.67, kept $1,500, profit $300, margin 20% — PASS
- Test 2: 10h × $50, 0 rounds, $100 expenses, 20% margin, 0% fee
  → labour $500, revision $0, costs $600, price $750, profit $150 — PASS
- Test 3: costs $1,000, 20% margin, 10% tax, 0% fee
  → pre-tax $1,250, tax $125, total $1,375 — PASS
- Test 4: negative rate, margin 100%, fee 100%, fractional rounds,
  milestones ≠ 100%, empty fields, huge rate — all show errors or pass — PASS
- Test 5: quotation — checked live in the browser after deployment:
  correct names, amounts, rounds, extra round price ($138.89),
  milestones ($833.33 / $500.00 / $333.33), tax separate, private
  margin/rate/fee hidden from the client view, copy shows "Copied." — PASS.
  Print: the print CSS hides everything except the quotation
  (verified in the code), but the test browser could not open a print
  preview, so please check Print / Save as PDF in a normal browser.
- Test 6: desktop Chrome — PASS (live re-test 6 Nov 2026: defaults,
  tax, errors, PKR, milestones, copy all passed). Mobile and print
  preview could not be checked in the test browser (it cannot resize
  to phone width or open print preview), so please check those on a
  phone and in a normal desktop browser. Light + dark theme are
  supported by the stylesheet; long names and special characters are
  rendered with textContent only, never as HTML.

## Deploy (GitHub Pages)

1. Push these files to the `main` branch of
   `datawithsaqib/freelancer-pricing-calculator`.
2. Settings → Pages → Source: Deploy from a branch, Branch: main, Folder: /(root).
3. After a minute or two the site is live at the URL above.

## Contact

Email: datawithsaqib@gmail.com — Phone: 03029097192.
Report a mistake at https://github.com/datawithsaqib/freelancer-pricing-calculator/issues
