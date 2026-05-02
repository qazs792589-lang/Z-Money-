import React, { useMemo } from 'react';
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
      </div>
    </div>
  );
};
