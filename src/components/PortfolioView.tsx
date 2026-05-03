import React, { useMemo, useState } from 'react';
import { LayoutDashboard, Activity, Edit2, TrendingUp, PieChart as PieChartIcon, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { Holding } from '../types';

interface PortfolioViewProps {
  stats: {
    totalInvested: number;
    totalMarketValue: number;
    unrealizedPL: number;
    roi: number;
  };
  chartData: any[];
  appData: {
    activeHoldings: Holding[];
    holdingsMap?: Record<string, any>;
  };
  marketData: {
    prices: Record<string, number>;
  };
  weeklyPrices: any[];
  setSelectedTicker: (ticker: string) => void;
  setActiveView: (view: 'A' | 'B' | 'C') => void;
  tickerOrder: string[];
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  stats,
  chartData,
  appData,
  marketData,
  weeklyPrices,
  setSelectedTicker,
  setActiveView,
  tickerOrder
}) => {
  const [page, setPage] = useState(0);

  const pieData = useMemo(() => {
    const holdings = appData.activeHoldings || [];
    return holdings.map(h => {
      const latestWeekly = weeklyPrices
        .filter(wp => wp.ticker === h.ticker)
        .sort((a, b) => b.date.localeCompare(a.date))[0]?.price;
      const curPrice = marketData.prices[h.ticker] || latestWeekly || h.avgCost;
      return {
        name: h.name,
        value: curPrice * h.currentShares,
        ticker: h.ticker
      };
    }).sort((a, b) => b.value - a.value);
  }, [appData.activeHoldings, marketData.prices, weeklyPrices]);

  const COLORS = ['#00f2ff', '#7000ff', '#ff00c8', '#ffcc00', '#00ff88', '#ff4400', '#44ff00'];

  return (
    <div className="flex flex-col gap-8 pb-20 overflow-hidden">
      {/* 1. Header & Stats */}
      <div className="space-y-6 px-1">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black flex items-center gap-3">
            <LayoutDashboard className="text-[var(--accent)]" /> 未實現損益
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-box">
            <div className="stat-label">總投入本金</div>
            <div className="stat-value text-[var(--text-main)] text-xl">${stats.totalInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div className="stat-box border-[var(--accent)]/50">
            <div className="stat-label">當前總市值 (含息)</div>
            <div className="stat-value text-[var(--accent)] text-xl">${stats.totalMarketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div className={cn("stat-box", stats.unrealizedPL >= 0 ? "border-[var(--success)]/50" : "border-[var(--danger)]/50")}>
            <div className="stat-label">帳面總損益 (含息)</div>
            <div className={cn("stat-value text-xl", stats.unrealizedPL >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
              {stats.unrealizedPL >= 0 ? '+' : ''}{stats.unrealizedPL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              <span className="text-xs ml-2 opacity-60">({stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Page Indicators */}
      <div className="flex justify-center gap-4 px-1 -mt-2 -mb-2 relative z-50">
        {[0, 1].map(i => (
          <button
            key={i}
            onClick={() => setPage(i)}
            className="group py-4 px-3 outline-none cursor-pointer"
          >
            <div className={cn(
              "h-1.5 rounded-full transition-all duration-500 ease-out",
              page === i 
                ? "bg-[var(--accent)] w-10 shadow-[0_0_15px_var(--accent-glow)]" 
                : "bg-[var(--border)] w-3 opacity-40 group-hover:opacity-100"
            )} />
          </button>
        ))}
      </div>

      {/* 3. Swiper Content */}
      <div className="relative overflow-visible">
        <motion.div
          className="flex w-full"
          animate={{ x: `-${page * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
        >
          {/* Page 1: Allocation & Holdings */}
          <div className="w-full shrink-0 px-1 space-y-10">
            <div className="elegant-card p-6 relative">
              <h3 className="text-[10px] font-black opacity-60 flex items-center gap-2 mb-8 uppercase tracking-[0.2em] text-[var(--accent)]">
                <PieChartIcon size={12} /> 資產配置比例
              </h3>
              <div className="flex flex-col md:flex-row items-center gap-8">
                <div className="flex-1 w-full h-[320px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={pieData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                        stroke="none"
                      >
                        {pieData.map((_, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            return (
                              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-3 rounded-xl shadow-2xl backdrop-blur-md">
                                <div className="text-[10px] text-[var(--text-dim)] font-black uppercase tracking-widest border-b border-[var(--border)] pb-2 mb-2">{data.name}</div>
                                <div className="flex justify-between gap-6">
                                  <span className="text-[11px] font-bold text-[var(--text-dim)]">市值</span>
                                  <span className="text-xs font-mono font-black text-[var(--text-main)]">${data.value.toLocaleString()}</span>
                                </div>
                              </div>
                            );
                          }
                          return null;
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="md:w-1/3 w-full grid grid-cols-2 md:grid-cols-1 gap-3">
                  {pieData.slice(0, 6).map((item, index) => (
                    <div key={item.ticker} className="flex items-center justify-between p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-[11px] font-bold text-[var(--text-main)] truncate w-20">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-mono font-black text-[var(--accent)]">
                        {((item.value / (stats.totalMarketValue || 1)) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black opacity-60 flex items-center gap-2 uppercase tracking-[0.2em]">
                <Edit2 size={12} /> 當前持倉明細
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...appData.activeHoldings]
                  .sort((a, b) => {
                    const idxA = tickerOrder.indexOf(a.ticker);
                    const idxB = tickerOrder.indexOf(b.ticker);
                    if (idxA === -1 && idxB === -1) return 0;
                    if (idxA === -1) return 1;
                    if (idxB === -1) return -1;
                    return idxA - idxB;
                  })
                  .map(h => {
                  const latestWeekly = weeklyPrices.filter(wp => wp.ticker === h.ticker).sort((a, b) => b.date.localeCompare(a.date))[0]?.price;
                  const curPrice = marketData.prices[h.ticker] || latestWeekly || h.avgCost;
                  const hpl = (curPrice - h.avgCost) * h.currentShares;
                  const hroi = h.avgCost > 0 ? (hpl / h.totalInvested) * 100 : 0;
                  return (
                    <div key={h.ticker} className="elegant-card p-6 md:p-8 hover:border-[var(--accent)] transition-all group relative shadow-2xl">
                      <div className="flex justify-between items-start mb-8">
                        <div>
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="text-2xl font-black text-[var(--text-main)] leading-none tracking-tight">{h.name}</h4>
                            <button onClick={() => { setSelectedTicker(h.ticker); setActiveView('A'); }} className="opacity-40 group-hover:opacity-100 text-[var(--accent)] transition-opacity">
                              <Edit2 size={14} />
                            </button>
                          </div>
                          <span className="text-xs text-[var(--text-dim)] font-mono font-bold uppercase tracking-widest">{h.ticker}</span>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-mono font-black text-[var(--accent)] leading-none">
                            {h.currentShares.toLocaleString()}
                          </div>
                          <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] mt-1 opacity-60">
                            持有股數
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-y-6 gap-x-4 pt-6 border-t border-[var(--border)]/50">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[var(--text-dim)] font-black uppercase tracking-widest opacity-60 mb-2">最新收盤價</span>
                          <span className="text-lg font-mono font-black text-[var(--text-main)]">${curPrice.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-[var(--text-dim)] font-black uppercase tracking-widest opacity-60 mb-2">總市值</span>
                          <span className="text-lg font-mono font-black text-[var(--accent)]">${(curPrice * h.currentShares).toLocaleString()}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[var(--text-dim)] font-black uppercase tracking-widest opacity-60 mb-2">平均成本</span>
                          <span className="text-base font-mono font-bold text-[var(--text-dim)]">${h.avgCost.toFixed(2)}</span>
                        </div>
                        <div className="flex flex-col text-right">
                          <span className="text-[10px] text-[var(--text-dim)] font-black uppercase tracking-widest opacity-60 mb-2">帳面損益 / 報酬率</span>
                          <div className={cn("flex flex-col items-end", hpl >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                            <span className="text-lg font-mono font-black leading-none">{hpl >= 0 ? '+' : ''}{hpl.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            <span className="text-xs font-black mt-1">{hroi >= 0 ? '▲' : '▼'} {Math.abs(hroi).toFixed(2)}%</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Page 2: Trend & Matrix */}
          <div className="w-full shrink-0 px-1 space-y-10">
            <div className="elegant-card p-0 overflow-hidden relative">
              <div className="absolute top-5 left-5 z-10">
                <h3 className="text-[10px] font-black opacity-60 flex items-center gap-2 uppercase tracking-[0.2em] text-[var(--accent)]">
                  <Activity size={12} /> 資產價值趨勢
                </h3>
              </div>
              <div className="h-[320px] relative mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 15, right: 5, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.2} />
                    <XAxis 
                      dataKey="name" 
                      stroke="var(--text-dim)" 
                      fontSize={9} 
                      axisLine={false} 
                      tickLine={false} 
                      tickMargin={10}
                      minTickGap={30}
                      tickFormatter={(str) => str.split('-').slice(1).join('/')}
                    />
                    <YAxis yAxisId="left" stroke="var(--text-dim)" fontSize={9} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickMargin={5} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} />
                    <YAxis yAxisId="right" orientation="right" stroke="var(--success)" fontSize={9} axisLine={false} tickLine={false} domain={['auto', 'auto']} tickMargin={5} tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} width={35} />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const originalPoint = chartData.find(d => d.name === label) || payload[0].payload;
                          return (
                            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-3 rounded-xl shadow-2xl backdrop-blur-md">
                              <div className="text-[10px] text-[var(--text-dim)] font-black uppercase tracking-widest border-b border-[var(--border)] pb-2 mb-2">{label?.toString().replace(/-/g, '/')}</div>
                              <div className="space-y-1.5">
                                {[
                                  { label: '市值', value: originalPoint.value, color: 'var(--text-main)' },
                                  { label: '成本', value: originalPoint.cost, color: 'var(--danger)' }
                                ].sort((a, b) => b.value - a.value).map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between gap-8" style={{ color: item.color === 'var(--text-main)' ? undefined : item.color }}>
                                    <span className={cn("text-[11px] font-bold", item.color === 'var(--text-main)' ? "text-[var(--text-dim)]" : "opacity-80")}>{item.label}</span>
                                    <span className={cn("text-xs font-mono font-black", item.color === 'var(--text-main)' ? "text-[var(--text-main)]" : "")}>${item.value.toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className="flex items-center justify-between gap-8 text-[var(--success)] border-t border-[var(--border)] pt-1.5 mt-1.5">
                                  <span className="text-[11px] font-bold opacity-80">盈虧</span>
                                  <span className="text-xs font-mono font-black">${originalPoint.profit.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend layout="vertical" verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ fontSize: '9px', fontWeight: 'bold', opacity: 0.6, top: 0, right: 0 }} />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      name="當前總市值 (含息)" 
                      dataKey={(d) => {
                        const idx = chartData.indexOf(d);
                        const win = 5;
                        const subset = chartData.slice(Math.max(0, idx - win), idx + 1);
                        return subset.reduce((acc, curr) => acc + curr.value, 0) / subset.length;
                      }}
                      stroke="var(--accent)" strokeWidth={3} dot={false} activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--accent)' }} 
                    />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      name="投入總成本" 
                      dataKey={(d) => {
                        const idx = chartData.indexOf(d);
                        const win = 5;
                        const subset = chartData.slice(Math.max(0, idx - win), idx + 1);
                        return subset.reduce((acc, curr) => acc + curr.cost, 0) / subset.length;
                      }}
                      stroke="var(--danger)" strokeWidth={2} strokeDasharray="4 4" dot={false} activeDot={false} 
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      name="帳面總損益 (含息)" 
                      dataKey={(d) => {
                        const idx = chartData.indexOf(d);
                        const win = 5;
                        const subset = chartData.slice(Math.max(0, idx - win), idx + 1);
                        return subset.reduce((acc, curr) => acc + curr.profit, 0) / subset.length;
                      }}
                      stroke="var(--success)" strokeWidth={2} dot={false} activeDot={false} 
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center gap-3 px-2">
                <Layers className="text-[var(--accent)]" size={18} />
                <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-dim)]">歷史週倉位矩陣</h3>
              </div>
            <div className="elegant-card p-0 overflow-hidden border-[var(--border)] shadow-xl">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left min-w-max border-collapse">
                  <thead>
                    <tr className="bg-[var(--bg-tertiary)] text-[9px] font-black uppercase tracking-widest text-[var(--text-dim)]">
                      <th className="px-4 py-4 border-b border-[var(--border)] sticky left-0 bg-[var(--bg-tertiary)] z-20">日期</th>
                      {/* Dynamic ticker columns */}
                      {Object.keys(chartData[0]?.breakdown || {}).map(ticker => (
                        <th key={ticker} className="px-4 py-4 border-b border-[var(--border)] text-right min-w-[100px]">{ticker}</th>
                      ))}
                      <th className="px-4 py-4 border-b border-[var(--border)] text-right text-[var(--danger)] min-w-[100px]">投入本金</th>
                      <th className="px-4 py-4 border-b border-[var(--border)] text-right text-[var(--accent)] min-w-[100px]">總市值 (含息)</th>
                      <th className="px-6 py-4 border-b border-[var(--border)] text-right min-w-[120px]">帳面損益 (含息)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {[...chartData].reverse().map((row, i) => (
                      <tr key={i} className="hover:bg-[var(--bg-secondary)] transition-colors group">
                        <td className="px-4 py-4 font-mono text-[10px] sticky left-0 bg-[var(--bg-primary)] group-hover:bg-[var(--bg-secondary)] z-10 border-r border-[var(--border)]/30">
                          {row.name.replace(/-/g, '/')}
                        </td>
                        {/* Dynamic ticker values */}
                        {Object.keys(chartData[0]?.breakdown || {}).map(ticker => (
                          <td key={ticker} className="px-4 py-4 font-mono text-[10px] text-right text-[var(--text-dim)]/70">
                            {row.breakdown?.[ticker] > 0 ? `$${row.breakdown[ticker].toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                          </td>
                        ))}
                        <td className="px-4 py-4 font-mono text-[10px] text-right text-[var(--danger)]/80">${row.cost.toLocaleString()}</td>
                        <td className="px-4 py-4 font-mono text-[10px] text-right text-[var(--accent)] font-bold">${row.value.toLocaleString()}</td>
                        <td className={cn("px-6 py-4 font-mono text-[10px] font-black text-right", row.profit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                          {row.profit >= 0 ? '+' : ''}{row.profit.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
