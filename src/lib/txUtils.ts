import { Transaction } from '../types';

/**
 * Determines if a transaction is effectively 'Realized' based on its direction
 * and any manual user overrides.
 * 
 * - BUY: Default Unrealized.
 * - SELL/DIVIDEND: Default Realized.
 * - isManualRealized: Explicit user override.
 */
export const isTxRealized = (tx: Transaction): boolean => {
  return tx.isManualRealized !== undefined 
    ? tx.isManualRealized 
    : (tx.direction !== 'BUY');
};
