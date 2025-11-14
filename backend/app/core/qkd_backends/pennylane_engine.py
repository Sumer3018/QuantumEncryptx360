import pennylane as qml
from pennylane import numpy as np
import hashlib
from app.core.exceptions import SecurityError


dev = qml.device("lightning.qubit", wires=1, shots=1)


@qml.qnode(dev)
def bb84_circuit(alice_bit, alice_basis, bob_basis):
    """
    Simulates a single qubit exchange in the BB84 protocol.
    """
    # 1. Alice prepares her qubit
    if alice_bit == 1:
        qml.PauliX(wires=0)  # Flip |0> to |1>
    if alice_basis == 1:
        qml.Hadamard(wires=0)  # Change to diagonal basis |+> or |->

    # 2. Bob measures the qubit in his chosen basis
    if bob_basis == 1:
        qml.Hadamard(wires=0)  # Change from diagonal back to rectilinear

    # 3. Measurement in the Z basis
    return qml.sample(wires=0)


class PennylaneQKD:
    """Simulates the full BB84 QKD protocol."""

    def __init__(self, qber_threshold=0.05, redundancy_factor=4):
        self.qber_threshold = qber_threshold
        self.redundancy_factor = redundancy_factor

    # UPDATED: Add the new 'simulate_eavesdropper' parameter
    def run_protocol(self, key_length_bits: int, simulate_eavesdropper: bool = False) -> str:
        """
        Runs the full BB84 simulation to generate a key.
        
        Args:
            key_length_bits (int): The desired final key length (e.g., 256).
            simulate_eavesdropper (bool): If True, intentionally introduces
                                          errors to fail the QBER check.
        """

        # ... (Step 1 & 2: Generate bits and run circuit - no changes) ...
        n_bits = key_length_bits * self.redundancy_factor

        alice_bits = np.random.randint(0, 2, n_bits)
        alice_bases = np.random.randint(0, 2, n_bits)
        bob_bases = np.random.randint(0, 2, n_bits)
        bob_bits = []

        for i in range(n_bits):
            measured_bit = bb84_circuit(
                alice_bit=alice_bits[i],
                alice_basis=alice_bases[i],
                bob_basis=bob_bases[i]
            )
            bob_bits.append(int(measured_bit[0]))  # Bug fix from before

        bob_bits = np.array(bob_bits)

        # --- NEW SIMULATION LOGIC ---
        if simulate_eavesdropper:
            print("--- SIMULATING EAVESDROPPER: INTRODUCING NOISE ---")
            # Flip ~50% of Bob's bits to guarantee a high QBER
            noise_indices = np.random.choice(
                range(n_bits),
                size=n_bits // 2,
                replace=False
            )
            for idx in noise_indices:
                bob_bits[idx] = 1 - bob_bits[idx]  # Flip the bit
        # ----------------------------

        # 3. Classical Sifting
        matching_bases = (alice_bases == bob_bases)
        sifted_key_alice = alice_bits[matching_bases]
        sifted_key_bob = bob_bits[matching_bases]

        n_sifted = len(sifted_key_alice)
        if n_sifted < key_length_bits:
            raise RuntimeError(
                f"QKD Failed: Not enough sifted bits ({n_sifted}) generated.")

        # 4. QBER Check
        n_check_bits = n_sifted // 4
        if n_check_bits == 0 and n_sifted > 0:
            n_check_bits = 1

        check_indices = np.random.choice(
            range(n_sifted), size=n_check_bits, replace=False)

        error_count = np.sum(
            sifted_key_alice[check_indices] != sifted_key_bob[check_indices])
        qber = error_count / n_check_bits if n_check_bits > 0 else 0

        # This check will now fail when simulate_eavesdropper is True
        if qber > self.qber_threshold:
            raise SecurityError(
                f"QKD Failed: High QBER ({qber*100:.2f}%) detected. Possible eavesdropper.")

        # ... (Rest of the function is unchanged) ...

        # 5. Final Key Generation
        final_key_indices = np.setdiff1d(range(n_sifted), check_indices)
        final_key_bits = sifted_key_bob[final_key_indices]

        if len(final_key_bits) < key_length_bits:
            raise RuntimeError(
                f"QKD Failed: Not enough key bits ({len(final_key_bits)}) after QBER check.")

        final_key_bits = final_key_bits[:key_length_bits]

        key_binary_string = "".join(map(str, final_key_bits))
        key_int = int(key_binary_string, 2)
        key_hex = f'{key_int:x}'.zfill(key_length_bits // 4)

        return key_hex
