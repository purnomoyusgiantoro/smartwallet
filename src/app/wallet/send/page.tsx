"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadWallets, decryptPrivateKey, getBalance, truncateAddress, getRpcUrl } from "@/lib/wallet";
import { Wallet, JsonRpcProvider, parseEther, Contract } from "ethers";
import { SMART_WALLET_ABI } from "@/lib/contract";

export default function SendTransactionPage() {
  const router = useRouter();
  const [selectedWallet] = useState<"owner" | "guardian">("owner");
  const [smartWalletAddress, setSmartWalletAddress] = useState("");
  const [balance, setBalance] = useState("0.0");
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [password, setPassword] = useState("");
  const [step, setStep] = useState<"form" | "confirm" | "sending" | "success" | "error">("form");
  const [txHash, setTxHash] = useState("");
  const [error, setError] = useState("");
  const [loadingBalance, setLoadingBalance] = useState(true);

  useEffect(() => {
    const wallets = loadWallets();
    if (!wallets) {
      router.push("/");
      return;
    }
    const addr = wallets.deployedWalletAddress || "";
    if (addr) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSmartWalletAddress(addr);
    }

    const fetchBal = async () => {
      setLoadingBalance(true);
      if (wallets.deployedWalletAddress) {
        const bal = await getBalance(wallets.deployedWalletAddress);
        setBalance(bal ?? "0.0");
      } else {
        const bal = await getBalance(wallets.owner.address);
        setBalance(bal ?? "0.0");
      }
      setLoadingBalance(false);
    };
    fetchBal();
  }, [router]);

  const handleConfirm = () => {
    if (!recipient || !recipient.startsWith("0x") || recipient.length !== 42) {
      setError("Address tidak valid (harus 0x... 42 karakter)");
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError("Amount harus lebih dari 0");
      return;
    }
    if (parseFloat(amount) > parseFloat(balance)) {
      setError("Balance tidak cukup di dalam Smart Wallet");
      return;
    }
    setError("");
    setStep("confirm");
  };

  const handleSend = async () => {
    const wallets = loadWallets();
    if (!wallets) return;

    if (!smartWalletAddress) {
      setError("Smart Wallet belum ter-deploy. Anda tidak bisa menggunakan fitur ini.");
      setStep("error");
      return;
    }

    try {
      setStep("sending");

      const encKey = selectedWallet === "owner"
        ? wallets.owner.encryptedKey
        : wallets.guardian.encryptedKey;

      const privateKey = decryptPrivateKey(encKey, password);
      if (!privateKey) {
        setError("Password salah");
        setStep("confirm");
        return;
      }

      const provider = new JsonRpcProvider(getRpcUrl());
      const wallet = new Wallet(privateKey, provider);
      
      const smartWalletContract = new Contract(smartWalletAddress, SMART_WALLET_ABI, wallet);
      
      // We are "proposing" a transaction to the smart wallet. It won't actually send yet until multisig is approved.
      const tx = await smartWalletContract.submitTransaction(recipient, parseEther(amount), "0x");
      const receipt = await tx.wait();

      // Find the txId from the TransactionSubmitted event
      let submittedTxId = "";
      for (const log of receipt.logs) {
        try {
          const parsedLog = smartWalletContract.interface.parseLog(log);
          if (parsedLog && parsedLog.name === "TransactionSubmitted") {
            submittedTxId = parsedLog.args.txId.toString();
            break;
          }
        } catch {
          // ignore
        }
      }

      setTxHash(tx.hash);
      
      // Automatically save to local pending transactions for the MultiSign page UI
      if (typeof window !== "undefined") {
         const MULTISIGN_STORAGE_KEY = "smartwallet_multisign";
         const existingData = localStorage.getItem(MULTISIGN_STORAGE_KEY);
         let pendingTxs = existingData ? JSON.parse(existingData) : [];
         
         const newPending = {
           id: submittedTxId || Date.now().toString(),
           txId: submittedTxId || null, // Real on-chain txId
           to: recipient,
           amount: amount,
           submittedBy: selectedWallet,
           approvals: [selectedWallet], 
           threshold: 2,
           status: "pending",
           timestamp: Date.now(),
         };
         pendingTxs = [newPending, ...pendingTxs];
         localStorage.setItem(MULTISIGN_STORAGE_KEY, JSON.stringify(pendingTxs));
      }

      setStep("success");
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Transaction failed";
      setError(errorMessage);
      setStep("error");
    }
  };

  return (
    <div className="page-wrapper" style={{ background: "var(--bg-primary)", paddingBottom: 80 }}>
      <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
        {/* Header */}
        <div className="page-header">
          <Link href="/dashboard" className="back-btn">←</Link>
          <h1>Send ETH</h1>
        </div>

        {step === "form" && (
          <div className="fade-in">
            {!smartWalletAddress ? (
              <div className="alert alert-warning" style={{ marginBottom: 20 }}>
                <span>⚠️</span>
                <span>Smart Wallet belum dibuat. Silakan kembali ke dashboard atau deploy terlebih dahulu.</span>
              </div>
            ) : (
              <>
                {/* Wallet Info Display */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.5px", display: "block", marginBottom: 8 }}>
                    Kirim dari Smart Wallet
                  </label>
                  
                  <div className="card" style={{ padding: "16px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 18 }}>🏦</span>
                        <span style={{ fontWeight: 600 }}>Smart Contract</span>
                      </div>
                      <span className="badge badge-accent">Sepolia</span>
                    </div>
                    
                    <div style={{ fontSize: 12, fontFamily: "monospace", color: "var(--text-tertiary)", marginBottom: 16 }}>
                      {smartWalletAddress}
                    </div>
                    
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border-light)", paddingTop: 12 }}>
                      <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Tersedia:</span>
                      <span style={{ fontWeight: 700, fontSize: 15 }}>
                        {loadingBalance ? "..." : `${parseFloat(balance).toFixed(4)} ETH`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recipient */}
                <div className="input-group">
                  <label>Address Tujuan</label>
                  <input
                    className="input"
                    placeholder="0x..."
                    value={recipient}
                    onChange={(e) => setRecipient(e.target.value)}
                  />
                </div>

                {/* Amount */}
                <div className="input-group">
                  <label>Jumlah (ETH)</label>
                  <input
                    className="input"
                    type="number"
                    step="0.0001"
                    placeholder="0.0"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                  />
                </div>

                {error && (
                  <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                    <span>⚠️</span>
                    <span>{error}</span>
                  </div>
                )}

                <button className="btn btn-primary" onClick={handleConfirm}>
                  Preview Transaction
                </button>
              </>
            )}
          </div>
        )}

        {step === "confirm" && (
          <div className="fade-in">
            <div className="card" style={{ marginBottom: 16 }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Konfirmasi Proposal</h3>
              <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
                Anda (Owner) akan mengajukan transaksi dari Smart Wallet. Transaksi ini butuh persetujuan Guardian di menu Multi-Sign nantinya.
              </p>

              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>From (Smart Wallet)</span>
                <span style={{ fontSize: 12, fontFamily: "monospace" }}>{truncateAddress(smartWalletAddress)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>To</span>
                <span style={{ fontSize: 12, fontFamily: "monospace" }}>{truncateAddress(recipient)}</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: "1px solid var(--border-light)" }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Amount</span>
                <span style={{ fontSize: 14, fontWeight: 700 }}>{amount} ETH</span>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 0" }}>
                <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Network</span>
                <span className="badge badge-accent">Sepolia</span>
              </div>
            </div>

            <div className="input-group">
              <label>Password untuk Mengajukan</label>
              <input
                type="password"
                className="input"
                placeholder="Masukkan password wallet"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            {error && (
              <div className="alert alert-danger" style={{ marginBottom: 16 }}>
                <span>⚠️</span>
                <span>{error}</span>
              </div>
            )}

            <button className="btn btn-primary" onClick={handleSend} style={{ marginBottom: 8 }}>
              🚀 Send Transaction
            </button>
            <button className="btn btn-secondary" onClick={() => { setStep("form"); setError(""); }}>
              ← Back
            </button>
          </div>
        )}

        {step === "sending" && (
          <div className="fade-in" style={{ textAlign: "center", padding: "48px 0" }}>
            <div style={{ fontSize: 48, marginBottom: 16, animation: "spin 2s linear infinite" }}>⏳</div>
            <h2 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>Sending Transaction...</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>Mohon tunggu sebentar</p>
          </div>
        )}

        {step === "success" && (
          <div className="fade-in" style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "#e6f9f0", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 32, margin: "0 auto 16px"
            }}>
              ✅
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Transaction Sent!</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              {amount} ETH berhasil dikirim
            </p>

            <div className="card" style={{ marginBottom: 20, textAlign: "left" }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: "var(--text-tertiary)", textTransform: "uppercase" }}>Transaction Hash</label>
              <p style={{ fontSize: 11, fontFamily: "monospace", wordBreak: "break-all", marginTop: 4, color: "var(--text-accent)" }}>
                {txHash}
              </p>
            </div>

            <Link href="/dashboard" className="btn btn-primary" style={{ textDecoration: "none" }}>
              ← Back to Dashboard
            </Link>
          </div>
        )}

        {step === "error" && (
          <div className="fade-in" style={{ textAlign: "center", padding: "32px 0" }}>
            <div style={{
              width: 72, height: 72, borderRadius: "50%",
              background: "var(--bg-danger-light)", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: 32, margin: "0 auto 16px"
            }}>
              ❌
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Transaction Failed</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              {error}
            </p>
            <button className="btn btn-primary" onClick={() => { setStep("form"); setError(""); }}>
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
