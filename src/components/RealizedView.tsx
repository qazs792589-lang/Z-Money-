import { History, FileUp, Edit2, Check, ChevronRight, ChevronDown, Clock } from 'lucide-react';
import React, { useState, useMemo } from 'react';
import { cn } from '../lib/utils';
import { RealizedProfit, Transaction } from '../types';

interface RealizedViewProps {
  appData: any;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onUpdateNotes: (txId: string, notes: string) => void;
}

export const RealizedView: React.FC<RealizedViewProps> = ({ appData, onImport, onUpdateNotes }) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');
  const [expandedTickers, setExpandedTickers] = useState<Record<string, boolean>>({});

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
    const groups: Record<string, {
      name: string;
      transactions: any[];
      cumulativeProfit: number;
      cumulativeCost: number;
      cumulativeRevenue: number;
    }> = {};

    Object.entries(appData.stockGroups).forEach(([ticker, txs]: [string, any]) => {
      const realizedItems = appData.realizedList.filter((r: RealizedProfit) => r.ticker === ticker);
      
      // ONLY include if there are realized items (sells/dividends)
      if (realizedItems.length === 0) return;

      const totalProfit = realizedItems.reduce((sum: number, r: RealizedProfit) => sum + r.profit, 0);
      
      // Calculate historical cost (all BUYS ever made for this stock)
      const totalCost = txs.filter((t: any) => t.direction === 'BUY').reduce((sum: number, t: any) => sum + t.totalAmount, 0);
      // Calculate historical revenue (all SELLS + DIVIDENDS)
      const totalRevenue = txs.filter((t: any) => t.direction === 'SELL' || t.direction === 'DIVIDEND').reduce((sum: number, t: any) => sum + t.totalAmount, 0);

      const displayRows = [...txs].sort((a, b) => a.date.localeCompare(b.date)).map(tx => {
        const realizedInfo = realizedItems.find((r: RealizedProfit) => r.sellTxId === tx.id);
        return {
          ...tx,
          realizedProfit: realizedInfo?.profit,
          realizedRoi: realizedInfo?.roi,
          daysHeld: realizedInfo?.daysHeld
        };
      });

      const currentShares = appData.holdingsMap[ticker]?.currentShares || 0;

      groups[ticker] = {
        name: txs[0]?.name || ticker,
        transactions: displayRows,
        cumulativeProfit: totalProfit,
        cumulativeCost: totalCost,
        cumulativeRevenue: totalRevenue,
        isHolding: currentShares > 0
      };
    });

    return Object.entries(groups).sort((a, b) => b[1].cumulativeProfit - a[1].cumulativeProfit);
  }, [appData]);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-black flex items-center gap-3">
          <History className="text-[var(--accent)]" /> 歷史交易全紀錄 (已實現)
        </h2>
        <div className="flex gap-2">
          <input
            type="file"
            ref={fileInputRef}
            onChange={onImport}
            accept=".csv"
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border)] text-[10px] font-black text-[var(--text-dim)] hover:text-[var(--accent)] hover:border-[var(--accent)] transition-all uppercase tracking-widest"
          >
            <FileUp size={14} /> 匯入歷史 CSV
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {tickerHistory.map(([ticker, group]: [string, any]) => {
          const totalRoi = group.cumulativeCost > 0 ? (group.cumulativeProfit / group.cumulativeCost) * 100 : 0;
          return (
            <div key={ticker} className="elegant-card overflow-hidden border-[var(--border)] shadow-xl">
              <div 
                onClick={() => toggleExpand(ticker)}
                className="bg-[var(--bg-secondary)] p-4 md:p-6 cursor-pointer hover:bg-[var(--bg-tertiary)] transition-colors border-b border-[var(--border)]"
              >
                <div className="flex items-center justify-between mb-4 md:mb-6">
                  <div className="flex items-center gap-4">
                    <div className="text-[var(--accent)] transition-transform duration-300" style={{ transform: expandedTickers[ticker] !== false ? 'rotate(0deg)' : 'rotate(-90deg)' }}>
                      <ChevronDown size={24} />
                    </div>
                    <div className="flex flex-col">
                      <div className="flex items-center gap-2">
                        <span className="text-xl md:text-2xl font-black text-[var(--text-main)] uppercase tracking-tight leading-tight">{group.name}</span>
                        {group.isHolding && (
                          <span className="text-[8px] bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/30 px-1.5 py-0.5 rounded font-black uppercase tracking-widest">持有中</span>
                        )}
                      </div>
                      <span className="text-[10px] text-[var(--text-dim)] font-mono font-bold tracking-[0.2em]">{ticker}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={cn(
                      "text-xl md:text-2xl font-mono font-black block leading-none",
                      group.cumulativeProfit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"
                    )}>
                      {group.cumulativeProfit >= 0 ? '+' : ''}{group.cumulativeProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                    <span className={cn("text-[10px] font-bold mt-1 inline-block", group.cumulativeProfit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                      {group.cumulativeProfit >= 0 ? '▲' : '▼'} {Math.abs(totalRoi).toFixed(2)}%
                    </span>
                  </div>
                </div>

                {/* Info Grid: Responsive 2 columns */}
                <div className="grid grid-cols-2 gap-4 border-t border-[var(--border)] pt-4">
                  <div className="flex flex-col">
                    <span className="text-[8px] md:text-[9px] text-[var(--text-dim)] uppercase font-black tracking-widest opacity-60 mb-1">累積總成本</span>
                    <span className="text-sm md:text-base font-mono font-bold text-[var(--text-main)]">
                      ${group.cumulativeCost.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                  <div className="flex flex-col text-right">
                    <span className="text-[8px] md:text-[9px] text-[var(--text-dim)] uppercase font-black tracking-widest opacity-60 mb-1">累積總收入</span>
                    <span className="text-sm md:text-base font-mono font-bold text-[var(--text-main)]">
                      ${group.cumulativeRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                    </span>
                  </div>
                </div>
              </div>

              {expandedTickers[ticker] !== false && (
                <div className="overflow-x-auto custom-scrollbar">
                  <table className="w-full text-left min-w-[1300px]">
                    <thead>
                      <tr className="text-[10px] text-[var(--text-dim)] font-bold uppercase tracking-widest bg-[var(--bg-primary)]">
                        <th className="px-6 py-4">日期</th>
                        <th className="px-6 py-4">單價</th>
                        <th className="px-6 py-4">股數 (買負賣正)</th>
                        <th className="px-6 py-4">股息</th>
                        <th className="px-6 py-4">手續/稅費</th>
                        <th className="px-6 py-4">淨收支 (現金流)</th>
                        <th className="px-6 py-4 bg-[var(--bg-tertiary)]/30">已結清損益</th>
                        <th className="px-6 py-4 bg-[var(--bg-tertiary)]/30">ROI%</th>
                        <th className="px-6 py-4">持有天數</th>
                        <th className="px-6 py-4 text-right">備註</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--border)]">
                      {group.transactions.map((tx) => {
                        const isDividend = tx.direction === 'DIVIDEND';
                        const isBuy = tx.direction === 'BUY';
                        const isSell = tx.direction === 'SELL';

                        return (
                          <tr key={tx.id} className="hover:bg-[var(--bg-secondary)]/50 transition-colors group">
                            <td className="px-6 py-4 font-mono text-xs">{tx.date}</td>
                            <td className="px-6 py-4 font-mono text-xs">
                              {isDividend ? <span className="opacity-20">-</span> : `$${tx.unitPrice.toLocaleString()}`}
                            </td>
                            <td className={cn("px-6 py-4 font-mono text-xs font-bold", isBuy ? "text-[var(--danger)]" : isSell ? "text-[var(--success)]" : "opacity-20")}>
                              {isBuy ? `-${tx.quantity.toLocaleString()}` : isSell ? `+${tx.quantity.toLocaleString()}` : '-'}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-yellow-500 font-bold">
                              {isDividend ? `$${tx.totalAmount.toLocaleString()}` : <span className="opacity-20">-</span>}
                            </td>
                            <td className="px-6 py-4 font-mono text-xs text-[var(--text-dim)]">
                              {tx.fee + tx.tax > 0 ? (
                                <span>${(tx.fee + tx.tax).toLocaleString(undefined, { maximumFractionDigits: 1 })}</span>
                              ) : <span className="opacity-20">$0</span>}
                            </td>
                            <td className={cn(
                              "px-6 py-4 font-mono text-xs font-black",
                              isBuy ? "text-[var(--danger)]" : (isDividend ? "text-yellow-500" : "text-[var(--success)]")
                            )}>
                              {isBuy ? '-' : '+'}${Math.abs(tx.totalAmount).toLocaleString(undefined, { maximumFractionDigits: 1 })}
                            </td>
                            
                            <td className={cn(
                              "px-6 py-4 font-mono text-xs font-black bg-[var(--bg-tertiary)]/10",
                              tx.realizedProfit !== undefined ? (tx.realizedProfit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]") : "opacity-10"
                            )}>
                              {tx.realizedProfit !== undefined ? (
                                <>{tx.realizedProfit >= 0 ? '+' : ''}{tx.realizedProfit.toLocaleString(undefined, { maximumFractionDigits: 1 })}</>
                              ) : '-'}
                            </td>
                            
                            <td className="px-6 py-4 bg-[var(--bg-tertiary)]/10">
                              {(tx.realizedRoi !== undefined && !isDividend) ? (
                                <span className={cn(
                                  "text-[10px] px-2 py-0.5 rounded font-bold",
                                  tx.realizedRoi >= 0 ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--danger)]/10 text-[var(--danger)]"
                                )}>
                                  {tx.realizedRoi >= 0 ? '+' : ''}{tx.realizedRoi.toFixed(2)}%
                                </span>
                              ) : <span className="opacity-10">-</span>}
                            </td>

                            <td className="px-6 py-4 font-mono text-[10px] text-[var(--text-dim)]">
                              {tx.daysHeld !== undefined && tx.daysHeld > 0 ? (
                                <div className="flex items-center gap-1.5">
                                  <Clock size={10} className="opacity-40" />
                                  <span>{tx.daysHeld} 天</span>
                                </div>
                              ) : <span className="opacity-10">-</span>}
                            </td>

                            <td className="px-6 py-4 text-right">
                              {editingId === tx.id ? (
                                <input
                                  autoFocus
                                  className="bg-[var(--bg-primary)] border border-[var(--accent)] rounded px-2 py-1 text-[10px] text-[var(--text-main)] w-full max-w-[120px]"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => e.key === 'Enter' && saveEdit(tx.id)}
                                  onBlur={() => saveEdit(tx.id)}
                                />
                              ) : (
                                <div 
                                  onClick={() => startEditing(tx.id, tx.notes)}
                                  className="text-[10px] text-[var(--text-dim)] italic cursor-pointer truncate max-w-[150px] ml-auto hover:text-[var(--accent)]"
                                >
                                  {tx.notes || '點擊編輯備註'}
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
