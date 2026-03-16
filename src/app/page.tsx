"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { loadWallets } from "@/lib/wallet";

export default function LandingPage() {
  const [hasWallet, setHasWallet] = useState(false);

  useEffect(() => {
    const wallets = loadWallets();
    if (wallets && (wallets.owner.address || wallets.guardian.address)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasWallet(true);
    } else {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setHasWallet(false);
    }
  }, []);

  return (
    <div className="page-wrapper" style={{ background: "var(--bg-primary)" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", alignItems: "center", padding: "40px 24px", textAlign: "center" }}>
        <div className="fade-in" style={{
          width: 80, height: 80, borderRadius: "var(--radius-xl)",
          background: "linear-gradient(135deg, var(--bg-accent), var(--bg-accent-light))",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 36, marginBottom: 32,
          boxShadow: "var(--shadow-accent)"
        }}>
          💎
        </div>

        <h1 className="fade-in" style={{
          fontSize: 32, fontWeight: 800, lineHeight: 1.2,
          marginBottom: 12, animationDelay: "0.1s"
        }}>
          Smart<span style={{ color: "var(--text-accent)" }}>Wallet</span>
        </h1>

        <p className="fade-in" style={{
          fontSize: 15, color: "var(--text-secondary)", maxWidth: 320,
          marginBottom: 40, animationDelay: "0.2s", lineHeight: 1.6
        }}>
          Secure Ethereum wallet with multi-signature protection. Create your owner &amp; guardian wallet pair instantly.
        </p>

        <div className="stagger" style={{ width: "100%", maxWidth: 340, marginBottom: 40 }}>
          {[
            { icon: "🔑", title: "Dual Wallet", desc: "Owner + Guardian pair" },
            { icon: "🔐", title: "Multi-Sign", desc: "Shared transaction approval" },
            { icon: "🛡️", title: "Encrypted Keys", desc: "AES encrypted storage" },
            { icon: "⚡", title: "Fast & Simple", desc: "Create in seconds" },
          ].map((f, i) => (
            <div key={i} className="fade-in" style={{
              display: "flex", alignItems: "center", gap: 14,
              padding: "12px 16px", borderRadius: "var(--radius-md)",
              background: "var(--bg-secondary)", marginBottom: 8,
              textAlign: "left", animationDelay: `${0.3 + i * 0.08}s`
            }}>
              <span style={{ fontSize: 22, flexShrink: 0 }}>{f.icon}</span>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600 }}>{f.title}</div>
                <div style={{ fontSize: 12, color: "var(--text-tertiary)" }}>{f.desc}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="fade-in" style={{ width: "100%", maxWidth: 340, animationDelay: "0.6s" }}>
          {hasWallet ? (
            <>
              <Link href="/dashboard" className="btn btn-primary" style={{ marginBottom: 10, textDecoration: "none" }}>
                Open Wallet
              </Link>
              <Link href="/create" className="btn btn-secondary" style={{ textDecoration: "none" }}>
                Create New Wallet
              </Link>
            </>
          ) : (
            <Link href="/create" className="btn btn-primary" style={{ textDecoration: "none", marginBottom: 12 }}>
              Create Wallet
            </Link>
          )}
          <Link href="/import" className="btn btn-outline" style={{ textDecoration: "none" }}>
            📥 Import Wallet
          </Link>
        </div>
      </div>

      <div style={{
        textAlign: "center", padding: "20px",
        fontSize: 12, color: "var(--text-tertiary)"
      }}>
        Powered by Ethereum • ethers.js
      </div>
    </div>
  );
}
