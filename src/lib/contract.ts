/**
 * SmartWallet Contract ABI & Integration
 *
 * Untuk menggunakan, deploy SmartWallet.sol terlebih dahulu, lalu
 * set NEXT_PUBLIC_WALLET_CONTRACT di .env.local
 */

export const SMART_WALLET_ABI = [
  // Constructor
  "constructor(address _owner, address _guardian)",

  // State variables
  "function owner() view returns (address)",
  "function guardian() view returns (address)",
  "function THRESHOLD() view returns (uint256)",
  "function RECOVERY_DELAY() view returns (uint256)",
  "function transactionCount() view returns (uint256)",

  // Transaction functions
  "function submitTransaction(address _to, uint256 _value, bytes _data) returns (uint256 txId)",
  "function approveTransaction(uint256 _txId)",
  "function revokeApproval(uint256 _txId)",

  // Recovery functions
  "function requestRecovery(address _newOwner)",
  "function cancelRecovery()",
  "function executeRecovery()",

  // View functions
  "function isApproved(uint256 _txId, address _signer) view returns (bool)",
  "function getTransaction(uint256 _txId) view returns (address to, uint256 value, bytes data, bool executed, uint256 approvalCount)",
  "function getBalance() view returns (uint256)",
  "function isSigner(address _addr) view returns (bool)",

  // Admin functions
  "function changeGuardian(address _newGuardian)",

  // Events
  "event Deposit(address indexed sender, uint256 amount)",
  "event TransactionSubmitted(uint256 indexed txId, address indexed to, uint256 value)",
  "event TransactionApproved(uint256 indexed txId, address indexed approver)",
  "event TransactionExecuted(uint256 indexed txId)",
  "event TransactionRevoked(uint256 indexed txId, address indexed revoker)",
  "event RecoveryRequested(address indexed newOwner, uint256 executeAfter)",
  "event RecoveryCancelled()",
  "event RecoveryExecuted(address indexed oldOwner, address indexed newOwner)",
  "event OwnerChanged(address indexed oldOwner, address indexed newOwner)",
  "event GuardianChanged(address indexed oldGuardian, address indexed newGuardian)",
] as const;

export const SMART_WALLET_FACTORY_ABI = [
  "function createWallet(address _owner, address _guardian) returns (address)",
  "function userWallets(address user) view returns (address)",
  "function getWalletsCount() view returns (uint256)",
  "event WalletCreated(address indexed owner, address indexed guardian, address indexed walletAddress)"
] as const;

/**
 * Alamat kontrak SmartWalletFactory yang sudah di-deploy.
 * Set di .env.local: NEXT_PUBLIC_FACTORY_CONTRACT=0x...
 */
export const FACTORY_ADDRESS = process.env.NEXT_PUBLIC_FACTORY_CONTRACT || "";

/**
 * Cek apakah kontrak factory sudah dikonfigurasi
 */
export function isContractConfigured(): boolean {
  return FACTORY_ADDRESS.length === 42 && FACTORY_ADDRESS.startsWith("0x");
}
