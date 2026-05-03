import React, { useMemo } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { Database, Activity, X } from 'lucide-react';
import { cn } from '../lib/utils';

interface DraggablePillProps {
  ticker: string;
  name: string;
  isZero: boolean;
  isSelected: boolean;
  onSelect: (t: string) => void;
  onRename: (t: string) => void;
  onDelete: (t: string) => void;
  isEditing: boolean;
}

const DraggablePill: React.FC<DraggablePillProps> = ({
  ticker, name, isZero, isSelected, onSelect, onRename, onDelete, isEditing
}) => {
  const dragControls = useDragControls();
  return (
    <Reorder.Item
      key={ticker}
      value={ticker}
      dragListener={false}
      dragControls={dragControls}
      className={cn(
        "px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap border shadow-sm flex items-center gap-2 transition-all hardware-accel no-select cursor-pointer",
        isSelected 
          ? "bg-[var(--text-main)] text-[var(--bg-primary)] border-[var(--text-main)] shadow-lg" 
          : (isZero ? "bg-[var(--bg-secondary)] text-[var(--text-dim)] border-[var(--border)] opacity-60 border-dashed" : "bg-[var(--bg-secondary)] text-[var(--text-main)] border-[var(--border)]")
      )}
      onClick={() => onSelect(ticker)}
      onDoubleClick={() => onRename(ticker)}
    >
      {isEditing && (
        <span
          className="opacity-60 text-[10px] cursor-grab active:cursor-grabbing p-1 -ml-2"
          onPointerDown={(e) => dragControls.start(e)}
        >
          ⠿
        </span>
      )}
      {name}
      {isZero && <span className="opacity-40 text-[9px] font-normal">(已清倉)</span>}
      {isEditing && (
        <button
          onClick={(e) => { e.stopPropagation(); onDelete(ticker); }}
          className="ml-1 p-0.5 hover:bg-black/20 rounded-full transition-colors"
        >
          <X size={10} />
        </button>
      )}
    </Reorder.Item>
  );
};

interface TickerPillListProps {
  tickerOrder: string[];
  setTickerOrder: (order: string[]) => void;
  selectedTicker: string | null;
  setSelectedTicker: (t: string | null) => void;
  stockMap: Record<string, string>;
  holdingsMap: any;
  onRenameTicker: (t: string) => void;
  onDeleteTicker: (t: string) => void;
  onImportBackup: () => void;
  onUpdateMarket: () => void;
  isEditing: boolean;
  allTickers: string[];
}

export const TickerPillList: React.FC<TickerPillListProps> = ({
  tickerOrder, setTickerOrder, selectedTicker, setSelectedTicker, 
  stockMap, holdingsMap, onRenameTicker, onDeleteTicker, onImportBackup, onUpdateMarket,
  isEditing, allTickers
}) => {
  const sortedTickers = useMemo(() => {
    const active = allTickers.filter(t => (holdingsMap[t]?.currentShares || 0) > 0);
    const zero = allTickers.filter(t => (holdingsMap[t]?.currentShares || 0) <= 0);
    const currentOrder = tickerOrder.filter(t => allTickers.includes(t));
    const unorganizedActive = active.filter(t => !tickerOrder.includes(t)).sort();
    const unorganizedZero = zero.filter(t => !tickerOrder.includes(t)).sort();
    return [...currentOrder, ...unorganizedActive, ...unorganizedZero];
  }, [allTickers, holdingsMap, tickerOrder]);

  return (
    <div className="flex items-center gap-2 w-full">
      <button
        onClick={() => setSelectedTicker(null)}
        className={cn(
          "px-5 py-2.5 rounded-full font-bold text-xs transition-all border shadow-md whitespace-nowrap shrink-0",
          selectedTicker === null 
            ? "bg-[var(--accent)] text-[var(--bg-primary)] border-[var(--accent)]" 
            : "bg-[var(--bg-secondary)] text-[var(--text-dim)] border-[var(--border)] hover:bg-[var(--bg-tertiary)]"
        )}
      >
        全部明細
      </button>
      
      <div className="h-5 w-[1px] bg-[var(--border)] opacity-30 mx-1 shrink-0" />

      <div className="flex-1 overflow-x-auto no-scrollbar py-2 -mx-2 px-2 hardware-accel">
        <Reorder.Group axis="x" values={sortedTickers} onReorder={setTickerOrder} className="flex gap-2 min-w-max">
          {sortedTickers.map(ticker => (
            <DraggablePill
              key={ticker}
              ticker={ticker}
              name={stockMap[ticker] || ticker}
              isZero={(holdingsMap[ticker]?.currentShares || 0) <= 0}
              isSelected={selectedTicker === ticker}
              onSelect={setSelectedTicker}
              onRename={onRenameTicker}
              onDelete={onDeleteTicker}
              isEditing={isEditing}
            />
          ))}
        </Reorder.Group>
      </div>

      {!isEditing && (
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button onClick={onUpdateMarket} className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--accent)] transition-all shadow-sm">
            <Activity size={16} />
          </button>
          <button onClick={onImportBackup} className="p-2.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border)] text-[var(--text-dim)] hover:text-[var(--accent)] transition-all shadow-sm">
            <Database size={16} />
          </button>
        </div>
      )}
    </div>
  );
};
