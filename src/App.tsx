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
  Edit2
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
const DEFAULT_CONFIGS: Record<TransactionCategory, Config> = {
  General: {
    category: 'General',
    buyFeeRate: 0.001425,
    sellFeeRate: 0.001425,
    taxRate: 0.003,
    minFee: 20,
    discount: 0.6
  },
  ETF: {
    category: 'ETF',
    buyFeeRate: 0.001425,
    sellFeeRate: 0.001425,
    taxRate: 0.001,
    minFee: 20,
    discount: 0.6
  },
  DayTrade: {
    category: 'DayTrade',
    buyFeeRate: 0.001425,
    sellFeeRate: 0.001425,
    taxRate: 0.0015,
    minFee: 20,
    discount: 0.6
  },
  Custom: {
    category: 'Custom',
    buyFeeRate: 0,
    sellFeeRate: 0,
    taxRate: 0,
    minFee: 0,
    discount: 1
  }
};

// Initial Mock Data to showcase the UI
const INITIAL_TRANSACTIONS: Transaction[] = [
  {
    id: '1',
    date: '2024-03-01',
    ticker: '2330',
    name: '台積電',
    direction: 'BUY',
    quantity: 1000,
    unitPrice: 600,
    category: 'General',
    fee: 513,
    tax: 0,
    totalAmount: 600513
  },
  {
    id: '2',
    date: '2024-03-15',
    ticker: '0050',
    name: '元大台灣50',
    direction: 'BUY',
    quantity: 2000,
    unitPrice: 150,
    category: 'ETF',
    fee: 256,
    tax: 0,
    totalAmount: 300256
  }
];

