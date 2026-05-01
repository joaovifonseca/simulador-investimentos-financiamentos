const BRL = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

const PERCENT = new Intl.NumberFormat("pt-BR", {
  style: "percent",
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
});

const iofTable = {
  1: 0.96, 2: 0.93, 3: 0.9, 4: 0.86, 5: 0.83,
  6: 0.8, 7: 0.76, 8: 0.73, 9: 0.7, 10: 0.66,
  11: 0.63, 12: 0.6, 13: 0.56, 14: 0.53, 15: 0.5,
  16: 0.46, 17: 0.43, 18: 0.4, 19: 0.36, 20: 0.33,
  21: 0.3, 22: 0.26, 23: 0.23, 24: 0.2, 25: 0.16,
  26: 0.13, 27: 0.1, 28: 0.06, 29: 0.03
};

function money(value) {
  return BRL.format(Number.isFinite(value) ? value : 0);
}

function numberValue(id) {
  return Number(document.getElementById(id).value) || 0;
}

function setText(id, value) {
  document.getElementById(id).textContent = value;
}

function addCharges(schedule, monthlyCharges = 0, upfrontFees = 0) {
  return {
    totalPaid: schedule.totalPaid + (schedule.rows.length * monthlyCharges) + upfrontFees,
    rows: schedule.rows.map((row) => ({
      ...row,
      basePayment: row.payment,
      payment: row.payment + monthlyCharges
    }))
  };
}

function investmentDays(term, unit) {
  if (unit === "years") return Math.round(term * 365);
  if (unit === "days") return Math.round(term);
  return Math.round(term * 30);
}

function incomeTaxRate(days) {
  if (days <= 180) return 0.225;
  if (days <= 360) return 0.2;
  if (days <= 720) return 0.175;
  return 0.15;
}

function investmentTaxes(grossProfit, days, taxable) {
  if (!taxable) return { iof: 0, incomeTax: 0, taxRate: 0 };
  const iof = days < 30 ? grossProfit * (iofTable[days] || 0) : 0;
  const taxRate = incomeTaxRate(days);
  const incomeTax = Math.max(0, grossProfit - iof) * taxRate;
  return { iof, incomeTax, taxRate };
}

