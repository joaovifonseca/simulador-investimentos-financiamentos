function renderAmortizationSchedule(baseRows, extraRows) {
  const tbody = document.getElementById('amortizationRows');
  tbody.innerHTML = '';
  const limit = Math.max(baseRows.length, extraRows.length, 12);

  for (let i = 0; i < Math.min(limit, 24); i += 1) {
    const base = baseRows[i];
    const extra = extraRows[i];
    const row = document.createElement('tr');
    row.innerHTML = `<td>${i + 1}</td><td>${base ? money(base.payment) : '-'}</td><td>${base ? money(base.balance) : '-'}</td><td>${extra ? money(extra.payment) : '-'}</td><td>${extra ? money(extra.balance) : '-'}</td>`;
    tbody.appendChild(row);
  }
}

function comparisonRowForReduction(baseRows, extraRows, amortizationType, startMonth) {
  const targetMonth = amortizationType === 'oneTime' ? startMonth + 1 : startMonth;
  const index = Math.min(Math.max(0, targetMonth - 1), Math.max(0, extraRows.length - 1));
  return { base: baseRows[index] || baseRows[baseRows.length - 1], extra: extraRows[index] || extraRows[extraRows.length - 1] };
}

function simulateInvestedPaymentDifference(baseRows, extraRows, monthlyRate) {
  let balance = 0;
  let contributed = 0;
  const rows = [];
  const length = Math.max(baseRows.length, extraRows.length);

  for (let i = 0; i < length; i += 1) {
    balance *= 1 + monthlyRate;
    const basePayment = baseRows[i]?.scheduledPayment || baseRows[i]?.payment || 0;
    const reducedPayment = extraRows[i]?.scheduledPayment || extraRows[i]?.payment || 0;
    const contribution = Math.max(0, basePayment - reducedPayment);
    balance += contribution;
    contributed += contribution;
    rows.push({ month: i + 1, contribution, contributed, balance, profit: Math.max(0, balance - contributed) });
  }

  return { finalValue: balance, contributed, profit: Math.max(0, balance - contributed), rows };
}

function renderAmortizationInvestmentRows(rows) {
  const tbody = document.getElementById('amortizationInvestmentRows');
  tbody.innerHTML = '';
  rows.slice(0, 240).forEach((item) => {
    const row = document.createElement('tr');
    row.innerHTML = `<td>${item.month}</td><td>${money(item.contribution)}</td><td>${money(item.contributed)}</td><td>${money(item.balance)}</td><td>${money(item.profit)}</td>`;
    tbody.appendChild(row);
  });
}

function updateAmortizationFields() {
  const amortizationType = document.getElementById('amortizationType').value;
  document.querySelectorAll('[data-amortization-group]').forEach((field) => {
    field.classList.toggle('hidden', field.dataset.amortizationGroup !== amortizationType);
  });
}

function updateInvestmentOptions() {
  const isPaymentGoal = document.getElementById('amortizationGoal').value === 'payment';
  const showInvestment = document.getElementById('investPaymentDifference').checked;
  document.querySelectorAll('.payment-goal-option').forEach((item) => item.classList.toggle('hidden', !isPaymentGoal));
  document.querySelectorAll('.investment-option, .investment-result').forEach((item) => item.classList.toggle('hidden', !isPaymentGoal || !showInvestment));
  document.querySelectorAll('.investment-sub-tab').forEach((item) => item.classList.toggle('hidden', !isPaymentGoal || !showInvestment));
  if (!isPaymentGoal || !showInvestment) setActiveSubTab('amortization-table');
}

function setActiveSubTab(tabId) {
  document.querySelectorAll('.sub-tab-button').forEach((button) => button.classList.toggle('active', button.dataset.subTab === tabId));
  document.querySelectorAll('.sub-tab-view').forEach((view) => view.classList.toggle('active', view.id === tabId));
}

