// Script to set up Zero-Knowledge Proof circuits
const { execSync } = require("child_process")
const fs = require("fs")
const path = require("path")

// Create zkp directory if it doesn't exist
const zkpDir = path.join(__dirname, "../zkp")
if (!fs.existsSync(zkpDir)) {
  fs.mkdirSync(zkpDir, { recursive: true })
}

console.log("Setting up Zero-Knowledge Proof circuits...")

try {
  // Check if snarkjs is installed
  execSync("npx snarkjs --version", { stdio: "inherit" })

  // Compile the circuit
  console.log("Compiling circuit...")
  execSync("npx circom zkp/circuit.circom --r1cs --wasm --sym", { stdio: "inherit" })

  // Setup the ceremony
  console.log("Setting up the ceremony...")
  execSync("npx snarkjs powersoftau new bn128 12 zkp/pot12_0000.ptau -v", { stdio: "inherit" })
  execSync(
    'npx snarkjs powersoftau contribute zkp/pot12_0000.ptau zkp/pot12_0001.ptau --name="First contribution" -v -e="random text"',
    { stdio: "inherit" },
  )
  execSync("npx snarkjs powersoftau prepare phase2 zkp/pot12_0001.ptau zkp/pot12_final.ptau -v", { stdio: "inherit" })

  // Generate the proving key
  console.log("Generating proving key...")
  execSync("npx snarkjs groth16 setup zkp/circuit.r1cs zkp/pot12_final.ptau zkp/circuit_0000.zkey", {
    stdio: "inherit",
  })
  execSync(
    'npx snarkjs zkey contribute zkp/circuit_0000.zkey zkp/circuit_final.zkey --name="Final contribution" -v -e="more random text"',
    { stdio: "inherit" },
  )

  // Export the verification key
  console.log("Exporting verification key...")
  execSync("npx snarkjs zkey export verificationkey zkp/circuit_final.zkey zkp/verification_key.json", {
    stdio: "inherit",
  })

  console.log("ZKP setup completed successfully!")
} catch (error) {
  console.error("Error setting up ZKP:", error.message)
  console.log("Creating placeholder files for simulation...")

  // Create placeholder files for simulation
  const placeholderVerificationKey = {
    protocol: "groth16",
    curve: "bn128",
    nPublic: 1,
    vk_alpha_1: ["0", "0", "0"],
    vk_beta_2: [
      ["0", "0"],
      ["0", "0"],
      ["0", "0"],
    ],
    vk_gamma_2: [
      ["0", "0"],
      ["0", "0"],
      ["0", "0"],
    ],
    vk_delta_2: [
      ["0", "0"],
      ["0", "0"],
      ["0", "0"],
    ],
    vk_alphabeta_12: [
      ["0", "0"],
      ["0", "0"],
      ["0", "0"],
    ],
    IC: [["0", "0", "0"]],
  }

  fs.writeFileSync(path.join(zkpDir, "verification_key.json"), JSON.stringify(placeholderVerificationKey, null, 2))
  console.log("Created placeholder verification key for simulation.")

  console.log("Note: The system will use simulated ZKP since the real setup failed.")
}