function renderInvestmentRows(rows) {
  const tbody = document.getElementById("investmentRows");
  tbody.innerHTML = "";

  rows.slice(0, 240).forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.month}</td>
      <td>${money(item.deposited)}</td>
      <td>${money(item.balance)}</td>
      <td>${money(item.taxes)}</td>
      <td>${money(item.netValue)}</td>
    `;
    tbody.appendChild(row);
  });
}

function simulateInvestment() {
  const initial = numberValue("initialAmount");
  const monthly = numberValue("monthlyContribution");
  const annualReturn = numberValue("annualReturn") / 100;
  const term = Math.max(1, numberValue("investmentTerm"));
  const unit = document.getElementById("investmentTermUnit").value;
  const type = document.getElementById("investmentType").value;
  const days = investmentDays(term, unit);
  const dailyRate = Math.pow(1 + annualReturn, 1 / 365) - 1;
  let balance = initial;
  let deposited = initial;
  const rows = [];

  for (let day = 1; day <= days; day += 1) {
    balance *= 1 + dailyRate;
    if (day % 30 === 0) {
      balance += monthly;
      deposited += monthly;
    }
    if (day % 30 === 0 || day === days) {
      const grossProfitAtDay = Math.max(0, balance - deposited);
      const taxesAtDay = investmentTaxes(grossProfitAtDay, day, type === "taxable");
      const taxTotal = taxesAtDay.iof + taxesAtDay.incomeTax;
      rows.push({
        month: Math.ceil(day / 30),
        deposited,
        balance,
        taxes: taxTotal,
        netValue: balance - taxTotal
      });
    }
  }

  const grossProfit = Math.max(0, balance - deposited);
  const taxable = type === "taxable";
  const taxes = investmentTaxes(grossProfit, days, taxable);
  const iof = taxes.iof;
  const incomeTax = taxes.incomeTax;
  const taxRate = taxes.taxRate;
  const netValue = balance - iof - incomeTax;

  setText("investmentNetValue", money(netValue));
  setText("investmentDeposited", money(deposited));
  setText("investmentGrossProfit", money(grossProfit));
  setText("investmentIncomeTax", money(incomeTax));
  setText("investmentIof", money(iof));
  setText("investmentTaxRate", taxable ? PERCENT.format(taxRate) : "Isento");
  renderInvestmentRows(rows);
}

function monthlyRateFromAnnual(annualRate) {
  return Math.pow(1 + annualRate / 100, 1 / 12) - 1;
}

function simulateSac(principal, monthlyRate, months, monthlyExtra = 0, oneTimeExtra = 0, oneTimeMonth = 0, extraStartMonth = 1) {
  let balance = principal;
  let totalPaid = 0;
  const rows = [];
  const baseAmortization = principal / months;

  for (let month = 1; month <= months && balance > 0.01; month += 1) {
    const interest = balance * monthlyRate;
    const amortization = Math.min(baseAmortization, balance);
    let extra = month >= extraStartMonth ? Math.min(monthlyExtra, Math.max(0, balance - amortization)) : 0;
    if (month === oneTimeMonth) {
      extra += Math.min(oneTimeExtra, Math.max(0, balance - amortization - extra));
    }
    const scheduledPayment = interest + amortization;
    const payment = scheduledPayment + extra;
    balance = Math.max(0, balance - amortization - extra);
    totalPaid += payment;
    rows.push({ month, payment, scheduledPayment, extra, interest, amortization: amortization + extra, balance });
  }

  return { totalPaid, rows };
}

function simulatePrice(principal, monthlyRate, months, monthlyExtra = 0, oneTimeExtra = 0, oneTimeMonth = 0, extraStartMonth = 1) {
  let balance = principal;
  let totalPaid = 0;
  const rows = [];
  const fixedPayment = monthlyRate === 0
    ? principal / months
    : principal * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -months)));

  for (let month = 1; month <= months && balance > 0.01; month += 1) {
    const interest = balance * monthlyRate;
    const scheduledAmortization = Math.min(Math.max(fixedPayment - interest, 0), balance);
    let extra = month >= extraStartMonth ? Math.min(monthlyExtra, Math.max(0, balance - scheduledAmortization)) : 0;
    if (month === oneTimeMonth) {
      extra += Math.min(oneTimeExtra, Math.max(0, balance - scheduledAmortization - extra));
    }
    const scheduledPayment = interest + scheduledAmortization;
    const payment = scheduledPayment + extra;
    balance = Math.max(0, balance - scheduledAmortization - extra);
    totalPaid += payment;
    rows.push({ month, payment, scheduledPayment, extra, interest, amortization: scheduledAmortization + extra, balance });
  }

  return { totalPaid, rows };
}

function pricePayment(balance, monthlyRate, remainingMonths) {
  if (remainingMonths <= 0) return balance;
  if (monthlyRate === 0) return balance / remainingMonths;
  return balance * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -remainingMonths)));
}

function simulateSacReducePayment(principal, monthlyRate, months, monthlyExtra = 0, oneTimeExtra = 0, oneTimeMonth = 0, extraStartMonth = 1) {
  let balance = principal;
  let totalPaid = 0;
  const rows = [];

  for (let month = 1; month <= months && balance > 0.01; month += 1) {
    const remainingMonths = months - month + 1;
    const interest = balance * monthlyRate;
    const amortization = Math.min(balance / remainingMonths, balance);
    let extra = month >= extraStartMonth ? Math.min(monthlyExtra, Math.max(0, balance - amortization)) : 0;
    if (month === oneTimeMonth) {
      extra += Math.min(oneTimeExtra, Math.max(0, balance - amortization - extra));
    }
    const scheduledPayment = interest + amortization;
    const payment = scheduledPayment + extra;
    balance = Math.max(0, balance - amortization - extra);
    totalPaid += payment;
    rows.push({ month, payment, scheduledPayment, extra, interest, amortization: amortization + extra, balance });
  }

  return { totalPaid, rows };
}

function simulatePriceReducePayment(principal, monthlyRate, months, monthlyExtra = 0, oneTimeExtra = 0, oneTimeMonth = 0, extraStartMonth = 1) {
  let balance = principal;
  let totalPaid = 0;
  const rows = [];

  for (let month = 1; month <= months && balance > 0.01; month += 1) {
    const remainingMonths = months - month + 1;
    const fixedPayment = pricePayment(balance, monthlyRate, remainingMonths);
    const interest = balance * monthlyRate;
    const scheduledAmortization = Math.min(Math.max(fixedPayment - interest, 0), balance);
    let extra = month >= extraStartMonth ? Math.min(monthlyExtra, Math.max(0, balance - scheduledAmortization)) : 0;
    if (month === oneTimeMonth) {
      extra += Math.min(oneTimeExtra, Math.max(0, balance - scheduledAmortization - extra));
    }
    const scheduledPayment = interest + scheduledAmortization;
    const payment = scheduledPayment + extra;
    balance = Math.max(0, balance - scheduledAmortization - extra);
    totalPaid += payment;
    rows.push({ month, payment, scheduledPayment, extra, interest, amortization: scheduledAmortization + extra, balance });
  }

  return { totalPaid, rows };
}

function renderSchedule(sacRows, priceRows) {
  const tbody = document.getElementById("scheduleRows");
  tbody.innerHTML = "";
  const limit = Math.max(sacRows.length, priceRows.length, 12);

  for (let index = 0; index < Math.min(limit, 24); index += 1) {
    const sac = sacRows[index];
    const price = priceRows[index];
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${sac ? money(sac.payment) : "-"}</td>
      <td>${sac ? money(sac.interest) : "-"}</td>
      <td>${sac ? money(sac.balance) : "-"}</td>
      <td>${price ? money(price.payment) : "-"}</td>
      <td>${price ? money(price.interest) : "-"}</td>
      <td>${price ? money(price.balance) : "-"}</td>
    `;
    tbody.appendChild(row);
  }
}

