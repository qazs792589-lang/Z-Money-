import { useMemo } from 'react';
import { Config, TransactionCategory, TransactionDirection, Holding, RealizedProfit, Transaction, WeeklyPrice } from '../types';

export const usePortfolioCalculations = (transactions: Transaction[], marketData: { updated: string | null; prices: Record<string, number> }, weeklyPrices: WeeklyPrice[]) => {
  const appData = useMemo(() => {
    const holdings: Record<string, Holding> = {};
    const realizedList: RealizedProfit[] = [];
    const stockGroups: Record<string, Transaction[]> = {};

    // Sort transactions by date for correct sequential calculation
    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTxs.forEach(tx => {
      // For Screen A grouping
      if (!stockGroups[tx.ticker]) stockGroups[tx.ticker] = [];
      stockGroups[tx.ticker].push(tx);

      if (!holdings[tx.ticker]) {
        holdings[tx.ticker] = { ticker: tx.ticker, name: tx.name, currentShares: 0, avgCost: 0, totalInvested: 0, realizedPL: 0 };
      }

      const h = holdings[tx.ticker];

      if (tx.direction === 'BUY') {
        // Reset floating point errors if starting fresh
        if (h.currentShares === 0) h.totalInvested = 0;

        const newTotalShares = h.currentShares + tx.quantity;
        const newTotalCost = h.totalInvested + Math.abs(tx.totalAmount);
        h.avgCost = newTotalShares > 0 ? newTotalCost / newTotalShares : 0;
        h.currentShares = newTotalShares;
        h.totalInvested = newTotalCost;
      } else if (tx.direction === 'SELL') {
        // SELL Logic
        const sellQty = Math.min(tx.quantity, h.currentShares);
        if (sellQty <= 0) return; // Ignore sell if no shares

        const costBasis = h.avgCost * sellQty;
        const sellRevenue = Math.abs(tx.totalAmount);

        const profit = sellRevenue - costBasis;
        h.realizedPL += profit; // Track realized profit
        // Net price = net total / quantity
        const netPrice = sellRevenue / sellQty;

        realizedList.push({
          ticker: tx.ticker,
          name: tx.name,
          shares: sellQty,
          buyPrice: h.avgCost,
          sellPrice: netPrice,
          profit: profit,
          roi: costBasis > 0 ? (profit / costBasis) * 100 : 0,
          daysHeld: 0,
          closeDate: tx.date
        });

        h.currentShares -= sellQty;
        h.totalInvested -= costBasis;

        // Clean up small floating point remainders
        if (h.currentShares <= 0) {
          h.currentShares = 0;
          h.totalInvested = 0;
          h.avgCost = 0;
        }
      } else if (tx.direction === 'DIVIDEND') {
        // Dividend reduces cost basis
        h.totalInvested -= Math.abs(tx.totalAmount);
        h.avgCost = h.currentShares > 0 ? h.totalInvested / h.currentShares : 0;
      }
    });

    const activeHoldings = Object.values(holdings).filter(h => h.currentShares > 0);

    return { activeHoldings, realizedList, stockGroups, holdingsMap: holdings };
  }, [transactions]);

  const stats = useMemo(() => {
    let totalMarketValue = 0;
    let totalInvested = 0;
    appData.activeHoldings.forEach(h => {
      const latestWeekly = weeklyPrices
        .filter(wp => wp.ticker === h.ticker)
        .sort((a, b) => b.date.localeCompare(a.date))[0]?.price;
      
      const price = marketData.prices[h.ticker] || latestWeekly || h.avgCost;
      totalMarketValue += price * h.currentShares;
      totalInvested += h.totalInvested;
    });
    const unrealizedPL = totalMarketValue - totalInvested;
    const roi = totalInvested > 0 ? (unrealizedPL / totalInvested) * 100 : 0;
    return { totalMarketValue, totalInvested, unrealizedPL, roi };
  }, [appData.activeHoldings, marketData.prices, weeklyPrices]);

  return { appData, stats };
};
