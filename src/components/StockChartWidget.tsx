import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Scatter,
  Legend
} from 'recharts';
import { Transaction, WeeklyPrice } from '../types';

export const StockChartWidget = ({ ticker, transactions, weeklyPrices, marketData }: { ticker: string, transactions: Transaction[], weeklyPrices: WeeklyPrice[], marketData: any }) => {
  const chartData: any[] = [];

  const combinedData = useMemo(() => {
    let dataToUse = weeklyPrices.length > 0 ? weeklyPrices.map(wp => ({
      date: wp.date,
      timestamp: new Date(wp.date).getTime(),
      price: wp.price
    })) : chartData;

    // 強制按照時間排序，防止連線跳躍
    dataToUse.sort((a, b) => a.timestamp - b.timestamp);

    // Fallback: If no history, see if we have a current static price
    const currentPrice = marketData.prices?.[ticker];
    if (dataToUse.length === 0 && currentPrice) {
      dataToUse = [{
        date: new Date().toISOString().split('T')[0],
        timestamp: Date.now(),
        price: currentPrice
      }];
    }

    if (!dataToUse.length) return [];

    // Sort transactions oldest to newest
    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sortedTxs.length === 0) return dataToUse;

    let currentShares = 0;
    let totalInvested = 0;
    let txIndex = 0;

    // Map API chart data to add daily position holding values
    const dataWithHoldings = dataToUse.map(point => {
      const pd = new Date(point.timestamp);
      // Format to YYYY-MM-DD
      const pointDateStr = `${pd.getFullYear()}-${String(pd.getMonth() + 1).padStart(2, '0')}-${String(pd.getDate()).padStart(2, '0')}`;

      let hasTxToday = false;

      // Apply all transactions that happened on or before this day
      while (txIndex < sortedTxs.length && sortedTxs[txIndex].date <= pointDateStr) {
        const tx = sortedTxs[txIndex];
        if (tx.direction === 'BUY') {
          currentShares += tx.quantity;
          totalInvested += tx.totalAmount;
        } else if (tx.direction === 'SELL') {
          const avgCost = currentShares > 0 ? totalInvested / currentShares : 0;
          currentShares -= tx.quantity;
          totalInvested -= (avgCost * tx.quantity);
        } else if (tx.direction === 'DIVIDEND') {
          totalInvested -= Math.abs(tx.totalAmount);
        }
        if (tx.date === pointDateStr) hasTxToday = true;
        txIndex++;
      }

      // Prevent negative invested space from zeroing out if there is weird data
      if (totalInvested < 0) totalInvested = 0;

      return {
        ...point,
        shares: currentShares,
        positionValue: currentShares > 0 ? Number((currentShares * point.price).toFixed(2)) : 0,
        totalCost: currentShares > 0 ? Number(totalInvested.toFixed(2)) : 0,
        isTxPoint: hasTxToday ? (currentShares > 0 ? Number((currentShares * point.price).toFixed(2)) : 0) : null
      };
    });

    // Optionally slice from the first transaction date so chart isn't empty on the left
    const firstTxDateStr = sortedTxs[0].date;
    const firstTxDateObj = new Date(firstTxDateStr);
    const startTimestamp = firstTxDateObj.getTime() - (7 * 24 * 60 * 60 * 1000); // 1 week before first tx
    return dataWithHoldings.filter(d => d.timestamp >= startTimestamp);

  }, [chartData, transactions, weeklyPrices]);

  const validValues = combinedData.flatMap(d => [d.positionValue, d.totalCost]).filter(v => v !== null) as number[];
  const minVal = validValues.length > 0 ? Math.min(...validValues) : 0;
  const maxVal = validValues.length > 0 ? Math.max(...validValues) : 0;
  const buffer = (maxVal - minVal) * 0.1;

  return (
    <div className="h-full w-full flex flex-col bg-[var(--bg-primary)]">
      <div className="flex-1 min-h-0 relative p-4">
        {combinedData.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--text-dim)] text-center px-4 leading-relaxed">
            目前無圖表資料<br />
            <span className="opacity-70 mt-1 block">
              請在下方「每週收盤價登錄」手動輸入股價
            </span>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis
                dataKey="date"
                stroke="var(--text-dim)"
                fontSize={10}
                tickMargin={10}
                minTickGap={30}
                tickFormatter={(val) => {
                  if (typeof val !== 'string') return val;
                  const parts = val.split('-');
                  return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : val;
                }}
              />
              <YAxis
                domain={[Math.max(0, minVal - buffer), maxVal + buffer]}
                stroke="var(--text-dim)"
                fontSize={10}
                tickFormatter={(val) => `$${val.toFixed(0)}`}
                orientation="right"
                tickMargin={10}
              />
              <Tooltip
                isAnimationActive={false}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-[var(--bg-secondary)] backdrop-blur-md border border-[var(--border)] px-3 py-2 rounded-lg shadow-xl text-[10px] md:text-xs font-mono select-none pointer-events-none mb-10 translate-y-[-20px]">
                        <p className="text-[var(--text-dim)] font-bold mb-1.5 opacity-70 border-b border-[var(--border)] pb-1">{label?.toString().replace(/-/g, '/')} </p>
                        {payload.map((entry, index) => {
                          if (entry.dataKey !== 'positionValue' && entry.dataKey !== 'totalCost') return null;
                          return (
                            <div key={index} className="flex items-center justify-between gap-6 py-0.5">
                              <div className="flex items-center gap-1.5">
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                <span style={{ color: entry.color }} className="opacity-90 font-bold whitespace-nowrap">
                                  {entry.name === 'positionValue' ? '市值' : entry.name === 'totalCost' ? '成本' : entry.name}
                                </span>
                              </div>
                              <span className="font-bold text-[var(--text-main)] whitespace-nowrap">${Number(entry.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ stroke: 'var(--text-dim)', strokeWidth: 1, strokeDasharray: '3 3', opacity: 0.5 }}
                position={{ y: 10 }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} formatter={(value) => value === 'totalCost' ? '持有成本' : value === 'positionValue' ? '累積市值' : '交易打點'} />
              <Line
                type="stepAfter"
                dataKey="totalCost"
                name="totalCost"
                stroke="var(--danger)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="positionValue"
                name="positionValue"
                stroke="var(--accent)"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Scatter dataKey="isTxPoint" name="交易打點" fill="var(--success)" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};
