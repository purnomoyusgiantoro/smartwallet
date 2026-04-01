"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { loadWallets, decryptPrivateKey } from "@/lib/wallet";

export default function WalletBackupPage() {
  const [ownerAddress, setOwnerAddress] = useState("");
  const [guardianAddress, setGuardianAddress] = useState("");
  const [ownerKey, setOwnerKey] = useState("");
  const [guardianKey, setGuardianKey] = useState("");
  const [password, setPassword] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [error, setError] = useState("");
  const [showOwner, setShowOwner] = useState(false);
  const [showGuardian, setShowGuardian] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);

  useEffect(() => {
    const wallets = loadWallets();
    if (wallets) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (wallets.owner.address) setOwnerAddress(wallets.owner.address);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (wallets.guardian.address) setGuardianAddress(wallets.guardian.address);
    }
  }, []);

  const handleUnlock = () => {
    const wallets = loadWallets();
    if (!wallets) return;

    try {
      const oKey = decryptPrivateKey(wallets.owner.encryptedKey, password);
      const gKey = decryptPrivateKey(wallets.guardian.encryptedKey, password);

      if (!oKey || !gKey) {
        setError("Password salah");
        return;
      }

      setOwnerKey(oKey);
      setGuardianKey(gKey);
      setUnlocked(true);
      setError("");
    } catch {
      setError("Password salah");
    }
  };

  const copyToClipboard = async (text: string, field: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  return (
    <div className="page-wrapper" style={{ background: "var(--bg-primary)" }}>
      <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
        {/* Header */}
        <div className="page-header">
          <Link href="/create" className="back-btn">←</Link>
          <h1>Backup Keys</h1>
        </div>

        {/* Warning */}
        <div className="alert alert-danger fade-in" style={{ marginBottom: 20 }}>
          <span>🚨</span>
          <span>
            <strong>Jangan pernah bagikan private key!</strong> Siapapun yang memiliki private key bisa mengakses wallet Anda.
          </span>
        </div>

        {!unlocked ? (
          <div className="fade-in">
            <p style={{ fontSize: 14, color: "var(--text-secondary)", marginBottom: 16 }}>
              Masukkan password untuk melihat private key.
            </p>

            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                className="input"
                placeholder="Masukkan password wallet"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleUnlock()}
              />
            </div>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button className="btn btn-primary" onClick={handleUnlock}>
              🔓 Unlock Keys
            </button>
          </div>
        ) : (
          <div className="fade-in stagger">
            {/* Owner Key */}
            <div className="card fade-in" style={{ marginBottom: 12, border: "1.5px solid var(--bg-accent)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span className="badge badge-accent">👤 Owner</span>
              </div>

              {/* Address */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Address</span>
                  <button
                    onClick={() => copyToClipboard(ownerAddress, "ownerAddr")}
                    style={{
                      background: "none", border: "none", fontSize: 12,
                      color: copiedField === "ownerAddr" ? "var(--text-success)" : "var(--text-accent)",
                      fontWeight: 600, cursor: "pointer"
                    }}
                  >
                    {copiedField === "ownerAddr" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <p style={{ fontSize: 11, fontFamily: "monospace", wordBreak: "break-all", color: "var(--text-primary)", marginTop: 2 }}>
                  {ownerAddress}
                </p>
              </div>

              {/* Private Key */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Private Key</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setShowOwner(!showOwner)}
                      style={{
                        background: "none", border: "none", fontSize: 12,
                        color: "var(--text-secondary)", fontWeight: 600, cursor: "pointer"
                      }}
                    >
                      {showOwner ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => copyToClipboard(ownerKey, "ownerKey")}
                      style={{
                        background: "none", border: "none", fontSize: 12,
                        color: copiedField === "ownerKey" ? "var(--text-success)" : "var(--text-accent)",
                        fontWeight: 600, cursor: "pointer"
                      }}
                    >
                      {copiedField === "ownerKey" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                <p style={{
                  fontSize: 11, fontFamily: "monospace", wordBreak: "break-all",
                  color: "var(--text-danger)", marginTop: 2,
                  filter: showOwner ? "none" : "blur(6px)",
                  transition: "filter 0.2s ease", userSelect: showOwner ? "text" : "none"
                }}>
                  {ownerKey}
                </p>
              </div>
            </div>

            {/* Guardian Key */}
            <div className="card fade-in" style={{ marginBottom: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                <span className="badge badge-warning">🛡️ Guardian</span>
              </div>

              {/* Address */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Address</span>
                  <button
                    onClick={() => copyToClipboard(guardianAddress, "guardAddr")}
                    style={{
                      background: "none", border: "none", fontSize: 12,
                      color: copiedField === "guardAddr" ? "var(--text-success)" : "var(--text-accent)",
                      fontWeight: 600, cursor: "pointer"
                    }}
                  >
                    {copiedField === "guardAddr" ? "✓ Copied" : "Copy"}
                  </button>
                </div>
                <p style={{ fontSize: 11, fontFamily: "monospace", wordBreak: "break-all", color: "var(--text-primary)", marginTop: 2 }}>
                  {guardianAddress}
                </p>
              </div>

              {/* Private Key */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Private Key</span>
                  <div style={{ display: "flex", gap: 8 }}>
                    <button
                      onClick={() => setShowGuardian(!showGuardian)}
                      style={{
                        background: "none", border: "none", fontSize: 12,
                        color: "var(--text-secondary)", fontWeight: 600, cursor: "pointer"
                      }}
                    >
                      {showGuardian ? "Hide" : "Show"}
                    </button>
                    <button
                      onClick={() => copyToClipboard(guardianKey, "guardKey")}
                      style={{
                        background: "none", border: "none", fontSize: 12,
                        color: copiedField === "guardKey" ? "var(--text-success)" : "var(--text-accent)",
                        fontWeight: 600, cursor: "pointer"
                      }}
                    >
                      {copiedField === "guardKey" ? "✓ Copied" : "Copy"}
                    </button>
                  </div>
                </div>
                <p style={{
                  fontSize: 11, fontFamily: "monospace", wordBreak: "break-all",
                  color: "var(--text-danger)", marginTop: 2,
                  filter: showGuardian ? "none" : "blur(6px)",
                  transition: "filter 0.2s ease", userSelect: showGuardian ? "text" : "none"
                }}>
                  {guardianKey}
                </p>
              </div>
            </div>

            {/* Confirm */}
            <div className="alert alert-warning fade-in" style={{ marginBottom: 16 }}>
              <span>📝</span>
              <span>Pastikan Anda sudah menyimpan kedua private key di tempat aman sebelum melanjutkan.</span>
            </div>

            <Link href="/dashboard" className="btn btn-primary fade-in" style={{ textDecoration: "none" }}>
              ✅ Saya Sudah Backup → Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