function simulateMortgage() {
  const propertyValue = numberValue("propertyValue");
  const downPayment = numberValue("downPayment");
  const principal = Math.max(0, propertyValue - downPayment);
  const annualRate = numberValue("mortgageAnnualRate");
  const months = Math.max(1, Math.round(numberValue("mortgageTerm")));
  const monthlyInsurance = Math.max(0, numberValue("monthlyInsurance"));
  const monthlyAdminFee = Math.max(0, numberValue("monthlyAdminFee"));
  const upfrontBankFees = Math.max(0, numberValue("upfrontBankFees"));
  const monthlyCharges = monthlyInsurance + monthlyAdminFee;
  const monthlyRate = monthlyRateFromAnnual(annualRate);
  const sacBase = simulateSac(principal, monthlyRate, months);
  const priceBase = simulatePrice(principal, monthlyRate, months);
  const sac = addCharges(sacBase, monthlyCharges, upfrontBankFees);
  const price = addCharges(priceBase, monthlyCharges, upfrontBankFees);

  setText("financedAmount", money(principal));
  setText("sacTotal", money(sac.totalPaid));
  setText("priceTotal", money(price.totalPaid));
  setText("sacSummary", `${sac.rows.length} parcelas, juros ${money(sacBase.totalPaid - principal)}`);
  setText("priceSummary", `${price.rows.length} parcelas, juros ${money(priceBase.totalPaid - principal)}`);
  setText("sacFirstPayment", money(sac.rows[0]?.payment || 0));
  setText("priceFirstPayment", money(price.rows[0]?.payment || 0));
  setText("monthlyBankCharges", money(monthlyCharges));
  setText("upfrontFeesResult", money(upfrontBankFees));
  renderSchedule(sac.rows, price.rows);
}

