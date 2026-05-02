import React, { useMemo } from 'react';
<<<<<<< HEAD
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
=======
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid, 
  ReferenceLine,
  Legend
>>>>>>> cb2b39583a34f4053e0c2078963540f1c7d4e615
} from 'recharts';
import { cn } from '../lib/utils';
import { TrendingUp, Activity, PieChart, ArrowUpRight, ArrowDownRight, Layers } from 'lucide-react';

interface PortfolioViewProps {
  stats: any;
  chartData: any[];
  appData: any;
  marketData: any;
  weeklyPrices: any[];
  setSelectedTicker: (t: string | null) => void;
  setActiveView: (v: any) => void;
}

// Simple LTTB-like downsampling or just bucketed sampling
const downsampleData = (data: any[], threshold: number) => {
  if (data.length <= threshold) return data;
  
  const sampled = [];
  const bucketSize = (data.length - 1) / (threshold - 1);
  
  for (let i = 0; i < threshold - 1; i++) {
    const idx = Math.floor(i * bucketSize);
    sampled.push(data[idx]);
  }
  
  // Always include the latest data point
  sampled.push(data[data.length - 1]);
  return sampled;
};

export const PortfolioView: React.FC<PortfolioViewProps> = ({ 
  stats, 
  chartData, 
  appData, 
  marketData, 
  weeklyPrices,
  setSelectedTicker,
  setActiveView
}) => {
  // Smoothing: Visible data is downsampled for aesthetics, Tooltip data is full
  const smoothedChartData = useMemo(() => {
    return downsampleData(chartData, 18); // Show ~18 points for a smooth look
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-4 rounded-xl shadow-2xl backdrop-blur-md">
          <p className="text-[10px] text-[var(--text-dim)] font-bold mb-2 uppercase tracking-widest">{label}</p>
          <div className="space-y-1">
            <div className="flex justify-between gap-8">
              <span className="text-[10px] text-[var(--text-dim)]">總市值</span>
              <span className="text-xs font-mono font-bold text-[var(--accent)]">${data.value.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-8">
              <span className="text-[10px] text-[var(--text-dim)]">投入成本</span>
              <span className="text-xs font-mono font-bold text-[var(--text-main)]">${data.cost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between gap-8 border-t border-[var(--border)] pt-1 mt-1">
              <span className="text-[10px] text-[var(--text-dim)]">未實現損益</span>
              <span className={cn("text-xs font-mono font-bold", data.profit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                {data.profit >= 0 ? '+' : ''}{data.profit.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      {/* Chart Section */}
      <div className="elegant-card p-0 overflow-hidden bg-[var(--bg-secondary)] border-[var(--border)] shadow-2xl">
        <div className="p-6 md:p-8 flex items-center justify-between border-b border-[var(--border)]">
          <div className="flex items-center gap-3">
            <Activity className="text-[var(--accent)]" />
            <h2 className="text-xl font-black text-[var(--text-main)] uppercase tracking-tighter">Valuation Trend</h2>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--danger)]/60" />
              <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase">帳面總損益</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-[var(--success)]/60" />
              <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase">投入總成本</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-blue-500/60" />
              <span className="text-[10px] font-bold text-[var(--text-dim)] uppercase">當前總市值</span>
            </div>
          </div>
        </div>
        
        <div className="h-[400px] w-full bg-[var(--bg-secondary)] relative group">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart 
              data={chartData} // Use FULL data for interactions
              margin={{ top: 0, right: 0, left: -20, bottom: 0 }} // Reduce margins
            >
              <defs>
                <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.15}/>
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} opacity={0.5} />
              <XAxis 
                dataKey="name" 
                hide 
              />
              <YAxis 
                stroke="var(--text-dim)" 
                fontSize={10} 
                tickFormatter={(v) => `$${v}`}
                opacity={0.5}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<CustomTooltip />} />
              
              {/* Visible Smoothed Area - High Volatility Hidden but trend visible */}
              {/* We draw the FULL data line but with MONOTONE smoothing and thinner stroke to keep detail available for tooltip */}
              {/* Actually, user wants "Smoothed but detail on hover". Recharts monotonicity helps, but bucketed sampling is what they asked for visual beauty. */}
              
              <Area 
                type="monotone" 
                dataKey="value" 
                data={smoothedChartData} // VISIBLE line is smoothed
                stroke="var(--accent)" 
                strokeWidth={3}
                fillOpacity={1} 
                fill="url(#colorValue)" 
                isAnimationActive={true}
                activeDot={{ r: 6, strokeWidth: 0, fill: "var(--accent)" }}
              />

              <Area 
                type="monotone" 
                dataKey="cost" 
                data={smoothedChartData}
                stroke="var(--success)" 
                strokeWidth={2}
                strokeDasharray="5 5"
                fill="transparent"
                isAnimationActive={true}
              />

              {/* PROFIT LINE (The red one in screenshot) */}
              <Area 
                type="monotone" 
                dataKey="profit" 
                data={smoothedChartData}
                stroke="var(--danger)" 
                strokeWidth={2}
                fill="transparent"
                isAnimationActive={true}
              />

              {/* HIDDEN Transparent Layer for FULL Data Tooltips */}
              <Area
                type="linear"
                dataKey="value"
                data={chartData}
                stroke="transparent"
                fill="transparent"
                activeDot={{ r: 4, stroke: 'var(--accent)', strokeWidth: 2, fill: 'white' }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Matrix Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3 px-2">
          <Layers className="text-[var(--accent)]" size={18} />
          <h3 className="text-sm font-black uppercase tracking-widest text-[var(--text-dim)]">Asset History Matrix</h3>
        </div>
        
        <div className="elegant-card overflow-hidden border-[var(--border)] shadow-xl p-0">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-[var(--bg-tertiary)] text-[9px] font-black uppercase tracking-[0.2em] text-[var(--text-dim)]">
                <th className="px-6 py-4">日期</th>
                <th className="px-6 py-4">持股比例 (1L)</th>
                <th className="px-6 py-4">投入本金</th>
                <th className="px-6 py-4">總市值</th>
                <th className="px-6 py-4 text-right">帳面損益</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {[...chartData].reverse().slice(0, 10).map((row, i) => (
                <tr key={i} className="hover:bg-[var(--bg-secondary)] transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs">{row.name}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-[var(--bg-primary)] rounded-full overflow-hidden border border-[var(--border)]">
                        <div 
                          className="h-full bg-[var(--accent)]" 
                          style={{ width: `${Math.min(100, (row.value / (stats.totalMarketValue || 1)) * 100)}%` }} 
                        />
                      </div>
                      <span className="text-[10px] font-mono opacity-50">{Math.floor((row.value / (stats.totalMarketValue || 1)) * 100)}%</span>
                    </div>
<<<<<<< HEAD
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
            <div className="elegant-card p-0 overflow-hidden relative">
              <div className="p-6">
                <h3 className="text-[10px] font-black opacity-60 flex items-center gap-2 uppercase tracking-[0.2em] text-[var(--accent)]">
                  <Activity size={12} /> Valuation Trend
                </h3>
              </div>
              <div className="h-[320px] relative group">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
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
                    <YAxis
                      yAxisId="left"
                      stroke="var(--text-dim)"
                      fontSize={9}
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      tickMargin={5}
                      tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                    />
                    <YAxis
                      yAxisId="right"
                      orientation="right"
                      stroke="var(--success)"
                      fontSize={9}
                      axisLine={false}
                      tickLine={false}
                      domain={['auto', 'auto']}
                      tickMargin={5}
                      tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`}
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          // Find the original data point for accurate hover values
                          const originalPoint = chartData.find(d => d.name === label) || payload[0].payload;
                          return (
                            <div className="bg-[var(--bg-secondary)] border border-[var(--border)] p-3 rounded-xl shadow-2xl backdrop-blur-md">
                              <div className="text-[10px] text-[var(--text-dim)] font-black uppercase tracking-widest border-b border-[var(--border)] pb-2 mb-2">{label?.toString().replace(/-/g, '/')}</div>
                              <div className="space-y-1.5">
                                <div className="flex items-center justify-between gap-8">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
                                    <span className="text-[11px] font-bold text-[var(--text-dim)]">當前總市值</span>
                                  </div>
                                  <span className="text-xs font-mono font-black text-[var(--text-main)]">${originalPoint.value.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between gap-8">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--danger)]" />
                                    <span className="text-[11px] font-bold text-[var(--text-dim)]">投入總成本</span>
                                  </div>
                                  <span className="text-xs font-mono font-black text-[var(--text-main)]">${originalPoint.cost.toLocaleString()}</span>
                                </div>
                                <div className="flex items-center justify-between gap-8">
                                  <div className="flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                                    <span className="text-[11px] font-bold text-[var(--text-dim)]">帳面總損益</span>
                                  </div>
                                  <span className="text-xs font-mono font-black text-[var(--text-main)]">${originalPoint.profit.toLocaleString()}</span>
                                </div>
                              </div>
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend verticalAlign="top" align="right" iconType="circle" wrapperStyle={{ paddingBottom: '20px', fontSize: '9px', fontWeight: 'bold', opacity: 0.6 }} />
                    
                    {/* Visual smoothed lines using a 5-point moving average for a "Z-GYM" look */}
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      name="當前總市值" 
                      dataKey={(d) => {
                        const idx = chartData.indexOf(d);
                        const windowSize = 5;
                        const start = Math.max(0, idx - windowSize);
                        const end = Math.min(chartData.length, idx + 1);
                        const subset = chartData.slice(start, end);
                        return subset.reduce((acc, curr) => acc + curr.value, 0) / subset.length;
                      }}
                      stroke="var(--accent)" 
                      strokeWidth={3} 
                      dot={false} 
                      activeDot={{ r: 4, strokeWidth: 0, fill: 'var(--accent)' }}
                    />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      name="投入總成本" 
                      dataKey={(d) => {
                        const idx = chartData.indexOf(d);
                        const windowSize = 5;
                        const start = Math.max(0, idx - windowSize);
                        const end = Math.min(chartData.length, idx + 1);
                        const subset = chartData.slice(start, end);
                        return subset.reduce((acc, curr) => acc + curr.cost, 0) / subset.length;
                      }}
                      stroke="var(--danger)" 
                      strokeWidth={2} 
                      strokeDasharray="4 4" 
                      dot={false} 
                      activeDot={false}
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      name="帳面總損益" 
                      dataKey={(d) => {
                        const idx = chartData.indexOf(d);
                        const windowSize = 5;
                        const start = Math.max(0, idx - windowSize);
                        const end = Math.min(chartData.length, idx + 1);
                        const subset = chartData.slice(start, end);
                        return subset.reduce((acc, curr) => acc + curr.profit, 0) / subset.length;
                      }}
                      stroke="var(--success)" 
                      strokeWidth={2} 
                      dot={false} 
                      activeDot={false}
                    />
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
                        <th className="p-4 text-[9px] font-black text-[var(--danger)] uppercase tracking-widest border-b border-[var(--border)] text-right">投入本金</th>
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
                          <td className="p-4 text-[11px] font-mono text-right text-[var(--danger)] font-bold">${d.cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}</td>
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
=======
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-[var(--success)]">${row.cost.toLocaleString()}</td>
                  <td className="px-6 py-4 font-mono text-xs text-blue-400 font-bold">${row.value.toLocaleString()}</td>
                  <td className={cn(
                    "px-6 py-4 font-mono text-xs font-black text-right",
                    row.profit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"
                  )}>
                    {row.profit >= 0 ? '+' : ''}{row.profit.toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
>>>>>>> cb2b39583a34f4053e0c2078963540f1c7d4e615
      </div>
    </div>
  );
};
