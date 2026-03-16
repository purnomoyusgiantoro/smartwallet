import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SmartWallet - Web3 Ethereum Wallet",
  description: "Secure multi-signature Ethereum wallet with owner and guardian wallets. Send, receive, and manage crypto with enhanced security.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
