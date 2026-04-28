/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useEffect } from 'react';
import {
  Plus,
  History,
  LayoutDashboard,
  TrendingUp,
  Activity,
  Database,
  ArrowUpRight,
  ArrowDownRight,
  Calculator,
  Briefcase,
  Menu,
  X,
  Calendar,
  Check,
  Target,
  Edit2,
  Trash2,
  Palette
} from 'lucide-react';
import {
  ResponsiveContainer,
  ComposedChart,
  AreaChart,
  Line,
  Area,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Scatter,
  ReferenceDot,
  Legend
} from 'recharts';
import { motion } from 'motion/react';
import { cn } from './lib/utils';
import {
  Transaction,
  TransactionCategory,
  TransactionDirection,
  Config,
  Holding,
  RealizedProfit,
  WeeklyPrice
} from './types';
import { DEFAULT_CONFIGS, INITIAL_TRANSACTIONS } from './constants';
import { StockChartWidget } from './components/StockChartWidget';
import { usePortfolioCalculations } from './hooks/usePortfolioCalculations';
import { useTransactionForm } from './hooks/useTransactionForm';
import { PortfolioView } from './components/PortfolioView';
import { RealizedView } from './components/RealizedView';

export default function App() {
  const [activeView, setActiveView] = useState<'A' | 'B' | 'C'>('B');
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [configs] = useState<Record<TransactionCategory, Config>>(DEFAULT_CONFIGS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Defaulting to false for mobile friendliness
  const themes = ['gold', 'cyan', 'ocean', 'light', 'zen'] as const;
  type Theme = typeof themes[number];
  const [theme, setTheme] = useState<Theme>('cyan');

  useEffect(() => {
    if (theme === 'gold') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', theme);
    }
  }, [theme]);

  const [marketData, setMarketData] = useState<{ updated: string | null; prices: Record<string, number> }>({ updated: null, prices: {} });
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [weeklyPrices, setWeeklyPrices] = useState<WeeklyPrice[]>([]);


  // Derived Calculations & Logic extracted to custom hooks
  const { formData, setFormData, preview } = useTransactionForm(configs);
  const { appData, stats } = usePortfolioCalculations(transactions, marketData);

  // Dynamic Chart Data for Dashboard (Mock historical trend based on current stats)
  const [manualDate, setManualDate] = useState(new Date().toISOString().split('T')[0]);
  const [manualPrice, setManualPrice] = useState('');

  const addWeeklyPrice = (ticker: string) => {
    if (!manualDate || !manualPrice) return;

    const newPriceEntry = {
      date: manualDate,
      price: parseFloat(manualPrice)
    };

    const updatedGroups = { ...appData.stockGroups };
    if (!updatedGroups[ticker].weeklyPrices) {
      updatedGroups[ticker].weeklyPrices = [];
    }

    // 避免重複日期
    updatedGroups[ticker].weeklyPrices = [
      ...updatedGroups[ticker].weeklyPrices.filter(p => p.date !== manualDate),
      newPriceEntry
    ].sort((a, b) => a.date.localeCompare(b.date));

    saveData({ ...appData, stockGroups: updatedGroups });
    setManualPrice('');
    // 立即更新圖表數據
    setChartData(updatedGroups[ticker].weeklyPrices.map(p => ({
      date: p.date,
      timestamp: new Date(p.date).getTime(),
      price: p.price
    })));
  };

  const chartData = useMemo(() => {
    const currentVal = stats.totalMarketValue || 1000000;
    const currentCost = stats.totalInvested || 900000;
    const currentProfit = stats.unrealizedPL || 100000;

    const data = [];
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - (i * 7));
      const dateStr = d.toISOString().split('T')[0];
      const factor = 1 - (i * 0.02) + (Math.random() * 0.04 - 0.02);
      const costFactor = 1 - (i * 0.01);
      data.push({
        name: dateStr,
        value: i === 0 ? currentVal : Math.floor(currentVal * factor),
        cost: i === 0 ? currentCost : Math.floor(currentCost * costFactor),
        profit: i === 0 ? currentProfit : (Math.floor(currentVal * factor) - Math.floor(currentCost * costFactor))
      });
    }
    return data;
  }, [stats]);

  const handleAddTransaction = () => {
    if (!formData.ticker || formData.unitPrice < 0 || formData.quantity <= 0) return;
    const newTx: Transaction = {
      id: editingTxId || Math.random().toString(36).substr(2, 9),
      date: formData.date,
      ticker: formData.ticker,
      name: formData.name || formData.ticker,
      direction: formData.direction,
      quantity: formData.quantity,
      unitPrice: formData.unitPrice,
      category: formData.category,
      fee: preview.fee,
      tax: preview.tax,
      totalAmount: preview.total
    };

    if (editingTxId) {
      setTransactions(transactions.map(t => t.id === editingTxId ? newTx : t));
      setEditingTxId(null);
      setSelectedTicker(newTx.ticker);
    } else {
      setTransactions([...transactions, newTx]);
    }

    setFormData(prev => ({
      ...prev,
      ticker: '',
      name: '',
      unitPrice: 0,
      quantity: 1000
    }));
  };

  const handleEditTx = (tx: Transaction) => {
    setEditingTxId(tx.id);
    setFormData({
      date: tx.date,
      ticker: tx.ticker,
      name: tx.name,
      direction: tx.direction,
      quantity: tx.quantity,
      unitPrice: tx.unitPrice,
      category: tx.category,
      customFee: tx.fee,
      customTax: tx.tax
    });
    setActiveView('A');

    // Auto-scroll to top smoothly
    setTimeout(() => {
      document.getElementById('tx-form-container')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 50);
  };

  return (
    <div className="min-h-screen bg-[var(--bg-primary)] text-[var(--text-main)] font-sans flex flex-col">
      {/* Header */}
      <header className="bg-[var(--bg-secondary)] border-b border-[var(--border)] flex items-center justify-between px-4 md:px-6 z-40 shadow-lg h-16 shrink-0 sticky top-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 hover:bg-[rgba(255,255,255,0.05)] rounded-lg text-[var(--accent)]"
          >
            {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
          <h1 className="flex items-center gap-2">
            <img
              src="/Z-Money-/logo.png"
              alt="Z-Ledger Logo"
              className={cn(
                "h-8 md:h-10 object-contain rounded-md transition-all duration-300",
                (theme === 'light' || theme === 'zen') ? "shadow-none" : "shadow-[0_0_20px_var(--accent-glow)]"
              )}
              style={ (theme === 'light' || theme === 'zen') ? { filter: 'invert(1) hue-rotate(180deg) brightness(1.2) contrast(1.2)', mixBlendMode: 'darken' } : {} }
            />
            <span className="text-[var(--text-main)] font-bold text-xs md:text-base uppercase tracking-widest hidden xs:inline-block ml-2">投資管理系統</span>
          </h1>
          <button
            onClick={() => {
              setTheme(t => {
                const currentIndex = themes.indexOf(t as any);
                return themes[(currentIndex + 1) % themes.length];
              });
            }}
            className="p-1.5 ml-2 hover:bg-[rgba(255,255,255,0.05)] rounded-lg text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors"
            title="切換主題風格"
          >
            <Palette size={18} />
          </button>
        </div>
        <div className="flex items-center gap-3 md:gap-6">
          <div className="flex flex-col items-end">
            <span className="text-[8px] md:text-[10px] text-[var(--text-dim)] font-mono uppercase tracking-[0.2em]">Asset Value</span>
            <span className="text-xs md:text-sm font-mono font-bold text-[var(--accent)]">${stats.totalMarketValue.toLocaleString()}</span>
          </div>
          <div className="h-8 w-[1px] bg-[var(--border)] hidden sm:block" />
          <div className="text-[10px] font-mono text-[var(--success)] hidden sm:flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
            MARKET_DATA: {marketData.updated ? new Date(marketData.updated).toLocaleTimeString() : 'FETCHING...'}
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="flex flex-1 overflow-hidden relative">
        {/* Sidebar: Navigation Controller */}
        <aside className={cn(
          "bg-[var(--bg-secondary)] border-r border-[var(--border)] p-6 flex flex-col gap-8 transition-all duration-300 z-40 fixed top-16 left-0 h-[calc(100vh-64px)] overflow-y-auto shadow-2xl",
          isSidebarOpen ? "translate-x-0 w-[260px]" : "-translate-x-full lg:translate-x-0 lg:w-[80px] lg:px-4"
        )}>
          <div>
            <span className={cn(
              "text-[10px] font-bold text-[var(--text-dim)] uppercase tracking-widest pl-2 mb-4 block transition-opacity",
              !isSidebarOpen && "lg:opacity-0"
            )}>
              Navigator
            </span>
            <nav className="flex flex-col gap-2">
              {[
                { id: 'A', label: '交易/明細', icon: Plus, desc: 'Groups & Entry' },
                { id: 'B', label: '未實現損益', icon: LayoutDashboard, desc: 'Portfolio' },
                { id: 'C', label: '已實現損益', icon: History, desc: 'History ROI' },
              ].map((nav) => (
                <button
                  key={nav.id}
                  onClick={() => {
                    setActiveView(nav.id as any);
                    if (window.innerWidth < 1024) setIsSidebarOpen(false);
                  }}
                  className={cn(
                    "flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all border group relative overflow-hidden",
                    activeView === nav.id
                      ? "bg-[var(--bg-tertiary)] border-[var(--accent)] text-[var(--accent)] shadow-[0_0_20px_rgba(0,242,255,0.1)]"
                      : "bg-transparent border-transparent text-[var(--text-dim)] hover:bg-[rgba(255,255,255,0.03)] hover:text-[var(--text-main)]",
                    !isSidebarOpen && "lg:px-0 lg:justify-center"
                  )}
                >
                  {activeView === nav.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--accent)] blur-[2px]" />}
                  <nav.icon size={18} />
                  <div className={cn(
                    "flex flex-col items-start leading-none text-left transition-all",
                    !isSidebarOpen && "lg:hidden"
                  )}>
                    <span className="text-sm font-bold">{nav.label}</span>
                  </div>
                </button>
              ))}
            </nav>
          </div>

          <div className={cn("mt-auto transition-all", !isSidebarOpen && "lg:hidden")}>
            <div className="elegant-card p-4 bg-[var(--bg-primary)]">
              <span className="text-[10px] text-[var(--accent)] font-bold mb-2 flex items-center gap-2">
                <Database size={10} /> SSOT PROTOCOL
              </span>
              <p className="text-[9px] text-[var(--text-dim)] leading-relaxed italic opacity-70">
                * One input, multiple views. Integrity locked.
              </p>
            </div>
          </div>
        </aside>

        {/* Overlay for mobile */}
        {isSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-20 lg:hidden"
            onClick={() => setIsSidebarOpen(false)}
          />
        )}

        <main className={cn(
          "flex-1 overflow-y-auto p-4 md:p-8 bg-[var(--bg-primary)] transition-all duration-300",
          isSidebarOpen ? "lg:ml-[260px]" : "lg:ml-[80px]"
        )}>
          {activeView === 'A' && (
            <div id="tx-form-container" className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 pt-2">
              <div>
                <h2 className="text-xl font-black mb-4 flex items-center gap-3 text-[var(--text-main)] transition-all">
                  {editingTxId ? (
                    <><Edit2 className="text-orange-500 animate-pulse" /> <span className="text-orange-500">編輯交易紀錄</span> <span className="text-[10px] bg-orange-500/20 text-orange-500 px-3 py-1 rounded-full ml-auto font-bold uppercase tracking-widest">編輯模式</span></>
                  ) : (
                    <><Plus className="text-[var(--accent)]" /> 交易/明細</>
                  )}
                </h2>

                <div className={cn("elegant-card space-y-6 transition-all", editingTxId && "border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.1)]")}>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="elegant-label text-xs">股票代號</label>
                      <input
                        type="text"
                        className="elegant-input text-lg uppercase"
                        placeholder="e.g. 2330"
                        value={formData.ticker}
                        onChange={(e) => setFormData({ ...formData, ticker: e.target.value })}
                      />
                    </div>
                    <div>
                      <label className="elegant-label text-xs">股票名稱</label>
                      <input
                        type="text"
                        className="elegant-input text-lg"
                        placeholder="e.g. 台積電"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="elegant-label text-xs">交易日期</label>
                    <div
                      className="relative group cursor-pointer"
                      onClick={(e) => {
                        const input = e.currentTarget.querySelector('input');
                        if (input) {
                          try {
                            input.showPicker();
                          } catch (err) {
                            input.focus();
                          }
                        }
                      }}
                    >
                      <Calendar size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--accent)] pointer-events-none" />
                      <input
                        type="date"
                        className="elegant-input pl-11 w-full block cursor-pointer"
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        style={{ colorScheme: 'dark' }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div className="col-span-2 md:col-span-1">
                      <label className="elegant-label">交易方向</label>
                      <div className="flex bg-[var(--bg-primary)] p-1 border border-[var(--border)] rounded h-[46px] items-stretch">
                        {(['BUY', 'SELL', 'DIVIDEND'] as TransactionDirection[]).map(dir => (
                          <button
                            key={dir}
                            onClick={() => setFormData({ ...formData, direction: dir })}
                            className={cn(
                              "flex-1 flex items-center justify-center text-[10px] font-bold rounded transition-all",
                              formData.direction === dir
                                ? (dir === 'BUY' ? "bg-[var(--danger)] text-white" : dir === 'SELL' ? "bg-[var(--success)] text-white" : "bg-yellow-500 text-black")
                                : "text-[var(--text-dim)]"
                            )}
                          >
                            {dir === 'BUY' ? '買入' : dir === 'SELL' ? '賣出' : '股息'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div>
                      <label className="elegant-label">{formData.direction === 'DIVIDEND' ? '每股股息' : '單價'}</label>
                      <input
                        type="number"
                        className="elegant-input h-[46px]"
                        value={formData.unitPrice || ''}
                        onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                      />
                    </div>
                    <div>
                      <label className="elegant-label">股數</label>
                      <input
                        type="number"
                        className="elegant-input h-[46px]"
                        value={formData.quantity || ''}
                        onChange={(e) => setFormData({ ...formData, quantity: Number(e.target.value) })}
                      />
                    </div>
                  </div>

                  <div className="bg-[var(--bg-tertiary)] border border-[var(--border)] rounded-xl p-6 relative overflow-hidden">
                    <div className="relative z-10">
                      <span className="elegant-label mb-4 flex items-center gap-2 text-[var(--accent)]">
                        <Calculator size={14} /> 即時預覽估算 (Live Calc)
                      </span>
                      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6 items-end">
                        <div className="flex flex-col">
                          <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-tighter mb-1 font-bold">{preview.feeLabel}</span>
                          <span className="text-2xl font-mono text-[var(--text-main)] font-black">${preview.fee.toLocaleString()}</span>
                        </div>

                        <div className="flex flex-col text-right lg:text-left">
                          <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-tighter mb-1 font-bold">{preview.taxLabel}</span>
                          <span className="text-2xl font-mono text-[var(--text-main)] font-black">${preview.tax.toLocaleString()}</span>
                        </div>

                        <div className="flex flex-col">
                          <span className="text-[10px] text-[var(--accent)] uppercase tracking-tighter mb-1 font-bold">淨交割 (Net Total)</span>
                          <span className={cn(
                            "text-2xl md:text-3xl font-mono font-black tracking-tighter",
                            formData.direction === 'BUY' ? "text-[var(--danger)]" : formData.direction === 'SELL' ? "text-[var(--success)]" : "text-orange-400"
                          )}>${Math.abs(preview.total).toLocaleString()}</span>
                        </div>

                        <div className="flex gap-2">
                          {editingTxId && (
                            <button
                              onClick={() => {
                                setEditingTxId(null);
                                setFormData(prev => ({ ...prev, ticker: '', name: '', unitPrice: 0, quantity: 1000 }));
                              }}
                              className="w-1/3 bg-[var(--accent)] text-white h-[48px] md:h-[56px] rounded-xl font-black text-sm md:text-base hover:opacity-90 active:scale-[0.95] transition-all flex items-center justify-center gap-2"
                            >
                              取消
                            </button>
                          )}
                          <button
                            onClick={handleAddTransaction}
                            disabled={!formData.ticker || formData.unitPrice <= 0 || formData.quantity <= 0}
                            className={cn(
                              "bg-[var(--accent)] text-[var(--bg-primary)] h-[48px] md:h-[56px] rounded-xl font-black text-sm md:text-base hover:brightness-110 shadow-[0_0_20px_rgba(0,242,255,0.2)] active:scale-[0.95] transition-all flex items-center justify-center gap-2 disabled:opacity-30 disabled:cursor-not-allowed",
                              editingTxId ? "w-2/3" : "w-full"
                            )}
                          >
                            {editingTxId ? '儲存修改' : '確認記錄'}
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-[var(--bg-tertiary)] rounded-xl border border-[var(--border)] text-[var(--accent)]">
                      <Briefcase size={18} />
                    </div>
                    <div>
                      <h4 className="text-lg font-black text-[var(--text-main)] leading-tight">投資組合明細</h4>
                    </div>
                  </div>

                  {/* Modern Pill Ticker Navigation */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                    {Object.keys(appData.stockGroups).sort().map(ticker => {
                      const groupTxs = appData.stockGroups[ticker];
                      const stockName = groupTxs.length > 0 ? groupTxs[0].name : ticker;

                      return (
                        <button
                          key={ticker}
                          onClick={() => setSelectedTicker(ticker)}
                          className={cn(
                            "px-4 py-2 rounded-full font-bold text-xs whitespace-nowrap transition-all border shrink-0",
                            selectedTicker === ticker
                              ? "bg-[var(--text-main)] text-[var(--bg-primary)] border-[var(--text-main)] shadow-lg shadow-[var(--accent-glow)] active:scale-[0.98]"
                              : "bg-[var(--bg-secondary)] text-[var(--text-dim)] border-[var(--border)] hover:bg-[var(--bg-tertiary)] hover:text-[var(--text-main)]"
                          )}
                        >
                          {stockName}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4">
                  {(selectedTicker || Object.keys(appData.stockGroups)[0]) ? (
                    (() => {
                      const ticker = selectedTicker || Object.keys(appData.stockGroups).sort()[0];
                      const txs = appData.stockGroups[ticker];
                      const h = appData.holdingsMap[ticker] || { currentShares: 0, avgCost: 0, totalInvested: 0 };
                      const curPrice = marketData.prices[ticker] || h.avgCost;
                      const unrealizedPL = (curPrice - h.avgCost) * h.currentShares;
                      const roi = h.avgCost > 0 ? ((curPrice / h.avgCost) - 1) * 100 : 0;

                      return (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                          <div className="elegant-card bg-[var(--bg-secondary)] overflow-hidden p-0 border-[var(--border)] shadow-2xl space-y-px">
                            {/* Stock Header & Primary Stat */}
                            {/* Stock Header & Live Chart Area */}
                            <div className="flex flex-col bg-[var(--bg-tertiary)] border-b border-[var(--border)]">
                              {/* Unified Header & Stats Block */}
                              <div className="p-4 md:p-8 bg-[var(--bg-secondary)] flex flex-col justify-center">
                                <div className="flex flex-row items-end justify-between gap-2 md:gap-6 mb-4 md:mb-6">
                                  <div className="flex flex-col min-w-0 flex-shrink">
                                    <h5 className="text-xl md:text-3xl lg:text-4xl font-black text-[var(--text-main)] tracking-tighter mb-1 md:mb-2 truncate">{txs[0].name}</h5>
                                    <div className="flex items-center gap-1 md:gap-2">
                                      <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-[var(--bg-primary)] border border-[var(--border)] text-[var(--accent)] rounded text-[9px] md:text-xs font-mono font-bold tracking-widest leading-none">{ticker}</span>
                                    </div>
                                  </div>

                                  <div className="text-right flex-shrink-0 mt-2 md:mt-0">
                                    <p className="text-2xl md:text-4xl lg:text-5xl font-mono font-black text-[var(--accent)] tracking-tighter leading-none mb-1 md:mb-2">${(h.currentShares * curPrice).toLocaleString()}</p>
                                    <p className={cn("text-[10px] md:text-xs font-bold font-mono", unrealizedPL >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]")}>
                                      {unrealizedPL >= 0 ? '▲' : '▼'} ${(Math.abs(unrealizedPL)).toLocaleString(undefined, { maximumFractionDigits: 0 })} ({roi.toFixed(1)}%)
                                    </p>
                                  </div>
                                </div>

                                {/* Sub-stats for all viewports */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 pt-8 border-t border-[var(--border)]">
                                  <div>
                                    <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-[0.2em] font-black opacity-60 block mb-2">持有股數</span>
                                    <p className="text-2xl md:text-3xl lg:text-4xl font-mono font-black text-[var(--text-main)] leading-none">{h.currentShares.toLocaleString()}</p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-[0.2em] font-black opacity-60 block mb-2">目前市價</span>
                                    <p className="text-2xl md:text-3xl lg:text-4xl font-mono font-black text-[var(--text-main)] leading-none">${curPrice}</p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-[0.2em] font-black opacity-60 block mb-2">平均成本</span>
                                    <p className="text-2xl md:text-3xl lg:text-4xl font-mono font-black text-[var(--text-main)] leading-none">${h.avgCost.toFixed(2)}</p>
                                  </div>
                                  <div>
                                    <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-[0.2em] font-black opacity-60 block mb-2">總投入本金</span>
                                    <p className="text-2xl md:text-3xl lg:text-4xl font-mono font-black text-[var(--text-main)] leading-none">${h.totalInvested.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                                  </div>
                                </div>
                              </div>

                              {/* History Ledger Section */}
                              <div className="flex flex-col border-b border-[var(--border)] bg-[var(--bg-secondary)]">
                                <div className="px-6 py-3 flex items-center justify-between bg-[var(--bg-tertiary)]">
                                  <span className="text-[9px] font-black tracking-[0.2em] text-[var(--text-dim)] uppercase">歷史交易明細表</span>
                                  <span className="text-[9px] font-mono text-[var(--text-dim)] border border-[var(--border)] px-2 py-0.5 rounded italic opacity-50">{txs.length} 筆資料</span>
                                </div>
                                <div className="max-h-[300px] overflow-y-auto divide-y divide-[var(--border)] custom-scrollbar">
                                  {[...(txs as Transaction[])].sort((a, b) => b.date.localeCompare(a.date)).map(tx => (
                                    <div key={tx.id} className="px-6 py-3 flex items-center justify-between hover:bg-[var(--bg-tertiary)] transition-colors group">
                                      <div className="flex items-center gap-3 md:gap-4 flex-1 min-w-0">
                                        <div className={cn(
                                          "px-2.5 py-0.5 rounded text-[9px] font-bold uppercase shrink-0",
                                          tx.direction === 'BUY' ? "bg-[var(--danger)]/10 text-[var(--danger)]" :
                                            tx.direction === 'SELL' ? "bg-[var(--success)]/10 text-[var(--success)]" : "bg-orange-500/10 text-orange-500"
                                        )}>
                                          {tx.direction === 'BUY' ? '買入' : tx.direction === 'SELL' ? '賣出' : '配息'}
                                        </div>
                                        <div className="truncate min-w-0 flex flex-col justify-center">
                                          <p className="text-[9px] font-mono font-bold text-[var(--text-dim)] mb-0.5 opacity-60 flex items-center gap-2 leading-none">
                                            {tx.date}
                                            <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                              <button
                                                onClick={() => handleEditTx(tx)}
                                                className="flex items-center text-[var(--accent)] hover:underline"
                                                title="編輯此筆交易"
                                              >
                                                <Edit2 size={9} className="mr-0.5" /> 編輯
                                              </button>
                                              <button
                                                onClick={() => {
                                                  if (window.confirm('確定要刪除這筆交易紀錄嗎？')) {
                                                    const updatedGroups = { ...appData.stockGroups };
                                                    updatedGroups[ticker] = updatedGroups[ticker].filter(t => t.id !== tx.id);
                                                    if (updatedGroups[ticker].length === 0) delete updatedGroups[ticker];
                                                    saveData({ ...appData, stockGroups: updatedGroups });
                                                  }
                                                }}
                                                className="flex items-center text-[var(--danger)] hover:underline"
                                                title="刪除此筆交易"
                                              >
                                                <Trash2 size={9} className="mr-0.5" /> 刪除
                                              </button>
                                            </div>
                                          </p>
                                          <p className="text-[10px] md:text-xs text-[var(--text-main)] font-mono font-bold truncate leading-none mt-1">
                                            <span className="text-[var(--text-dim)] mr-1">數量:</span>{tx.quantity.toLocaleString()} 股
                                            <span className="mx-2 opacity-30">|</span>
                                            <span className="text-[var(--text-dim)] mr-1">單價:</span><span className="opacity-50 text-[10px]">$</span>{tx.unitPrice.toLocaleString()}
                                          </p>
                                        </div>
                                      </div>
                                      <div className="text-right shrink-0 flex flex-col justify-center">
                                        <p className="text-[8px] text-[var(--text-dim)] uppercase tracking-widest font-black opacity-60 mb-0.5 leading-none">
                                          交易總額
                                        </p>
                                        <p className={cn(
                                          "text-sm md:text-base font-mono font-black leading-none mt-1",
                                          tx.direction === 'BUY' ? "text-[var(--danger)]" : tx.direction === 'DIVIDEND' ? "text-orange-400" : "text-[var(--success)]"
                                        )}><span className="opacity-40 text-xs mr-0.5">$</span>{Math.abs(tx.totalAmount).toLocaleString()}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* The Integrated Chart Area (Always bottom) */}
                              <div className="p-4 md:p-8 bg-[var(--bg-primary)] border-t border-[var(--border)]">
                                <div className="h-[300px] md:h-[450px] rounded-xl overflow-hidden border border-[var(--border)] relative group">
                                  <StockChartWidget ticker={ticker} transactions={txs} weeklyPrices={weeklyPrices.filter(wp => wp.ticker === ticker)} marketData={marketData} />
                                </div>
                              </div>
                            </div>

                            {/* Weekly Price Input Section */}
                            <div className="bg-[var(--bg-tertiary)] p-6 border-b border-[var(--border)] space-y-4">
                              <span className="text-[9px] font-black tracking-[0.2em] text-[var(--text-dim)] uppercase">每週收盤價登錄</span>
                              <div className="flex gap-4">
                                <input
                                  type="date"
                                  className="elegant-input flex-1"
                                  value={formData.date}
                                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                                />
                                <input
                                  type="number"
                                  className="elegant-input flex-1"
                                  placeholder="Price"
                                  value={formData.unitPrice || ''}
                                  onChange={(e) => setFormData({ ...formData, unitPrice: Number(e.target.value) })}
                                />
                                <button
                                  className="bg-[var(--accent)] text-[var(--bg-primary)] px-4 py-2 rounded-lg font-bold"
                                  onClick={() => {
                                    const others = weeklyPrices.filter(p => !(p.date === formData.date && p.ticker === ticker));
                                    const newPrices = [...others, { date: formData.date, ticker, price: formData.unitPrice }]
                                      .sort((a, b) => a.date.localeCompare(b.date));
                                    setWeeklyPrices(newPrices);
                                  }}
                                >新增</button>
                              </div>
                              <div className="space-y-2 mt-4 max-h-40 overflow-y-auto">
                                {weeklyPrices.filter(wp => wp.ticker === ticker)
                                  .sort((a, b) => b.date.localeCompare(a.date)) // 顯示：最新在上面
                                  .map((wp, i) => (
                                    <div key={i} className="flex justify-between items-center bg-[var(--bg-primary)] border border-[var(--border)] p-2 rounded text-xs font-mono group hover:bg-[var(--bg-secondary)] transition-colors">
                                      <div className="flex gap-4 items-center">
                                        <span className="opacity-50">{wp.date}</span>
                                        <span className="font-bold text-[var(--accent)]">${wp.price}</span>
                                      </div>
                                      <div className="flex items-center gap-3">
                                        <button
                                          className="text-[var(--accent)] hover:underline flex items-center gap-1 text-[10px]"
                                          onClick={() => {
                                            setFormData({ ...formData, date: wp.date, unitPrice: wp.price });
                                            // 尋找「每週收盤價登錄」這幾個字所在的區塊並捲動過去
                                            const entryHeader = Array.from(document.querySelectorAll('span')).find(el => el.textContent === '每週收盤價登錄');
                                            entryHeader?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                          }}
                                        >
                                          <Edit2 size={10} /> 編輯
                                        </button>
                                        <button
                                          className="text-[var(--danger)] hover:underline flex items-center gap-1 text-[10px]"
                                          onClick={() => {
                                            if (window.confirm('確定要刪除這筆收盤價紀錄嗎？')) {
                                              setWeeklyPrices(weeklyPrices.filter(item => !(item.date === wp.date && item.ticker === wp.ticker)));
                                            }
                                          }}
                                        >
                                          <Trash2 size={10} /> 刪除
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })()
                  ) : (
                    <div className="elegant-card p-16 text-center text-[var(--text-dim)] italic border-dashed border-[var(--border)] bg-[var(--bg-secondary)]">
                      尚未登錄任何交易明細，請於上方輸入第一筆資料。
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeView === 'B' && (
            <PortfolioView
              stats={stats}
              chartData={chartData}
              appData={appData}
              marketData={marketData}
              setSelectedTicker={setSelectedTicker}
              setActiveView={setActiveView}
            />
          )}

          {activeView === 'C' && (
            <RealizedView realizedList={appData.realizedList} />
          )}
        </main>
      </div>
    </div>
  );
}
