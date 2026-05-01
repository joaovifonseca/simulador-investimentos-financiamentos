function resolveRentBuySystem(system, sac, price) {
  if (system === 'price') {
    return { systemLabel: 'PRICE', selectedRows: price.rows, selectedTotal: price.totalPaid, selectedFirstPayment: price.rows[0]?.payment || 0 };
  }
  return { systemLabel: 'SAC', selectedRows: sac.rows, selectedTotal: sac.totalPaid, selectedFirstPayment: sac.rows[0]?.payment || 0 };
}

function renderRentBuyRows(rows) {
  const tbody = document.getElementById('rentBuyRows');
  tbody.innerHTML = '';

  rows.slice(0, 240).forEach((item) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${item.month}</td>
      <td>${money(item.rent)}</td>
      <td>${money(item.rentAccumulated)}</td>
      <td>${money(item.financePayment)}</td>
      <td>${money(item.buyAccumulated)}</td>
      <td>${money(item.outstandingBalance)}</td>
      <td>${money(item.homeEquity)}</td>
    `;
    tbody.appendChild(row);
  });
}

function syncRentBuyFields(event) {
  syncPairedNumber(event, 'rentBuyPropertyValueRange', 'rentBuyPropertyValue', 0, Number.POSITIVE_INFINITY);
  syncPairedNumber(event, 'rentBuyDownPaymentPercentRange', 'rentBuyDownPaymentPercent', 20, 100);
}

function updateRentBuyAmortizationFields() {
  const amortizationType = document.getElementById('rentBuyAmortizationType').value;
  const shouldShow = amortizationType !== 'none';
  document.querySelectorAll('[data-rentbuy-amortization-group]').forEach((field) => {
    field.classList.toggle('hidden', !shouldShow || field.dataset.rentbuyAmortizationGroup !== amortizationType);
  });
}

function simulateRentVsBuy() {
  const propertyValue = numberValue('rentBuyPropertyValue');
  const downPaymentPercent = Math.min(100, Math.max(20, numberValue('rentBuyDownPaymentPercent')));
  const downPaymentAmount = propertyValue * (downPaymentPercent / 100);
  const financedAmount = Math.max(0, propertyValue - downPaymentAmount);
  const annualRate = numberValue('rentBuyMortgageAnnualRate');
  const months = Math.max(1, Math.round(numberValue('rentBuyMortgageTerm')));
  const mortgageSystem = document.getElementById('rentBuyMortgageSystem').value;
  const amortizationType = document.getElementById('rentBuyAmortizationType').value;
  const monthlyExtra = amortizationType === 'monthly' ? Math.max(0, numberValue('rentBuyMonthlyExtraAmortization')) : 0;
  const extraStartMonth = amortizationType === 'monthly' ? Math.max(1, Math.round(numberValue('rentBuyExtraStartMonth'))) : 1;
  const oneTimeExtra = amortizationType === 'oneTime' ? Math.max(0, numberValue('rentBuyOneTimeAmortization')) : 0;
  const oneTimeMonth = amortizationType === 'oneTime' ? Math.max(1, Math.round(numberValue('rentBuyOneTimeMonth'))) : 0;
  const monthlyInsurance = Math.max(0, numberValue('rentBuyMonthlyInsurance'));
  const monthlyAdminFee = Math.max(0, numberValue('rentBuyMonthlyAdminFee'));
  const upfrontBankFees = Math.max(0, numberValue('rentBuyUpfrontBankFees'));
  const rentMonthly = Math.max(0, numberValue('rentMonthly'));
  const rentAnnualIncrease = Math.max(0, numberValue('rentAnnualIncrease'));
  const propertyAppreciationAnnual = Math.max(0, numberValue('propertyAppreciationAnnual'));
  const investmentAnnualRate = Math.max(0, numberValue('rentBuyInvestmentAnnualRate'));
  const monthlyCharges = monthlyInsurance + monthlyAdminFee;
  const monthlyRate = monthlyRateFromAnnual(annualRate);
  const investmentMonthlyRate = monthlyRateFromAnnual(investmentAnnualRate);
  const sac = addCharges(simulateSac(financedAmount, monthlyRate, months, monthlyExtra, oneTimeExtra, oneTimeMonth, extraStartMonth), monthlyCharges, upfrontBankFees);
  const price = addCharges(simulatePrice(financedAmount, monthlyRate, months, monthlyExtra, oneTimeExtra, oneTimeMonth, extraStartMonth), monthlyCharges, upfrontBankFees);
  const selected = resolveRentBuySystem(mortgageSystem, sac, price);
  const selectedRows = selected.selectedRows;

  let rentAccumulated = 0;
  let buyAccumulated = downPaymentAmount + upfrontBankFees;
  let rentBalance = downPaymentAmount + upfrontBankFees;
  const totalInterest = selectedRows.reduce((sum, row) => sum + (row.interest || 0), 0);
  const rows = [];

  for (let month = 1; month <= months; month += 1) {
    const rent = annualIncrementValue(rentMonthly, rentAnnualIncrease, month);
    const financePayment = selectedRows[month - 1]?.payment || 0;
    const outstandingBalance = selectedRows[month - 1]?.balance || 0;
    const homeValue = propertyValue * Math.pow(1 + propertyAppreciationAnnual / 100, month / 12);

    rentAccumulated += rent;
    buyAccumulated += financePayment;
    rentBalance = rentBalance * (1 + investmentMonthlyRate) + (financePayment - rent);

    rows.push({
      month,
      rent,
      rentAccumulated,
      financePayment,
      buyAccumulated,
      outstandingBalance,
      homeEquity: Math.max(0, homeValue - outstandingBalance),
      rentBalance
    });
  }

  const finalHomeValue = propertyValue * Math.pow(1 + propertyAppreciationAnnual / 100, months / 12);
  const finalOutstanding = selectedRows[selectedRows.length - 1]?.balance || 0;
  const buyerNet = finalHomeValue - finalOutstanding - totalInterest - (monthlyCharges * months) - upfrontBankFees;
  const rentNet = rentBalance;
  const difference = buyerNet - rentNet;
  const winner = difference >= 0 ? 'Comprar' : 'Alugar';

  setText('rentBuyWinner', winner);
  setText('rentBuyPurchaseNet', money(buyerNet));
  setText('rentBuyRentNet', money(rentNet));
  setText('rentBuyPurchaseCost', money(buyAccumulated));
  setText('rentBuyRentCost', money(rentAccumulated));
  setText('rentBuyPropertyValue', money(finalHomeValue));
  setText('rentBuySystemUsed', selected.systemLabel);
  setText('rentBuyFirstPayment', money(selected.selectedFirstPayment));
  setText('rentBuyFirstRent', money(rentMonthly));
  renderRentBuyRows(rows);
}

function bind() {
  document.querySelectorAll('input, select').forEach((field) => {
    field.addEventListener('input', (event) => {
      syncRentBuyFields(event);
      updateRentBuyAmortizationFields();
      simulateRentVsBuy();
    });
  });

  document.querySelectorAll('form').forEach((form) => {
    form.addEventListener('reset', () => {
      window.setTimeout(() => {
        syncRentBuyFields({ target: document.getElementById('rentBuyPropertyValueRange') });
        updateRentBuyAmortizationFields();
        simulateRentVsBuy();
      }, 0);
    });
  });
}

bind();
updateRentBuyAmortizationFields();
simulateRentVsBuy();
