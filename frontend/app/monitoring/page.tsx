"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { transactionAPI } from "@/lib/api";
import type { TransactionDetail } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Search } from "lucide-react";

export default function TransactionMonitoring() {
  const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<
    TransactionDetail[]
  >([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [decisionFilter, setDecisionFilter] = useState("ALL");
  const [riskFilter, setRiskFilter] = useState("ALL");

  useEffect(() => {
    const loadTransactions = async () => {
      try {
        setLoading(true);
        const data = await transactionAPI.getTransactions();
        setTransactions(data);
        setFilteredTransactions(data);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load transactions"
        );
      } finally {
        setLoading(false);
      }
    };

    loadTransactions();
  }, []);

  useEffect(() => {
    let filtered = transactions;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (txn) =>
          txn.transaction_id
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          txn.user_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Decision filter
    if (decisionFilter !== "ALL") {
      filtered = filtered.filter((txn) => txn.decision === decisionFilter);
    }

    // Risk filter
    if (riskFilter !== "ALL") {
      filtered = filtered.filter((txn) => {
        const score = txn.composite_score;
        if (riskFilter === "LOW") return score <= 40;
        if (riskFilter === "MEDIUM") return score > 40 && score <= 70;
        if (riskFilter === "HIGH") return score > 70;
        return true;
      });
    }

    setFilteredTransactions(filtered);
  }, [searchTerm, decisionFilter, riskFilter, transactions]);

  if (error) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-accent-block mb-2">
            Failed to Load Transactions
          </h2>
          <p className="text-text-tertiary">{error}</p>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Transaction Monitoring
          </h1>
          <p className="text-text-tertiary">
            Monitor and analyze all transactions in real-time
          </p>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              placeholder="Search by Transaction ID or User"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
            <Select
              options={[
                { value: "ALL", label: "All Decisions" },
                { value: "APPROVE", label: "Approved" },
                { value: "VERIFY", label: "Requires Verification" },
                { value: "BLOCK", label: "Blocked" },
              ]}
              value={decisionFilter}
              onChange={(e) => setDecisionFilter(e.target.value)}
            />
            <Select
              options={[
                { value: "ALL", label: "All Risk Levels" },
                { value: "LOW", label: "Low Risk (0-40)" },
                { value: "MEDIUM", label: "Medium Risk (41-70)" },
                { value: "HIGH", label: "High Risk (71-100)" },
              ]}
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
            />
          </div>
        </Card>

        {/* Results */}
        {loading ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-text-tertiary">Loading transactions...</p>
            </div>
          </Card>
        ) : filteredTransactions.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-text-tertiary">No transactions found</p>
            </div>
          </Card>
        ) : (
          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Transaction ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Timestamp
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Risk Score
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Salami Risk
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Decision
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map((txn) => (
                    <tr
                      key={txn.transaction_id}
                      className="border-b border-border-default hover:bg-background-tertiary transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-text-primary font-mono">
                        {txn.transaction_id.slice(0, 12)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {txn.user_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-tertiary">
                        {formatDateTime(txn.timestamp)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary font-semibold">
                        {formatCurrency(txn.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary">
                        {txn.composite_score}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        {txn.salami_risk_level ? (
                          <Badge
                            variant={
                              txn.salami_risk_level === "LOW"
                                ? "approve"
                                : txn.salami_risk_level === "MEDIUM"
                                  ? "verify"
                                  : txn.salami_risk_level === "HIGH"
                                    ? "block"
                                    : "block"
                            }
                            size="sm"
                          >
                            {txn.salami_risk_level}
                          </Badge>
                        ) : (
                          <span className="text-text-tertiary">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge
                          variant={
                            txn.decision === "APPROVE"
                              ? "approve"
                              : txn.decision === "VERIFY"
                                ? "verify"
                                : "block"
                          }
                          size="sm"
                        >
                          {txn.decision}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/details/${txn.transaction_id}`}
                        >
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Summary */}
            <div className="mt-4 pt-4 border-t border-border-default flex justify-between text-sm text-text-tertiary">
              <span>Showing {filteredTransactions.length} of {transactions.length} transactions</span>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