const StockChartWidget = ({ ticker, transactions, weeklyPrices }: { ticker: string, transactions: Transaction[], weeklyPrices: WeeklyPrice[] }) => {
  const [chartData, setChartData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchChartData = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/chart/${ticker}`);
        const data = await res.json();
        if (active) {
          setChartData(data);
          setLoading(false);
        }
      } catch (err) {
        if (active) setLoading(false);
      }
    };
    fetchChartData();
    return () => { active = false; };
  }, [ticker]);

  const combinedData = useMemo(() => {
    const dataToUse = weeklyPrices.length > 0 ? weeklyPrices.map(wp => ({
      date: wp.date,
      timestamp: new Date(wp.date).getTime(),
      price: wp.price
    })) : chartData;

    if (!dataToUse.length) return [];
    
    // Sort transactions oldest to newest
    const sortedTxs = [...transactions].sort((a,b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (sortedTxs.length === 0) return dataToUse;

    let currentShares = 0;
    let totalInvested = 0;
    let txIndex = 0;
    
    // Map API chart data to add daily position holding values
    const dataWithHoldings = dataToUse.map(point => {
      const pd = new Date(point.timestamp);
      // Format to YYYY-MM-DD
      const pointDateStr = `${pd.getFullYear()}-${String(pd.getMonth()+1).padStart(2, '0')}-${String(pd.getDate()).padStart(2, '0')}`;
      
      let hasTxToday = false;
      
      // Apply all transactions that happened on or before this day
      while (txIndex < sortedTxs.length && sortedTxs[txIndex].date <= pointDateStr) {
        const tx = sortedTxs[txIndex];
        if (tx.direction === 'BUY') {
          currentShares += tx.quantity;
          totalInvested += tx.totalAmount;
        } else if (tx.direction === 'SELL') {
          const avgCost = currentShares > 0 ? totalInvested / currentShares : 0;
          currentShares -= tx.quantity;
          totalInvested -= (avgCost * tx.quantity);
        }
        if (tx.date === pointDateStr) hasTxToday = true;
        txIndex++;
      }
      
      // Prevent negative invested space from zeroing out if there is weird data
      if (totalInvested < 0) totalInvested = 0;

      return {
        ...point,
        shares: currentShares,
        positionValue: currentShares > 0 ? Number((currentShares * point.price).toFixed(2)) : 0,
        totalCost: currentShares > 0 ? Number(totalInvested.toFixed(2)) : 0,
        isTxPoint: hasTxToday ? (currentShares > 0 ? Number((currentShares * point.price).toFixed(2)) : 0) : null
      };
    });

    // Optionally slice from the first transaction date so chart isn't empty on the left
    const firstTxDateStr = sortedTxs[0].date;
    const firstTxDateObj = new Date(firstTxDateStr);
    const startTimestamp = firstTxDateObj.getTime() - (7 * 24 * 60 * 60 * 1000); // 1 week before first tx
    return dataWithHoldings.filter(d => d.timestamp >= startTimestamp);

  }, [chartData, transactions]);

  const yahooSymbol = /^\d+$/.test(ticker) ? `${ticker}.TW` : ticker;
  const yahooUrl = `https://tw.stock.yahoo.com/quote/${yahooSymbol}/chart`;

  const validValues = combinedData.flatMap(d => [d.positionValue, d.totalCost]).filter(v => v !== null) as number[];
  const minVal = validValues.length > 0 ? Math.min(...validValues) : 0;
  const maxVal = validValues.length > 0 ? Math.max(...validValues) : 0;
  const buffer = (maxVal - minVal) * 0.1;

  return (
    <div className="h-full w-full flex flex-col bg-[#0A0A0A]">
      <div className="flex-1 min-h-0 relative p-4">
        {loading ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[var(--accent)] border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : combinedData.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-xs text-[var(--text-dim)]">
             等待資料中 (尚無持倉紀錄或無法讀取)
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={combinedData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis 
                dataKey="date" 
                stroke="rgba(255,255,255,0.3)" 
                fontSize={10} 
                tickMargin={10}
                minTickGap={30}
              />
              <YAxis 
                domain={[Math.max(0, minVal - buffer), maxVal + buffer]} 
                stroke="rgba(255,255,255,0.3)" 
                fontSize={10} 
                tickFormatter={(val) => `$${val.toFixed(0)}`}
                orientation="right"
                tickMargin={10}
              />
              <Tooltip 
                isAnimationActive={false}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-black/60 backdrop-blur-md border border-white/10 px-3 py-2 rounded-lg shadow-xl text-[10px] md:text-xs font-mono select-none pointer-events-none mb-10 translate-y-[-20px]">
                        <p className="text-[var(--text-dim)] font-bold mb-1.5 opacity-70 border-b border-white/10 pb-1">{label}</p>
                        {payload.map((entry, index) => {
                          if (entry.dataKey !== 'positionValue' && entry.dataKey !== 'totalCost') return null;
                          return (
                            <div key={index} className="flex items-center justify-between gap-6 py-0.5">
                              <div className="flex items-center gap-1.5">
                                 <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                 <span style={{ color: entry.color }} className="opacity-90 font-bold whitespace-nowrap">
                                   {entry.name === 'positionValue' ? '市值' : entry.name === 'totalCost' ? '成本' : entry.name}
                                 </span>
                              </div>
                              <span className="font-bold text-white whitespace-nowrap">${Number(entry.value).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                            </div>
                          );
                        })}
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 1, strokeDasharray: '3 3' }}
                position={{ y: 10 }}
              />
              <Legend wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} formatter={(value) => value === 'totalCost' ? '持有成本' : value === 'positionValue' ? '累積市值' : '交易打點'} />
              <Line 
                type="stepAfter" 
                dataKey="totalCost" 
                name="totalCost"
                stroke="var(--danger)" 
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line 
                type="monotone" 
                dataKey="positionValue" 
                name="positionValue"
                stroke="var(--accent)" 
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Scatter dataKey="isTxPoint" name="交易打點" fill="var(--success)" />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default function App() {
  const [activeView, setActiveView] = useState<'A' | 'B' | 'C'>('C');
  const [transactions, setTransactions] = useState<Transaction[]>(INITIAL_TRANSACTIONS);
  const [configs] = useState<Record<TransactionCategory, Config>>(DEFAULT_CONFIGS);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Defaulting to false for mobile friendliness
  const [marketData, setMarketData] = useState<{ updated: string | null; prices: Record<string, number> }>({ updated: null, prices: {} });
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null);
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [weeklyPrices, setWeeklyPrices] = useState<WeeklyPrice[]>([]);
  
  // 讀取 GitHub Pages 上的價格資料
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        // 使用相對路徑 fetch，這在同個網站下的 GitHub Pages 應該是最安全的方式
        // 加上時間戳記避免快取
        const response = await fetch(`./data/prices.json?t=${Date.now()}`);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        const data = await response.json();
        console.log('Got remote prices:', data);
        // 您可以在這裡將 data 更新到您的狀態中
      } catch (e) {
        console.error('Error fetching remote prices:', e);
      }
    };
    fetchPrices();
  }, []);
  
  // Fetch market prices from server
  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const res = await fetch('/api/prices');
        const data = await res.json();
        setMarketData(data);
      } catch (err) {
        console.error("Failed to fetch market prices:", err);
      }
    };
    fetchPrices();
  }, []);
  
  // Form State
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    ticker: '',
    name: '',
    direction: 'BUY' as TransactionDirection,
    quantity: 1000,
    unitPrice: 0,
    category: 'General' as TransactionCategory,
    customFee: 0,
    customTax: 0
  });

  // Derived Calculations
  const preview = useMemo(() => {
    const subtotal = formData.unitPrice * formData.quantity;
    const config = configs[formData.category];
    let fee = 0;
    let tax = 0;

    if (formData.direction === 'DIVIDEND') {
      const total = -subtotal;
      return { 
        fee: 0, 
        tax: 0, 
        total,
        feeLabel: '免手續費',
        feeFormula: '股息發放不扣券商手續費',
        taxLabel: '免徵交稅',
        taxFormula: '股息不屬於證券交易，故無交易稅'
      };
    }

    if (formData.category === 'Custom') {
      fee = formData.customFee;
      tax = formData.customTax;
    } else {
      const feeRate = formData.direction === 'BUY' ? config.buyFeeRate : config.sellFeeRate;
      fee = Math.max(config.minFee, Math.floor(subtotal * feeRate * config.discount));
      tax = formData.direction === 'SELL' ? Math.floor(subtotal * config.taxRate) : 0;
    }
    const total = formData.direction === 'BUY' ? subtotal + fee + tax : -(subtotal - fee - tax);
    
    // Formulas strings for display
    const feeFormula = `max(${config.minFee}, floor(${subtotal.toLocaleString()} × ${formData.direction === 'BUY' ? config.buyFeeRate : config.sellFeeRate} × ${config.discount}))`;
    const taxFormula = formData.direction === 'SELL' ? `floor(${subtotal.toLocaleString()} × ${config.taxRate})` : '免徵';
    
    // Plain language explanations
    const feeFormulaPlain = formData.direction === 'DIVIDEND' 
      ? '股息領取無需付給券商手續費' 
      : fee === config.minFee 
        ? `手續費不足 ${config.minFee} 元，以最低 ${config.minFee} 元計收。` 
        : `成交金額 $${subtotal.toLocaleString()} 乘以費率 ${configs[formData.category].buyFeeRate * 100}% 再打 ${configs[formData.category].discount * 10} 折。`;
    
    const taxFormulaPlain = formData.direction === 'SELL' 
      ? `賣出金額 $${subtotal.toLocaleString()} 乘以稅率 ${(config.taxRate * 100).toFixed(2)}%。` 
      : formData.direction === 'BUY' ? '只有在賣出股票時才需要繳納證交稅。' : '免徵稅';

    const feeLabel = `手續費 (${(config.discount * 10).toFixed(1)}折)`;
    const taxLabel = `證券交易稅 (${(config.taxRate * 100).toFixed(2)}%)`;

    return { fee, tax, total, feeFormula, taxFormula, feeLabel, taxLabel, feeFormulaPlain, taxFormulaPlain };
  }, [formData, configs]);

  // Aggregation Logic for Screen B (Unrealized) & Screen C (Realized)
  const appData = useMemo(() => {
    const holdings: Record<string, Holding> = {};
    const realizedList: RealizedProfit[] = [];
    const stockGroups: Record<string, Transaction[]> = {};
    
    // Sort transactions by date for correct sequential calculation
    const sortedTxs = [...transactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    sortedTxs.forEach(tx => {
      // For Screen A grouping
      if (!stockGroups[tx.ticker]) stockGroups[tx.ticker] = [];
      stockGroups[tx.ticker].push(tx);

      if (!holdings[tx.ticker]) {
        holdings[tx.ticker] = { ticker: tx.ticker, name: tx.name, currentShares: 0, avgCost: 0, totalInvested: 0 };
      }

      const h = holdings[tx.ticker];

      if (tx.direction === 'BUY') {
        // Reset floating point errors if starting fresh
        if (h.currentShares === 0) h.totalInvested = 0;
        
        const newTotalShares = h.currentShares + tx.quantity;
        const newTotalCost = h.totalInvested + Math.abs(tx.totalAmount);
        h.avgCost = newTotalShares > 0 ? newTotalCost / newTotalShares : 0;
        h.currentShares = newTotalShares;
        h.totalInvested = newTotalCost;
      } else if (tx.direction === 'SELL') {
        // SELL Logic
        const sellQty = Math.min(tx.quantity, h.currentShares);
        if (sellQty <= 0) return; // Ignore sell if no shares

        const costBasis = h.avgCost * sellQty;
        const sellRevenue = Math.abs(tx.totalAmount); 
        
        const profit = sellRevenue - costBasis;
        // Net price = net total / quantity
        const netPrice = sellRevenue / sellQty;

        realizedList.push({
          ticker: tx.ticker,
          name: tx.name,
          shares: sellQty,
          buyPrice: h.avgCost,
          sellPrice: netPrice,
          profit: profit,
          roi: costBasis > 0 ? (profit / costBasis) * 100 : 0,
          daysHeld: 0,
          closeDate: tx.date
        });

        h.currentShares -= sellQty;
        h.totalInvested -= costBasis;
        
        // Clean up small floating point remainders
        if (h.currentShares <= 0) {
          h.currentShares = 0;
          h.totalInvested = 0;
          h.avgCost = 0;
        }
      } else if (tx.direction === 'DIVIDEND') {
        // Dividend reduces cost basis
        h.totalInvested -= Math.abs(tx.totalAmount);
        h.avgCost = h.currentShares > 0 ? h.totalInvested / h.currentShares : 0;
      }
    });

    const activeHoldings = Object.values(holdings).filter(h => h.currentShares > 0);
    
    return { activeHoldings, realizedList, stockGroups, holdingsMap: holdings };
  }, [transactions]);

  const stats = useMemo(() => {
    let totalMarketValue = 0;
    let totalInvested = 0;
    appData.activeHoldings.forEach(h => {
      const price = marketData.prices[h.ticker] || h.avgCost;
      totalMarketValue += price * h.currentShares;
      totalInvested += h.totalInvested;
    });
    const unrealizedPL = totalMarketValue - totalInvested;
    const roi = totalInvested > 0 ? (unrealizedPL / totalInvested) * 100 : 0;
    return { totalMarketValue, totalInvested, unrealizedPL, roi };
  }, [appData.activeHoldings, marketData.prices]);

  // Dynamic Chart Data for Dashboard (Mock historical trend based on current stats)
  const chartData = useMemo(() => {
    const currentVal = stats.totalMarketValue || 1000000;
    const currentCost = stats.totalInvested || 900000;
    const currentProfit = stats.unrealizedPL || 100000;

    const data = [];
    for (let i = 5; i >= 1; i--) {
      const factor = 1 - (i * 0.02) + (Math.random() * 0.04 - 0.02);
      const costFactor = 1 - (i * 0.01);
      data.push({
        name: `WK ${17 - i}`,
        value: Math.floor(currentVal * factor),
        cost: Math.floor(currentCost * costFactor),
        profit: Math.floor(currentVal * factor) - Math.floor(currentCost * costFactor)
      });
    }
    data.push({
      name: 'WK 17',
      value: currentVal,
      cost: currentCost,
      profit: currentProfit
    });
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
    const mainEl = document.querySelector('main');
    if (mainEl) {
      mainEl.scrollTo({ top: 0, behavior: 'smooth' });
    }
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
          <div className="p-1.5 bg-[var(--bg-primary)] rounded-lg border border-[var(--accent)] shadow-[0_0_15px_rgba(0,242,255,0.2)] hidden sm:flex">
            <TrendingUp className="text-[var(--accent)]" size={20} />
          </div>
          <h1 className="text-sm md:text-lg font-black tracking-tighter text-[var(--accent)] flex items-center gap-2">
            STOCK BOOM 333 <span className="w-1 h-1 rounded-full bg-[var(--accent)] hidden xs:inline-block"/> <span className="text-[var(--text-main)] font-bold text-xs md:text-base uppercase tracking-widest hidden xs:inline-block">投資管理系統</span>
          </h1>
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
          "bg-[var(--bg-secondary)] border-r border-[var(--border)] p-6 flex flex-col gap-8 transition-all duration-300 z-30 fixed lg:relative h-full",
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
                { id: 'B', label: '庫存儀表板', icon: LayoutDashboard, desc: 'Portfolio' },
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
            <div className="elegant-card p-4 bg-[#0a0a0c]">
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

        <main className="flex-1 overflow-y-auto p-4 md:p-8 bg-[var(--bg-primary)]">
        {activeView === 'A' && (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6">
            <div>
              <h2 className="text-xl font-black mb-4 flex items-center gap-3 text-white transition-all">
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
                      onChange={(e) => setFormData({...formData, ticker: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="elegant-label text-xs">股票名稱</label>
                    <input 
                      type="text" 
                      className="elegant-input text-lg" 
                      placeholder="e.g. 台積電"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
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
                      onChange={(e) => setFormData({...formData, date: e.target.value})}
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
                          onClick={() => setFormData({...formData, direction: dir})}
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
                      onChange={(e) => setFormData({...formData, unitPrice: Number(e.target.value)})}
                    />
                  </div>
                  <div>
                    <label className="elegant-label">股數</label>
                    <input 
                      type="number" 
                      className="elegant-input h-[46px]"
                      value={formData.quantity || ''}
                      onChange={(e) => setFormData({...formData, quantity: Number(e.target.value)})}
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
                        <span className="text-2xl font-mono text-white font-black">${preview.fee.toLocaleString()}</span>
                      </div>

                      <div className="flex flex-col text-right lg:text-left">
                        <span className="text-[10px] text-[var(--text-dim)] uppercase tracking-tighter mb-1 font-bold">{preview.taxLabel}</span>
                        <span className="text-2xl font-mono text-white font-black">${preview.tax.toLocaleString()}</span>
                      </div>

                      <div className="flex flex-col">
                        <span className="text-[10px] text-[var(--accent)] uppercase tracking-tighter mb-1 font-bold">淨交割 (Net Total)</span>
                        <span className="text-2xl md:text-3xl font-mono text-[var(--accent)] font-black tracking-tighter">${Math.abs(preview.total).toLocaleString()}</span>
                      </div>

                        <div className="flex gap-2">
                          {editingTxId && (
                            <button 
                              onClick={() => {
                                setEditingTxId(null);
                                setFormData(prev => ({ ...prev, ticker: '', name: '', unitPrice: 0, quantity: 1000 }));
                              }}
                              className="w-1/3 bg-white/10 text-white h-[48px] md:h-[56px] rounded-xl font-black text-sm md:text-base hover:bg-white/20 active:scale-[0.95] transition-all flex items-center justify-center gap-2"
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
                   <div className="p-2 bg-white/5 rounded-xl border border-white/10 text-[var(--accent)]">
                      <Briefcase size={18} />
                   </div>
                   <div>
                      <h4 className="text-lg font-black text-white leading-tight">投資組合明細</h4>
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
                            ? "bg-white text-black border-white shadow-[0_8px_20px_rgba(255,255,255,0.1)] active:scale-[0.98]"
                            : "bg-[var(--bg-secondary)] text-[var(--text-dim)] border-[var(--border)] hover:bg-white/5 hover:text-white"
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
                          <div className="elegant-card bg-[var(--bg-secondary)] overflow-hidden p-0 border-white/5 shadow-2xl space-y-px">
                             {/* Stock Header & Primary Stat */}
                             {/* Stock Header & Live Chart Area */}
                             <div className="flex flex-col bg-white/5 border-b border-white/5">
                                {/* Unified Header & Stats Block */}
                                <div className="p-4 md:p-8 bg-[var(--bg-secondary)] flex flex-col justify-center">
                                   <div className="flex flex-row items-end justify-between gap-2 md:gap-6 mb-4 md:mb-6">
                                      <div className="flex flex-col min-w-0 flex-shrink">
                                         <h5 className="text-xl md:text-3xl lg:text-4xl font-black text-white tracking-tighter mb-1 md:mb-2 truncate">{txs[0].name}</h5>
                                         <div className="flex items-center gap-1 md:gap-2">
                                           <span className="px-1.5 py-0.5 md:px-2 md:py-1 bg-white/10 text-[var(--accent)] rounded text-[9px] md:text-xs font-mono font-bold tracking-widest leading-none">{ticker}</span>
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
                                   <div className="grid grid-cols-5 gap-2 md:gap-4 pt-6 border-t border-white/5">
                                      <div>
                                         <span className="text-[9px] text-[var(--text-dim)] uppercase tracking-widest font-black opacity-60 block mb-1">持有股數</span>
                                         <p className="text-lg md:text-xl lg:text-2xl font-mono font-black text-white">{h.currentShares.toLocaleString()}</p>
                                      </div>
                                      <div>
                                         <span className="text-[9px] text-[var(--text-dim)] uppercase tracking-widest font-black opacity-60 block mb-1">目前市價</span>
                                         <p className="text-lg md:text-xl lg:text-2xl font-mono font-black text-white">${curPrice}</p>
                                      </div>
                                      <div>
                                         <span className="text-[9px] text-[var(--text-dim)] uppercase tracking-widest font-black opacity-60 block mb-1">平均成本</span>
                                         <p className="text-lg md:text-xl lg:text-2xl font-mono font-black text-white">${h.avgCost.toFixed(2)}</p>
                                      </div>
                                   </div>
                                </div>

                                {/* The Integrated Chart Area (Always bottom) */}
                                <div className="p-4 md:p-8 bg-black/20">
                                   <div className="h-[300px] md:h-[450px] rounded-xl overflow-hidden border border-white/5 relative group">
                                      <StockChartWidget ticker={ticker} transactions={txs} weeklyPrices={weeklyPrices.filter(wp => wp.ticker === ticker)} />
                                   </div>
                                </div>
                             </div>

                             {/* Weekly Price Input Section */}
                             <div className="bg-white/[0.02] p-6 border-b border-white/5 space-y-4">
                                <span className="text-[9px] font-black tracking-[0.2em] text-white/50 uppercase">每週收盤價登錄</span>
                                <div className="flex gap-4">
                                  <input 
                                    type="date" 
                                    className="elegant-input flex-1"
                                    value={formData.date} // reuse existing date state for now for simplicity, or add new
                                    onChange={(e) => setFormData({...formData, date: e.target.value})}
                                  />
                                  <input 
                                    type="number" 
                                    className="elegant-input flex-1"
                                    placeholder="Price"
                                    onChange={(e) => setFormData({...formData, unitPrice: Number(e.target.value)})}
                                  />
                                  <button 
                                    className="bg-[var(--accent)] text-[var(--bg-primary)] px-4 py-2 rounded-lg font-bold"
                                    onClick={() => {
                                      setWeeklyPrices([...weeklyPrices, { date: formData.date, ticker: ticker, price: formData.unitPrice }]);
                                    }}
                                  >新增</button>
                                </div>
                                <div className="space-y-2 mt-4 max-h-40 overflow-y-auto">
                                  {weeklyPrices.filter(wp => wp.ticker === ticker).map((wp, i) => (
                                    <div key={i} className="flex justify-between items-center bg-white/5 p-2 rounded text-xs font-mono">
                                      <span>{wp.date}</span>
                                      <span className="font-bold text-[var(--accent)]">${wp.price}</span>
                                      <button 
                                        className="text-[var(--danger)]"
                                        onClick={() => setWeeklyPrices(weeklyPrices.filter((_, idx) => idx !== i))}
                                      >刪除</button>
                                    </div>
                                  ))}
                                </div>
                             </div>

                             {/* History Ledger Section */}
                             <div className="flex flex-col">
                                <div className="px-6 py-3 flex items-center justify-between bg-white/[0.02]">
                                   <span className="text-[9px] font-black tracking-[0.2em] text-white/50 uppercase">歷史交易明細表</span>
                                   <span className="text-[9px] font-mono text-[var(--text-dim)] border border-white/10 px-2 py-0.5 rounded italic opacity-50">{txs.length} 筆資料</span>
                                </div>
                                <div className="max-h-[500px] overflow-y-auto divide-y divide-white/5 custom-scrollbar">
                                   {[...(txs as Transaction[])].sort((a,b) => b.date.localeCompare(a.date)).map(tx => (
                                      <div key={tx.id} className="px-6 py-3 flex items-center justify-between hover:bg-white/[0.01] transition-colors group">
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
                                                  <button 
                                                    onClick={() => handleEditTx(tx)} 
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center text-[var(--accent)] hover:underline"
                                                    title="編輯此筆交易"
                                                  >
                                                    <Edit2 size={9} className="mr-0.5" /> 編輯
                                                  </button>
                                               </p>
                                               <p className="text-[10px] md:text-xs text-white font-mono font-bold truncate leading-none mt-1">
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
                                              tx.direction === 'BUY' ? "text-white" : tx.direction === 'DIVIDEND' ? "text-orange-400" : "text-[var(--success)]"
                                            )}><span className="opacity-40 text-xs mr-0.5">$</span>{Math.abs(tx.totalAmount).toLocaleString()}</p>
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
                    <div className="elegant-card p-16 text-center text-[var(--text-dim)] italic border-dashed border-white/10 bg-[var(--bg-secondary)]/30">
                       尚未登錄任何交易明細，請於上方輸入第一筆資料。
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

        {activeView === 'B' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-500">
            <h2 className="text-2xl font-black flex items-center gap-3">
              <LayoutDashboard className="text-[var(--accent)]" /> 庫存儀表板
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
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
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
                          tickFormatter={(val) => `$${(val/10000).toFixed(0)}w`} 
                          tickMargin={10}
                        />
                        <YAxis 
                          yAxisId="right"
                          orientation="right"
                          stroke="var(--success)" 
                          fontSize={10} 
                          axisLine={false} 
                          tickLine={false} 
                          tickFormatter={(val) => `${(val/10000).toFixed(0)}w`} 
                          tickMargin={10}
                        />
                        <Tooltip 
                          content={({ active, payload, label }) => {
                            if (active && payload && payload.length) {
                              return (
                                <div className="bg-[#0f0f12]/95 border border-white/10 p-3 rounded-xl shadow-2xl backdrop-blur-md">
                                  <div className="text-[10px] text-[var(--text-dim)] font-black uppercase tracking-widest border-b border-white/5 pb-2 mb-2">{label}</div>
                                  <div className="space-y-1.5">
                                    {payload.map((entry: any, index: number) => (
                                      <div key={index} className="flex items-center justify-between gap-8">
                                        <div className="flex items-center gap-2">
                                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: entry.color }} />
                                          <span className="text-[11px] font-bold text-[var(--text-dim)]">{entry.name}</span>
                                        </div>
                                        <span className="text-xs font-mono font-black text-white">${Number(entry.value).toLocaleString()}</span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              );
                            }
                            return null;
                          }}
                          cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1 }}
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

              <div className="elegant-card flex flex-col">
                <h3 className="text-sm font-bold opacity-60 mb-6 flex items-center gap-2">
                   <Briefcase size={14} /> 目前持股細節
                </h3>
                <div className="space-y-4 flex-1 overflow-y-auto pr-2">
                   {appData.activeHoldings.map(h => (
                     <div key={h.ticker} className="bg-[var(--bg-tertiary)] p-4 rounded-xl border border-[var(--border)] group hover:border-[var(--accent)] transition-all">
                        <div className="flex justify-between items-start mb-2">
                           <div className="flex flex-col">
                             <span className="text-sm font-bold">{h.name}</span>
                             <span className="text-[10px] text-[var(--text-dim)] font-mono">{h.ticker}</span>
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-xs font-bold text-[var(--accent)]">{h.currentShares.toLocaleString()} 股</span>
                             <button 
                               onClick={() => {
                                 setActiveView('A');
                                 setSelectedTicker(h.ticker);
                               }}
                               className="p-1 hover:bg-white/5 rounded text-[var(--text-dim)] hover:text-[var(--accent)] transition-colors"
                               title="編輯交易"
                             >
                               <Edit2 size={12} />
                             </button>
                           </div>
                        </div>
                        <div className="grid grid-cols-2 gap-x-2 border-t border-[rgba(255,255,255,0.05)] pt-3 mt-3">
                           <div className="flex flex-col">
                             <span className="text-[9px] text-white/50 uppercase font-bold">平均成本</span>
                             <span className="text-xs font-mono text-white">${h.avgCost.toFixed(2)}</span>
                           </div>
                           <div className="flex flex-col items-end">
                             <span className="text-[9px] text-white/50 uppercase font-bold">市值</span>
                             <span className="text-xs font-mono text-white">${(marketData.prices[h.ticker || ''] * h.currentShares || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                           </div>
                           <div className="flex flex-col col-span-2 mt-2">
                             <span className="text-[9px] text-white/50 uppercase font-bold">帳面獲益</span>
                             <span className={cn(
                               "text-xs font-mono font-bold",
                               (marketData.prices[h.ticker || ''] * h.currentShares - h.totalInvested) >= 0 ? "text-[var(--success)]" : "text-[var(--danger)]"
                             )}>
                               ${(marketData.prices[h.ticker || ''] * h.currentShares - h.totalInvested).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                             </span>
                           </div>
                        </div>
                     </div>
                   ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeView === 'C' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
            <h2 className="text-2xl font-black flex items-center gap-3">
              <History className="text-[var(--accent)]" /> 已實現損益
            </h2>

            <div className="elegant-card overflow-hidden">
               <div className="bg-[rgba(255,255,255,0.02)] px-6 py-4 border-b border-[var(--border)] flex justify-between items-center">
                  <span className="text-xs font-bold uppercase tracking-widest text-[var(--text-dim)]">已結清倉位列表</span>
                  <div className="text-[10px] px-2 py-1 bg-[var(--bg-primary)] border border-[var(--border)] rounded text-[var(--success)] font-mono">
                    篩選：僅顯示已實現
                  </div>
               </div>
               <div className="overflow-x-auto">
                 <table className="w-full text-left">
                   <thead>
                     <tr className="text-[10px] text-white font-bold uppercase tracking-wider bg-white/[0.03]">
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
                      {appData.realizedList.map((r, i) => (
                        <tr key={i} className="hover:bg-[rgba(255,255,255,0.02)] transition-colors group">
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
                            {r.profit >= 0 ? '+' : ''}{Math.floor(r.profit).toLocaleString()}
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
                      {appData.realizedList.length === 0 && (
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
        )}
      </main>
    </div>
  </div>
);
}
