"use client";

import React, { useEffect, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Metric } from "@/components/ui/Metric";
import { Badge } from "@/components/ui/Badge";
import { transactionAPI } from "@/lib/api";
import type { DashboardSummary, TransactionDetail } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [transactions, setTransactions] = useState<TransactionDetail[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        const [summaryData, transactionsData] = await Promise.all([
          transactionAPI.getDashboardSummary(),
          transactionAPI.getTransactions(),
        ]);
        setSummary(summaryData);
        setTransactions(transactionsData);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load dashboard data"
        );
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (error) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-accent-block mb-2">
            Failed to Load Dashboard
          </h2>
          <p className="text-text-tertiary">{error}</p>
          <p className="text-xs text-text-tertiary mt-4">
            Make sure the backend API is running on {process.env.NEXT_PUBLIC_API_URL}
          </p>
        </div>
      </AppLayout>
    );
  }

  if (loading) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <div className="text-4xl mb-4 animate-pulse">⏳</div>
          <p className="text-text-tertiary">Loading dashboard...</p>
        </div>
      </AppLayout>
    );
  }

  if (!summary) {
    return (
      <AppLayout>
        <div className="text-center py-12">
          <p className="text-text-tertiary">No data available</p>
        </div>
      </AppLayout>
    );
  }

  const riskData = [
    { name: "Low Risk", value: summary.total_transactions * 0.4 },
    { name: "Medium Risk", value: summary.total_transactions * 0.35 },
    { name: "High Risk", value: summary.high_risk_transactions },
  ];

  const decisionData = [
    { name: "Approved", value: summary.approved_transactions },
    { name: "Verified", value: summary.verified_transactions },
    { name: "Blocked", value: summary.blocked_transactions },
  ];

  const COLORS = {
    approved: "#36d17c",
    verified: "#e8b84b",
    blocked: "#ff6262",
    low: "#36d17c",
    medium: "#e8b84b",
    high: "#ff6262",
  };

  return (
    <AppLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Dashboard
          </h1>
          <p className="text-text-tertiary">
            Real-time transaction and fraud monitoring overview
          </p>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Metric
            label="Total Transactions"
            value={summary.total_transactions}
            icon="📊"
          />
          <Metric
            label="Approved"
            value={summary.approved_transactions}
            suffix="✓"
            icon="✅"
          />
          <Metric
            label="Verified"
            value={summary.verified_transactions}
            suffix="?"
            icon="🔍"
          />
          <Metric
            label="Blocked"
            value={summary.blocked_transactions}
            suffix="✕"
            icon="🚫"
          />
        </div>

        {/* Secondary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <Metric
            label="Amount Protected"
            value={formatCurrency(summary.amount_protected)}
            icon="💰"
          />
          <Metric
            label="Salami Alerts"
            value={summary.salami_attack_alerts}
            icon="🚨"
          />
          <Metric
            label="High Risk"
            value={summary.high_risk_transactions}
            icon="⚠️"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Risk Distribution */}
          <Card>
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              📈 Risk Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={riskData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={2}
                  dataKey="value"
                >
                  <Cell fill={COLORS.low} />
                  <Cell fill={COLORS.medium} />
                  <Cell fill={COLORS.high} />
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#202832",
                    border: "1px solid #2d333b",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#ffffff" }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </Card>

          {/* Decision Distribution */}
          <Card>
            <h2 className="text-lg font-semibold text-text-primary mb-4">
              🎯 Decision Distribution
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart
                data={decisionData}
                margin={{ top: 20, right: 30, left: 0, bottom: 20 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#2d333b"
                  vertical={false}
                />
                <XAxis dataKey="name" stroke="#9ba7b5" />
                <YAxis stroke="#9ba7b5" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#202832",
                    border: "1px solid #2d333b",
                    borderRadius: "8px",
                  }}
                  labelStyle={{ color: "#ffffff" }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  <Cell fill={COLORS.approved} />
                  <Cell fill={COLORS.verified} />
                  <Cell fill={COLORS.blocked} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Recent Transactions */}
        <Card>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            📋 Recent Transactions
          </h2>

          {transactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-text-tertiary">No transactions available</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border-default">
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      ID
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      User
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Risk Score
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Decision
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Time
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.slice(0, 10).map((txn) => (
                    <tr
                      key={txn.transaction_id}
                      className="border-b border-border-default hover:bg-background-tertiary transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-text-primary font-mono">
                        {txn.transaction_id.slice(0, 8)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {txn.user_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary font-medium">
                        {formatCurrency(txn.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary">
                        {txn.composite_score}
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
                      <td className="px-4 py-3 text-sm text-text-tertiary">
                        {formatDateTime(txn.timestamp)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
