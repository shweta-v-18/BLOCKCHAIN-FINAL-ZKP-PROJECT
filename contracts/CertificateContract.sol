// SPDX-License-Identifier: MIT
pragma solidity ^0.8.9;

contract CertificateContract {
    address public owner;
    
    // Mapping to store certificate hashes
    mapping(string => uint256) private certificates;
    mapping(string => bool) private certificateStatus;
    
    // Event emitted when a certificate is stored
    event CertificateStored(string certificateHash, uint256 timestamp);
    
    constructor() {
        owner = msg.sender;
    }
    
    // Function to store a certificate hash
    function storeCertificate(string memory certificateHash) public returns (bool) {
        // Store the certificate with current timestamp
        certificates[certificateHash] = block.timestamp;
        certificateStatus[certificateHash] = true;
        
        // Emit event
        emit CertificateStored(certificateHash, block.timestamp);
        
        return true;
    }
    
    // Function to check if a certificate exists
    function certificateExists(string memory certificateHash) public view returns (bool) {
        return certificateStatus[certificateHash];
    }
    
    // Function to verify a certificate
    function verifyCertificate(string memory certificateHash) public view returns (bool) {
        // Check if certificate exists and return its status
        uint256 timestamp = certificates[certificateHash];
        if (timestamp > 0) {
            return certificateStatus[certificateHash];
        }
        return false;
    }
}
