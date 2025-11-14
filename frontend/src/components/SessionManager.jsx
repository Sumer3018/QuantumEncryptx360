import { useState } from 'react';
import { Users, KeyRound, RadioTower } from 'lucide-react';
import Button from './Button';
import AnimatedCard from './AnimatedCard';

// --- UPDATED ---
// It now receives all its state as props from App.jsx
export default function SessionManager({ 
  currentUser, setCurrentUser,
  peerUser, setPeerUser,
  onGenerateKey, isLoading, status 
}) {
  const [simulateEavesdropper, setSimulateEavesdropper] = useState(false);

  const USERS = ['Alice', 'Bob', 'Charlie', 'David'];
  const commonSelectClasses =
    'w-full p-3 bg-gray-700 border border-gray-600 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-blue-500';

  return (
    <AnimatedCard>
      <h2 className="mb-4 flex items-center text-xl font-semibold text-blue-300">
        <Users className="mr-2 h-5 w-5" />
        Step 1: Session Manager
      </h2>

      <div className="mb-6 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div>
          <label
            htmlFor="currentUser"
            className="mb-2 block text-sm font-medium text-gray-300"
          >
            You are:
          </label>
          <select
            id="currentUser"
            value={currentUser}
            onChange={(e) => setCurrentUser(e.target.value)}
            className={commonSelectClasses}
          >
            {USERS.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label
            htmlFor="peerUser"
            className="mb-2 block text-sm font-medium text-gray-300"
          >
            Your Peer:
          </label>
          <select
            id="peerUser"
            value={peerUser}
            onChange={(e) => setPeerUser(e.target.value)}
            className={commonSelectClasses}
          >
            {USERS.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="mb-6 flex items-center justify-center rounded-lg border border-red-500/30 bg-red-900/20 p-4">
        <div className="flex items-center space-x-3">
          <RadioTower className="h-6 w-6 text-red-400" />
          <label htmlFor="eavesdropper" className="font-medium text-red-300">
            Simulate Eavesdropper
          </label>
          <button
            type="button"
            role="switch"
            aria-checked={simulateEavesdropper}
            onClick={() => setSimulateEavesdropper(!simulateEavesdropper)}
            className={`
              relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent 
              transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2
              ${simulateEavesdropper ? 'bg-red-600' : 'bg-gray-600'}
            `}
          >
            <span
              className={`
                pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 
                transition duration-200 ease-in-out
                ${simulateEavesdropper ? 'translate-x-5' : 'translate-x-0'}
              `}
            />
          </button>
        </div>
      </div>

      {/* --- UPDATED ---
        onClick no longer passes user/peer, as App.jsx already knows them
      */}
      <Button
        onClick={() => onGenerateKey(simulateEavesdropper)}
        isLoading={isLoading && status.status === 'loading'}
        variant="primary"
      >
        <KeyRound className="mr-2 h-5 w-5" />
        Generate Secure Key
      </Button>
    </AnimatedCard>
  );
}