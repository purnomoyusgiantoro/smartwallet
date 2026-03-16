import { Wallet, JsonRpcProvider, formatEther } from "ethers";
import CryptoJS from "crypto-js";

export interface WalletData {
  address: string;
  encryptedKey: string;
  role: "owner" | "guardian";
}

export interface WalletPair {
  owner: WalletData;
  guardian: WalletData;
  deployedWalletAddress?: string; // Target SmartWallet contract deployed by Factory
}

export interface DecryptedWallet {
  address: string;
  privateKey: string;
  role: "owner" | "guardian";
}

const STORAGE_KEY = "smartwallet_data";
const NETWORK_KEY = "smartwallet_network";

// Generate a pair of wallets (owner + guardian) - Note: This does NOT deploy the physical wallet yet
export function generateWalletPair(password: string): {
  pair: WalletPair;
  ownerPrivateKey: string;
  guardianPrivateKey: string;
} {
  const wallet1 = Wallet.createRandom();
  const wallet2 = Wallet.createRandom();

  const pair: WalletPair = {
    owner: {
      address: wallet1.address,
      encryptedKey: CryptoJS.AES.encrypt(wallet1.privateKey, password).toString(),
      role: "owner",
    },
    guardian: {
      address: wallet2.address,
      encryptedKey: CryptoJS.AES.encrypt(wallet2.privateKey, password).toString(),
      role: "guardian",
    },
    deployedWalletAddress: "", // Initially empty until deployed by the factory
  };

  return {
    pair,
    ownerPrivateKey: wallet1.privateKey,
    guardianPrivateKey: wallet2.privateKey,
  };
}

// Reconstruct a wallet pair from existing private keys (Import)
export function reconstructWalletPair(
  ownerPK: string,
  guardianPK: string,
  smartAddress: string,
  password: string
): WalletPair {
  const wallet1 = new Wallet(ownerPK);
  const wallet2 = new Wallet(guardianPK);

  return {
    owner: {
      address: wallet1.address,
      encryptedKey: CryptoJS.AES.encrypt(ownerPK, password).toString(),
      role: "owner",
    },
    guardian: {
      address: wallet2.address,
      encryptedKey: CryptoJS.AES.encrypt(guardianPK, password).toString(),
      role: "guardian",
    },
    deployedWalletAddress: smartAddress,
  };
}

// Encrypt a private key
export function encryptPrivateKey(key: string, password: string): string {
  return CryptoJS.AES.encrypt(key, password).toString();
}

// Decrypt a private key
export function decryptPrivateKey(cipher: string, password: string): string {
  const bytes = CryptoJS.AES.decrypt(cipher, password);
  return bytes.toString(CryptoJS.enc.Utf8);
}

// Save wallet pair to localStorage
export function saveWallets(pair: WalletPair): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pair));
  }
}

// Load wallet pair from localStorage
export function loadWallets(): WalletPair | null {
  if (typeof window !== "undefined") {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      return JSON.parse(data) as WalletPair;
    }
  }
  return null;
}

// Clear wallets from localStorage
export function clearWallets(): void {
  if (typeof window !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(NETWORK_KEY);
  }
}

// Get balance for an address
export async function getBalance(address: string, rpcUrl?: string): Promise<string | null> {
  const url = rpcUrl || getRpcUrl();
  try {
    const provider = new JsonRpcProvider(url, undefined, { staticNetwork: true });
    const balance = await provider.getBalance(address);
    return formatEther(balance);
  } catch (err) {
    console.error(`Gagal mengambil balance di ${url}:`, err);
    return null;
  }
}

// Save selected network
export function saveNetwork(network: string): void {
  if (typeof window !== "undefined") {
    localStorage.setItem(NETWORK_KEY, network);
  }
}

// Load selected network
export function loadNetwork(): string {
  if (typeof window !== "undefined") {
    return localStorage.getItem(NETWORK_KEY) || "sepolia";
  }
  return "sepolia";
}

// Get RPC URL based on network
export function getRpcUrl(network?: string): string {
  const net = network || loadNetwork();
  switch (net) {
    case "mainnet":
      return "https://eth.llamarpc.com";
    case "sepolia":
      // Gunakan kombinasi RPC publik yang lebih stabil
      return "https://ethereum-sepolia-rpc.publicnode.com";
    default:
      return "https://ethereum-sepolia-rpc.publicnode.com";
  }
}

// Truncate address for display
export function truncateAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Truncate private key for display
export function truncateKey(key: string): string {
  return `${key.slice(0, 10)}...${key.slice(-6)}`;
}
