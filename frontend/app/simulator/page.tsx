"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { transactionAPI } from "@/lib/api";
import type { Transaction } from "@/lib/types";

export default function TransactionSimulator() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    user_id: "",
    sender_id: "",
    receiver_id: "",
    receiver_type: "individual" as "individual" | "business" | "unknown",
    amount: "",
    currency: "INR",
    device_type: "mobile" as "mobile" | "web" | "atm" | "unknown",
    location: "",
  });

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const validateForm = (): boolean => {
    if (!formData.user_id.trim()) {
      setError("Please enter your user ID");
      return false;
    }
    if (!formData.receiver_id.trim()) {
      setError("Please enter the receiver ID");
      return false;
    }
    if (!formData.amount || Number(formData.amount) <= 0) {
      setError("Please enter a valid amount");
      return false;
    }
    if (!formData.sender_id.trim()) {
      setError("Please enter your sender ID");
      return false;
    }
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    try {
      setLoading(true);

      const transaction: Transaction = {
        transaction_id: `TXN-${Date.now()}`,
        user_id: formData.user_id,
        sender_id: formData.sender_id,
        receiver_id: formData.receiver_id,
        receiver_type: formData.receiver_type,
        amount: Number(formData.amount),
        currency: formData.currency,
        timestamp: new Date().toISOString(),
        device_type: formData.device_type,
        location: formData.location || "Unknown",
      };

      // Evaluate transaction
      const result = await transactionAPI.evaluateTransaction(transaction);

      // Redirect to processing page with transaction ID
      router.push(
        `/processing?transactionId=${result.transaction_id}&decision=${result.decision}`
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to initiate transaction. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <AppLayout>
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-text-primary mb-2">
            Transaction Simulator
          </h1>
          <p className="text-text-tertiary">
            Enter transaction details to initiate analysis
          </p>
        </div>

        {/* Form Card */}
        <Card>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User & Sender Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Your User ID"
                name="user_id"
                placeholder="e.g., USER-12345"
                value={formData.user_id}
                onChange={handleInputChange}
                required
              />
              <Input
                label="Sender ID"
                name="sender_id"
                placeholder="e.g., SENDER-67890"
                value={formData.sender_id}
                onChange={handleInputChange}
                required
              />
            </div>

            {/* Receiver Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Receiver ID"
                name="receiver_id"
                placeholder="e.g., RECV-11111"
                value={formData.receiver_id}
                onChange={handleInputChange}
                required
              />
              <Select
                label="Receiver Type"
                name="receiver_type"
                value={formData.receiver_type}
                onChange={handleInputChange}
                options={[
                  { value: "individual", label: "Individual" },
                  { value: "business", label: "Business" },
                  { value: "unknown", label: "Unknown" },
                ]}
              />
            </div>

            {/* Transaction Amount */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Amount"
                name="amount"
                type="number"
                placeholder="e.g., 5000"
                value={formData.amount}
                onChange={handleInputChange}
                required
              />
              <Select
                label="Currency"
                name="currency"
                value={formData.currency}
                onChange={handleInputChange}
                options={[
                  { value: "INR", label: "Indian Rupee (INR)" },
                  { value: "USD", label: "US Dollar (USD)" },
                  { value: "EUR", label: "Euro (EUR)" },
                ]}
              />
            </div>

            {/* Device & Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Device Type"
                name="device_type"
                value={formData.device_type}
                onChange={handleInputChange}
                options={[
                  { value: "mobile", label: "Mobile App" },
                  { value: "web", label: "Web Browser" },
                  { value: "atm", label: "ATM" },
                  { value: "unknown", label: "Unknown" },
                ]}
              />
              <Input
                label="Location (Optional)"
                name="location"
                placeholder="e.g., Mumbai, India"
                value={formData.location}
                onChange={handleInputChange}
              />
            </div>

            {/* Error Message */}
            {error && (
              <div className="p-4 bg-accent-block bg-opacity-15 border border-accent-block border-opacity-30 rounded-lg text-accent-block text-sm">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="inline-block animate-spin mr-2">⏳</span>
                  Processing...
                </>
              ) : (
                <>🎯 Initiate Transaction</>
              )}
            </Button>
          </form>
        </Card>

        {/* Info Card */}
        <Card>
          <div className="space-y-3">
            <h3 className="font-semibold text-text-primary">ℹ️ How it works:</h3>
            <ul className="space-y-2 text-sm text-text-secondary">
              <li>• Enter your user ID and transaction details</li>
              <li>• SentinelAI will analyze the transaction in real-time</li>
              <li>• View detailed risk breakdown and decision reasoning</li>
              <li>
                • Check for Salami Attack indicators and suspicious patterns
              </li>
            </ul>
          </div>
        </Card>
      </div>
    </AppLayout>
  );
}
