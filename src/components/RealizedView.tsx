import { History, FileUp, Edit2, Check, ChevronRight, ChevronDown, Clock, PieChart, LineChart as LucideLineChart, Activity, Plus, Trash2 } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import { RealizedProfit, Transaction } from '../types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface RealizedViewProps {
  appData: any;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateNotes: (txId: string, notes: string) => void;
  onToggleUncleared: (txId: string) => void;
  netWorthEntries: {date: string, cash: number, crypto: number}[];
  setNetWorthEntries: React.Dispatch<React.SetStateAction<{date: string, cash: number, crypto: number}[]>>;
  historicalChartData: any[];
}

export const RealizedView: React.FC<RealizedViewProps> = ({ 
  appData, onImport, onUpdateNotes, onToggleUncleared, 
  netWorthEntries, setNetWorthEntries, historicalChartData = []
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedTickers, setExpandedTickers] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState<'details' | 'networth'>('details');

  // Asset Entry State
  const [nDate, setNDate] = useState(new Date().toISOString().split('T')[0]);
  const [nCash, setNCash] = useState('');
  const [nCrypto, setNCrypto] = useState('');

  const startEditing = (txId: string, currentNotes: string) => {
    setEditingId(txId);
    setEditValue(currentNotes || '');
  };

  const saveEdit = (txId: string) => {
    onUpdateNotes(txId, editValue);
    setEditingId(null);
  };

  const toggleExpand = (ticker: string) => {
    setExpandedTickers(prev => ({ ...prev, [ticker]: !prev[ticker] }));
  };

  const tickerHistory = useMemo(() => {
    if (!appData?.stockGroups) return [];
    const groups: Record<string, {
      name: string;
      transactions: any[];
      cumulativeProfit: number;
      cumulativeCost: number;
      cumulativeRevenue: number;
      isHolding: boolean;
    }> = {};

    Object.entries(appData.stockGroups).forEach(([ticker, txs]: [string, any]) => {
      const realizedItems = (appData.realizedList || []).filter((r: RealizedProfit) => r.ticker === ticker);
      const currentShares = appData.holdingsMap?.[ticker]?.currentShares || 0;
      if (realizedItems.length === 0 && currentShares === 0) return;

      const totalProfit = realizedItems.reduce((sum: number, r: RealizedProfit) => sum + r.profit, 0);
      const totalRealizedCost = realizedItems.reduce((sum: number, r: RealizedProfit) => sum + r.totalCost, 0);
      const totalRevenue = realizedItems.reduce((sum: number, r: RealizedProfit) => sum + r.totalRevenue, 0);

      const displayRows = [...txs].sort((a, b) => a.date.localeCompare(b.date)).map(tx => {
        const realizedInfo = realizedItems.find((r: RealizedProfit) => r.sellTxId === tx.id);
        // User requested: Skip ROI for dividends
        const isDividend = tx.direction === 'DIVIDEND';
        
        return {
          ...tx,
          realizedProfit: realizedInfo?.profit,
          realizedRoi: isDividend ? undefined : realizedInfo?.roi,
          daysHeld: realizedInfo?.daysHeld
        };
      });


      const lastOpDate = txs.reduce((latest: string, tx: any) => tx.date > latest ? tx.date : latest, '0000-00-00');

      groups[ticker] = {
        name: txs[0]?.name || ticker,
        transactions: displayRows,
        cumulativeProfit: totalProfit,
        cumulativeCost: totalRealizedCost,
        cumulativeRevenue: totalRevenue,
        isHolding: currentShares > 0,
        lastOpDate
      };
    });

    return Object.entries(groups).sort((a, b) => {
      // 1. Holding first
      if (a[1].isHolding && !b[1].isHolding) return -1;
      if (!a[1].isHolding && b[1].isHolding) return 1;
      // 2. Sort by lastOpDate descending
      return b[1].lastOpDate.localeCompare(a[1].lastOpDate);
    });
  }, [appData]);

  const netWorthChartData = useMemo(() => {
    if (!netWorthEntries) return [];
    return netWorthEntries.map(entry => {
      const history = historicalChartData || [];
      // Find the closest stock value from historicalChartData
      const stockEntry = history.filter(d => d.name <= entry.date).reverse()[0] || history[0];
      const stockValue = stockEntry?.value || 0;
      const cash = parseFloat(entry.cash as any) || 0;
      const crypto = parseFloat(entry.crypto as any) || 0;
      const total = cash + crypto + stockValue;
      return {
        ...entry,
        cash,
        crypto,
        stockValue,
        total
      };
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [netWorthEntries, historicalChartData]);

  const currentTotalAssets = netWorthChartData[netWorthChartData.length - 1]?.total || 0;
  const prevTotalAssets = netWorthChartData[netWorthChartData.length - 2]?.total || currentTotalAssets;
  const assetsChange = currentTotalAssets - prevTotalAssets;

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500 pb-20">
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl md:text-2xl font-black flex items-center gap-3">
            {activeTab === 'details' ? <History className="text-[var(--accent)]" /> : <Activity className="text-[var(--accent)]" />}
            {activeTab === 'details' ? '已實現損益' : '個人總資產'}
          </h2>
          <div className="flex md:hidden">
            <input type="file" ref={fileInputRef} onChange={onImport} accept=".csv" className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-dim)] active:scale-90 transition-all shadow-sm"
              title="匯入歷史 CSV"
            >
              <FileUp size={18} />
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex bg-[var(--bg-secondary)] p-1 rounded-xl border border-[var(--border)]">
            <button 
              onClick={() => setActiveTab('details')}
              className={cn(
                "px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'details' ? "bg-[var(--accent)] text-[var(--bg-primary)] shadow-lg" : "text-[var(--text-dim)]"
              )}
            >
              <PieChart size={14} /> 損益細節
            </button>
            <button 
              onClick={() => setActiveTab('networth')}
              className={cn(
                "px-3 md:px-4 py-2 rounded-lg text-[10px] md:text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2",
                activeTab === 'networth' ? "bg-[var(--accent)] text-[var(--bg-primary)] shadow-lg" : "text-[var(--text-dim)]"
              )}
            >
              <LucideLineChart size={14} /> 總資產
            </button>
          </div>

          <div className="hidden md:flex">
            <input type="file" ref={fileInputRef} onChange={onImport} accept=".csv" className="hidden" />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[10px] font-black text-[var(--text-dim)] hover:text-[var(--accent)] transition-all uppercase tracking-widest shadow-sm"
            >
              <FileUp size={14} /> 匯入歷史 CSV
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'details' ? (
        <div className="space-y-6">

          {tickerHistory.map(([ticker, group]: [string, any]) => {
            return (
              <div key={ticker} className="elegant-card overflow-hidden border-[var(--border)] shadow-xl">
                <div 
                  onClick={() => toggleExpand(ticker)}
                  className="bg-[var(--bg-secondary)] p-4 md:p-6 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors border-b border-[var(--border)]"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="text-[var(--accent)] transition-transform duration-300" style={{ transform: expandedTickers[ticker] !== false ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                        <ChevronDown size={20} />
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="text-lg md:text-xl font-black text-[var(--text-main)] uppercase tracking-tight">{group.name}</span>
                          {group.isHolding && (
                            <span className="bg-[var(--accent)]/10 text-[var(--accent)] text-[9px] px-2 py-0.5 rounded-md font-bold border border-[var(--accent)]/20">
                              仍持倉中
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-[var(--text-dim)] font-mono font-bold tracking-widest">{ticker}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex flex-col items-end">
                        <span className={cn("text-lg md:text-xl font-mono font-black", group.cumulativeProfit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                          {group.cumulativeProfit >= 0 ? '+' : ''}{(group.cumulativeProfit || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        {group.cumulativeCost > 0 && (
                          <div className={cn("text-[10px] font-bold flex items-center gap-1", group.cumulativeProfit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                            {group.cumulativeProfit >= 0 ? '▲' : '▼'} {((group.cumulativeProfit / group.cumulativeCost) * 100).toFixed(2)}%
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Header Metrics */}
                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-[var(--border)] mt-2">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-[var(--text-dim)] font-black uppercase tracking-widest mb-1">累積總成本</span>
                      <span className="text-sm md:text-base font-mono font-bold text-[var(--text-main)]">
                        ${(group.cumulativeCost || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                    <div className="flex flex-col text-right">
                      <span className="text-[9px] text-[var(--text-dim)] font-black uppercase tracking-widest mb-1">累積總收入</span>
                      <span className="text-sm md:text-base font-mono font-bold text-[var(--text-main)]">
                        ${(group.cumulativeRevenue || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </span>
                    </div>
                  </div>
                </div>

                {expandedTickers[ticker] !== false && (
                  <div className="overflow-x-auto custom-scrollbar bg-[var(--bg-primary)]/50">
                    <table className="w-full text-left min-w-[900px]">
                      <thead>
                        <tr className="text-[9px] text-[var(--text-dim)] font-bold uppercase tracking-widest border-b border-[var(--border)]">
                          <th className="px-6 py-3">日期</th>
                          <th className="px-6 py-3">股數</th>
                          <th className="px-6 py-3">淨收支</th>
                          <th className="px-6 py-3">已結損益</th>
                          <th className="px-6 py-3">ROI%</th>
                          <th className="px-6 py-3 text-right">備註</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border)]">
                        {group.transactions.map((tx: any) => (
                          <tr key={tx.id} className={cn("hover:bg-[var(--bg-secondary)]/30 transition-colors", tx.isUncleared && "bg-[var(--bg-tertiary)]")}>
                            <td className="px-6 py-3 font-mono text-xs">{tx.date}</td>
                            <td className="px-6 py-3 font-mono text-xs">{(tx.quantity || 0).toLocaleString()}</td>
                            <td className="px-6 py-3 font-mono text-xs">${(tx.totalAmount || 0).toLocaleString()}</td>
                            <td className={cn("px-6 py-3 font-mono text-xs font-bold", tx.realizedProfit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                              {tx.realizedProfit !== undefined ? `${tx.realizedProfit >= 0 ? '+' : ''}${tx.realizedProfit.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-6 py-3">
                              {tx.realizedRoi !== undefined ? (
                                <span className={cn("text-[10px] px-2 py-0.5 rounded font-bold", tx.realizedRoi >= 0 ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--danger)]/10 text-[var(--danger)]")}>
                                  {tx.realizedRoi.toFixed(1)}%
                                </span>
                              ) : '-'}
                            </td>
                            <td className="px-6 py-3 text-right">
                              <div className="text-[10px] text-[var(--text-dim)] italic truncate max-w-[120px] ml-auto">
                                {tx.notes || '-'}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Net Worth Summary Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="elegant-card p-5 bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)]">
              <span className="text-[9px] text-[var(--text-dim)] font-black uppercase tracking-widest block mb-1">目前總淨資產</span>
              <p className="text-2xl md:text-3xl font-mono font-black text-[var(--text-main)]">
                ${(currentTotalAssets || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
            <div className="elegant-card p-5 bg-gradient-to-br from-[var(--bg-tertiary)] to-[var(--bg-secondary)]">
              <span className="text-[9px] text-[var(--text-dim)] font-black uppercase tracking-widest block mb-1">近期資產變動</span>
              <p className={cn("text-2xl md:text-3xl font-mono font-black", assetsChange >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                {assetsChange >= 0 ? '+' : ''}{(assetsChange || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          {/* Chart Section */}
          <div className="elegant-card p-6">
            <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] mb-6 flex items-center gap-2">
              <Activity size={14} className="text-[var(--accent)]" /> 總資產成長趨勢 (Net Worth)
            </h4>
            <div className="h-[300px] md:h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={netWorthChartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--accent)" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="var(--accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.2} />
                  <XAxis dataKey="date" stroke="var(--text-dim)" fontSize={10} axisLine={false} tickLine={false} tickMargin={10} tickFormatter={(str) => str?.split('-')?.slice(1)?.join('/') || str} />
                  <YAxis stroke="var(--text-dim)" fontSize={10} axisLine={false} tickLine={false} tickMargin={10} width={60} tickFormatter={(v) => `$${((v || 0)/1000).toFixed(0)}k`} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border)', borderRadius: '12px' }}
                    formatter={(v: any) => [`$${(v || 0).toLocaleString()}`, '總資產']}
                  />
                  <Area type="monotone" dataKey="total" stroke="var(--accent)" strokeWidth={3} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Data Management Table */}
          <div className="elegant-card p-0 overflow-hidden border-[var(--border)] shadow-xl">
            <div className="p-6 border-b border-[var(--border)] bg-[var(--bg-secondary)]">
              <h4 className="text-xs font-black uppercase tracking-widest text-[var(--text-main)] flex items-center gap-2">
                <Edit2 size={14} className="text-[var(--accent)]" /> 資產分配歷史紀錄
              </h4>
            </div>
            
            <div className="p-4 bg-[var(--bg-primary)] border-b border-[var(--border)]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 items-end">
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-dim)]">記錄日期</label>
                  <input type="date" className="elegant-input text-xs h-10 px-2 w-full" value={nDate} onChange={e => setNDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-dim)]">現金帳戶 (TWD)</label>
                  <input type="number" className="elegant-input text-xs h-10 px-3 w-full" placeholder="0" value={nCash} onChange={e => setNCash(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-black uppercase tracking-widest text-[var(--text-dim)]">加密貨幣 (USD)</label>
                  <input type="number" className="elegant-input text-xs h-10 px-3 w-full" placeholder="0" value={nCrypto} onChange={e => setNCrypto(e.target.value)} />
                </div>
                <button 
                  onClick={() => {
                    if (!nCash) return;
                    setNetWorthEntries(prev => {
                      const others = (prev || []).filter(p => p.date !== nDate);
                      return [...others, { date: nDate, cash: parseFloat(nCash), crypto: parseFloat(nCrypto) || 0 }]
                        .sort((a, b) => a.date.localeCompare(b.date));
                    });
                    setNCash(''); setNCrypto('');
                  }}
                  className="bg-[var(--accent)] text-[var(--bg-primary)] h-10 rounded-xl text-xs font-black uppercase flex items-center justify-center gap-1 hover:brightness-110 active:scale-95 transition-all shadow-lg shadow-[var(--accent-glow)]"
                >
                  <Plus size={16} /> 記錄資產
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead>
                  <tr className="text-[9px] text-[var(--text-dim)] font-bold uppercase tracking-widest bg-[var(--bg-tertiary)]/30">
                    <th className="px-6 py-4">日期</th>
                    <th className="px-6 py-4">帳戶/現金</th>
                    <th className="px-6 py-4">台股市值</th>
                    <th className="px-6 py-4">加密貨幣</th>
                    <th className="px-6 py-4 text-right">總計 (Net Worth)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {[...netWorthChartData].reverse().map((entry, idx) => (
                    <tr key={idx} className="hover:bg-[var(--bg-secondary)]/50 transition-colors group">
                      <td className="px-4 py-4 font-mono text-xs">
                        <div className="flex items-center gap-1.5 flex-nowrap whitespace-nowrap">
                          <span className="shrink-0">{entry.date}</span>
                          <div className="flex items-center gap-1">
                            <button 
                              onClick={() => {
                                setNDate(entry.date);
                                setNCash(entry.cash.toString());
                                setNCrypto(entry.crypto.toString());
                                window.scrollTo({ top: 0, behavior: 'smooth' });
                              }}
                              className="p-1.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-dim)] md:opacity-0 md:group-hover:opacity-100 transition-all hover:text-[var(--accent)]"
                              title="編輯此筆紀錄"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button 
                              onClick={() => {
                                if (window.confirm('確定要刪除這筆資產紀錄嗎？')) {
                                  setNetWorthEntries(prev => prev.filter(p => p.date !== entry.date));
                                }
                              }}
                              className="p-1.5 rounded-md bg-[var(--bg-tertiary)] text-[var(--text-dim)] md:opacity-0 md:group-hover:opacity-100 transition-all hover:text-[var(--danger)]"
                              title="刪除此筆紀錄"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-[var(--text-main)]">
                        ${(entry.cash || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 font-mono text-xs text-[var(--accent)]">${(entry.stockValue || 0).toLocaleString()}</td>
                      <td className={cn("px-6 py-4 font-mono text-xs", (entry.crypto || 0) >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                        ${(entry.crypto || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-xs font-black">
                        ${(entry.total || 0).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
