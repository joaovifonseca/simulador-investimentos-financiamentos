function renderSchedule(sacRows, priceRows, system = 'compare') {
  const tbody = document.getElementById('scheduleRows');
  tbody.innerHTML = '';
  const limit = Math.max(sacRows.length, priceRows.length, 12);
  const cols = {
    payment1: document.getElementById('scheduleColPayment1'),
    interest1: document.getElementById('scheduleColInterest1'),
    balance1: document.getElementById('scheduleColBalance1'),
    payment2: document.getElementById('scheduleColPayment2'),
    interest2: document.getElementById('scheduleColInterest2'),
    balance2: document.getElementById('scheduleColBalance2')
  };
  const set = (key, value) => { if (cols[key]) cols[key].textContent = value; };

  if (system === 'sac') {
    set('payment1', 'SAC parcela'); set('interest1', 'SAC juros'); set('balance1', 'SAC saldo');
    set('payment2', '-'); set('interest2', '-'); set('balance2', '-');
  } else if (system === 'price') {
    set('payment1', 'PRICE parcela'); set('interest1', 'PRICE juros'); set('balance1', 'PRICE saldo');
    set('payment2', '-'); set('interest2', '-'); set('balance2', '-');
  } else {
    set('payment1', 'SAC parcela'); set('interest1', 'SAC juros'); set('balance1', 'SAC saldo');
    set('payment2', 'PRICE parcela'); set('interest2', 'PRICE juros'); set('balance2', 'PRICE saldo');
  }

  for (let i = 0; i < Math.min(limit, 24); i += 1) {
    const sac = sacRows[i];
    const price = priceRows[i];
    const row = document.createElement('tr');
    if (system === 'sac') {
      row.innerHTML = `<td>${i + 1}</td><td>${sac ? money(sac.payment) : '-'}</td><td>${sac ? money(sac.interest) : '-'}</td><td>${sac ? money(sac.balance) : '-'}</td><td>-</td><td>-</td><td>-</td>`;
    } else if (system === 'price') {
      row.innerHTML = `<td>${i + 1}</td><td>-</td><td>-</td><td>-</td><td>${price ? money(price.payment) : '-'}</td><td>${price ? money(price.interest) : '-'}</td><td>${price ? money(price.balance) : '-'}</td>`;
    } else {
      row.innerHTML = `<td>${i + 1}</td><td>${sac ? money(sac.payment) : '-'}</td><td>${sac ? money(sac.interest) : '-'}</td><td>${sac ? money(sac.balance) : '-'}</td><td>${price ? money(price.payment) : '-'}</td><td>${price ? money(price.interest) : '-'}</td><td>${price ? money(price.balance) : '-'}</td>`;
    }
    tbody.appendChild(row);
  }
}

function syncMortgageFields(event) {
  syncPairedNumber(event, 'propertyValueRange', 'propertyValue', 0, Number.POSITIVE_INFINITY);
  syncPairedNumber(event, 'downPaymentPercentRange', 'downPaymentPercent', 20, 100);
}

function simulateMortgage() {
  const propertyValue = numberValue('propertyValue');
  const downPaymentPercent = Math.min(100, Math.max(20, numberValue('downPaymentPercent')));
  const downPaymentAmount = propertyValue * (downPaymentPercent / 100);
  const principal = Math.max(0, propertyValue - downPaymentAmount);
  const annualRate = numberValue('mortgageAnnualRate');
  const months = Math.max(1, Math.round(numberValue('mortgageTerm')));
  const system = document.getElementById('mortgageSystem').value;
  const monthlyInsurance = Math.max(0, numberValue('monthlyInsurance'));
  const monthlyAdminFee = Math.max(0, numberValue('monthlyAdminFee'));
  const upfrontBankFees = Math.max(0, numberValue('upfrontBankFees'));
  const monthlyCharges = monthlyInsurance + monthlyAdminFee;
  const monthlyRate = monthlyRateFromAnnual(annualRate);
  const sacBase = simulateSac(principal, monthlyRate, months);
  const priceBase = simulatePrice(principal, monthlyRate, months);
  const sac = addCharges(sacBase, monthlyCharges, upfrontBankFees);
  const price = addCharges(priceBase, monthlyCharges, upfrontBankFees);
  const showSac = system === 'compare' || system === 'sac';
  const showPrice = system === 'compare' || system === 'price';

  setText('financedAmount', money(principal));
  setText('downPaymentAmount', money(downPaymentAmount));
  setText('downPaymentPercentDisplay', `${downPaymentPercent.toFixed(0)}%`);
  setText('mortgageSelectedSystem', system === 'compare' ? 'Comparar SAC e PRICE' : system.toUpperCase());
  if (system === 'sac') {
    setText('mortgageSelectedTotal', money(sac.totalPaid));
    setText('mortgageSelectedFirstPayment', money(sac.rows[0]?.payment || 0));
  } else if (system === 'price') {
    setText('mortgageSelectedTotal', money(price.totalPaid));
    setText('mortgageSelectedFirstPayment', money(price.rows[0]?.payment || 0));
  } else {
    setText('mortgageSelectedTotal', `SAC: ${money(sac.totalPaid)} | PRICE: ${money(price.totalPaid)}`);
    setText('mortgageSelectedFirstPayment', `SAC: ${money(sac.rows[0]?.payment || 0)} | PRICE: ${money(price.rows[0]?.payment || 0)}`);
  }
  setText('sacTotal', money(sac.totalPaid));
  setText('priceTotal', money(price.totalPaid));
  setText('sacSummary', `${sac.rows.length} parcelas, juros ${money(sacBase.totalPaid - principal)}`);
  setText('priceSummary', `${price.rows.length} parcelas, juros ${money(priceBase.totalPaid - principal)}`);
  setText('sacFirstPayment', money(sac.rows[0]?.payment || 0));
  setText('priceFirstPayment', money(price.rows[0]?.payment || 0));
  setText('monthlyBankCharges', money(monthlyCharges));
  setText('upfrontFeesResult', money(upfrontBankFees));
  document.getElementById('sacCard').classList.toggle('hidden', !showSac);
  document.getElementById('priceCard').classList.toggle('hidden', !showPrice);
  renderSchedule(sac.rows, price.rows, system);
}

function bindMortgage() {
  document.querySelectorAll('#mortgage-form input, #mortgage-form select').forEach((field) => {
    field.addEventListener('input', (event) => {
      syncMortgageFields(event);
      simulateMortgage();
    });
  });

  document.getElementById('mortgage-form').addEventListener('reset', () => {
    window.setTimeout(() => {
      syncMortgageFields({ target: document.getElementById('propertyValueRange') });
      simulateMortgage();
    }, 0);
  });
}

bindMortgage();
simulateMortgage();
