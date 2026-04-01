"use client";

import { useState } from "react";
import type { Eip1193Provider } from "ethers";
import Link from "next/link";
import { generateWalletPair, saveWallets } from "@/lib/wallet";

export default function CreateWalletPage() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [step, setStep] = useState<"password" | "generated">("password");
  const [walletInfo, setWalletInfo] = useState<{
    ownerAddress: string;
    guardianAddress: string;
    ownerKey: string;
    guardianKey: string;
  } | null>(null);

  const handleCreate = async () => {
    if (password.length < 6) {
      setError("Password minimal 6 karakter");
      return;
    }
    if (password !== confirmPassword) {
      setError("Password tidak cocok");
      return;
    }

    setLoading(true);
    setError("Generating wallets...");

    try {
      // 1. Generate local account coordinates first
      const { pair, ownerPrivateKey, guardianPrivateKey } = generateWalletPair(password);
      
      // 2. We use window.ethereum for user to pay gas to deploy their own wallet
      const win = typeof window !== "undefined" ? window as unknown as { ethereum?: Record<string, unknown> } : null;
      if (win && win.ethereum) {
        setError("Silakan konfirmasi transaksi di dompet Anda untuk membuat SmartWallet...");
        
        const { ethers } = await import("ethers");
        const { SMART_WALLET_FACTORY_ABI } = await import("@/lib/contract");
        
        // Use direct process.env reference so Next.js replaces it at build/runtime
        const factoryAddressStr = process.env.NEXT_PUBLIC_FACTORY_CONTRACT || "";
        
        if (!factoryAddressStr || factoryAddressStr.length !== 42) {
          throw new Error("Factory Address belum dikonfigurasi di .env.local: " + factoryAddressStr);
        }

        const provider = new ethers.BrowserProvider(win.ethereum as unknown as Eip1193Provider);
        await provider.send("eth_requestAccounts", []);
        const signer = await provider.getSigner();
        
        // Ensure correct network (Sepolia - chainId 11155111 in hex is 0xaa36a7)
        try {
          await provider.send("wallet_switchEthereumChain", [{ chainId: "0xaa36a7" }]);
        } catch (switchError: unknown) {
          const sErr = switchError as { code: number };
          // This error code indicates that the chain has not been added to MetaMask.
          if (sErr.code === 4902) {
            await provider.send("wallet_addEthereumChain", [
              {
                chainId: "0xaa36a7",
                chainName: "Sepolia Testnet",
                rpcUrls: ["https://rpc.sepolia.org"],
                nativeCurrency: {
                  name: "Sepolia Ether",
                  symbol: "ETH",
                  decimals: 18,
                },
                blockExplorerUrls: ["https://sepolia.etherscan.io"],
              },
            ]);
          } else {
             console.warn("User rejected network switch or another error occurred:", switchError);
             throw new Error("Tolong ganti ke jaringan Sepolia di wallet Anda dulu.");
          }
        }
        
        const factoryContract = new ethers.Contract(factoryAddressStr, SMART_WALLET_FACTORY_ABI, signer);
        
        // 3. Call the Factory to deploy a new SmartWallet
        const tx = await factoryContract.createWallet(pair.owner.address, pair.guardian.address);
        setError("Menunggu konfirmasi jaringan...");
        const receipt = await tx.wait();
        
        // Find the deployed wallet address from the event WalletCreated
        let newWalletAddress = "";
        for (const log of receipt.logs) {
          try {
            const parsedLog = factoryContract.interface.parseLog(log);
            if (parsedLog && parsedLog.name === "WalletCreated") {
              newWalletAddress = parsedLog.args.walletAddress;
              break;
            }
          } catch {
            // Ignore unparsed logs
          }
        }
        
        if (!newWalletAddress) {
          throw new Error("Gagal mengambil alamat SmartWallet baru dari transaksi");
        }
        
        // Save the matched address
        pair.deployedWalletAddress = newWalletAddress;
      } else {
         // Fallback if no metamask/web3 browser (only mock creation)
         console.warn("No Web3 provider found. Saving coordinates only without on-chain deployment.");
      }

      // Save to local storage
      saveWallets(pair);

      setWalletInfo({
        ownerAddress: pair.owner.address,
        guardianAddress: pair.guardian.address,
        ownerKey: ownerPrivateKey,
        guardianKey: guardianPrivateKey,
      });

      setStep("generated");
      setLoading(false);
      setError("");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : "Terjadi kesalahan saat membuat wallet";
      console.error(err);
      setError(errorMsg);
      setLoading(false);
    }
  };

  return (
    <div className="page-wrapper" style={{ background: "var(--bg-primary)" }}>
      <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
        {/* Header */}
        <div className="page-header">
          <Link href="/" className="back-btn">←</Link>
          <h1>Create Wallet</h1>
        </div>

        {step === "password" ? (
          <div className="fade-in">
            {/* Info */}
            <div className="alert alert-info" style={{ marginBottom: 24 }}>
              <span>ℹ️</span>
              <span>
                Akan dibuat <strong>2 wallet</strong>: Owner (utama) dan Guardian (backup/recovery).
                Password digunakan untuk mengenkripsi private key.
              </span>
            </div>

            {/* Password Form */}
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                className="input"
                placeholder="Minimal 6 karakter"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label>Konfirmasi Password</label>
              <input
                type="password"
                className="input"
                placeholder="Ulangi password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button
              className="btn btn-primary"
              onClick={handleCreate}
              disabled={loading}
              style={{ marginTop: 8 }}
            >
              {loading ? (
                <>
                  <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>⏳</span>
                  Generating...
                </>
              ) : (
                "🔑 Create Wallet Pair"
              )}
            </button>
          </div>
        ) : (
          <div className="fade-in stagger">
            {/* Success */}
            <div style={{
              textAlign: "center", padding: "24px 0 20px",
            }} className="fade-in">
              <div style={{
                width: 64, height: 64, borderRadius: "50%",
                background: "#e6f9f0", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: 28, margin: "0 auto 12px"
              }}>
                ✅
              </div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Wallet Created!</h2>
              <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>2 wallet berhasil dibuat</p>
            </div>

            {/* Wallet 1 */}
            <div className="card fade-in" style={{ marginBottom: 12, border: "1.5px solid var(--bg-accent)", background: "var(--bg-accent-subtle)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span className="badge badge-accent">👤 Owner</span>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Wallet Utama</span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Address</span>
                <p style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text-primary)", wordBreak: "break-all", marginTop: 2 }}>
                  {walletInfo?.ownerAddress}
                </p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Private Key</span>
                <p style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-danger)", wordBreak: "break-all", marginTop: 2 }}>
                  {walletInfo?.ownerKey}
                </p>
              </div>
            </div>

            {/* Wallet 2 */}
            <div className="card fade-in" style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
                <span className="badge badge-warning">🛡️ Guardian</span>
                <span style={{ fontSize: 12, color: "var(--text-tertiary)" }}>Wallet Backup</span>
              </div>
              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Address</span>
                <p style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text-primary)", wordBreak: "break-all", marginTop: 2 }}>
                  {walletInfo?.guardianAddress}
                </p>
              </div>
              <div>
                <span style={{ fontSize: 11, color: "var(--text-tertiary)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Private Key</span>
                <p style={{ fontSize: 11, fontFamily: "monospace", color: "var(--text-danger)", wordBreak: "break-all", marginTop: 2 }}>
                  {walletInfo?.guardianKey}
                </p>
              </div>
            </div>

            {/* Warning */}
            <div className="alert alert-danger fade-in" style={{ marginBottom: 20 }}>
              <span>🚨</span>
              <span>
                <strong>PENTING:</strong> Simpan private key di tempat aman! Jika hilang, wallet tidak bisa dipulihkan.
              </span>
            </div>

            {/* Actions */}
            <Link href="/wallet?view=backup" className="btn btn-primary fade-in" style={{ marginBottom: 10, textDecoration: "none" }}>
              📋 Backup Private Keys
            </Link>
            <Link href="/wallet?view=dashboard" className="btn btn-secondary fade-in" style={{ textDecoration: "none" }}>
              Skip → Dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
