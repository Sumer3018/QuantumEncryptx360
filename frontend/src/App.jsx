import { useState } from 'react';
// Import scrolling hooks
import { motion, useScroll, useTransform } from 'framer-motion'; 
import Header from './components/Header';
import SessionManager from './components/SessionManager';
import Encryptor from './components/Encryptor';
import Decryptor from './components/Decryptor';
import Visualizer from './components/Visualizer';

const API_BASE_URL = 'http://localhost:8000/api/v1';
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      delayChildren: 0.2,
      staggerChildren: 0.2,
    },
  },
};

const INITIAL_PROCESS_STATUS = {
  session: { status: 'idle', type: 'idle', message: 'Waiting for key generation...' },
  encrypt: { status: 'idle', type: 'idle', message: 'Waiting for file...' },
  decrypt: { status: 'idle', type: 'idle', message: 'Waiting for components...' },
};

export default function App() {
  const [currentUser, setCurrentUser] = useState('Alice');
  const [peerUser, setPeerUser] = useState('Bob');
  const [isLoading, setIsLoading] = useState(false);
  const [processStatus, setProcessStatus] = useState(INITIAL_PROCESS_STATUS);
  const [cryptoComponents, setCryptoComponents] = useState({
    nonce: '',
    tag: '',
    ciphertext: '',
  });
  const [decryptedPreview, setDecryptedPreview] = useState('');

  const resetStatus = (currentProcess) => {
    setDecryptedPreview('');
    setProcessStatus((prev) => {
      let nextStatus = { ...INITIAL_PROCESS_STATUS };
      if (currentProcess !== 'session' && prev.session.status === 'success') {
        nextStatus.session = { status: 'success', type: 'success', message: 'Session active' };
      }
      if (currentProcess !== 'session' && currentProcess !== 'encrypt' && prev.encrypt.status === 'success') {
         nextStatus.encrypt = { status: 'success', type: 'success', message: 'Encryption complete' };
      }
      if (currentProcess === 'session') {
          nextStatus = {...INITIAL_PROCESS_STATUS};
      }
      return nextStatus;
    });
  };

  const handleGenerateKey = async (simulateEavesdropper) => {
    if (currentUser === peerUser) {
      setProcessStatus({ ...INITIAL_PROCESS_STATUS, session: { status: 'error', type: 'error', message: 'User and Peer cannot be the same.' }});
      setDecryptedPreview('');
      return;
    }
    setIsLoading(true);
    resetStatus('session');
    setProcessStatus(prev => ({ ...prev, session: { status: 'loading', type: 'loading', message: 'Establishing secure session... (QKD running)' }}));
    await sleep(1500);

    const formData = new FormData();
    formData.append('user_id', currentUser);
    formData.append('peer_id', peerUser);
    formData.append('simulate_eavesdropper', simulateEavesdropper);

    try {
      const response = await fetch(`${API_BASE_URL}/session/initiate`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        let detailMessage = `Request failed: ${response.status}`;
        let statusToSet = 'error';
        let typeToSet = 'error';

        if (response.status === 403) {
            statusToSet = 'eavesdropper';
            typeToSet = 'eavesdropper';
            detailMessage = 'Attack detected. Session terminated.';
             try {
                const errorData = await response.json();
                detailMessage = errorData.detail || detailMessage;
             } catch (e) { console.error("Could not parse 403 error JSON:", e); }
        } else {
             try {
                const errorData = await response.json();
                detailMessage = errorData.detail || detailMessage;
             } catch (e) { console.error(`Could not parse ${response.status} error JSON:`, e); }
        }

        setProcessStatus({
            ...INITIAL_PROCESS_STATUS,
            session: { status: statusToSet, type: typeToSet, message: detailMessage }
        });
        setDecryptedPreview('');
        return;
      }

      const data = await response.json();
      setProcessStatus({
          ...INITIAL_PROCESS_STATUS,
          session: { status: 'success', type: 'success', message: 'Secure session established!' }
      });

    } catch (networkError) {
       console.error("Network error during session initiation:", networkError);
       setProcessStatus({ ...INITIAL_PROCESS_STATUS, session: { status: 'error', type: 'error', message: 'Network error: Could not connect to server.' }});
       setDecryptedPreview('');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEncrypt = async (file) => {
    setIsLoading(true);
    resetStatus('encrypt');
    setProcessStatus(prev => ({ ...prev, encrypt: { status: 'loading', type: 'loading', message: 'Encrypting file...' }}));
    setCryptoComponents({ nonce: '', tag: '', ciphertext: '' });
    await sleep(1000);

    const formData = new FormData();
    formData.append('user_id', currentUser);
    formData.append('peer_id', peerUser);
    formData.append('file', file);

    try {
      const response = await fetch(`${API_BASE_URL}/encrypt-file`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
         let detailMessage = `Encryption failed: ${response.status}`;
         try { const errorData = await response.json(); detailMessage = errorData.detail || detailMessage; } catch (e) {}
         throw new Error(detailMessage);
      }
      const data = await response.json();
      setCryptoComponents(data);
      setProcessStatus(prev => ({ ...prev, encrypt: { status: 'success', type: 'success', message: 'File encrypted. Components ready.' }}));
    } catch (error) {
       setProcessStatus(prev => ({ ...prev, encrypt: { status: 'error', type: 'error', message: error.message }}));
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecryptPreview = async (components) => {
    setIsLoading(true);
    resetStatus('decrypt');
    setProcessStatus(prev => ({ ...prev, decrypt: { status: 'loading', type: 'loading', message: 'Decrypting preview...' }}));
    await sleep(1000);

    const formData = new FormData();
    formData.append('user_id', currentUser);
    formData.append('peer_id', peerUser);
    formData.append('nonce', components.nonce);
    formData.append('tag', components.tag);
    formData.append('ciphertext', components.ciphertext);

    try {
      const response = await fetch(`${API_BASE_URL}/decrypt-file-preview`, {
        method: 'POST',
        body: formData,
      });
       if (!response.ok) {
         let detailMessage = `Decryption failed: ${response.status}`;
         try { const errorData = await response.json(); detailMessage = errorData.detail || detailMessage; } catch (e) {}
         throw new Error(detailMessage);
      }
      const data = await response.json();
      setDecryptedPreview(data.plaintext);
      setProcessStatus(prev => ({ ...prev, decrypt: { status: 'success', type: 'success', message: 'Decryption preview successful.' }}));
    } catch (error) {
       setProcessStatus(prev => ({ ...prev, decrypt: { status: 'error', type: 'error', message: error.message }}));
      setDecryptedPreview(`Error: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };


  const isSessionReady = processStatus.session.status === 'success';
  const isEncryptReady = processStatus.encrypt.status === 'success';

  // --- PARALLAX SCROLL LOGIC ---
  const { scrollYProgress } = useScroll({ target: null });
  
  // FIX: Changed from [0, -150] to [0, 150] for correct scroll direction
  const parallaxY = useTransform(scrollYProgress, [0, 1], [0, 150]); 
  // -----------------------------

  return (
    <div className="min-h-screen p-4 sm:p-8 flex justify-center py-8">
      <div className="w-full max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -50 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, ease: 'easeOut' }}>
          <Header />
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 relative">

          {/* Column 1: The Visualizer BOX */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="bg-gray-800 shadow-2xl rounded-2xl ring-1 ring-blue-500/20 flex items-center justify-center p-6 min-h-[450px]"
          >
            {/* The Visualizer component now receives the parallax style */}
            <Visualizer
              processes={processStatus}
              previewText={decryptedPreview}
              currentUser={currentUser}
              peerUser={peerUser}
              parallaxStyle={{ y: parallaxY }}
            />
          </motion.div>

          {/* Column 2: The Controls */}
          <motion.div className="space-y-8" variants={containerVariants} initial="hidden" animate="visible">
            <SessionManager currentUser={currentUser} setCurrentUser={setCurrentUser} peerUser={peerUser} setPeerUser={setPeerUser} onGenerateKey={handleGenerateKey} isLoading={isLoading} status={processStatus.session} />
            <Encryptor onEncrypt={handleEncrypt} cryptoComponents={cryptoComponents} isLoading={isLoading} isDisabled={!isSessionReady} status={processStatus.encrypt} />
            <Decryptor onDecryptPreview={handleDecryptPreview} isLoading={isLoading} isDisabled={!isEncryptReady} currentUser={currentUser} peerUser={peerUser} status={processStatus.decrypt} />
          </motion.div>
        </div>
      </div>
    </div>
  );
}