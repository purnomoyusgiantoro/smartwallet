// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title SmartWallet
 * @dev A multi-signature wallet with social recovery features.
 */
contract SmartWallet {
    address public owner;
    address public guardian;
    
    uint256 public constant THRESHOLD = 2; // Approvals needed for execution
    uint256 public constant RECOVERY_DELAY = 1 days;
    
    uint256 public transactionCount;

    struct Transaction {
        address to;
        uint256 value;
        bytes data;
        bool executed;
        uint256 approvalCount;
    }

    mapping(uint256 => Transaction) public transactions;
    mapping(uint256 => mapping(address => bool)) public approvedBy;
    
    // Recovery state
    address public pendingNewOwner;
    uint256 public recoveryExecuteAfter;

    // Events matching ABI
    event Deposit(address indexed sender, uint256 amount);
    event TransactionSubmitted(uint256 indexed txId, address indexed to, uint256 value);
    event TransactionApproved(uint256 indexed txId, address indexed approver);
    event TransactionExecuted(uint256 indexed txId);
    event TransactionRevoked(uint256 indexed txId, address indexed revoker);
    event RecoveryRequested(address indexed newOwner, uint256 executeAfter);
    event RecoveryCancelled();
    event RecoveryExecuted(address indexed oldOwner, address indexed newOwner);
    event OwnerChanged(address indexed oldOwner, address indexed newOwner);
    event GuardianChanged(address indexed oldGuardian, address indexed newGuardian);

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    modifier onlyGuardian() {
        require(msg.sender == guardian, "Not guardian");
        _;
    }

    modifier onlySigner() {
        require(isSigner(msg.sender), "Not a signer");
        _;
    }

    modifier txExists(uint256 _txId) {
        require(_txId < transactionCount, "Tx does not exist");
        _;
    }

    modifier notExecuted(uint256 _txId) {
        require(!transactions[_txId].executed, "Tx already executed");
        _;
    }

    modifier notApproved(uint256 _txId) {
        require(!approvedBy[_txId][msg.sender], "Tx already approved");
        _;
    }

    constructor(address _owner, address _guardian) {
        require(_owner != address(0), "Invalid owner");
        require(_guardian != address(0), "Invalid guardian");
        owner = _owner;
        guardian = _guardian;
    }

    receive() external payable {
        emit Deposit(msg.sender, msg.value);
    }

    // View Functions
    function isSigner(address _addr) public view returns (bool) {
        return _addr == owner || _addr == guardian;
    }

    function isApproved(uint256 _txId, address _signer) public view returns (bool) {
        return approvedBy[_txId][_signer];
    }

    function getTransaction(uint256 _txId) public view returns (
        address to, 
        uint256 value, 
        bytes memory data, 
        bool executed, 
        uint256 approvalCount
    ) {
        require(_txId < transactionCount, "Tx does not exist");
        Transaction storage txn = transactions[_txId];
        return (txn.to, txn.value, txn.data, txn.executed, txn.approvalCount);
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }

    // Transaction Functions
    function submitTransaction(address _to, uint256 _value, bytes calldata _data) 
        public 
        onlySigner 
        returns (uint256 txId) 
    {
        txId = transactionCount;
        transactions[txId] = Transaction({
            to: _to,
            value: _value,
            data: _data,
            executed: false,
            approvalCount: 0
        });
        
        transactionCount++;
        emit TransactionSubmitted(txId, _to, _value);
        
        // Auto approve by submitter
        approveTransaction(txId);
    }

    function approveTransaction(uint256 _txId) 
        public 
        onlySigner 
        txExists(_txId) 
        notExecuted(_txId) 
        notApproved(_txId) 
    {
        approvedBy[_txId][msg.sender] = true;
        transactions[_txId].approvalCount++;
        
        emit TransactionApproved(_txId, msg.sender);

        if (transactions[_txId].approvalCount >= THRESHOLD) {
            executeTransaction(_txId);
        }
    }

    function revokeApproval(uint256 _txId) 
        public 
        onlySigner 
        txExists(_txId) 
        notExecuted(_txId) 
    {
        require(approvedBy[_txId][msg.sender], "Tx not approved by sender");
        
        approvedBy[_txId][msg.sender] = false;
        transactions[_txId].approvalCount--;
        
        emit TransactionRevoked(_txId, msg.sender);
    }

    function executeTransaction(uint256 _txId) internal {
        require(transactions[_txId].approvalCount >= THRESHOLD, "Not enough approvals");
        
        Transaction storage txn = transactions[_txId];
        txn.executed = true;
        
        (bool success, ) = txn.to.call{value: txn.value}(txn.data);
        require(success, "Tx execution failed");
        
        emit TransactionExecuted(_txId);
    }

    // Recovery Functions
    function requestRecovery(address _newOwner) public onlyGuardian {
        require(_newOwner != address(0), "Invalid new owner");
        require(_newOwner != owner, "Already owner");
        
        pendingNewOwner = _newOwner;
        recoveryExecuteAfter = block.timestamp + RECOVERY_DELAY;
        
        emit RecoveryRequested(_newOwner, recoveryExecuteAfter);
    }

    function cancelRecovery() public onlyOwner {
        require(pendingNewOwner != address(0), "No recovery pending");
        
        pendingNewOwner = address(0);
        recoveryExecuteAfter = 0;
        
        emit RecoveryCancelled();
    }

    function executeRecovery() public onlyGuardian {
        require(pendingNewOwner != address(0), "No recovery pending");
        require(block.timestamp >= recoveryExecuteAfter, "Recovery delay not passed");
        
        address oldOwner = owner;
        owner = pendingNewOwner;
        
        pendingNewOwner = address(0);
        recoveryExecuteAfter = 0;
        
        emit RecoveryExecuted(oldOwner, owner);
        emit OwnerChanged(oldOwner, owner);
    }

    // Admin Functions
    function changeGuardian(address _newGuardian) public onlyOwner {
        require(_newGuardian != address(0), "Invalid guardian");
        
        address oldGuardian = guardian;
        guardian = _newGuardian;
        
        emit GuardianChanged(oldGuardian, guardian);
    }
}

/**
 * @title SmartWalletFactory
 * @dev A factory contract to deploy new SmartWallet instances.
 */
contract SmartWalletFactory {
    mapping(address => address) public userWallets;
    address[] public allWallets;

    event WalletCreated(address indexed owner, address indexed guardian, address indexed walletAddress);

    /**
     * @dev Deploys a new SmartWallet
     * @param _owner The owner address
     * @param _guardian The guardian address
     */
    function createWallet(address _owner, address _guardian) external returns (address) {
        require(userWallets[_owner] == address(0), "User already has a wallet");
        require(_owner != address(0), "Invalid owner");
        require(_guardian != address(0), "Invalid guardian");

        SmartWallet newWallet = new SmartWallet(_owner, _guardian);
        address walletAddress = address(newWallet);
        
        userWallets[_owner] = walletAddress;
        allWallets.push(walletAddress);

        emit WalletCreated(_owner, _guardian, walletAddress);

        return walletAddress;
    }

    /**
     * @dev Returns the total number of wallets created
     */
    function getWalletsCount() external view returns (uint256) {
        return allWallets.length;
    }
}
