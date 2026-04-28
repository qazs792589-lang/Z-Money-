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
  Line
} from 'recharts';
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
  setSelectedTicker: (ticker: string) => void;
  setActiveView: (view: 'A' | 'B' | 'C') => void;
}

export const PortfolioView: React.FC<PortfolioViewProps> = ({
  stats,
  chartData,
  appData,
  marketData,
  setSelectedTicker,
  setActiveView
}) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
      <h2 className="text-2xl font-black flex items-center gap-3">
        <LayoutDashboard className="text-[var(--accent)]" /> 未實現損益 (Unrealized P/L)
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="stat-box">
          <div className="stat-label">總投入本金 (Invested)</div>
          <div className="stat-value text-[var(--text-main)]">${stats.totalInvested.toLocaleString()}</div>
        </div>
        <div className="stat-box border-[var(--accent)]">
          <div className="stat-label">當前總市值 (Market Value)</div>
          <div className="stat-value text-[var(--accent)]">${stats.totalMarketValue.toLocaleString()}</div>
        </div>
        <div className={cn("stat-box", stats.unrealizedPL >= 0 ? "border-[var(--success)]" : "border-[var(--danger)]")}>
          <div className="stat-label">帳面總損益</div>
          <div className={cn("stat-value", stats.unrealizedPL >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
            {stats.unrealizedPL >= 0 ? '+' : ''}{stats.unrealizedPL.toLocaleString()}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 elegant-card p-8">
          <div className="flex items-center justify-between mb-8">
            <h3 className="text-sm font-bold opacity-60 flex items-center gap-2">
              <Activity size={14} /> 週倉位價值變化趨勢
            </h3>
            <div className="text-[10px] font-mono text-[var(--text-dim)]">52-WEEK DATA SYNC</div>
          </div>
          <div className="h-[320px]">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                <XAxis
                  dataKey="name"
                  stroke="var(--text-dim)"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  tickMargin={10}
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke="var(--text-dim)"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `$${(val / 10000).toFixed(0)}w`}
                  tickMargin={10}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke="var(--success)"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(val) => `${(val / 10000).toFixed(0)}w`}
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
                  cursor={{ stroke: 'var(--text-dim)', strokeWidth: 1, opacity: 0.5 }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  height={40}
                  iconType="circle"
                  wrapperStyle={{ paddingBottom: '20px', fontSize: '10px', fontWeight: 'bold', letterSpacing: '0.05em' }}
                />
                <Line
                  yAxisId="left"
                  type="monotone"
                  name="當前總市值"
                  dataKey="value"
                  stroke="var(--accent)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: 'var(--accent)', strokeWidth: 0 }}
                  activeDot={{ r: 6, stroke: 'var(--bg-primary)', strokeWidth: 2 }}
                />
                <Line
                  yAxisId="left"
                  type="stepAfter"
                  name="投入總成本"
                  dataKey="cost"
                  stroke="var(--danger)"
                  strokeWidth={2}
                  dot={{ r: 4, fill: 'var(--danger)', strokeWidth: 0 }}
                  activeDot={{ r: 6 }}
                  strokeDasharray="5 5"
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  name="帳面總損益"
                  dataKey="profit"
                  stroke="var(--success)"
                  strokeWidth={2}
                  dot={{ r: 3, fill: 'var(--success)', strokeWidth: 0 }}
                  activeDot={{ r: 5 }}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="elegant-card p-0 overflow-hidden flex flex-col max-h-[400px] lg:max-h-none">
          <div className="p-6 border-b border-[var(--border)] bg-[var(--bg-tertiary)]">
            <h3 className="text-sm font-bold opacity-60 flex items-center gap-2">現有持倉部位明細</h3>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar divide-y divide-[var(--border)]">
            {appData.activeHoldings.map(h => {
              const curPrice = marketData.prices[h.ticker] || h.avgCost;
              const hpl = (curPrice - h.avgCost) * h.currentShares;
              const hroi = h.avgCost > 0 ? (hpl / h.totalInvested) * 100 : 0;
              return (
                <div key={h.ticker} className="p-6 hover:bg-[var(--bg-tertiary)] transition-colors group">
                  {/* Top Section */}
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex flex-col">
                      <span className="text-xl font-black text-[var(--text-main)]">{h.name}</span>
                      <span className="text-sm text-[var(--text-dim)] font-mono mt-1">{h.ticker}</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-bold text-[var(--accent)] font-mono">
                        {h.currentShares.toLocaleString()} <span className="text-sm font-sans">股</span>
                      </span>
                      <button
                        onClick={() => {
                          setSelectedTicker(h.ticker);
                          setActiveView('A');
                        }}
                        className="text-[var(--text-dim)] hover:text-[var(--text-main)] transition-colors"
                        title="編輯這檔股票"
                      >
                        <Edit2 size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Bottom Section (Grid) */}
                  <div className="grid grid-cols-2 gap-y-4 pt-4 border-t border-[var(--border)]">
                    <div className="flex flex-col">
                      <span className="text-xs text-[var(--text-dim)] font-bold mb-1">平均成本</span>
                      <span className="text-sm font-mono text-[var(--text-main)] font-bold">${h.avgCost.toFixed(2)}</span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-[var(--text-dim)] font-bold mb-1">市值</span>
                      <span className="text-sm font-mono text-[var(--text-main)] font-bold">${(curPrice * h.currentShares).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-[var(--text-dim)] font-bold mb-1">帳面獲益</span>
                      <span className={cn("text-sm font-mono font-bold", hpl >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                        {hpl >= 0 ? '' : '-'}${Math.abs(hpl).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex flex-col items-end">
                      <span className="text-xs text-[var(--text-dim)] font-bold mb-1">報酬率</span>
                      <span className={cn("text-sm font-mono font-bold", hroi >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                        {hroi >= 0 ? '+' : ''}{hroi.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            {appData.activeHoldings.length === 0 && (
              <div className="p-8 text-center text-[var(--text-dim)] text-xs italic">
                目前無持有任何部位
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
