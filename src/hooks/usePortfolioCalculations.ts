import { useMemo } from 'react';
import { Config, TransactionCategory, TransactionDirection, Holding, RealizedProfit, Transaction, WeeklyPrice } from '../types';

export const usePortfolioCalculations = (transactions: Transaction[], marketData: { updated: string | null; prices: Record<string, number> }, weeklyPrices: WeeklyPrice[]) => {
  const appData = useMemo(() => {
    const holdings: Record<string, Holding & { totalBuyFees: number, firstBuyDate?: string }> = {};
    const realizedList: RealizedProfit[] = [];
    const stockGroups: Record<string, Transaction[]> = {};

    // Sort transactions by date for correct sequential calculation
    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTxs.forEach(tx => {
      // For Screen A grouping
      if (!stockGroups[tx.ticker]) stockGroups[tx.ticker] = [];
      stockGroups[tx.ticker].push(tx);

      if (!holdings[tx.ticker]) {
        holdings[tx.ticker] = { ticker: tx.ticker, name: tx.name, currentShares: 0, avgCost: 0, totalInvested: 0, realizedPL: 0, totalBuyFees: 0 };
      }

      const h = holdings[tx.ticker];

      if (tx.direction === 'BUY') {
        if (h.currentShares === 0) {
          h.totalInvested = 0;
          h.totalBuyFees = 0;
          h.firstBuyDate = tx.date;
        }

        const newTotalShares = h.currentShares + tx.quantity;
        const newTotalCost = h.totalInvested + Math.abs(tx.totalAmount);
        h.avgCost = newTotalShares > 0 ? newTotalCost / newTotalShares : 0;
        h.currentShares = newTotalShares;
        h.totalInvested = newTotalCost;
        h.totalBuyFees += tx.fee + tx.tax;
      } else if (tx.direction === 'SELL') {
        const sellQty = Math.min(tx.quantity, h.currentShares);
        if (sellQty <= 0) return;

        const costBasis = h.avgCost * sellQty;
        const buyFeesBasis = (h.totalBuyFees / h.currentShares) * sellQty;
        
        const sellRevenue = Math.abs(tx.totalAmount);
        const sellFees = tx.fee + tx.tax;

        const profit = sellRevenue - costBasis;
        h.realizedPL += profit;
        
        const netSellPrice = sellRevenue / sellQty;

        // Calculate Days Held
        let daysHeld = 0;
        if (h.firstBuyDate) {
          const start = new Date(h.firstBuyDate).getTime();
          const end = new Date(tx.date).getTime();
          daysHeld = Math.floor((end - start) / (1000 * 60 * 60 * 24));
        }

        realizedList.push({
          ticker: tx.ticker,
          name: tx.name,
          shares: sellQty,
          buyPrice: h.avgCost,
          sellPrice: netSellPrice,
          totalCost: costBasis,
          totalRevenue: sellRevenue,
          totalFees: buyFeesBasis + sellFees,
          profit: profit,
          roi: costBasis > 0 ? (profit / costBasis) * 100 : 0,
          daysHeld: daysHeld,
          closeDate: tx.date,
          notes: tx.notes,
          sellTxId: tx.id
        });

        h.currentShares -= sellQty;
        h.totalInvested -= costBasis;
        h.totalBuyFees -= buyFeesBasis;

        if (h.currentShares <= 0) {
          h.currentShares = 0;
          h.totalInvested = 0;
          h.avgCost = 0;
          h.totalBuyFees = 0;
          h.firstBuyDate = undefined;
        }
      } else if (tx.direction === 'DIVIDEND') {
        const dividendAmount = Math.abs(tx.totalAmount);
        h.realizedPL += dividendAmount;
        
        realizedList.push({
          ticker: tx.ticker,
          name: tx.name,
          shares: 0,
          buyPrice: 0,
          sellPrice: 0,
          totalCost: 0,
          totalRevenue: dividendAmount,
          totalFees: 0,
          profit: dividendAmount,
          roi: 0, // ROI is 0 for dividends now per user request to not show it
          daysHeld: 0,
          closeDate: tx.date,
          notes: tx.notes || '股息收入',
          sellTxId: tx.id
        });
      }
    });

    const activeHoldings = Object.values(holdings).filter(h => h.currentShares > 0);

    return { activeHoldings, realizedList, stockGroups, holdingsMap: holdings };
  }, [transactions]);

  const stats = useMemo(() => {
    let totalMarketValue = 0;
    let totalInvested = 0;
    const totalRealizedPL = appData.realizedList.reduce((sum, r) => sum + r.profit, 0);

    appData.activeHoldings.forEach(h => {
      const latestWeekly = weeklyPrices
        .filter(wp => wp.ticker === h.ticker)
        .sort((a, b) => b.date.localeCompare(a.date))[0]?.price;
      
      const price = marketData.prices[h.ticker] || latestWeekly || h.avgCost;
      totalMarketValue += price * h.currentShares;
      totalInvested += h.totalInvested;
    });

    const unrealizedPL = totalMarketValue - totalInvested;
    const totalPL = unrealizedPL + totalRealizedPL;
    const roi = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;
    
    return { totalMarketValue, totalInvested, unrealizedPL, totalRealizedPL, totalPL, roi };
  }, [appData.activeHoldings, appData.realizedList, marketData.prices, weeklyPrices]);

  return { appData, stats };
};
