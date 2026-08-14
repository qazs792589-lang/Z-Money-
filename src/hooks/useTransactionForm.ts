import { useMemo, useState } from 'react';
import { Config, TransactionCategory, TransactionDirection } from '../types';

export const useTransactionForm = (configs: Record<TransactionCategory, Config>) => {
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    ticker: '',
    name: '',
    direction: 'BUY' as TransactionDirection,
    quantity: 1000,
    unitPrice: 0,
    category: 'General' as TransactionCategory,
    customFee: 0,
    customTax: 0,
    manualFee: '' as string | number, // Added for manual override
    manualTax: '' as string | number // Added for manual override
  });

  const preview = useMemo(() => {
    const subtotal = formData.unitPrice * formData.quantity;
    const config = configs[formData.category] || configs['General'];
    let fee = 0;
    let tax = 0;

    // Calculate auto fee and tax first
    const feeRate = formData.direction === 'BUY' ? config.buyFeeRate : config.sellFeeRate;
    const autoFee = formData.direction === 'DIVIDEND' ? 0 : Math.max(config.minFee, Math.floor(subtotal * feeRate * config.discount));
    const autoTax = formData.direction === 'SELL' ? Math.floor(subtotal * config.taxRate) : 0;

    // Use manual fee if provided, otherwise use auto/custom logic
    if (formData.manualFee !== '') {
      fee = parseFloat(formData.manualFee as string) || 0;
    } else if (formData.category === 'Custom') {
      fee = formData.customFee;
    } else {
      fee = autoFee;
    }

    // Use manual tax if provided, otherwise use auto/custom logic
    if (formData.manualTax !== '') {
      tax = parseFloat(formData.manualTax as string) || 0;
    } else if (formData.category === 'Custom') {
      tax = formData.customTax;
    } else {
      tax = autoTax;
    }

    const total = formData.direction === 'BUY' ? subtotal + fee + tax : -(subtotal - fee - tax);

    // Formulas strings for display
    const feeFormula = formData.manualFee !== '' 
      ? `手動輸入: ${fee.toLocaleString()}` 
      : formData.direction === 'DIVIDEND'
        ? '股息發放不扣券商手續費（可手動輸入）'
        : `max(${config.minFee}, floor(${subtotal.toLocaleString()} × ${formData.direction === 'BUY' ? config.buyFeeRate : config.sellFeeRate} × ${config.discount}))`;

    const taxFormula = formData.manualTax !== '' 
      ? `手動輸入: ${tax.toLocaleString()}`
      : formData.direction === 'DIVIDEND'
        ? '股息非證券交易無交易稅（可手動扣繳稅）'
        : formData.direction === 'SELL'
          ? `floor(${subtotal.toLocaleString()} × ${config.taxRate})`
          : '免徵';

    // Plain language explanations
    const feeFormulaPlain = formData.manualFee !== ''
      ? `已使用手動輸入的手續費/匯費 $${fee.toLocaleString()}。`
      : formData.direction === 'DIVIDEND'
        ? '股息領取無需付給券商手續費（若有匯費/手續費可手動輸入）。'
        : fee === config.minFee
          ? `手續費不足 ${config.minFee} 元，以最低 ${config.minFee} 元計收。`
          : `成交金額 $${subtotal.toLocaleString()} 乘以費率 ${config.buyFeeRate * 100}% 再打 ${config.discount * 10} 折。`;

    const taxFormulaPlain = formData.manualTax !== ''
      ? `已使用手動輸入的扣繳稅額/補充保費 $${tax.toLocaleString()}。`
      : formData.direction === 'DIVIDEND'
        ? '股息不屬於證券交易免徵交稅（如有二代健保或海外扣繳可手動輸入）。'
        : formData.direction === 'SELL'
          ? `賣出金額 $${subtotal.toLocaleString()} 乘以稅率 ${(config.taxRate * 100).toFixed(2)}%。`
          : formData.direction === 'BUY' ? '只有在賣出股票時才需要繳納證交稅。' : '免徵稅';

    const feeLabel = formData.manualFee !== '' 
      ? '手續費 (手動)' 
      : formData.direction === 'DIVIDEND'
        ? '免手續費 (可手動)'
        : `手續費 (${(config.discount * 10).toFixed(1)}折)`;

    const taxLabel = formData.manualTax !== '' 
      ? (formData.direction === 'DIVIDEND' ? '扣繳稅額/補充保費 (手動)' : '證券交易稅 (手動)')
      : formData.direction === 'DIVIDEND'
        ? '免徵交稅 (可手動)'
        : formData.direction === 'SELL'
          ? `證券交易稅 (${(config.taxRate * 100).toFixed(2)}%)`
          : '免徵交稅';

    return { fee, tax, total, feeFormula, taxFormula, feeLabel, taxLabel, feeFormulaPlain, taxFormulaPlain, autoFee, autoTax };
  }, [formData, configs]);

  return { formData, setFormData, preview };
};
