"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadWallets, decryptPrivateKey, clearWallets, loadNetwork, saveNetwork, truncateAddress } from "@/lib/wallet";

export default function SettingsPage() {
  const router = useRouter();
  const [ownerAddress, setOwnerAddress] = useState("");
  const [guardianAddress, setGuardianAddress] = useState("");
  const [network, setNetwork] = useState("sepolia");
  const [showExport, setShowExport] = useState(false);
  const [exportPassword, setExportPassword] = useState("");
  const [exportedKeys, setExportedKeys] = useState<{ owner: string; guardian: string } | null>(null);
  const [exportError, setExportError] = useState("");
  const [showReset, setShowReset] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const wallets = loadWallets();
    if (!wallets) {
      router.push("/");
      return;
    }
    if (wallets.owner.address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOwnerAddress(wallets.owner.address);
    }
    if (wallets.guardian.address) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setGuardianAddress(wallets.guardian.address);
    }
    const net = loadNetwork();
    if (net) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNetwork(net);
    }
  }, [router]);

  const handleNetworkChange = (net: string) => {
    setNetwork(net);
    saveNetwork(net);
  };

  const handleExport = () => {
    const wallets = loadWallets();
    if (!wallets) return;

    try {
      const oKey = decryptPrivateKey(wallets.owner.encryptedKey, exportPassword);
      const gKey = decryptPrivateKey(wallets.guardian.encryptedKey, exportPassword);

      if (!oKey || !gKey) {
        setExportError("Password salah");
        return;
      }

      setExportedKeys({ owner: oKey, guardian: gKey });
      setExportError("");
    } catch {
      setExportError("Password salah");
    }
  };

  const handleReset = () => {
    clearWallets();
    localStorage.removeItem("smartwallet_multisign");
    router.push("/");
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="page-wrapper" style={{ background: "var(--bg-secondary)", paddingBottom: 80 }}>
      <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
        {/* Header */}
        <div className="page-header">
          <Link href="/dashboard" className="back-btn">←</Link>
          <h1>Settings</h1>
        </div>

        {/* Wallet Info */}
        <div className="card fade-in" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Wallet Info</h3>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: "1px solid var(--border-light)" }}>
            <div>
              <span className="badge badge-accent" style={{ marginBottom: 2 }}>👤 Owner</span>
              <p style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text-secondary)", marginTop: 2 }}>
                {truncateAddress(ownerAddress)}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(ownerAddress, "owner")}
              style={{
                background: "none", border: "none", fontSize: 12, cursor: "pointer",
                color: copiedField === "owner" ? "var(--text-success)" : "var(--text-accent)", fontWeight: 600
              }}
            >
              {copiedField === "owner" ? "✓" : "Copy"}
            </button>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0" }}>
            <div>
              <span className="badge badge-warning" style={{ marginBottom: 2 }}>🛡️ Guardian</span>
              <p style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text-secondary)", marginTop: 2 }}>
                {truncateAddress(guardianAddress)}
              </p>
            </div>
            <button
              onClick={() => copyToClipboard(guardianAddress, "guardian")}
              style={{
                background: "none", border: "none", fontSize: 12, cursor: "pointer",
                color: copiedField === "guardian" ? "var(--text-success)" : "var(--text-accent)", fontWeight: 600
              }}
            >
              {copiedField === "guardian" ? "✓" : "Copy"}
            </button>
          </div>
        </div>

        {/* Network */}
        <div className="card fade-in" style={{ marginBottom: 12 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>Network</h3>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {[
              { value: "mainnet", label: "Ethereum Mainnet", icon: "🟢" },
              { value: "sepolia", label: "Sepolia Testnet", icon: "🔵" },
            ].map((net) => (
              <button
                key={net.value}
                onClick={() => handleNetworkChange(net.value)}
                style={{
                  padding: "12px",
                  borderRadius: "var(--radius-md)",
                  border: `1.5px solid ${network === net.value ? "var(--bg-accent)" : "var(--border-light)"}`,
                  background: network === net.value ? "var(--bg-accent-subtle)" : "var(--bg-primary)",
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "all 0.2s"
                }}
              >
                <div style={{ fontSize: 16, marginBottom: 2 }}>{net.icon}</div>
                <div style={{ fontSize: 11, fontWeight: 600 }}>{net.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Export Keys */}
        <div className="card fade-in" style={{ marginBottom: 12 }}>
          <div
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              cursor: "pointer"
            }}
            onClick={() => { setShowExport(!showExport); setExportedKeys(null); setExportError(""); }}
          >
            <h3 style={{ fontSize: 14, fontWeight: 700 }}>Export Private Keys</h3>
            <span style={{ fontSize: 16, color: "var(--text-tertiary)" }}>{showExport ? "▲" : "▼"}</span>
          </div>

          {showExport && (
            <div style={{ marginTop: 12 }}>
              {!exportedKeys ? (
                <>
                  <div className="alert alert-danger" style={{ marginBottom: 12 }}>
                    <span>🚨</span>
                    <span>Jangan pernah bagikan private key kepada siapapun!</span>
                  </div>

                  <div className="input-group">
                    <label>Password</label>
                    <input
                      type="password"
                      className="input"
                      placeholder="Masukkan password"
                      value={exportPassword}
                      onChange={(e) => setExportPassword(e.target.value)}
                    />
                  </div>

                  {exportError && (
                    <div className="alert alert-danger" style={{ marginBottom: 12 }}>
                      <span>⚠️</span>
                      <span>{exportError}</span>
                    </div>
                  )}

                  <button className="btn btn-outline btn-sm" onClick={handleExport}>
                    🔓 Export Keys
                  </button>
                </>
              ) : (
                <div className="stagger">
                  <div className="fade-in" style={{
                    background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)",
                    padding: 12, marginBottom: 8
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)" }}>OWNER KEY</span>
                      <button
                        onClick={() => copyToClipboard(exportedKeys.owner, "eOwner")}
                        style={{
                          background: "none", border: "none", fontSize: 11, cursor: "pointer",
                          color: copiedField === "eOwner" ? "var(--text-success)" : "var(--text-accent)", fontWeight: 600
                        }}
                      >
                        {copiedField === "eOwner" ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                    <p style={{ fontSize: 10, fontFamily: "monospace", wordBreak: "break-all", color: "var(--text-danger)" }}>
                      {exportedKeys.owner}
                    </p>
                  </div>

                  <div className="fade-in" style={{
                    background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)",
                    padding: 12
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)" }}>GUARDIAN KEY</span>
                      <button
                        onClick={() => copyToClipboard(exportedKeys.guardian, "eGuard")}
                        style={{
                          background: "none", border: "none", fontSize: 11, cursor: "pointer",
                          color: copiedField === "eGuard" ? "var(--text-success)" : "var(--text-accent)", fontWeight: 600
                        }}
                      >
                        {copiedField === "eGuard" ? "✓ Copied" : "Copy"}
                      </button>
                    </div>
                    <p style={{ fontSize: 10, fontFamily: "monospace", wordBreak: "break-all", color: "var(--text-danger)" }}>
                      {exportedKeys.guardian}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="card fade-in" style={{ border: "1.5px solid var(--bg-danger)" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-danger)", marginBottom: 8 }}>Danger Zone</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12 }}>
            Reset wallet akan menghapus semua data dari localStorage. Pastikan Anda sudah backup private key.
          </p>

          {!showReset ? (
            <button className="btn btn-danger btn-sm" onClick={() => setShowReset(true)}>
              🗑️ Reset Wallet
            </button>
          ) : (
            <div className="fade-in">
              <div className="alert alert-danger" style={{ marginBottom: 12 }}>
                <span>⚠️</span>
                <span><strong>Yakin?</strong> Tindakan ini tidak bisa dibatalkan!</span>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn btn-danger btn-sm" style={{ flex: 1 }} onClick={handleReset}>
                  Ya, Reset
                </button>
                <button className="btn btn-secondary btn-sm" style={{ flex: 1 }} onClick={() => setShowReset(false)}>
                  Batal
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Version */}
        <div style={{ textAlign: "center", marginTop: 24, fontSize: 12, color: "var(--text-tertiary)" }}>
          SmartWallet v1.0.0 • Powered by ethers.js
        </div>
      </div>
    </div>
  );
}
