/* Freelancer Pricing Calculator — all maths runs in the browser, nothing is uploaded.
   Pure maths lives in calculatePure() so it can be tested without the page.
   Display rounding happens only at display time (money()), never inside the maths. */
(function () {
  "use strict";

  var PHASE_IDS = ["phDiscovery", "phDesign", "phDev", "phContent", "phTesting", "phLaunch"];
  var EXPENSE_IDS = ["exHosting", "exDomain", "exSoftware", "exStock", "exSubcontractor", "exOther"];
  var NUMERIC_IDS = PHASE_IDS.concat(EXPENSE_IDS, ["rate", "rounds", "revHours", "contingency", "margin", "fee", "tax", "ms1", "ms2", "ms3", "validDays"]);

  var LIMITS = {
    phase: { max: 100000, label: "Hours" },
    rate: { max: 1000000, label: "Hourly rate" },
    rounds: { max: 100, label: "Revision rounds" },
    revHours: { max: 1000, label: "Hours per revision round" },
    expense: { max: 10000000, label: "Expense" },
    contingency: { max: 100, label: "Contingency" },
    margin: { max: 100, label: "Profit margin", exclusiveMax: true },
    fee: { max: 100, label: "Platform fee", exclusiveMax: true },
    tax: { max: 100, label: "Tax" },
    milestone: { max: 100, label: "Milestone" },
    validDays: { max: 365, label: "Validity (days)" }
  };

  /* ---------- pure calculation ---------- */
  function calculatePure(inp) {
    var totalHours = inp.phases.reduce(function (a, b) { return a + b; }, 0);
    var labour = totalHours * inp.rate;
    // Revision cost = rounds x hours per round x hourly rate.
    var revisionCost = inp.rounds * inp.revHours * inp.rate;
    var expensesTotal = inp.expenses.reduce(function (a, b) { return a + b; }, 0);
    var base = labour + revisionCost + expensesTotal;
    var contingencyAmt = base * inp.contingency / 100;
    var totalCosts = base + contingencyAmt;
    // True profit margin: margin is a % of the selling price (before fees),
    // so selling price = total costs / (1 - margin). This is NOT a markup.
    // Markup would be totalCosts * (1 + margin%), which gives a smaller
    // margin than the one asked for. Example: costs $1,000, margin 20%:
    // markup price $1,200 (profit $200 = 16.7% of price) — wrong.
    // True margin price $1,250 (profit $250 = 20% of price) — correct.
    var preFeePrice = inp.margin > 0 ? totalCosts / (1 - inp.margin / 100) : totalCosts;
    var profit = preFeePrice - totalCosts;
    // Platform fee is grossed up on the PRE-TAX price, so the freelancer
    // keeps the price above after the platform takes its cut.
    // Fee is never charged on tax, and tax is never counted as profit.
    var preTaxPrice = inp.fee > 0 ? preFeePrice / (1 - inp.fee / 100) : preFeePrice;
    var feeAmt = preTaxPrice - preFeePrice;
    var retained = preTaxPrice - feeAmt; // == preFeePrice
    var taxAmt = preTaxPrice * inp.tax / 100;
    var totalCustomer = preTaxPrice + taxAmt;
    var actualProfit = retained - totalCosts;
    var actualMargin = retained > 0 ? actualProfit / retained * 100 : 0;
    var extraRoundCost = inp.revHours * inp.rate;
    var extraRoundPrice = extraRoundCost > 0
      ? extraRoundCost / (1 - inp.margin / 100) / (1 - inp.fee / 100) : 0;
    var milestones = inp.milestones.map(function (pct) { return totalCustomer * pct / 100; });
    return {
      totalHours: totalHours, labour: labour, revisionCost: revisionCost,
      expensesTotal: expensesTotal, contingencyAmt: contingencyAmt,
      totalCosts: totalCosts, preFeePrice: preFeePrice, profit: profit,
      preTaxPrice: preTaxPrice, feeAmt: feeAmt, retained: retained,
      taxAmt: taxAmt, totalCustomer: totalCustomer,
      actualProfit: actualProfit, actualMargin: actualMargin,
      extraRoundCost: extraRoundCost, extraRoundPrice: extraRoundPrice,
      milestones: milestones
    };
  }

  /* ---------- validation (no silent capping) ---------- */
  function checkNumber(raw, rule, fieldLabel) {
    if (raw === "" || raw === null || raw === undefined) return { value: 0, error: null };
    var v = Number(raw);
    if (!isFinite(v)) return { value: 0, error: fieldLabel + ": enter a number." };
    if (v < 0) return { value: 0, error: fieldLabel + ": cannot be negative." };
    if (rule.exclusiveMax ? v >= rule.max : v > rule.max)
      return { value: 0, error: fieldLabel + ": must be below " + rule.max + "%." };
    if (v > rule.max) return { value: 0, error: fieldLabel + ": is too large." };
    return { value: v, error: null };
  }

  function validateInputs(raw) {
    var errors = [];
    var out = { phases: [], expenses: [], milestones: [] };
    PHASE_IDS.forEach(function (id, i) {
      var r = checkNumber(raw[id], LIMITS.phase, "Phase hours");
      if (r.error) errors.push({ id: id, message: r.error });
      out.phases[i] = r.value;
    });
    EXPENSE_IDS.forEach(function (id, i) {
      var r = checkNumber(raw[id], LIMITS.expense, "Expense");
      if (r.error) errors.push({ id: id, message: r.error });
      out.expenses[i] = r.value;
    });
    var fields = [
      ["rate", LIMITS.rate, "Hourly rate"], ["revHours", LIMITS.revHours, "Hours per revision round"],
      ["contingency", LIMITS.contingency, "Contingency"], ["margin", LIMITS.margin, "Profit margin"],
      ["fee", LIMITS.fee, "Platform fee"], ["tax", LIMITS.tax, "Tax"],
      ["validDays", LIMITS.validDays, "Validity"]
    ];
    fields.forEach(function (f) {
      var r = checkNumber(raw[f[0]], f[1], f[2]);
      if (r.error) errors.push({ id: f[0], message: r.error });
      out[f[0]] = r.value;
    });
    // Revision rounds must be a whole number.
    var roundsRaw = raw.rounds;
    var rounds = roundsRaw === "" ? 0 : Number(roundsRaw);
    if (!isFinite(rounds) || rounds < 0) {
      errors.push({ id: "rounds", message: "Revision rounds: cannot be negative." }); out.rounds = 0;
    } else if (Math.floor(rounds) !== rounds) {
      errors.push({ id: "rounds", message: "Revision rounds: must be a whole number, not a fraction." }); out.rounds = 0;
    } else if (rounds > 100) {
      errors.push({ id: "rounds", message: "Revision rounds: must be below 100." }); out.rounds = 0;
    } else { out.rounds = rounds; }
    ["ms1", "ms2", "ms3"].forEach(function (id, i) {
      var r = checkNumber(raw[id], LIMITS.milestone, "Milestone " + (i + 1));
      if (r.error) errors.push({ id: id, message: r.error });
      out.milestones[i] = r.value;
    });
    var msSum = out.milestones[0] + out.milestones[1] + out.milestones[2];
    if (Math.abs(msSum - 100) > 0.001)
      errors.push({ id: "ms1", message: "Milestones must add up to exactly 100%. They now add up to " + (Math.round(msSum * 100) / 100) + "%." });
    return { values: out, errors: errors };
  }

  /* ---------- DOM helpers (safe: textContent only, never innerHTML with user data) ---------- */
  function $(id) { return document.getElementById(id); }
  function setText(id, text) { var el = $(id); if (el) el.textContent = text; }
  function setMoney(id, n, currency) { setText(id, money(n, currency)); }
  var currency = "USD";
  function money(n, cur) {
    var code = cur || currency;
    if (!isFinite(n)) return "—";
    try {
      return new Intl.NumberFormat("en-US", { style: "currency", currency: code, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);
    } catch (e) { return code + " " + n.toFixed(2); }
  }
  function fmtDate(d) {
    return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
  }
  function lines(text) {
    return String(text || "").split(/\r?\n/).map(function (s) { return s.trim(); }).filter(Boolean);
  }

  function readRaw() {
    var raw = {};
    NUMERIC_IDS.forEach(function (id) { var el = $(id); raw[id] = el ? el.value : ""; });
    ["freelancer", "client", "project", "quoteDate", "scope", "deliverables", "exclusions", "terms"].forEach(function (id) {
      var el = $(id); raw[id] = el ? el.value : "";
    });
    raw.currency = $("currency") ? $("currency").value : "USD";
    return raw;
  }

  function buildClientQuoteText(raw, res) {
    var date = raw.quoteDate ? new Date(raw.quoteDate + "T12:00:00") : new Date();
    var validUntil = new Date(date.getTime());
    validUntil.setDate(validUntil.getDate() + (raw.validDays || 14));
    var L = [];
    L.push("QUOTATION — " + (raw.project || "Project"));
    L.push("From: " + (raw.freelancer || "Freelancer"));
    L.push("To: " + (raw.client || "Client"));
    L.push("Date: " + fmtDate(date) + "  |  Valid until: " + fmtDate(validUntil));
    L.push("");
    L.push("Scope: " + (raw.scope || "As discussed with the client."));
    var del = lines(raw.deliverables);
    if (del.length) { L.push("Deliverables:"); del.forEach(function (d) { L.push("- " + d); }); }
    L.push("");
    L.push("Price (before tax): " + money(res.preTaxPrice));
    L.push("Tax (" + raw.tax + "%): " + money(res.taxAmt));
    L.push("TOTAL TO PAY: " + money(res.totalCustomer));
    L.push("Milestones: " + raw.milestones.map(function (p, i) { return (i + 1) + ") " + p + "% = " + money(res.milestones[i]); }).join(", "));
    L.push("Included revision rounds: " + raw.rounds + " (" + raw.revHours + " hours each). Extra revision round: " + money(res.extraRoundPrice) + " before tax.");
    L.push("Exclusions: " + (raw.exclusions || "None listed."));
    L.push("Payment terms: " + (raw.terms || ""));
    L.push("");
    L.push("Client acceptance: ______________________   Date: __________");
    L.push("Freelancer: ______________________   Date: __________");
    return L.join("\n");
  }

  function calc() {
    var raw = readRaw();
    currency = raw.currency;
    var checked = validateInputs(raw);
    var errors = checked.errors;
    var v = checked.values;
    // Show / clear per-field errors.
    NUMERIC_IDS.forEach(function (id) {
      var el = $(id); if (!el) return;
      var err = errors.find(function (e) { return e.id === id; });
      el.classList.toggle("invalid", !!err);
      el.setAttribute("aria-invalid", err ? "true" : "false");
      var span = $("err-" + id); if (span) setText("err-" + id, err ? err.message : "");
    });
    var box = $("errorBox");
    var valid = errors.length === 0;
    if (box) {
      box.hidden = valid;
      if (!valid) setText("errorSummary", "Please fix " + errors.length + " problem" + (errors.length > 1 ? "s" : "") + " below before the quotation can be finalised.");
    }
    var printBtn = $("btnPrint"); if (printBtn) printBtn.disabled = !valid;
    if (!valid) {
      ["rLabour", "rRevision", "rExpenses", "rCont", "rCost", "rProfit", "rBeforeFee", "rFee", "rPreTax", "rTax", "rTotal", "rKeep", "rActualMargin", "rExtraRound", "rTotalHours", "rExpensesTotal", "rMsSum", "qTotal", "qTax", "qPreTax", "qExtraRound"].forEach(function (id) { setText(id, "—"); });
      setText("qValidUntil", "—");
      var qn = $("qNote"); if (qn) setText("qNote", "Fix the errors above to finalise this quotation.");
      return { valid: false, errors: errors };
    }
    var res = calculatePure({
      phases: v.phases, rate: v.rate, rounds: v.rounds, revHours: v.revHours,
      expenses: v.expenses, contingency: v.contingency, margin: v.margin,
      fee: v.fee, tax: v.tax, milestones: v.milestones
    });
    // Phase + expense totals.
    setText("rTotalHours", res.totalHours + " hours");
    var phasePct = PHASE_IDS.map(function (id, i) {
      return res.totalHours > 0 ? Math.round(v.phases[i] / res.totalHours * 100) : 0;
    });
    setText("rPhaseNote", "Total: " + res.totalHours + " hours — Discovery " + phasePct[0] + "%, Design " + phasePct[1] + "%, Development " + phasePct[2] + "%, Content " + phasePct[3] + "%, Testing " + phasePct[4] + "%, Launch " + phasePct[5] + "%.");
    setMoney("rExpensesTotal", res.expensesTotal);
    setMoney("rLabour", res.labour); setMoney("rRevision", res.revisionCost);
    setMoney("rExpenses", res.expensesTotal); setMoney("rCont", res.contingencyAmt);
    setMoney("rCost", res.totalCosts); setMoney("rProfit", res.profit);
    setMoney("rBeforeFee", res.preFeePrice); setMoney("rFee", res.feeAmt);
    setMoney("rPreTax", res.preTaxPrice); setMoney("rTax", res.taxAmt);
    setMoney("rTotal", res.totalCustomer); setMoney("rKeep", res.retained);
    setText("rActualMargin", (Math.round(res.actualMargin * 100) / 100) + "%");
    setMoney("rExtraRound", res.extraRoundPrice);
    setText("rMsSum", (v.milestones[0] + v.milestones[1] + v.milestones[2]) + "%");
    ["ms1", "ms2", "ms3"].forEach(function (id, i) { setMoney("rMsAmt" + (i + 1), res.milestones[i]); });
    // Client quotation sheet — private costs are NEVER put here.
    var date = raw.quoteDate ? new Date(raw.quoteDate + "T12:00:00") : new Date();
    var validUntil = new Date(date.getTime()); validUntil.setDate(validUntil.getDate() + (v.validDays || 14));
    setText("qFreelancer", raw.freelancer || "Freelancer");
    setText("qClient", raw.client || "Client");
    setText("qProject", raw.project || "Project");
    setText("qDate", fmtDate(date));
    setText("qValidUntil", fmtDate(validUntil));
    setText("qScope", raw.scope || "As discussed with the client.");
    var delList = $("qDeliverables"); if (delList) { delList.textContent = ""; lines(raw.deliverables).forEach(function (d) { var li = document.createElement("li"); li.textContent = d; delList.appendChild(li); }); if (!lines(raw.deliverables).length) { var li2 = document.createElement("li"); li2.textContent = "As discussed with the client."; delList.appendChild(li2); } }
    setMoney("qPreTax", res.preTaxPrice); setMoney("qTax", res.taxAmt); setMoney("qTotal", res.totalCustomer);
    setText("qTaxRate", "Tax (" + v.tax + "%)");
    setText("qRounds", v.rounds + " revision round" + (v.rounds === 1 ? "" : "s") + " (" + v.revHours + " hours each)");
    setMoney("qExtraRound", res.extraRoundPrice);
    setText("qExclusions", raw.exclusions || "None listed.");
    setText("qTerms", raw.terms || "");
    var msList = $("qMilestones"); if (msList) { msList.textContent = ""; v.milestones.forEach(function (p, i) { var li = document.createElement("li"); li.textContent = "Payment " + (i + 1) + ": " + p + "% — " + money(res.milestones[i]); msList.appendChild(li); }); }
    var qn2 = $("qNote"); if (qn2) setText("qNote", "Prices are in " + currency + ". Tax is shown separately and is not profit. The platform fee, if any, applies to the pre-tax price — no fee is charged on tax.");
    var quoteText = buildClientQuoteText({ freelancer: raw.freelancer, client: raw.client, project: raw.project, quoteDate: raw.quoteDate, validDays: v.validDays, scope: raw.scope, deliverables: raw.deliverables, exclusions: raw.exclusions, terms: raw.terms, rounds: v.rounds, revHours: v.revHours, tax: v.tax, milestones: v.milestones }, res);
    return { valid: true, errors: [], result: res, quoteText: quoteText, raw: raw };
  }

  function bind() {
    if (typeof document === "undefined") return;
    NUMERIC_IDS.concat(["freelancer", "client", "project", "quoteDate", "scope", "deliverables", "exclusions", "terms", "currency"]).forEach(function (id) {
      var el = $(id); if (el) el.addEventListener("input", calc); if (el) el.addEventListener("change", calc);
    });
    var qd = $("quoteDate"); if (qd && !qd.value) qd.valueAsDate = new Date();
    var sample = $("btnSample"); if (sample) sample.addEventListener("click", function () {
      var set = function (id, val) { var el = $(id); if (el) el.value = val; };
      set("phDiscovery", 0); set("phDesign", 0); set("phDev", 20); set("phContent", 0); set("phTesting", 0); set("phLaunch", 0);
      set("rate", 50); set("rounds", 2); set("revHours", 2);
      set("exHosting", 0); set("exDomain", 0); set("exSoftware", 0); set("exStock", 0); set("exSubcontractor", 0); set("exOther", 0);
      set("contingency", 0); set("margin", 20); set("fee", 10); set("tax", 0);
      set("ms1", 50); set("ms2", 30); set("ms3", 20);
      set("project", "Business website"); set("client", "Example Client"); set("freelancer", "Example Freelancer");
      set("scope", "A 5-page business website: home, about, services, contact and a blog page.");
      set("deliverables", "5-page website\nMobile-friendly design\nContact form\nBasic search setup");
      set("exclusions", "Logo design, written content, hosting and domain fees, unless listed above.");
      set("terms", "50% to start, 30% on design approval, 20% on launch. Bank transfer.");
      set("validDays", 14);
      calc();
    });
    var clear = $("btnClear"); if (clear) clear.addEventListener("click", function () {
      NUMERIC_IDS.forEach(function (id) { var el = $(id); if (el) el.value = ""; });
      ["freelancer", "client", "project", "scope", "deliverables", "exclusions", "terms"].forEach(function (id) { var el = $(id); if (el) el.value = ""; });
      var set = function (id, val) { var el = $(id); if (el) el.value = val; };
      set("margin", 20); set("fee", 0); set("tax", 0); set("rounds", 2); set("revHours", 2); set("validDays", 14);
      set("ms1", 50); set("ms2", 30); set("ms3", 20); set("currency", "USD");
      var qd2 = $("quoteDate"); if (qd2) qd2.valueAsDate = new Date();
      calc();
    });
    var copy = $("btnCopy"); if (copy) copy.addEventListener("click", function () {
      var r = calc();
      var msg = $("copyMsg");
      if (!r.valid) { if (msg) setText("copyMsg", "Fix the errors first."); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(r.quoteText).then(function () { if (msg) setText("copyMsg", "Copied."); }, function () { if (msg) setText("copyMsg", "Copy did not work — select the quotation text and copy it."); });
      } else if (msg) setText("copyMsg", "Copy is not available in this browser.");
    });
    var printBtn = $("btnPrint"); if (printBtn) printBtn.addEventListener("click", function () {
      var r = calc();
      if (!r.valid) { var first = document.querySelector("input.invalid"); if (first) first.focus(); return; }
      window.print();
    });
    calc();
  }

  // Expose the pure maths + validation for testing (Node / browser console).
  if (typeof window !== "undefined") { window.__priceCalc = { calculatePure: calculatePure, validateInputs: validateInputs, money: money }; }
  if (typeof module !== "undefined" && module.exports) { module.exports = { calculatePure: calculatePure, validateInputs: validateInputs }; }
  if (typeof document !== "undefined") {
    if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind); else bind();
  }
})();
