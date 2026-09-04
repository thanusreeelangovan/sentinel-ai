# SentinelAI

## Pre-Authorization AI-Powered Payment Fraud Detection

SentinelAI is an AI-powered payment fraud detection system designed to identify suspicious transactions **before authorization**. It combines transaction data, sender and receiver risk, behavioral signals, rules, and machine learning to make real-time payment decisions.

## Problem

Traditional fraud detection systems have several limitations:

- Fraud may be detected too late, after a transaction has already been authorized.
- Rule-based systems can miss behavioral anomalies.
- Sender-side analysis alone may overlook risks associated with the receiver.
- Complex fraud patterns require multiple risk signals to be analyzed together.

## Solution

SentinelAI addresses these challenges by:

- Analyzing transactions **before authorization**.
- Combining sender, receiver, transaction, behavioral, and ML signals.
- Generating a composite risk score for every transaction.
- Making real-time decisions:
  - **APPROVE** – Transaction is considered safe.
  - **VERIFY** – Additional verification is required.
  - **BLOCK** – Transaction is considered high risk.
- Maintaining an audit trail of transaction evaluations and decisions.

## Architecture

The SentinelAI system consists of the following components:

```text
Transaction Simulator
        ↓
      FastAPI
        ↓
   ML + Rules
        ↓
   Risk Engine
        ↓
 Decision Engine
        ↓
   PostgreSQL
        ↓
    Dashboard

## Current Status

- Phase 1 backend completed
- Decision Engine integrated
- Risk Engine integration in progress
- ML integration in progress
- Frontend integration in progress
