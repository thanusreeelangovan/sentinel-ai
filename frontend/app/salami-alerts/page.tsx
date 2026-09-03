"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { transactionAPI } from "@/lib/api";
import type { SalamiAttackAlert } from "@/lib/types";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { Search, AlertTriangle } from "lucide-react";

export default function SalamiAttackAlerts() {
  const [alerts, setAlerts] = useState<SalamiAttackAlert[]>([]);
  const [filteredAlerts, setFilteredAlerts] = useState<SalamiAttackAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [riskFilter, setRiskFilter] = useState("ALL");

  useEffect(() => {
    const loadAlerts = async () => {
      try {
        setLoading(true);
        const data = await transactionAPI.getSalamiAttackAlerts();
        setAlerts(data);
        setFilteredAlerts(data);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "Failed to load alerts"
        );
      } finally {
        setLoading(false);
      }
    };

    loadAlerts();
  }, []);

  useEffect(() => {
    let filtered = alerts;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (alert) =>
          alert.transaction_id
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          alert.user_id.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Risk filter
    if (riskFilter !== "ALL") {
      filtered = filtered.filter(
        (alert) => alert.salami_risk_level === riskFilter
      );
    }

    setFilteredAlerts(filtered);
  }, [searchTerm, riskFilter, alerts]);

  const getRiskColor = (
    risk: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  ): "approve" | "verify" | "block" => {
    switch (risk) {
      case "LOW":
        return "approve";
      case "MEDIUM":
        return "verify";
      case "HIGH":
      case "CRITICAL":
        return "block";
      default:
        return "approve";
    }
  };

  const criticalCount = alerts.filter(
    (a) => a.salami_risk_level === "CRITICAL"
  ).length;
  const highCount = alerts.filter((a) => a.salami_risk_level === "HIGH").length;
  const mediumCount = alerts.filter(
    (a) => a.salami_risk_level === "MEDIUM"
  ).length;
  const lowCount = alerts.filter((a) => a.salami_risk_level === "LOW").length;

  return (
    <AppLayout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            🚨 Salami Attack Alerts
          </h1>
          <p className="text-text-tertiary">
            Real-time detection of suspicious micro-transactions and deductions
          </p>
        </div>

        {/* Alert Summary */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <div className="text-center py-4">
              <div className="text-3xl font-bold text-accent-block mb-2">
                {criticalCount}
              </div>
              <p className="text-sm text-text-tertiary">Critical Alerts</p>
            </div>
          </Card>
          <Card>
            <div className="text-center py-4">
              <div className="text-3xl font-bold text-accent-block mb-2">
                {highCount}
              </div>
              <p className="text-sm text-text-tertiary">High Risk</p>
            </div>
          </Card>
          <Card>
            <div className="text-center py-4">
              <div className="text-3xl font-bold text-accent-verify mb-2">
                {mediumCount}
              </div>
              <p className="text-sm text-text-tertiary">Medium Risk</p>
            </div>
          </Card>
          <Card>
            <div className="text-center py-4">
              <div className="text-3xl font-bold text-accent-approve mb-2">
                {lowCount}
              </div>
              <p className="text-sm text-text-tertiary">Low Risk</p>
            </div>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Search by Transaction ID or User"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              icon={<Search className="w-4 h-4" />}
            />
            <div>
              <select
                value={riskFilter}
                onChange={(e) => setRiskFilter(e.target.value)}
                className="w-full bg-background-tertiary border border-border-default rounded-md px-3 py-2 text-text-primary text-sm transition-colors cursor-pointer focus-visible:outline-none focus-visible:border-accent-blue focus-visible:ring-1 focus-visible:ring-accent-blue"
              >
                <option value="ALL">All Risk Levels</option>
                <option value="CRITICAL">🔴 Critical</option>
                <option value="HIGH">🟠 High</option>
                <option value="MEDIUM">🟡 Medium</option>
                <option value="LOW">🟢 Low</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Results */}
        {error ? (
          <Card>
            <div className="text-center py-12">
              <AlertTriangle className="w-12 h-12 text-accent-block mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-accent-block mb-2">
                Error Loading Alerts
              </h3>
              <p className="text-text-tertiary">{error}</p>
            </div>
          </Card>
        ) : loading ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-text-tertiary">Loading alerts...</p>
            </div>
          </Card>
        ) : filteredAlerts.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <div className="text-4xl mb-4">✅</div>
              <h3 className="text-lg font-semibold text-accent-approve mb-2">
                No Salami Attacks Detected
              </h3>
              <p className="text-text-tertiary">
                All transactions are clean and safe
              </p>
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
                      Amount
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Risk Score
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Salami Risk
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Indicators
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Decision
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Detected
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-semibold text-text-secondary">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAlerts.map((alert) => (
                    <tr
                      key={alert.transaction_id}
                      className="border-b border-border-default hover:bg-background-tertiary transition-colors"
                    >
                      <td className="px-4 py-3 text-sm text-text-primary font-mono">
                        {alert.transaction_id.slice(0, 12)}...
                      </td>
                      <td className="px-4 py-3 text-sm text-text-secondary">
                        {alert.user_id}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary font-semibold">
                        {formatCurrency(alert.amount)}
                      </td>
                      <td className="px-4 py-3 text-sm text-text-primary">
                        {alert.composite_score}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge
                          variant={getRiskColor(alert.salami_risk_level)}
                          size="sm"
                        >
                          {alert.salami_risk_level}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-tertiary">
                        {alert.indicators.length}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Badge
                          variant={
                            alert.decision === "APPROVE"
                              ? "approve"
                              : alert.decision === "VERIFY"
                                ? "verify"
                                : "block"
                          }
                          size="sm"
                        >
                          {alert.decision}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-text-tertiary">
                        {formatDateTime(alert.detected_at)}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <Link
                          href={`/details/${alert.transaction_id}`}
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
              <span>
                Showing {filteredAlerts.length} of {alerts.length} alerts
              </span>
            </div>
          </Card>
        )}
      </div>
    </AppLayout>
  );
}
