import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useRef } from 'react';
import ProcessStep from './ProcessStep';
import { User, ShieldX, CheckCircle, XCircle, Loader2, KeyRound, Lock, Unlock, UserX } from 'lucide-react';

// Sub-component for the connection line animation AND status message
function ConnectionVisual({ status }) {
  // Ensure status is defined before destructuring
  const type = status?.type || 'idle';
  const message = status?.message || '';

  const TEXT_COLORS = {
    idle: 'text-blue-200',
    loading: 'text-blue-200',
    success: 'text-green-200',
    error: 'text-red-200',
    eavesdropper: 'text-red-200 font-bold',
  };

  let animationComponent;
  let statusText = '';
  let eveIcon = null;

  // --- 1. EAVESDROPPER ATTACK (Highest Priority) ---
  if (type === 'eavesdropper') {
    statusText = "COMPROMISED CHANNEL";
    eveIcon = (
        <motion.div
            key="eve-icon"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="absolute left-1/2 -translate-x-1/2 top-full mt-2 flex flex-col items-center" 
        >
          <UserX className="h-8 w-8 text-red-400" />
          <span className="text-xs text-red-300">EVE</span>
        </motion.div>
    );
    animationComponent = (
      <>
        {/* Red X icon for compromised state */}
        <XCircle className="h-12 w-12 text-red-400" />
        {/* Red broken line */}
        <svg width="200" height="40" viewBox="0 0 200 40"><motion.path d="M 10 20 L 80 20 L 90 10 L 100 30 L 110 15 L 120 25 L 190 20" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 8" initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.5 }} /></svg>
      </>
    );
  }
  // --- 2. GENERIC ERROR ---
  else if (type === 'error') {
     statusText = "ERROR";
     animationComponent = (
       <>
         <XCircle className="h-12 w-12 text-red-400" />
         <svg width="200" height="40" viewBox="0 0 200 40"><path d="M 10 20 L 190 20" stroke="#ef4444" strokeWidth="3" strokeLinecap="round" strokeDasharray="4 8" /></svg>
       </>
     );
   }
  // 3. KEY GENERATION (QKD)
  else if (type === 'loading' && message.includes('Establishing')) {
    statusText = "BUILDING TUNNEL...";
    animationComponent = (
      <>
        <Loader2 className="h-12 w-12 animate-spin text-blue-400" />
        <svg width="200" height="40" viewBox="0 0 200 40"><motion.path d="M 10 20 L 190 20" stroke="#38bdf8" strokeWidth="3" strokeLinecap="round" strokeDasharray="0 5" initial={{ pathLength: 0, opacity: 1 }} animate={{ pathLength: 1 }} transition={{ duration: 1.5, ease: 'easeInOut' }} /></svg>
      </>
    );
  }
  // 4. ENCRYPTING / DECRYPTING (Data Flow)
  else if (type === 'loading') {
    statusText = message.toUpperCase() + "...";
    animationComponent = (
      <>
        <Loader2 className="h-12 w-12 animate-spin text-green-400" />
        <svg width="200" height="40" viewBox="0 0 200 40"><path d="M 10 20 L 190 20" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" opacity="0.3" /><motion.path d="M 10 20 L 190 20" stroke="#22c55e" strokeWidth="4" strokeLinecap="round" strokeDasharray="20 180" initial={{ strokeDashoffset: 200 }} animate={{ strokeDashoffset: -200 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear', }} /></svg>
      </>
    );
  }
  // 5. SECURE CONNECTION (Default Success / Idle)
  else { // Covers 'success' and 'idle'
     statusText = "SECURE TUNNEL";
     animationComponent = (
       <>
         <CheckCircle className="h-12 w-12 text-green-400" />
         <svg width="200" height="40" viewBox="0 0 200 40"><motion.path d="M 10 20 L 190 20" stroke="#22c55e" strokeWidth="3" strokeLinecap="round" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, delay: 0.2 }} style={{ transformOrigin: 'center' }} /><motion.path d="M 10 20 L 190 20" stroke="#22c55e" strokeWidth="8" strokeLinecap="round" opacity="0.5" initial={{ scaleX: 0 }} animate={{ scaleX: 1 }} transition={{ duration: 0.5, delay: 0.2 }} style={{ transformOrigin: 'center', filter: 'blur(5px)' }} /></svg>
       </>
     );
   }

  // Define animation props based on type
  const animationProps = type === 'eavesdropper'
    ? { x: [0, -10, 10, -8, 8, -5, 5, 0], scale: 1 } // Shake animation
    : { scale: 1 }; // Default animation (just scale in)

  return (
    <motion.div
      key={type} // Re-animate when type changes
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, ...animationProps }}
      exit={{ opacity: 0, scale: 0.5 }}
      transition={{ duration: 0.5 }}
      className="relative flex flex-col items-center" // Relative positioning for Eve icon
    >
      {/* Render the selected animation */}
      {animationComponent}
      {/* Render the status text below the animation */}
      <span className={`mt-2 text-xs ${TEXT_COLORS[type]}`}>
        {statusText}
      </span>
      {/* Conditionally render the Eve icon */}
      <AnimatePresence>{eveIcon}</AnimatePresence>
    </motion.div>
  );
}


