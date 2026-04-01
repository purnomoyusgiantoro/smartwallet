"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { loadWallets, getBalance } from "@/lib/wallet";
import WalletCard from "@/components/WalletCard";

export default function DashboardPage() {
  const router = useRouter();
  const [ownerAddress, setOwnerAddress] = useState("");
  const [guardianAddress, setGuardianAddress] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  
  const [ownerBalance, setOwnerBalance] = useState("0.0");
  const [guardianBalance, setGuardianBalance] = useState("0.0");
  const [contractBalance, setContractBalance] = useState("0.0");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeWalletTab, setActiveWalletTab] = useState<"smart" | "owner" | "guardian">("owner");

  const fetchBalances = useCallback(async (owner: string, guardian: string, contract: string) => {
    setLoading(true);
    setError(null);
    try {
      const [ob, gb, cb] = await Promise.all([
        getBalance(owner),
        getBalance(guardian),
        contract ? getBalance(contract) : Promise.resolve("0.0")
      ]);
      
      if (ob === null || gb === null || (contract && cb === null)) {
        setError("Gagal mengambil data dari blockchain. Periksa koneksi internet atau coba lagi nanti.");
        setOwnerBalance(ob ?? "0.0");
        setGuardianBalance(gb ?? "0.0");
        setContractBalance(cb ?? "0.0");
      } else {
        setOwnerBalance(ob as string);
        setGuardianBalance(gb as string);
        setContractBalance(cb as string);
      }
    } catch (err) {
      console.error("fetchBalances error:", err);
      setError("Terjadi kesalahan teknis saat mengambil saldo.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const wallets = loadWallets();
    if (!wallets) {
      router.push("/");
      return;
    }
    
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (wallets.owner.address) setOwnerAddress(wallets.owner.address);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (wallets.guardian.address) setGuardianAddress(wallets.guardian.address);
    const cAddr = wallets.deployedWalletAddress || "";
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setContractAddress(cAddr);
    
    if (cAddr) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setActiveWalletTab("smart");
    }
    
    // Fetch all 3 balances
    fetchBalances(wallets.owner.address, wallets.guardian.address, cAddr);
  }, [router, fetchBalances]);

  // Total balance depends on whether they have a spawned contract or just EOAs
  const totalBalance = (
    parseFloat(contractBalance) + 
    parseFloat(ownerBalance) + 
    parseFloat(guardianBalance)
  ).toFixed(4);

  return (
    <div className="page-wrapper" style={{ background: "var(--bg-secondary)", paddingBottom: 80 }}>
      <div className="container" style={{ paddingTop: 16, paddingBottom: 40 }}>
        {/* Header */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "center",
          padding: "12px 0 20px"
        }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700 }}>SmartWallet</h1>
            <p style={{ fontSize: 13, color: "var(--text-tertiary)" }}>Ethereum Wallet</p>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <Link
              href="/settings"
              className="btn-icon"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-light)",
                fontSize: 16,
                textDecoration: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Settings"
            >
              ⚙️
            </Link>
            <button
              onClick={() => fetchBalances(ownerAddress, guardianAddress, contractAddress)}
              className="btn-icon"
              style={{
                background: "var(--bg-primary)",
                border: "1px solid var(--border-light)",
                fontSize: 16
              }}
              title="Refresh balance"
            >
              🔄
            </button>
          </div>
        </div>

        {/* Total Balance Card */}
        <div className="card card-elevated fade-in" style={{
          background: "linear-gradient(135deg, var(--bg-accent), var(--bg-accent-light))",
          color: "white", marginBottom: 20, border: "none"
        }}>
          <p style={{ fontSize: 12, opacity: 0.8, marginBottom: 4, textTransform: "uppercase", letterSpacing: "1px", fontWeight: 600 }}>
            Total Balance
          </p>
          {loading ? (
            <div className="skeleton" style={{ height: 36, width: 160, marginBottom: 4, opacity: 0.3 }} />
          ) : error ? (
            <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
              <p style={{ fontSize: 32, fontWeight: 800 }}>Error</p>
              <button 
                onClick={() => fetchBalances(ownerAddress, guardianAddress, contractAddress)}
                style={{ background: "rgba(255,255,255,0.2)", border: "none", color: "white", padding: "4px 8px", borderRadius: 4, fontSize: 10, cursor: "pointer" }}
              >
                Retry
              </button>
            </div>
          ) : (
            <p style={{ fontSize: 32, fontWeight: 800 }}>
              {totalBalance} <span style={{ fontSize: 16, opacity: 0.8 }}>ETH</span>
            </p>
          )}
          <p style={{ fontSize: 12, opacity: 0.6, marginTop: 4 }}>{contractAddress ? "3" : "2"} wallets active</p>
        </div>

        {/* Quick Actions */}
        <div className="fade-in" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 8, marginBottom: 24 }}>
          {[
            { href: "/send", icon: "📤", label: "Send" },
            { href: "/receive", icon: "📥", label: "Receive" },
            { href: "/multisign", icon: "🔐", label: "Multi-Sign" },
            { href: "/backup", icon: "🔑", label: "Backup" },
          ].map((action) => (
            <Link key={action.href} href={action.href} style={{
              display: "flex", flexDirection: "column", alignItems: "center", gap: 6,
              padding: "14px 8px", background: "var(--bg-primary)", borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-light)", textDecoration: "none",
              transition: "all var(--transition)", fontSize: 12, fontWeight: 600,
              color: "var(--text-primary)"
            }}>
              <span style={{ fontSize: 22 }}>{action.icon}</span>
              {action.label}
            </Link>
          ))}
        </div>

        {/* Wallet Cards */}
        <div style={{ marginBottom: 16 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700 }}>Your Wallets</h2>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 16, overflowX: "auto", paddingBottom: 4 }}>
            {contractAddress && (
              <button
                onClick={() => setActiveWalletTab("smart")}
                className={`btn btn-sm ${activeWalletTab === "smart" ? "btn-primary" : "btn-outline"}`}
                style={{ borderRadius: "var(--radius-full)", whiteSpace: "nowrap" }}
              >
                🏦 Smart Contract
              </button>
            )}
            {ownerAddress && (
              <button
                onClick={() => setActiveWalletTab("owner")}
                className={`btn btn-sm ${activeWalletTab === "owner" ? "btn-primary" : "btn-outline"}`}
                style={{ borderRadius: "var(--radius-full)", whiteSpace: "nowrap" }}
              >
                👤 Owner
              </button>
            )}
            {guardianAddress && (
              <button
                onClick={() => setActiveWalletTab("guardian")}
                className={`btn btn-sm ${activeWalletTab === "guardian" ? "btn-primary" : "btn-outline"}`}
                style={{ borderRadius: "var(--radius-full)", whiteSpace: "nowrap" }}
              >
                🛡️ Guardian
              </button>
            )}
          </div>
          
          {activeWalletTab === "smart" && contractAddress && (
             <div className="card wallet-card fade-in" style={{ marginBottom: 12, border: "2px solid var(--text-accent)", background: "var(--bg-accent-subtle)" }}>
               <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                 <span className="badge badge-accent" style={{ background: "var(--text-accent)", color: "white" }}>
                   🏦 SmartWallet Contract
                 </span>
                 <button
                   onClick={async () => await navigator.clipboard.writeText(contractAddress)}
                   className="btn-icon"
                   style={{
                     background: "var(--bg-primary)",
                     color: "var(--text-accent)",
                     fontSize: 14,
                     border: "1px solid var(--text-accent)",
                   }}
                   title="Copy address"
                 >
                   📋
                 </button>
               </div>
               <div style={{ marginBottom: 4 }}>
                 <span style={{ fontSize: 12, color: "var(--text-tertiary)", textTransform: "uppercase", letterSpacing: "0.5px", fontWeight: 600 }}>
                   Address (Deposit Here)
                 </span>
                 <p style={{ fontSize: 14, fontWeight: 500, fontFamily: "monospace", color: "var(--text-primary)", marginTop: 2 }}>
                   {contractAddress.slice(0, 6)}...{contractAddress.slice(-4)}
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
                     {parseFloat(contractBalance).toFixed(4)} <span style={{ fontSize: 14, color: "var(--text-secondary)" }}>ETH</span>
                   </p>
                 )}
               </div>
             </div>
          )}

          {activeWalletTab === "owner" && ownerAddress && (
            <div className="fade-in">
              <WalletCard
                address={ownerAddress}
                balance={ownerBalance}
                role="owner"
                loading={loading}
              />
            </div>
          )}
          
          {activeWalletTab === "guardian" && guardianAddress && (
            <div className="fade-in">
              <WalletCard
                address={guardianAddress}
                balance={guardianBalance}
                role="guardian"
                loading={loading}
              />
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div style={{ marginBottom: 20 }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Recent Activity</h2>
          <div className="empty-state card" style={{ padding: "32px 16px" }}>
            <span className="icon">📋</span>
            <h3>No transactions yet</h3>
            <p>Your transaction history will Appear here</p>
          </div>
        </div>
      </div>
    </div>
  );
}
