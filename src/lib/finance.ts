import type { Budget, Transaction } from "@/lib/types";

export interface CashflowSummary {
  income: number;
  expense: number;
  net: number;
}

export function summarizeTransactions(transactions: Transaction[]): CashflowSummary {
  const income = transactions
    .filter((transaction) => transaction.type === "income")
    .reduce((total, transaction) => total + transaction.amount, 0);
  const expense = transactions
    .filter((transaction) => transaction.type === "expense")
    .reduce((total, transaction) => total + transaction.amount, 0);

  return { income, expense, net: income - expense };
}

export function summarizeBudgets(transactions: Transaction[], budgets: Budget[]) {
  return budgets.map((budget) => ({
    ...budget,
    spent: transactions
      .filter((transaction) => transaction.type === "expense" && transaction.category === budget.category)
      .reduce((total, transaction) => total + transaction.amount, 0),
  }));
}
