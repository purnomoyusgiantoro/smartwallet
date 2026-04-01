"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { reconstructWalletPair, saveWallets } from "@/lib/wallet";

export default function ImportWalletPage() {
  const router = useRouter();
  const [ownerPK, setOwnerPK] = useState("");
  const [guardianPK, setGuardianPK] = useState("");
  const [smartAddress, setSmartAddress] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!ownerPK || !guardianPK || !smartAddress || !password) {
      setError("Semua field harus diisi");
      return;
    }

    if (password !== confirmPassword) {
      setError("Password konfirmasi tidak cocok");
      return;
    }

    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }

    // Basic hex check
    if (!ownerPK.startsWith("0x") || ownerPK.length !== 66) {
      setError("Owner Private Key tidak valid (harus 0x... 66 karakter)");
      return;
    }
    if (!guardianPK.startsWith("0x") || guardianPK.length !== 66) {
      setError("Guardian Private Key tidak valid (harus 0x... 66 karakter)");
      return;
    }
    if (!smartAddress.startsWith("0x") || smartAddress.length !== 42) {
      setError("Smart Wallet Address tidak valid (harus 0x... 42 karakter)");
      return;
    }

    try {
      setLoading(true);
      const pair = reconstructWalletPair(ownerPK, guardianPK, smartAddress, password);
      saveWallets(pair);
      
      // Delay for effect
      setTimeout(() => {
        router.push("/dashboard");
      }, 1000);
    } catch {
      setError("Gagal mengimpor wallet. Pastikan Private Key benar.");
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ background: "var(--bg-secondary)" }}>
      <div className="container" style={{ paddingTop: 40, paddingBottom: 40 }}>
        <div style={{ maxWidth: 400, margin: "0 auto" }}>
          <div className="page-header" style={{ marginBottom: 32 }}>
            <Link href="/" className="back-btn">←</Link>
            <h1>Import Wallet</h1>
          </div>

          <div className="card fade-in">
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 24 }}>
              Masukkan Private Key dan alamat Smart Wallet Anda untuk memulihkan akses.
            </p>

            <form onSubmit={handleImport}>
              <div className="input-group">
                <label>Owner Private Key</label>
                <input
                  type="password"
                  className="input"
                  placeholder="0x..."
                  value={ownerPK}
                  onChange={(e) => setOwnerPK(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <label>Guardian Private Key</label>
                <input
                  type="password"
                  className="input"
                  placeholder="0x..."
                  value={guardianPK}
                  onChange={(e) => setGuardianPK(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <label>Smart Wallet Address (Contract)</label>
                <input
                  type="text"
                  className="input"
                  placeholder="0x..."
                  value={smartAddress}
                  onChange={(e) => setSmartAddress(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div style={{ height: 1, background: "var(--border-light)", margin: "24px 0" }} />

              <div className="input-group">
                <label>Buat Password Baru</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Untuk mengenkripsi kunci Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              <div className="input-group">
                <label>Konfirmasi Password</label>
                <input
                  type="password"
                  className="input"
                  placeholder="Masukkan ulang password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={loading}
                />
              </div>

              {error && (
                <div className="alert alert-danger" style={{ marginBottom: 20 }}>
                  <span>⚠️</span>
                  <span>{error}</span>
                </div>
              )}

              <button 
                type="submit" 
                className="btn btn-primary" 
                disabled={loading}
                style={{ marginTop: 8 }}
              >
                {loading ? "Recovering..." : "📥 Import & Recover"}
              </button>
            </form>
          </div>

          <div className="alert alert-info" style={{ marginTop: 24 }}>
            <span>ℹ️</span>
            <span>
              Private key Kakak akan dienkripsi dengan password baru ini dan disimpan aman di peramban (Local Storage).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
