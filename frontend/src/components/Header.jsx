import { Lock } from 'lucide-react';

export default function Header() {
  return (
    <div className="text-center mb-8">
      <div className="flex items-center justify-center space-x-3 mb-3">
        <div className="p-3 bg-blue-600/20 rounded-full ring-8 ring-blue-500/10">
          <Lock className="w-8 h-8 text-blue-400" />
        </div>
      </div>
      <h1 className="text-4xl font-bold text-white">
        QuantumCrypt Sentinel
      </h1>
      <p className="text-lg text-blue-300/70 mt-2">
        A Quantum-Resistant Hybrid Encryption System
      </p>
    </div>
  );
}