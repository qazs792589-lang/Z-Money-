import React from 'react';
import { LayoutDashboard, Activity, Edit2 } from 'lucide-react';
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
import { motion, AnimatePresence } from 'framer-motion';
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
  };
  marketData: {
    prices: Record<string, number>;
  };
  weeklyPrices: any[];
  setSelectedTicker: (ticker: string) => void;
  setActiveView: (view: 'A' | 'B' | 'C') => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  stats,
  chartData,
  appData,
  marketData,
  weeklyPrices,
  setSelectedTicker,
  setActiveView
}) => {
  const [page, setPage] = React.useState(0);

  const pieData = React.useMemo(() => {
    return appData.activeHoldings.map(h => {
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

  const COLORS = ['var(--accent)', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#06B6D4'];

  const paginate = (newPage: number) => {
    setPage(newPage);
  };

  return (
    <div className="flex flex-col gap-8 pb-20 overflow-hidden">
      {/* 1. Header & Stats - Global */}
      <div className="space-y-6 px-1">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black flex items-center gap-3">
            <LayoutDashboard className="text-[var(--accent)]" /> 未實現損益
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="stat-box">
            <div className="stat-label">總投入本金</div>
            <div className="stat-value text-[var(--text-main)] text-xl">${stats.totalInvested.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          <div className="stat-box border-[var(--accent)]/50">
            <div className="stat-label">當前總市值</div>
            <div className="stat-value text-[var(--accent)] text-xl">${stats.totalMarketValue.toLocaleString(undefined, { maximumFractionDigits: 2 })}</div>
          </div>
          <div className={cn("stat-box", stats.unrealizedPL >= 0 ? "border-[var(--success)]/50" : "border-[var(--danger)]/50")}>
            <div className="stat-label">帳面總損益</div>
            <div className={cn("stat-value text-xl", stats.unrealizedPL >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
              {stats.unrealizedPL >= 0 ? '+' : ''}{stats.unrealizedPL.toLocaleString(undefined, { maximumFractionDigits: 2 })}
              <span className="text-xs ml-2 opacity-60">({stats.roi >= 0 ? '+' : ''}{stats.roi.toFixed(2)}%)</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Page Indicators - Fixed nesting to be clickable and outside the card */}
      <div className="flex justify-center gap-4 px-1 -mt-2 -mb-2 relative z-50">
        {[0, 1].map(i => (
          <button
            key={i}
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              paginate(i);
            }}
            className="group py-4 px-3 outline-none cursor-pointer touch-none"
          >
            <div className={cn(
              "h-1.5 rounded-full transition-all duration-500 ease-out",
              page === i 
                ? "bg-[var(--accent)] w-10 shadow-[0_0_15px_var(--accent-glow)]" 
                : "bg-[var(--border)] w-3 opacity-40 group-hover:opacity-100 group-hover:bg-[var(--text-dim)]"
            )} />
          </button>
        ))}
      </div>

      {/* 3. Swiper Content */}
      <div className="relative overflow-visible cursor-grab active:cursor-grabbing" style={{ touchAction: 'pan-y' }}>
        <motion.div
          className="flex w-full"
          animate={{ x: `-${page * 100}%` }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          drag="x"
          dragDirectionLock
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.2}
          onDragEnd={(_, info) => {
            const threshold = 50;
            const velocityThreshold = 200;
            if (info.offset.x < -threshold || info.velocity.x < -velocityThreshold) {
              if (page === 0) paginate(1);
            } else if (info.offset.x > threshold || info.velocity.x > velocityThreshold) {
              if (page === 1) paginate(0);
            }
          }}
          style={{ touchAction: 'pan-y' }}
        >
          {/* Page 1: Allocation & Holdings */}
          <div className="w-full shrink-0 px-1 space-y-10">
            <div className="elegant-card p-6 relative">
              <h3 className="text-[10px] font-black opacity-60 flex items-center gap-2 mb-8 uppercase tracking-[0.2em] text-[var(--accent)]">
                <LayoutDashboard size={12} /> Portfolio Allocation
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
                        {pieData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip
                        content={({ active, payload }) => {
                          if (active && payload && payload.length) {
                            const data = payload[0].payload;
                            const percent = ((data.value / stats.totalMarketValue) * 100).toFixed(1);
                            return (
                              <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-3 rounded-xl shadow-2xl backdrop-blur-md">
                                <div className="text-[10px] text-[var(--text-dim)] font-black uppercase tracking-widest border-b border-[var(--border)] pb-2 mb-2">{data.name}</div>
                                <div className="space-y-1">
                                  <div className="flex justify-between gap-6">
                                    <span className="text-[11px] font-bold text-[var(--text-dim)]">市值</span>
                                    <span className="text-xs font-mono font-black text-[var(--text-main)]">${data.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                                  </div>
                                  <div className="flex justify-between gap-6">
                                    <span className="text-[11px] font-bold text-[var(--text-dim)]">佔比</span>
                                    <span className="text-xs font-mono font-black text-[var(--accent)]">{percent}%</span>
                                  </div>
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
                  {pieData.map((item, index) => (
                    <div key={item.ticker} className="flex items-center justify-between p-2.5 bg-[var(--bg-secondary)] rounded-xl border border-[var(--border)]">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                        <span className="text-[11px] font-bold text-[var(--text-main)] truncate w-20">{item.name}</span>
                      </div>
                      <span className="text-[10px] font-mono font-black text-[var(--accent)]">
                        {((item.value / stats.totalMarketValue) * 100).toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black opacity-60 flex items-center gap-2 uppercase tracking-[0.2em]">
                <Edit2 size={12} /> Positions Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {appData.activeHoldings.map(h => {
                  const latestWeekly = weeklyPrices.filter(wp => wp.ticker === h.ticker).sort((a, b) => b.date.localeCompare(a.date))[0]?.price;
                  const curPrice = marketData.prices[h.ticker] || latestWeekly || h.avgCost;
                  const hpl = (curPrice - h.avgCost) * h.currentShares;
                  const hroi = h.avgCost > 0 ? (hpl / h.totalInvested) * 100 : 0;
                  return (
                    <div key={h.ticker} className="elegant-card p-5 hover:border-[var(--accent)] transition-all group relative">
                      <div className="flex justify-between items-start mb-6">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-lg font-black text-[var(--text-main)] leading-none">{h.name}</h4>
                            <button 
                              onClick={() => { setSelectedTicker(h.ticker); setActiveView('A'); }} 
                              className="opacity-0 group-hover:opacity-40 hover:!opacity-100 transition-opacity text-[var(--accent)]"
                            >
                              <Edit2 size={12} />
                            </button>
                          </div>
                          <span className="text-[9px] text-[var(--text-dim)] font-mono uppercase tracking-tighter">{h.ticker}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-[var(--accent)] font-mono">{h.currentShares.toLocaleString()} <span className="text-[8px] font-sans opacity-60">股</span></span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border)]">
                        <div>
                          <span className="text-[8px] text-[var(--text-dim)] font-black uppercase mb-0.5 block opacity-50">Avg Cost</span>
                          <span className="text-xs font-mono font-bold text-[var(--text-main)]">${h.avgCost.toFixed(2)}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] text-[var(--text-dim)] font-black uppercase mb-0.5 block opacity-50">Market Value</span>
                          <span className="text-xs font-mono font-bold text-[var(--text-main)]">${(curPrice * h.currentShares).toLocaleString(undefined, { maximumFractionDigits: 2 })}</span>
                        </div>
                        <div>
                          <span className="text-[8px] text-[var(--text-dim)] font-black uppercase mb-0.5 block opacity-50">Gain/Loss</span>
                          <span className={cn("text-xs font-mono font-bold", hpl >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                            {hpl >= 0 ? '+' : '-'}${Math.abs(hpl).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] text-[var(--text-dim)] font-black uppercase mb-0.5 block opacity-50">ROI</span>
                          <span className={cn("text-xs font-mono font-bold", hroi >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                            {hroi >= 0 ? '+' : ''}{hroi.toFixed(2)}%
                          </span>
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
            <div className="elegant-card p-6 relative">
              <h3 className="text-[10px] font-black opacity-60 flex items-center gap-2 mb-8 uppercase tracking-[0.2em] text-[var(--accent)]">
                <Activity size={12} /> Valuation Trend
              </h3>
              <div className="h-[320px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 30, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                    <XAxis dataKey="name" stroke="var(--text-dim)" fontSize={9} axisLine={false} tickLine={false} tickMargin={10} />
                    <YAxis
                      yAxisId="left"
                      stroke="var(--text-dim)"
                      fontSize={9}
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(val) => Math.abs(val) >= 10000 ? `${(val / 10000).toFixed(1)}萬` : val.toLocaleString()}
                      tickMargin={10}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="var(--success)"
                      fontSize={9}
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      tickFormatter={(val) => Math.abs(val) >= 10000 ? `${(val / 10000).toFixed(1)}萬` : val.toLocaleString()}
                      tickMargin={10}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-3 rounded-xl shadow-2xl backdrop-blur-md">
                              <div className="text-[10px] text-[var(--text-dim)] font-black uppercase tracking-widest border-b border-[var(--border)] pb-2 mb-2">{label?.toString().replace(/-/g, '/')}</div>
                              <div className="space-y-1.5">
                                {payload.map((entry: any, index: number) => (
                                  <div key={index} className="flex items-center justify-between gap-8">
                                    <div className="flex items-center gap-2">
                                      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                      <span className="text-[11px] font-bold text-[var(--text-dim)]">{entry.name}</span>
                                    </div>
                                    <span className="text-xs font-mono font-black text-[var(--text-main)]">${Number(entry.value).toLocaleString()}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '9px', fontWeight: 'bold' }} />
                    <Line yAxisId="left" type="monotone" name="當前總市值" dataKey="value" stroke="var(--accent)" strokeWidth={3} dot={{ r: 3, fill: 'var(--accent)' }} />
                    <Line yAxisId="left" type="monotone" name="投入總成本" dataKey="cost" stroke="var(--danger)" strokeWidth={2} strokeDasharray="4 4" />
                    <Line yAxisId="right" type="monotone" name="帳面總損益" dataKey="profit" stroke="var(--success)" strokeWidth={2} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-[10px] font-black opacity-60 flex items-center gap-2 uppercase tracking-[0.2em]">
                <LayoutDashboard size={12} /> Asset History Matrix
              </h3>
              <div className="elegant-card p-0 overflow-hidden">
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left border-collapse min-w-max">
                    <thead className="bg-[var(--bg-tertiary)]">
                      <tr>
                        <th className="p-4 text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest border-b border-[var(--border)] sticky left-0 bg-[var(--bg-tertiary)] z-20">日期</th>
                        {Object.keys(chartData[0]?.breakdown || {}).map(ticker => (
                          <th key={ticker} className="p-4 text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest border-b border-[var(--border)] text-right">{ticker}</th>
                        ))}
                        <th className="p-4 text-[9px] font-black text-[var(--accent)] uppercase tracking-widest border-b border-[var(--border)] text-right">總市值</th>
                        <th className="p-4 text-[9px] font-black text-[var(--text-dim)] uppercase tracking-widest border-b border-[var(--border)] text-right">帳面損益</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {[...chartData].reverse().map((d, i) => (
                        <tr key={i} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
                          <td className="p-4 text-[11px] font-mono text-[var(--text-dim)] sticky left-0 bg-[var(--bg-primary)] group-hover:bg-[var(--bg-tertiary)] z-10 border-r border-[var(--border)]/30">{d.name.replace(/-/g, '/')}</td>
                          {Object.keys(d.breakdown || {}).map(ticker => (
                            <td key={ticker} className="p-4 text-[11px] font-mono text-right text-[var(--text-dim)]/80">{d.breakdown[ticker] > 0 ? `$${d.breakdown[ticker].toLocaleString(undefined, { maximumFractionDigits: 2 })}` : '-'}</td>
                          ))}
                          <td className="p-4 text-[11px] font-mono font-bold text-right text-[var(--accent)]">${d.value.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
                          <td className={cn("p-4 text-[11px] font-mono font-black text-right", d.profit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>{d.profit >= 0 ? '+' : ''}{d.profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
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