function renderAmortizationSchedule(baseRows, extraRows) {
  const tbody = document.getElementById("amortizationRows");
  tbody.innerHTML = "";
  const limit = Math.max(baseRows.length, extraRows.length, 12);

  for (let index = 0; index < Math.min(limit, 24); index += 1) {
    const base = baseRows[index];
    const extra = extraRows[index];
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${base ? money(base.payment) : "-"}</td>
      <td>${base ? money(base.balance) : "-"}</td>
      <td>${extra ? money(extra.payment) : "-"}</td>
      <td>${extra ? money(extra.balance) : "-"}</td>
    `;
    tbody.appendChild(row);
  }
}

function comparisonRowForReduction(baseRows, extraRows, amortizationType, startMonth) {
  const targetMonth = amortizationType === "oneTime" ? startMonth + 1 : startMonth;
  const index = Math.min(Math.max(0, targetMonth - 1), Math.max(0, extraRows.length - 1));
  return {
    base: baseRows[index] || baseRows[baseRows.length - 1],
    extra: extraRows[index] || extraRows[extraRows.length - 1]
  };
}

function simulateInvestedPaymentDifference(baseRows, extraRows, monthlyRate) {
  let balance = 0;
  let contributed = 0;
  const rows = [];
  const length = Math.max(baseRows.length, extraRows.length);

  for (let index = 0; index < length; index += 1) {
    balance *= 1 + monthlyRate;
    const basePayment = baseRows[index]?.scheduledPayment || baseRows[index]?.payment || 0;
    const reducedPayment = extraRows[index]?.scheduledPayment || extraRows[index]?.payment || 0;
    const contribution = Math.max(0, basePayment - reducedPayment);
    balance += contribution;
    contributed += contribution;
    rows.push({
      month: index + 1,
      contribution,
      contributed,
      balance,
      profit: Math.max(0, balance - contributed)
    });
  }

  return {
    finalValue: balance,
    contributed,
    profit: Math.max(0, balance - contributed),
    rows
  };
}

function renderAmortizationInvestmentRows(rows) {
  const tbody = document.getElementById("amortizationInvestmentRows");
  tbody.innerHTML = "";

  rows.slice(0, 240).forEach((item) => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${item.month}</td>
      <td>${money(item.contribution)}</td>
      <td>${money(item.contributed)}</td>
      <td>${money(item.balance)}</td>
      <td>${money(item.profit)}</td>
    `;
    tbody.appendChild(row);
  });
}

function simulateAmortization() {
  const principal = Math.max(0, numberValue("amortizationPrincipal"));
  const annualRate = numberValue("amortizationAnnualRate");
  const shouldInvestDifference = document.getElementById("investPaymentDifference").checked;
  const investmentAnnualRate = numberValue("amortizationInvestmentRate") || annualRate;
  const months = Math.max(1, Math.round(numberValue("amortizationTerm")));
  const method = document.getElementById("amortizationMethod").value;
  const amortizationType = document.getElementById("amortizationType").value;
  const amortizationGoal = document.getElementById("amortizationGoal").value;
  const monthlyExtra = amortizationType === "monthly" ? Math.max(0, numberValue("monthlyExtraAmortization")) : 0;
  const extraStartMonth = amortizationType === "monthly" ? Math.max(1, Math.round(numberValue("extraStartMonth"))) : 1;
  const oneTimeExtra = amortizationType === "oneTime" ? Math.max(0, numberValue("oneTimeAmortization")) : 0;
  const oneTimeMonth = amortizationType === "oneTime" ? Math.max(1, Math.round(numberValue("oneTimeMonth"))) : 0;
  const monthlyRate = monthlyRateFromAnnual(annualRate);
  const investmentMonthlyRate = monthlyRateFromAnnual(investmentAnnualRate);
  const simulator = method === "price" ? simulatePrice : simulateSac;
  const paymentReductionSimulator = method === "price" ? simulatePriceReducePayment : simulateSacReducePayment;
  const base = simulator(principal, monthlyRate, months);
  const withExtra = amortizationGoal === "payment"
    ? paymentReductionSimulator(principal, monthlyRate, months, monthlyExtra, oneTimeExtra, oneTimeMonth, extraStartMonth)
    : simulator(principal, monthlyRate, months, monthlyExtra, oneTimeExtra, oneTimeMonth, extraStartMonth);
  const savings = Math.max(0, base.totalPaid - withExtra.totalPaid);
  const savedMonths = Math.max(0, base.rows.length - withExtra.rows.length);
  const compared = comparisonRowForReduction(
    base.rows,
    withExtra.rows,
    amortizationType,
    amortizationType === "oneTime" ? oneTimeMonth : extraStartMonth
  );
  const baseComparablePayment = compared.base?.scheduledPayment || compared.base?.payment || 0;
  const extraComparablePayment = compared.extra?.scheduledPayment || compared.extra?.payment || 0;
  const paymentReduction = Math.max(0, baseComparablePayment - extraComparablePayment);
  const investedDifference = amortizationGoal === "payment" && shouldInvestDifference
    ? simulateInvestedPaymentDifference(base.rows, withExtra.rows, investmentMonthlyRate)
    : { finalValue: 0, profit: 0 };

  setText("amortizationSavings", money(savings));
  setText("baseAmortizationTotal", money(base.totalPaid));
  setText("extraAmortizationTotal", money(withExtra.totalPaid));
  setText("baseAmortizationMonths", `${base.rows.length} meses`);
  setText("extraAmortizationMonths", `${withExtra.rows.length} meses`);
  setText("monthsSaved", `${savedMonths} meses`);
  setText("baseFirstPayment", money(baseComparablePayment));
  setText("extraFirstPayment", money(extraComparablePayment));
  setText("paymentReduction", money(paymentReduction));
  setText("investmentDifferenceRate", `${investmentAnnualRate.toLocaleString("pt-BR")}% a.a.`);
  setText("investedPaymentDifference", money(investedDifference.finalValue));
  setText("investmentDifferenceProfit", money(investedDifference.profit));
  renderAmortizationSchedule(base.rows, withExtra.rows);
  renderAmortizationInvestmentRows(investedDifference.rows || []);
}

