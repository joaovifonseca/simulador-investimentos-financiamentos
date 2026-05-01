const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL'
});

const PERCENT = new Intl.NumberFormat('pt-BR', {
  style: 'percent',
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
  const el = document.getElementById(id);
  return el ? Number(el.value) || 0 : 0;
}

function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

function syncPairedNumber(event, rangeId, inputId, min = 0, max = Number.POSITIVE_INFINITY) {
  const range = document.getElementById(rangeId);
  const input = document.getElementById(inputId);
  const source = event?.target;

  if (!range || !input) return;

  if (source === range) {
    input.value = range.value;
    return;
  }

  const value = Math.min(max, Math.max(min, Number(input.value) || 0));
  input.value = value;
  if (value >= Number(range.min) && value <= Number(range.max)) {
    range.value = value;
  }
}

function investmentDays(term, unit) {
  if (unit === 'years') return Math.round(term * 365);
  if (unit === 'days') return Math.round(term);
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

function monthlyRateFromAnnual(annualRate) {
  return Math.pow(1 + annualRate / 100, 1 / 12) - 1;
}

function annualIncrementValue(baseValue, annualRate, month) {
  const yearsElapsed = Math.floor((month - 1) / 12);
  return baseValue * Math.pow(1 + annualRate / 100, yearsElapsed);
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

function pricePayment(balance, monthlyRate, remainingMonths) {
  if (remainingMonths <= 0) return balance;
  if (monthlyRate === 0) return balance / remainingMonths;
  return balance * (monthlyRate / (1 - Math.pow(1 + monthlyRate, -remainingMonths)));
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
