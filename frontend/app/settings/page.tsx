"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function Settings() {
  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Settings
          </h1>
          <p className="text-text-tertiary">
            Application information and configuration
          </p>
        </div>

        {/* Application Info */}
        <Card>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            ℹ️ Application Information
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-border-default pb-3">
              <span className="text-text-tertiary">Application</span>
              <span className="text-text-primary font-semibold">SentinelAI</span>
            </div>
            <div className="flex justify-between border-b border-border-default pb-3">
              <span className="text-text-tertiary">Version</span>
              <span className="text-text-primary font-semibold">1.0.0</span>
            </div>
            <div className="flex justify-between border-b border-border-default pb-3">
              <span className="text-text-tertiary">Frontend</span>
              <span className="text-text-primary font-semibold">Next.js 15</span>
            </div>
            <div className="flex justify-between border-b border-border-default pb-3">
              <span className="text-text-tertiary">Purpose</span>
              <span className="text-text-primary font-semibold">
                AI-Driven Transaction Anomaly & Fraud Detection
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-text-tertiary">Status</span>
              <Badge variant="approve" size="sm">
                ✓ Operational
              </Badge>
            </div>
          </div>
        </Card>

        {/* Risk Decision Thresholds */}
        <Card>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            🎯 Risk Decision Thresholds
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-default">
                  <th className="text-left py-2 px-2 text-text-secondary font-semibold">
                    Score Range
                  </th>
                  <th className="text-left py-2 px-2 text-text-secondary font-semibold">
                    Decision
                  </th>
                  <th className="text-left py-2 px-2 text-text-secondary font-semibold">
                    Risk Level
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border-default hover:bg-background-tertiary">
                  <td className="py-2 px-2 text-text-primary">0 – 40</td>
                  <td className="py-2 px-2">
                    <Badge variant="approve" size="sm">
                      APPROVE
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-text-tertiary">Low</td>
                </tr>
                <tr className="border-b border-border-default hover:bg-background-tertiary">
                  <td className="py-2 px-2 text-text-primary">41 – 70</td>
                  <td className="py-2 px-2">
                    <Badge variant="verify" size="sm">
                      VERIFY
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-text-tertiary">Medium</td>
                </tr>
                <tr className="hover:bg-background-tertiary">
                  <td className="py-2 px-2 text-text-primary">71 – 100</td>
                  <td className="py-2 px-2">
                    <Badge variant="block" size="sm">
                      BLOCK
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-text-tertiary">High</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>

        {/* Risk Scoring Model */}
        <Card>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            📊 Risk Scoring Model
          </h2>
          <div className="space-y-3 text-sm">
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-text-secondary">Anomaly Score</span>
                <span className="font-semibold text-text-primary">40%</span>
              </div>
              <div className="w-full h-2 bg-background-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-500 rounded-full"
                  style={{ width: "40%" }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-text-secondary">Velocity Score</span>
                <span className="font-semibold text-text-primary">25%</span>
              </div>
              <div className="w-full h-2 bg-background-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-yellow-500 rounded-full"
                  style={{ width: "25%" }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-text-secondary">Receiver Score</span>
                <span className="font-semibold text-text-primary">20%</span>
              </div>
              <div className="w-full h-2 bg-background-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-500 rounded-full"
                  style={{ width: "20%" }}
                />
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-1">
                <span className="text-text-secondary">Behavioral Score</span>
                <span className="font-semibold text-text-primary">15%</span>
              </div>
              <div className="w-full h-2 bg-background-tertiary rounded-full overflow-hidden">
                <div
                  className="h-full bg-pink-500 rounded-full"
                  style={{ width: "15%" }}
                />
              </div>
            </div>
          </div>
        </Card>

        {/* Features */}
        <Card>
          <h2 className="text-lg font-semibold text-text-primary mb-4">
            ✨ Features
          </h2>
          <ul className="space-y-2 text-sm text-text-secondary">
            <li className="flex items-center gap-2">
              <span className="text-accent-approve">✓</span> Real-time transaction
              analysis
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent-approve">✓</span> Salami Attack detection
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent-approve">✓</span> Behavioral anomaly
              detection
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent-approve">✓</span> Risk scoring engine
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent-approve">✓</span> Transaction monitoring
            </li>
            <li className="flex items-center gap-2">
              <span className="text-accent-approve">✓</span> Comprehensive audit logs
            </li>
          </ul>
        </Card>
      </div>
    </AppLayout>
  );
}
