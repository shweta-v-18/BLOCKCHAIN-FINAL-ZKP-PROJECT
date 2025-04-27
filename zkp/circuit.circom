pragma circom 2.0.0;

/*
 * This is a simple circuit for demonstrating Zero-Knowledge Proofs
 * It proves knowledge of a salt that, when combined with a commitment,
 * produces a specific hash
 */

// Include the hash library
include "circomlib/poseidon.circom";

template CertificateVerifier() {
    // Public inputs
    signal input commitment;
    
    // Private inputs
    signal input salt;
    
    // Compute the hash of the commitment and salt
    component hasher = Poseidon(2);
    hasher.inputs[0] <== commitment;
    hasher.inputs[1] <== salt;
    
    // The output is public and can be verified
    signal output hash;
    hash <== hasher.out;
}

component main {public [commitment]} = CertificateVerifier();
