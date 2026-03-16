"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadWallets } from "@/lib/wallet";

export default function ReceivePage() {
  const [smartWalletAddress, setSmartWalletAddress] = useState("");
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const wallets = loadWallets();
    if (wallets && wallets.deployedWalletAddress) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSmartWalletAddress(wallets.deployedWalletAddress);
    }
  }, []);

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="page-wrapper" style={{ background: "var(--bg-primary)", paddingBottom: 80 }}>
      <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
        {/* Header */}
        <div className="page-header">
          <Link href="/dashboard" className="back-btn">←</Link>
          <h1>Receive ETH</h1>
        </div>

        <div className="fade-in">
          {!smartWalletAddress ? (
            <div className="alert alert-warning">
              <span>⚠️</span>
              <span>Smart Wallet belum dibuat. Silakan kembali ke dashboard atau deploy terlebih dahulu.</span>
            </div>
          ) : (
            <>
              {/* Address Display */}
              <div className="card card-elevated" style={{ textAlign: "center", padding: "28px 20px", marginBottom: 20 }}>
                <div style={{
                  width: 60, height: 60, borderRadius: "50%",
                  background: "var(--bg-accent-subtle)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 28, margin: "0 auto 16px"
                }}>
                  📥
                </div>

                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 8 }}>
                  Kirim ETH ke alamat Smart Wallet ini
                </p>

                <div style={{
                  background: "var(--bg-secondary)",
                  borderRadius: "var(--radius-md)",
                  padding: "14px",
                  fontFamily: "monospace",
                  fontSize: 12,
                  wordBreak: "break-all",
                  color: "var(--text-primary)",
                  lineHeight: 1.8,
                  marginBottom: 16
                }}>
                  {smartWalletAddress}
                </div>

                <button
                  className="btn btn-primary"
                  onClick={() => copyToClipboard(smartWalletAddress, "address")}
                  style={{ maxWidth: 240, margin: "0 auto" }}
                >
                  {copiedField === "address" ? "✓ Copied!" : "📋 Copy Address"}
                </button>
              </div>

              {/* Info */}
              <div className="alert alert-info">
                <span>ℹ️</span>
                <span>
                  Ini adalah alamat <strong>Smart Contract Wallet</strong> utama Anda di jaringan <strong>Ethereum (Sepolia)</strong>. Semua transfer masuk akan disimpan di sini.
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
