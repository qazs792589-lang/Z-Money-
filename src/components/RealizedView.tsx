import React from 'react';
import { History } from 'lucide-react';
import { cn } from '../lib/utils';
import { RealizedProfit } from '../types';

interface RealizedViewProps {
  realizedList: RealizedProfit[];
}

export const RealizedView: React.FC<RealizedViewProps> = ({ realizedList }) => {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
      <h2 className="text-2xl font-black flex items-center gap-3">
        <History className="text-[var(--accent)]" /> 已實現損益
      </h2>

      <div className="elegant-card overflow-hidden">
        <div className="bg-[var(--bg-tertiary)] px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
          <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">已結清倉位列表</span>
          <div className="text-[10px] px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[var(--success)] font-mono">
            篩選：僅顯示已實現
          </div>
        </div>
        <div className="overflow-x-auto smooth-scroll-x">
          <table className="w-full text-left">
            <thead>
              <tr className="text-[10px] text-[var(--text-main)] font-bold uppercase tracking-wider bg-[var(--bg-tertiary)]">
                <th className="px-6 py-4 font-bold">結清日期</th>
                <th className="px-6 py-4 font-bold">標的碼</th>
                <th className="px-6 py-4 font-bold">成交股數</th>
                <th className="px-6 py-4 font-bold">成本均價</th>
                <th className="px-6 py-4 font-bold">賣出價</th>
                <th className="px-6 py-4 font-bold">淨損益</th>
                <th className="px-6 py-4 font-bold text-right">ROI %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border)]">
              {realizedList.map((r, i) => (
                <tr key={i} className="hover:bg-[var(--bg-tertiary)] transition-colors group">
                  <td className="px-6 py-4 font-mono text-xs">{r.closeDate}</td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold">{r.name}</span>
                      <span className="text-[9px] text-[var(--text-dim)] font-mono">{r.ticker}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs">{r.shares.toLocaleString()}</td>
                  <td className="px-6 py-4 font-mono text-xs text-[var(--text-dim)]">${r.buyPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 font-mono text-xs">${r.sellPrice.toFixed(2)}</td>
                  <td className={cn("px-6 py-4 font-mono text-xs font-bold", r.profit >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                    {r.profit >= 0 ? '+' : ''}{r.profit.toLocaleString(undefined, { maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className={cn(
                      "text-[10px] px-2 py-1 rounded font-bold",
                      r.roi >= 0 ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-[var(--danger)]/10 text-[var(--danger)]"
                    )}>
                      {r.roi >= 0 ? '+' : ''}{r.roi.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))}
              {realizedList.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-[var(--text-dim)] italic text-sm">
                    目前尚無已結清的交易紀錄。
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
