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
  Cell,
  Label
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
  setWeeklyPrices: React.Dispatch<React.SetStateAction<any[]>>;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  stats,
  chartData,
  appData,
  marketData,
  weeklyPrices,
  setSelectedTicker,
  setActiveView,
  tickerOrder,
  setWeeklyPrices
}) => {
  const [page, setPage] = useState(0);
  const [viewMode, setViewMode] = useState<'ratio' | 'absolute'>('ratio');
  const [mDate, setMDate] = useState(new Date().toISOString().split('T')[0]);
  const [mPrice, setMPrice] = useState('');

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
          <div className="stat-box group hover:border-[var(--accent)] transition-all duration-300">
            <div className="stat-label flex items-center gap-2">
              <TrendingUp size={12} className="opacity-50" /> 總投入本金
            </div>
            <div className="stat-value text-[var(--text-main)] text-2xl font-mono">${stats.totalInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div className="stat-box border-[var(--accent)]/50 bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)] shadow-[0_0_20px_var(--accent-glow)]">
            <div className="stat-label flex items-center gap-2">
              <PieChartIcon size={12} className="text-[var(--accent)]" /> 當前總市值 (含息)
            </div>
            <div className="stat-value text-[var(--accent)] text-2xl font-mono">${stats.totalMarketValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
          </div>
          <div className={cn("stat-box transition-all duration-500", stats.unrealizedPL >= 0 ? "border-[var(--success)]/50 shadow-[0_0_15px_rgba(255,69,58,0.1)]" : "border-[var(--danger)]/50 shadow-[0_0_15px_rgba(50,215,75,0.1)]")}>
            <div className="stat-label flex items-center gap-2">
              <Activity size={12} className={stats.unrealizedPL >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"} /> 帳面總損益 (含息)
            </div>
            <div className={cn("stat-value text-2xl font-mono", stats.unrealizedPL >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
              {stats.unrealizedPL >= 0 ? '+' : ''}{stats.unrealizedPL.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              <span className="text-xs ml-2 opacity-60 font-sans tracking-normal">({stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Page Indicators */}
      <div className="flex justify-center gap-4 px-1 -mt-2 -mb-2 relative z-50">
        {[0, 1, 2].map(i => (
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
                      <div key={h.ticker} className="elegant-card p-5 md:p-6 hover:shadow-[0_8px_30px_rgb(0,0,0,0.12)] border-[var(--border)] hover:border-[var(--accent)] transition-all group relative">
                        <div className="flex justify-between items-start mb-6">
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
            <div className="elegant-card p-0 overflow-hidden relative border-[var(--border)] shadow-2xl">
              <div className="p-5 pb-0 flex items-center justify-between">
                <h3 className="text-[11px] font-black opacity-80 flex items-center gap-2 uppercase tracking-[0.2em] text-[var(--text-main)]">
                  <div className="p-1.5 rounded-lg bg-[var(--accent)]/10 text-[var(--accent)]">
                    <Activity size={14} />
                  </div>
                  資產價值趨勢
                </h3>
              </div>
              <div className="h-[340px] relative px-2">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 20, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.3} />
                    <XAxis
                      dataKey="name"
                      stroke="var(--text-dim)"
                      fontSize={9}
                      axisLine={false}
                      tickLine={false}
                      tickMargin={12}
                      minTickGap={40}
                      tickFormatter={(str) => str.split('-').slice(1).join('/')}
                    />
                    <YAxis
                      yAxisId="left"
                      stroke="var(--text-dim)"
                      fontSize={9}
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      tickMargin={8}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="var(--text-dim)"
                      fontSize={9}
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      tickMargin={8}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`}
                      width={40}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          const originalPoint = chartData.find(d => d.name === label) || payload[0].payload;
                          return (
                            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-4 rounded-2xl shadow-2xl backdrop-blur-xl bg-opacity-80">
                              <div className="text-[10px] text-[var(--text-dim)] font-black uppercase tracking-widest border-b border-[var(--border)] pb-2.5 mb-2.5 flex items-center justify-between gap-4">
                                <span>{label?.toString().replace(/-/g, '/')}</span>
                                <span className="opacity-40 font-mono font-normal">WEEKLY REPORT</span>
                              </div>
                              <div className="space-y-2">
                                {[
                                  { label: '市值', value: originalPoint.value, color: 'var(--accent)' },
                                  { label: '成本', value: originalPoint.cost, color: 'var(--danger)' }
                                ].sort((a, b) => b.value - a.value).map((item, idx) => (
                                  <div key={idx} className="flex items-center justify-between gap-10">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: item.color }} />
                                      <span className="text-[11px] font-bold text-[var(--text-dim)]">{item.label}</span>
                                    </div>
                                    <span className="text-xs font-mono font-black text-[var(--text-main)]">${item.value.toLocaleString()}</span>
                                  </div>
                                ))}
                                <div className="flex items-center justify-between gap-10 border-t border-[var(--border)] pt-2 mt-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                                    <span className="text-[11px] font-bold text-[var(--text-dim)]">盈虧</span>
                                  </div>
                                  <span className={cn("text-xs font-mono font-black", originalPoint.profit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                                    {originalPoint.profit >= 0 ? '+' : ''}{originalPoint.profit.toLocaleString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      iconType="circle"
                      wrapperStyle={{
                        paddingBottom: '25px',
                        paddingTop: '0px',
                        fontSize: '9px',
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em',
                        opacity: 0.8
                      }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      name="當前市值"
                      dataKey={(d) => {
                        const idx = chartData.indexOf(d);
                        const win = 3;
                        const subset = chartData.slice(Math.max(0, idx - win), idx + 1);
                        return subset.reduce((acc, curr) => acc + curr.value, 0) / subset.length;
                      }}
                      stroke="var(--accent)" strokeWidth={4} dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: 'var(--accent)' }}
                    />
                    <Line
                      yAxisId="left"
                      type="monotone"
                      name="投入成本"
                      dataKey={(d) => {
                        const idx = chartData.indexOf(d);
                        const win = 3;
                        const subset = chartData.slice(Math.max(0, idx - win), idx + 1);
                        return subset.reduce((acc, curr) => acc + curr.cost, 0) / subset.length;
                      }}
                      stroke="var(--danger)" strokeWidth={2} strokeDasharray="5 5" opacity={0.6} dot={false} activeDot={false}
                    />
                    <Line
                      yAxisId="right"
                      type="monotone"
                      name="帳面盈虧"
                      dataKey={(d) => {
                        const idx = chartData.indexOf(d);
                        const win = 3;
                        const subset = chartData.slice(Math.max(0, idx - win), idx + 1);
                        return subset.reduce((acc, curr) => acc + curr.profit, 0) / subset.length;
                      }}
                      stroke="var(--success)" strokeWidth={3} dot={false} activeDot={{ r: 5, strokeWidth: 0, fill: 'var(--success)' }}
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
              <div className="elegant-card p-0 overflow-hidden border-[var(--border)] shadow-2xl bg-opacity-50 backdrop-blur-sm">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left min-w-max border-collapse">
                    <thead>
                      <tr className="bg-[var(--bg-tertiary)] text-[10px] font-black uppercase tracking-widest text-[var(--text-dim)] border-b border-[var(--border)]">
                        <th className="px-6 py-5 sticky left-0 bg-[var(--bg-tertiary)] z-20 shadow-[2px_0_10px_rgba(0,0,0,0.2)]">日期</th>
                        {/* Dynamic ticker columns */}
                        {Object.keys(chartData[0]?.breakdown || {}).map(ticker => (
                          <th key={ticker} className="px-6 py-5 text-right min-w-[100px] font-mono">{ticker}</th>
                        ))}
                        <th className="px-6 py-5 text-right text-[var(--danger)] min-w-[120px] bg-[var(--danger)]/5">投入本金</th>
                        <th className="px-6 py-5 text-right text-[var(--accent)] min-w-[120px] bg-[var(--accent)]/5">市值 (含息)</th>
                        <th className="px-8 py-5 text-right min-w-[140px] bg-[var(--success)]/5">帳面損益</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]/50">
                      {[...chartData].reverse().map((row, i) => (
                        <tr key={i} className="hover:bg-[var(--accent)]/5 transition-colors group">
                          <td className="px-6 py-5 font-mono text-[11px] font-bold sticky left-0 bg-[var(--bg-primary)] group-hover:bg-[#1a1a1e] z-10 border-r border-[var(--border)]/30">
                            {row.name.replace(/-/g, '/')}
                          </td>
                          {/* Dynamic ticker values */}
                          {Object.keys(chartData[0]?.breakdown || {}).map(ticker => (
                            <td key={ticker} className="px-6 py-5 font-mono text-[11px] text-right text-[var(--text-main)] opacity-70">
                              {row.breakdown?.[ticker] > 0 ? `$${row.breakdown[ticker].toLocaleString(undefined, { maximumFractionDigits: 0 })}` : '-'}
                            </td>
                          ))}
                          <td className="px-6 py-5 font-mono text-[11px] text-right text-[var(--danger)] opacity-80">${row.cost.toLocaleString()}</td>
                          <td className="px-6 py-5 font-mono text-[11px] text-right text-[var(--accent)] font-black">${row.value.toLocaleString()}</td>
                          <td className={cn("px-8 py-5 font-mono text-xs font-black text-right", row.profit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                            <div className="flex flex-col items-end">
                              <span>{row.profit >= 0 ? '+' : ''}{row.profit.toLocaleString()}</span>
                              <span className="text-[9px] opacity-60 font-sans tracking-normal font-normal">
                                {((row.profit / (row.cost || 1)) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

          {/* Page 3: ROI Benchmark Redesigned */}
          <div className="w-full shrink-0 px-0.5 space-y-4 md:space-y-8">
            {/* Header Stats */}
            <div className="grid grid-cols-2 gap-3 md:gap-4">
              <div className="elegant-card p-3 md:p-5 bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)] border-[var(--accent)]/30">
                <span className="text-[8px] md:text-[9px] text-[var(--text-dim)] font-black uppercase tracking-widest block mb-1">累積超額報酬 (Alpha)</span>
                <p className={cn(
                  "text-lg md:text-2xl font-mono font-black",
                  (chartData[chartData.length - 1]?.portfolioRoi - chartData[chartData.length - 1]?.marketRoi) >= 0 ? "text-[var(--accent)]" : "text-[var(--danger)]"
                )}>
                  {((chartData[chartData.length - 1]?.portfolioRoi || 0) - (chartData[chartData.length - 1]?.marketRoi || 0)).toFixed(2)}%
                </p>
              </div>
              <div className="elegant-card p-3 md:p-5 bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)] border-[var(--border)]">
                <span className="text-[8px] md:text-[9px] text-[var(--text-dim)] font-black uppercase tracking-widest block mb-1">投資組合勝率</span>
                <p className="text-lg md:text-2xl font-mono font-black text-[var(--text-main)]">
                  {((chartData.filter(d => d.portfolioRoi > d.marketRoi).length / (chartData.length || 1)) * 100).toFixed(0)}%
                </p>
              </div>
            </div>

            <div className="elegant-card p-0 overflow-hidden relative border-[var(--border)] shadow-xl">
              <div className="p-4 md:p-6 pb-2 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-[var(--accent)] text-[var(--bg-primary)]">
                      <Activity size={14} />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-main)]">
                      績效對比分析
                    </h3>
                  </div>
                  <p className="text-[10px] text-[var(--text-dim)] font-bold opacity-60 ml-9">
                    Benchmark: TAIEX (台股大盤指數)
                  </p>
                </div>
                
                <div className="flex bg-[var(--bg-primary)] p-1 rounded-xl border border-[var(--border)] self-start md:self-center">
                  <button 
                    onClick={() => setViewMode('ratio')}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      viewMode === 'ratio' ? "bg-[var(--accent)] text-[var(--bg-primary)] shadow-lg" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
                    )}
                  >
                    比率
                  </button>
                  <button 
                    onClick={() => setViewMode('absolute')}
                    className={cn(
                      "px-4 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all",
                      viewMode === 'absolute' ? "bg-[var(--accent)] text-[var(--bg-primary)] shadow-lg" : "text-[var(--text-dim)] hover:text-[var(--text-main)]"
                    )}
                  >
                    數值
                  </button>
                </div>
              </div>
              
              <div className="h-[320px] md:h-[420px] relative px-1 md:px-2 pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 30, right: 10, left: 15, bottom: 20 }}>
                    <defs>
                      <linearGradient id="colorRoi" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.2} />
                    <XAxis 
                      dataKey="name" 
                      stroke="var(--text-dim)" 
                      fontSize={8} 
                      axisLine={false} 
                      tickLine={false} 
                      tickMargin={15}
                      minTickGap={40}
                      tickFormatter={(str) => str.split('-').slice(1).join('/')}
                    />
                    <YAxis 
                      yAxisId="left"
                      type="number"
                      stroke="var(--accent)" 
                      fontSize={8} 
                      axisLine={false} 
                      tickLine={false} 
                      tickMargin={8} 
                      width={45}
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => {
                        const val = Number(v);
                        if (isNaN(val)) return '';
                        if (viewMode === 'ratio') return `${val >= 0 ? '+' : ''}${val.toFixed(1)}%`;
                        if (val >= 1000000) return `$${(val/1000000).toFixed(1)}M`;
                        if (val >= 1000) return `$${(val/1000).toFixed(0)}k`;
                        return `$${val}`;
                      }}
                    />
                    {viewMode === 'absolute' && (
                      <YAxis 
                        yAxisId="right"
                        orientation="right"
                        type="number"
                        stroke="var(--text-dim)" 
                        fontSize={8} 
                        axisLine={false} 
                        tickLine={false} 
                        tickMargin={8} 
                        width={45}
                        domain={['auto', 'auto']}
                        tickFormatter={(v) => Number(v).toLocaleString()}
                      />
                    )}
                    <Tooltip
                      cursor={{ stroke: 'var(--border)', strokeWidth: 1 }}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-4 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] backdrop-blur-xl border-opacity-50">
                              <div className="text-[10px] text-[var(--text-dim)] font-black uppercase tracking-widest border-b border-[var(--border)] pb-2.5 mb-3 flex items-center justify-between gap-8">
                                <span>{label?.toString().replace(/-/g, '/')}</span>
                                <span className="opacity-40 font-mono text-[8px]">SNAPSHOT</span>
                              </div>
                              <div className="space-y-3">
                                {payload.map((item: any, idx: number) => (
                                  <div key={idx} className="flex items-center justify-between gap-12">
                                    <div className="flex items-center gap-2.5">
                                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: item.color }} />
                                      <span className="text-[11px] font-bold text-[var(--text-main)]">{item.name}</span>
                                    </div>
                                    <span className={cn("text-xs font-mono font-black", (item.value || 0) >= 0 ? "text-[var(--text-main)]" : "text-[var(--danger)]")}>
                                      {viewMode === 'ratio' 
                                        ? `${(item.value || 0) >= 0 ? '+' : ''}${(item.value || 0).toFixed(2)}%`
                                        : `${item.name.includes('大盤') ? '' : '$'}${Number(item.value).toLocaleString()}`
                                      }
                                    </span>
                                  </div>
                                ))}
                                {viewMode === 'ratio' && payload.length >= 2 && (
                                  <div className="flex items-center justify-between gap-12 border-t border-[var(--border)] pt-3 mt-1">
                                    <span className="text-[10px] font-black text-[var(--text-dim)] uppercase tracking-tighter">超額收益 (Alpha)</span>
                                    <span className={cn("text-xs font-mono font-black", (payload[0].value - payload[1].value) >= 0 ? "text-[var(--accent)]" : "text-[var(--danger)]")}>
                                      {(payload[0].value - payload[1].value) >= 0 ? '+' : ''}{(payload[0].value - payload[1].value).toFixed(2)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend 
                      verticalAlign="top" 
                      align="right" 
                      iconType="rect" 
                      iconSize={10}
                      wrapperStyle={{ 
                        paddingBottom: '30px', 
                        fontSize: '9px', 
                        fontWeight: '900',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em',
                        opacity: 0.7
                      }} 
                    />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      name={viewMode === 'ratio' ? "個人帳戶" : "資產金額"} 
                      dataKey={viewMode === 'ratio' ? "portfolioRoi" : "value"} 
                      stroke="var(--accent)" 
                      strokeWidth={4} 
                      dot={false} 
                      activeDot={{ r: 6, strokeWidth: 0, fill: 'var(--accent)' }} 
                      animationDuration={1000}
                    />
                    <Line 
                      yAxisId={viewMode === 'ratio' ? "left" : "right"}
                      type="monotone" 
                      name={viewMode === 'ratio' ? "大盤指數" : "大盤點數"} 
                      dataKey={viewMode === 'ratio' ? "marketRoi" : "marketPrice"} 
                      stroke="var(--text-dim)" 
                      strokeWidth={2} 
                      strokeDasharray="4 4" 
                      dot={false} 
                      activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--text-dim)' }} 
                      opacity={0.6}
                      animationDuration={1500}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Market Data Entry Section */}
            <div className="elegant-card bg-opacity-40 backdrop-blur-md">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-xl bg-[var(--bg-tertiary)] text-[var(--accent)]">
                  <Edit2 size={16} />
                </div>
                <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)]">大盤基準數據管理</h4>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 items-end">
                <div className="space-y-2">
                  <label className="elegant-label">記錄日期</label>
                  <input 
                    type="date" 
                    className="elegant-input text-[11px] h-10 md:h-11 px-2"
                    value={mDate}
                    onChange={(e) => setMDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="elegant-label">大盤點數</label>
                  <input 
                    type="number" 
                    className="elegant-input text-[11px] h-10 md:h-11 px-2"
                    placeholder="點數"
                    value={mPrice}
                    onChange={(e) => setMPrice(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => {
                    if (!mPrice) return;
                    setWeeklyPrices(prev => {
                      const others = prev.filter(p => !(p.date === mDate && p.ticker === '^TWII'));
                      return [...others, { date: mDate, ticker: '^TWII', price: parseFloat(mPrice) }]
                        .sort((a, b) => a.date.localeCompare(b.date));
                    });
                    setMPrice('');
                    alert('大盤點數已成功記錄！');
                  }}
                  className="col-span-2 md:col-span-1 bg-[var(--accent)] text-[var(--bg-primary)] h-10 md:h-11 rounded-xl text-[11px] font-black uppercase tracking-widest active:scale-95 transition-all shadow-xl shadow-[var(--accent-glow)]"
                >
                  儲存數據
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};
