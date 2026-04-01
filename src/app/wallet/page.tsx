"use client";

import { useSearchParams } from "next/navigation";
import { Suspense, useMemo } from "react";
import DashboardView from "./Dashboard";
import SendView from "./Send";
import ReceiveView from "./Receive";
import MultiSignView from "./MultiSign";
import BackupView from "./Backup";
import SettingsView from "./Settings";
import CreateView from "./Create";
import ImportView from "./Import";

function WalletContainer() {
  const searchParams = useSearchParams();
  const view = searchParams.get("view") || "dashboard";

  const content = useMemo(() => {
    switch (view) {
      case "dashboard":
        return <DashboardView />;
      case "send":
        return <SendView />;
      case "receive":
        return <ReceiveView />;
      case "multisign":
        return <MultiSignView />;
      case "backup":
        return <BackupView />;
      case "settings":
        return <SettingsView />;
      case "create":
        return <CreateView />;
      case "import":
        return <ImportView />;
      default:
        return <DashboardView />;
    }
  }, [view]);

  return <div className="wallet-container">{content}</div>;
}

export default function WalletPage() {
  return (
    <Suspense fallback={
      <div className="page-wrapper" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ animation: "spin 1s linear infinite", fontSize: 32 }}>⏳</div>
      </div>
    }>
      <WalletContainer />
    </Suspense>
  );
}
