"use client";

import { useState } from "react";
import { truncateAddress } from "@/lib/wallet";

interface WalletCardProps {
  address: string;
  balance: string;
  role: "owner" | "guardian";
  loading?: boolean;
}

export default function WalletCard({ address, balance, role, loading }: WalletCardProps) {
  const [copied, setCopied] = useState(false);

  const copyAddress = async () => {
    await navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="card wallet-card fade-in" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <span className={`badge ${role === "owner" ? "badge-accent" : "badge-warning"}`}>
          {role === "owner" ? "👤 Owner" : "🛡️ Guardian"}
        </span>
        <button
          onClick={copyAddress}
          className="btn-icon"
          style={{
            background: copied ? "var(--bg-accent-subtle)" : "var(--bg-tertiary)",
            color: copied ? "var(--text-accent)" : "var(--text-secondary)",
            fontSize: 14,
            border: "none",
          }}
          title="Copy address"
        >
          {copied ? "✓" : "📋"}
        </button>
      </div>

      <div style={{ marginBottom: 4 }}>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
          Address
        </span>
        <p style={{ fontSize: 14, fontWeight: 500, fontFamily: "monospace", color: "var(--text-secondary)", marginTop: 2 }}>
          {truncateAddress(address)}
        </p>
      </div>

      <div>
        <span style={{ fontSize: 12, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
          Balance
        </span>
        {loading ? (
          <div className="skeleton" style={{ height: 28, width: 120, marginTop: 4 }} />
        ) : (
          <p style={{ fontSize: 24, fontWeight: 700, color: "var(--text-primary)", marginTop: 2 }}>
            {parseFloat(balance).toFixed(4)} <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>ETH</span>
          </p>
        )}
      </div>
    </div>
  );
}
