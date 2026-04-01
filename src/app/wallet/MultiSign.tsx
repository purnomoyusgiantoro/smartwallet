"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadWallets, decryptPrivateKey, truncateAddress, getRpcUrl } from "@/lib/wallet";
import { Wallet, JsonRpcProvider, Contract } from "ethers";
import { SMART_WALLET_ABI } from "@/lib/contract";

interface PendingTx {
  id: string; // the local array ID
  txId: string | null; // the on-chain txId
  to: string;
  amount: string;
  submittedBy: "owner" | "guardian";
  approvals: ("owner" | "guardian")[];
  threshold: number;
  status: "pending" | "executed" | "rejected";
  timestamp: number;
}

const MULTISIGN_STORAGE_KEY = "smartwallet_multisign";

function loadPendingTxs(): PendingTx[] {
  if (typeof window === "undefined") return [];
  const data = localStorage.getItem(MULTISIGN_STORAGE_KEY);
  return data ? JSON.parse(data) : [];
}

function savePendingTxs(txs: PendingTx[]): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(MULTISIGN_STORAGE_KEY, JSON.stringify(txs));
  }
}

export default function MultiSignPage() {
  const router = useRouter();
  const [ownerAddress, setOwnerAddress] = useState("");
  const [guardianAddress, setGuardianAddress] = useState("");
  const [smartWalletAddress, setSmartWalletAddress] = useState("");
  const [transactions, setTransactions] = useState<PendingTx[]>([]);

  // Approval modal state
  const [approvingTx, setApprovingTx] = useState<{ id: string, txId: string, role: "owner" | "guardian" } | null>(null);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const wallets = loadWallets();
    if (!wallets) {
      router.push("/");
      return;
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOwnerAddress(wallets.owner.address);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGuardianAddress(wallets.guardian.address);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSmartWalletAddress(wallets.deployedWalletAddress || "");
    
    // Initial load
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTransactions(loadPendingTxs());
  }, [router]);

  // Sync on-chain status for pending txs
  useEffect(() => {
    if (!smartWalletAddress) return;
    
    const syncWithChain = async () => {
       const provider = new JsonRpcProvider(getRpcUrl());
       const contract = new Contract(smartWalletAddress, SMART_WALLET_ABI, provider);
       
       const currentTxs = loadPendingTxs();
       let changed = false;
       
       for (let i = 0; i < currentTxs.length; i++) {
         const tx = currentTxs[i];
         if (tx.status === "pending" && tx.txId !== null) {
            try {
              const onChainTx = await contract.getTransaction(tx.txId);
              const executed = onChainTx.executed;
              
              const isOwnerApproved = await contract.isApproved(tx.txId, ownerAddress);
              const isGuardianApproved = await contract.isApproved(tx.txId, guardianAddress);
              
              const newApprovals: ("owner"|"guardian")[] = [];
              if (isOwnerApproved) newApprovals.push("owner");
              if (isGuardianApproved) newApprovals.push("guardian");
              
              if (executed) {
                 tx.status = "executed";
                 changed = true;
              }
              
              if (newApprovals.length !== tx.approvals.length) {
                 tx.approvals = newApprovals;
                 changed = true;
              }
            } catch (err) {
              console.error("Error syncing tx", tx.txId, err);
            }
         }
       }
       
       if (changed) {
         setTransactions([...currentTxs]);
         savePendingTxs(currentTxs);
       }
    };
    
    syncWithChain();
  }, [smartWalletAddress, ownerAddress, guardianAddress]);


  const confirmApprove = async () => {
    if (!approvingTx) return;
    
    const wallets = loadWallets();
    if (!wallets) return;
    if (!smartWalletAddress) {
      setError("Smart Wallet belum ter-deploy");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const encKey = approvingTx.role === "owner"
        ? wallets.owner.encryptedKey
        : wallets.guardian.encryptedKey;

      const privateKey = decryptPrivateKey(encKey, password);
      if (!privateKey) {
        throw new Error("Password salah");
      }

      const provider = new JsonRpcProvider(getRpcUrl());
      const wallet = new Wallet(privateKey, provider);
      const contract = new Contract(smartWalletAddress, SMART_WALLET_ABI, wallet);
      
      const tx = await contract.approveTransaction(approvingTx.txId);
      await tx.wait(); // wait for confirmation
      
      // Update local state optimistic
      const updated = transactions.map((t) => {
        if (t.id === approvingTx.id && !t.approvals.includes(approvingTx.role)) {
          const newApprovals = [...t.approvals, approvingTx.role];
          return {
            ...t,
            approvals: newApprovals,
            status: newApprovals.length >= t.threshold ? "executed" as const : t.status,
          };
        }
        return t;
      });
      setTransactions(updated);
      savePendingTxs(updated);
      
      // close modal
      setApprovingTx(null);
      setPassword("");
    } catch (err: unknown) {
      console.error(err);
      const msg = err instanceof Error ? (err as unknown as { reason?: string }).reason || err.message : "Failed to approve transaction on-chain";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  const pendingTxs = transactions.filter((tx) => tx.status === "pending");
  const historyTxs = transactions.filter((tx) => tx.status !== "pending");

  return (
    <div className="page-wrapper" style={{ background: "var(--bg-secondary)", paddingBottom: 80 }}>
      {/* Approval Modal Overlay */}
      {approvingTx && (
        <div style={{
          position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
          background: "rgba(0,0,0,0.5)", zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center",
          padding: 20
        }}>
          <div className="card fade-in" style={{ width: "100%", maxWidth: 400 }}>
            <h3 style={{ marginBottom: 16, fontSize: 18, fontWeight: 700 }}>
              Konfirmasi {approvingTx.role === "owner" ? "👤 Owner" : "🛡️ Guardian"}
            </h3>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 16 }}>
              Anda akan menyetujui transaksi <b>#{approvingTx.txId}</b> di blockchain. Masukkan password wallet untuk menandatangani.
            </p>
            <div className="input-group">
              <label>Password</label>
              <input
                type="password"
                className="input"
                autoFocus
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password wallet..."
              />
            </div>
            
            {error && <div className="alert alert-danger" style={{ marginBottom: 16 }}>{error}</div>}
            
            <div style={{ display: "flex", gap: 10 }}>
              <button 
                 className="btn btn-secondary" 
                 style={{ flex: 1 }} 
                 onClick={() => { setApprovingTx(null); setPassword(""); setError(""); }}
                 disabled={loading}
              >
                Batal
              </button>
              <button 
                 className="btn btn-primary" 
                 style={{ flex: 1 }} 
                 onClick={confirmApprove}
                 disabled={loading || !password}
              >
                {loading ? "Menandatangani..." : "✅ Setujui Tx"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
        {/* Header */}
        <div className="page-header">
          <Link href="/wallet?view=dashboard" className="back-btn">←</Link>
          <h1>Multi-Sign</h1>
        </div>

        {/* Info */}
        <div className="alert alert-info fade-in" style={{ marginBottom: 20 }}>
          <span>🔐</span>
          <span>
            Transaksi di Smart Wallet Anda butuh persetujuan on-chain dari <strong>Owner + Guardian</strong> (threshold: 2/2) sebelum dieksekusi.
          </span>
        </div>

        {/* Pending Transactions */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>
               Pending <span className="badge badge-warning" style={{ marginLeft: 4 }}>{pendingTxs.length}</span>
            </h2>
            <Link href="/wallet?view=send" className="btn btn-primary btn-sm" style={{ textDecoration: "none" }}>
               + New Tx
            </Link>
          </div>

          {pendingTxs.length === 0 ? (
            <div className="empty-state card" style={{ padding: "24px 16px" }}>
              <span className="icon">📭</span>
              <h3>Tidak ada proposal pending</h3>
              <p>Buka halaman Send untuk membuat draft transaksi pengeluaran baru.</p>
            </div>
          ) : (
            pendingTxs.map((tx) => (
              <div key={tx.id} className="card fade-in" style={{ marginBottom: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <span className="badge badge-warning">⏳ Pending</span>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    TxID: {tx.txId}
                  </span>
                </div>

                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4, fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>To</span>
                  <span style={{ fontFamily: "monospace" }}>{truncateAddress(tx.to)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>Amount</span>
                  <span style={{ fontWeight: 700 }}>{tx.amount} ETH</span>
                </div>

                {/* Approval Status */}
                <div style={{
                  background: "var(--bg-secondary)", borderRadius: "var(--radius-sm)",
                  padding: "8px 12px", marginBottom: 10, fontSize: 12
                }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontWeight: 600 }}>Approvals: {tx.approvals.length}/{tx.threshold}</span>
                    <div style={{
                      width: 60, height: 4, background: "var(--border-light)",
                      borderRadius: 4, overflow: "hidden"
                    }}>
                      <div style={{
                        width: `${(tx.approvals.length / tx.threshold) * 100}%`,
                        height: "100%", background: "var(--bg-accent)",
                        borderRadius: 4, transition: "width 0.3s ease"
                      }} />
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                    <span style={{ color: tx.approvals.includes("owner") ? "var(--text-success)" : "var(--text-tertiary)" }}>
                      {tx.approvals.includes("owner") ? "✅" : "⬜"} Owner
                    </span>
                    <span style={{ color: tx.approvals.includes("guardian") ? "var(--text-success)" : "var(--text-tertiary)" }}>
                      {tx.approvals.includes("guardian") ? "✅" : "⬜"} Guardian
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div style={{ display: "flex", gap: 8 }}>
                  {!tx.approvals.includes("owner") && (
                    <button
                      className="btn btn-primary btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => setApprovingTx({ id: tx.id, txId: tx.txId || "0", role: "owner" })}
                    >
                      ✅ Approve (Owner)
                    </button>
                  )}
                  {!tx.approvals.includes("guardian") && (
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ flex: 1 }}
                      onClick={() => setApprovingTx({ id: tx.id, txId: tx.txId || "0", role: "guardian" })}
                    >
                      ✅ Approve (Guardian)
                    </button>
                  )}
                  {/* Note: real rejection functionality would need its own contract call if supported, or just ignoring it */}
                </div>
              </div>
            ))
          )}
        </div>

        {/* History */}
        {historyTxs.length > 0 && (
          <div>
            <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>History</h2>
            {historyTxs.map((tx) => (
              <div key={tx.id} className="card" style={{ marginBottom: 8, opacity: 0.7 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span className={`badge ${tx.status === "executed" ? "badge-success" : "badge-danger"}`}>
                    {tx.status === "executed" ? "✅ Executed" : "❌ Rejected"}
                  </span>
                  <span style={{ fontSize: 11, color: "var(--text-tertiary)" }}>
                    TxID: {tx.txId}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                  <span style={{ color: "var(--text-secondary)" }}>To: {truncateAddress(tx.to)}</span>
                  <span style={{ fontWeight: 600 }}>{tx.amount} ETH</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
