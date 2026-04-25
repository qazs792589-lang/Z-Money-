export type TransactionCategory = 'General' | 'ETF' | 'DayTrade' | 'Custom';
export type TransactionDirection = 'BUY' | 'SELL' | 'DIVIDEND';

export interface Transaction {
  id: string;
  date: string;
  ticker: string;
  name: string;
  direction: TransactionDirection;
  quantity: number;
  unitPrice: number; // For DIVIDEND, this is dividend per share
  category: TransactionCategory;
  fee: number;
  tax: number;
  totalAmount: number; // For BUY: positive cost, for SELL: negative (cash in), for DIVIDEND: negative (cash in)
}

export interface Config {
  category: TransactionCategory;
  buyFeeRate: number;
  sellFeeRate: number;
  taxRate: number;
  minFee: number;
  discount: number;
}

export interface Holding {
  ticker: string;
  name: string;
  currentShares: number;
  avgCost: number;
  totalInvested: number;
}

export interface RealizedProfit {
  ticker: string;
  name: string;
  shares: number;
  buyPrice: number;
  sellPrice: number;
  profit: number;
  roi: number;
  daysHeld: number;
  closeDate: string;
}

export interface WeeklyPrice {
  date: string;
  ticker: string;
  price: number;
}
