"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Navbar() {
  const pathname = usePathname();

  const links = [
    { href: "/dashboard", label: "Wallet", icon: "💎" },
    { href: "/send", label: "Send", icon: "📤" },
    { href: "/receive", label: "Receive", icon: "📥" },
    { href: "/multisign", label: "Multi-Sign", icon: "🔐" },
    { href: "/settings", label: "Settings", icon: "⚙️" },
  ];

  return (
    <nav className="navbar">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          className={pathname === link.href ? "active" : ""}
        >
          <span className="nav-icon">{link.icon}</span>
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