function updateInvestmentOptions() {
  const isPaymentGoal = document.getElementById("amortizationGoal").value === "payment";
  const showInvestment = document.getElementById("investPaymentDifference").checked;
  document.querySelectorAll(".payment-goal-option").forEach((item) => {
    item.classList.toggle("hidden", !isPaymentGoal);
  });
  document.querySelectorAll(".investment-option, .investment-result").forEach((item) => {
    item.classList.toggle("hidden", !isPaymentGoal || !showInvestment);
  });
  document.querySelectorAll(".investment-sub-tab").forEach((item) => {
    item.classList.toggle("hidden", !isPaymentGoal || !showInvestment);
  });
  if (!isPaymentGoal || !showInvestment) {
    setActiveSubTab("amortization-table");
  }
}

function setActiveSubTab(tabId) {
  document.querySelectorAll(".sub-tab-button").forEach((button) => {
    button.classList.toggle("active", button.dataset.subTab === tabId);
  });
  document.querySelectorAll(".sub-tab-view").forEach((view) => {
    view.classList.toggle("active", view.id === tabId);
  });
}

function syncPropertyValue(event) {
  const range = document.getElementById("propertyValueRange");
  const input = document.getElementById("propertyValue");
  const source = event?.target;

  if (source === range) {
    input.value = range.value;
    return;
  }

  const value = Math.max(0, numberValue("propertyValue"));
  if (value >= Number(range.min) && value <= Number(range.max)) {
    range.value = value;
  }
}

function updateAmortizationFields() {
  const amortizationType = document.getElementById("amortizationType").value;
  document.querySelectorAll("[data-amortization-group]").forEach((field) => {
    field.classList.toggle("hidden", field.dataset.amortizationGroup !== amortizationType);
  });
}

function bindTabs() {
  document.querySelectorAll(".tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll(".tab-button").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".tab-view").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(button.dataset.tab).classList.add("active");
    });
  });
}

function bindSubTabs() {
  document.querySelectorAll(".sub-tab-button").forEach((button) => {
    button.addEventListener("click", () => {
      setActiveSubTab(button.dataset.subTab);
    });
  });
}

function bindCalculators() {
  document.querySelectorAll("input, select").forEach((field) => {
    field.addEventListener("input", (event) => {
      syncPropertyValue(event);
      updateAmortizationFields();
      updateInvestmentOptions();
      simulateInvestment();
      simulateMortgage();
      simulateAmortization();
    });
  });
}

bindTabs();
bindSubTabs();
bindCalculators();
updateAmortizationFields();
updateInvestmentOptions();
simulateInvestment();
simulateMortgage();
simulateAmortization();