function simulateAmortization() {
  const principal = Math.max(0, numberValue('amortizationPrincipal'));
  const annualRate = numberValue('amortizationAnnualRate');
  const shouldInvestDifference = document.getElementById('investPaymentDifference').checked;
  const investmentAnnualRate = numberValue('amortizationInvestmentRate') || annualRate;
  const months = Math.max(1, Math.round(numberValue('amortizationTerm')));
  const method = document.getElementById('amortizationMethod').value;
  const amortizationType = document.getElementById('amortizationType').value;
  const amortizationGoal = document.getElementById('amortizationGoal').value;
  const monthlyExtra = amortizationType === 'monthly' ? Math.max(0, numberValue('monthlyExtraAmortization')) : 0;
  const extraStartMonth = amortizationType === 'monthly' ? Math.max(1, Math.round(numberValue('extraStartMonth'))) : 1;
  const oneTimeExtra = amortizationType === 'oneTime' ? Math.max(0, numberValue('oneTimeAmortization')) : 0;
  const oneTimeMonth = amortizationType === 'oneTime' ? Math.max(1, Math.round(numberValue('oneTimeMonth'))) : 0;
  const monthlyRate = monthlyRateFromAnnual(annualRate);
  const investmentMonthlyRate = monthlyRateFromAnnual(investmentAnnualRate);
  const simulator = method === 'price' ? simulatePrice : simulateSac;
  const paymentReductionSimulator = method === 'price' ? simulatePriceReducePayment : simulateSacReducePayment;
  const base = simulator(principal, monthlyRate, months);
  const withExtra = amortizationGoal === 'payment'
    ? paymentReductionSimulator(principal, monthlyRate, months, monthlyExtra, oneTimeExtra, oneTimeMonth, extraStartMonth)
    : simulator(principal, monthlyRate, months, monthlyExtra, oneTimeExtra, oneTimeMonth, extraStartMonth);
  const savings = Math.max(0, base.totalPaid - withExtra.totalPaid);
  const savedMonths = Math.max(0, base.rows.length - withExtra.rows.length);
  const compared = comparisonRowForReduction(base.rows, withExtra.rows, amortizationType, amortizationType === 'oneTime' ? oneTimeMonth : extraStartMonth);
  const baseComparablePayment = compared.base?.scheduledPayment || compared.base?.payment || 0;
  const extraComparablePayment = compared.extra?.scheduledPayment || compared.extra?.payment || 0;
  const paymentReduction = Math.max(0, baseComparablePayment - extraComparablePayment);
  const investedDifference = amortizationGoal === 'payment' && shouldInvestDifference
    ? simulateInvestedPaymentDifference(base.rows, withExtra.rows, investmentMonthlyRate)
    : { finalValue: 0, profit: 0 };

  setText('amortizationSavings', money(savings));
  setText('baseAmortizationTotal', money(base.totalPaid));
  setText('extraAmortizationTotal', money(withExtra.totalPaid));
  setText('baseAmortizationMonths', `${base.rows.length} meses`);
  setText('extraAmortizationMonths', `${withExtra.rows.length} meses`);
  setText('monthsSaved', `${savedMonths} meses`);
  setText('baseFirstPayment', money(baseComparablePayment));
  setText('extraFirstPayment', money(extraComparablePayment));
  setText('paymentReduction', money(paymentReduction));
  setText('investmentDifferenceRate', `${investmentAnnualRate.toLocaleString('pt-BR')}% a.a.`);
  setText('investedPaymentDifference', money(investedDifference.finalValue));
  setText('investmentDifferenceProfit', money(investedDifference.profit));
  renderAmortizationSchedule(base.rows, withExtra.rows);
  renderAmortizationInvestmentRows(investedDifference.rows || []);
}

function bindAmortizacao() {
  document.querySelectorAll('#amortization-form input, #amortization-form select').forEach((field) => {
    field.addEventListener('input', () => {
      updateAmortizationFields();
      updateInvestmentOptions();
      simulateAmortization();
    });
  });
  document.getElementById('amortization-form').addEventListener('reset', () => {
    window.setTimeout(() => {
      updateAmortizationFields();
      updateInvestmentOptions();
      simulateAmortization();
    }, 0);
  });
}

bindAmortizacao();
updateAmortizationFields();
updateInvestmentOptions();
simulateAmortization();