export default function Visualizer({ processes, previewText, currentUser, peerUser, parallaxStyle }) { // <-- Parallax Style received

  const getConnectionStatus = () => {
    // 1. Eavesdropper is absolute highest priority
    if (processes.session.status === 'eavesdropper') {
        return processes.session; 
    }

    // 2. Check ANY Error State NEXT
    let errorProcess = null;
    if (processes.decrypt.status === 'error') errorProcess = processes.decrypt;
    else if (processes.encrypt.status === 'error') errorProcess = processes.encrypt;
    else if (processes.session.status === 'error') errorProcess = processes.session;
    if (errorProcess) {
        return { status: 'error', message: errorProcess.message };
    }

    // 3. Check ANY Loading State
    if (processes.decrypt.status === 'loading') return processes.decrypt;
    if (processes.encrypt.status === 'loading') return processes.encrypt;
    if (processes.session.status === 'loading') return processes.session;

    // 4. If nothing else matches, show success/idle
    return { status: 'success', message: 'Secure Tunnel Active' };
  };
  const topConnectionProcess = getConnectionStatus();

  // Get the most relevant message for the top display
  const getTopMessage = () => {
     if (processes.session.status === 'eavesdropper') return processes.session.message;
     if (processes.decrypt.status === 'error') return processes.decrypt.message;
     if (processes.encrypt.status === 'error') return processes.encrypt.message;
     if (processes.session.status === 'error') return processes.session.message;
     if (processes.decrypt.status === 'loading') return processes.decrypt.message;
     if (processes.encrypt.status === 'loading') return processes.encrypt.message;
     if (processes.session.status === 'loading') return processes.session.message;
     if (processes.decrypt.status === 'success') return processes.decrypt.message;
     if (processes.encrypt.status === 'success') return processes.encrypt.message;
     if (processes.session.status === 'success') return processes.session.message;
     return processes.session.message;
  }
  const topMessage = getTopMessage();
  // Determine top message color based on the actual top message's status
  const topStatusType = (
      Object.values(processes).find(p => p.message === topMessage) || processes.session
  ).status;


  const TEXT_COLORS = {
    idle: 'text-blue-200',
    loading: 'text-blue-200',
    success: 'text-green-200',
    error: 'text-red-200',
    eavesdropper: 'text-red-200 font-bold',
  };

  return (
    // Outer div (Box itself)
    <div className="relative flex h-full min-h-[500px] w-full flex-col items-center justify-start p-6 space-y-10">

      {/* --- INNER CONTENT CONTAINER (APPLY PARALLAX HERE) --- */}
      <motion.div style={parallaxStyle} className="w-full flex flex-col items-center justify-start space-y-10">

        {/* Top Status Message */}
        <motion.p key={topMessage} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className={`w-full text-center text-lg ${TEXT_COLORS[topStatusType]}`}>
          {topMessage}
        </motion.p>

        {/* Dynamic User Section */}
        <div className="flex w-full items-center justify-between">
          <motion.div key={currentUser} initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-col items-center">
            <>
              <User className="h-16 w-16 rounded-full bg-blue-500/20 p-3 text-blue-300 ring-2 ring-blue-400" />
              <span className="mt-2 font-semibold text-blue-300 uppercase">{currentUser}</span>
            </>
          </motion.div>

          {/* Connection Visual */}
          <div className="flex-1">
            <AnimatePresence mode="popLayout">
              <ConnectionVisual status={topConnectionProcess} />
            </AnimatePresence>
          </div>

          <motion.div key={peerUser} initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5, delay: 0.1 }} className="flex flex-col items-center">
            <>
              <User className="h-16 w-16 rounded-full bg-blue-500/20 p-3 text-blue-300 ring-2 ring-blue-400" />
              <span className="mt-2 font-semibold text-blue-300 uppercase">{peerUser}</span>
            </>
          </motion.div>
        </div>

        {/* Process List */}
        <div className="w-full space-y-8">
          <ProcessStep title="Session Key" icon={<KeyRound className="h-8 w-8 text-blue-300" />} status={processes.session} message={processes.session.message} />
          <ProcessStep title="Encryption" icon={<Lock className="h-8 w-8 text-green-300" />} status={processes.encrypt} message={processes.encrypt.message} />
          <ProcessStep title="Decryption" icon={<Unlock className="h-8 w-8 text-purple-300" />} status={processes.decrypt} message={processes.decrypt.message} />
        </div>

        {/* Decrypted Preview Area */}
        <div className="w-full h-24 mt-2">
          <AnimatePresence>
            {previewText && (
              <motion.div key="preview-box" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="w-full">
                <label className="mb-2 block text-sm font-medium text-green-300">Decrypted Preview:</label>
                <textarea
                  readOnly
                  value={previewText}
                  className="h-24 w-full min-w-0 resize-none rounded-md border border-green-500/30 bg-gray-900 p-3 font-mono text-sm text-green-300"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}