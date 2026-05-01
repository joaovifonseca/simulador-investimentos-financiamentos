function renderInvestmentRows(rows) {
  const tbody = document.getElementById('investmentRows');
  tbody.innerHTML = '';

  rows.slice(0, 240).forEach((item) => {
    const row = document.createElement('tr');
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
  const initial = numberValue('initialAmount');
  const monthly = numberValue('monthlyContribution');
  const annualReturn = numberValue('annualReturn') / 100;
  const term = Math.max(1, numberValue('investmentTerm'));
  const unit = document.getElementById('investmentTermUnit').value;
  const type = document.getElementById('investmentType').value;
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
      const taxesAtDay = investmentTaxes(grossProfitAtDay, day, type === 'taxable');
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
  const taxable = type === 'taxable';
  const taxes = investmentTaxes(grossProfit, days, taxable);
  setText('investmentNetValue', money(balance - taxes.iof - taxes.incomeTax));
  setText('investmentDeposited', money(deposited));
  setText('investmentGrossProfit', money(grossProfit));
  setText('investmentIncomeTax', money(taxes.incomeTax));
  setText('investmentIof', money(taxes.iof));
  setText('investmentTaxRate', taxable ? PERCENT.format(taxes.taxRate) : 'Isento');
  renderInvestmentRows(rows);
}

function bind() {
  document.querySelectorAll('input, select').forEach((field) => {
    field.addEventListener('input', simulateInvestment);
  });
  document.querySelectorAll('form').forEach((form) => {
    form.addEventListener('reset', () => {
      window.setTimeout(simulateInvestment, 0);
    });
  });
}

bind();
simulateInvestment();
