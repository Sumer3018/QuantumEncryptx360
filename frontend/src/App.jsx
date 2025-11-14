import { useState } from 'react';
// Import scrolling hooks
import { motion, useScroll, useTransform } from 'framer-motion'; 
import Header from './components/Header';
import SessionManager from './components/SessionManager';
import Encryptor from './components/Encryptor';
import Decryptor from './components/Decryptor';
import Visualizer from './components/Visualizer';
import { initiateSession, encryptFile, decryptFilePreview } from "./api.js";

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
    setProcessStatus({
      ...INITIAL_PROCESS_STATUS,
      session: { status: 'error', type: 'error', message: 'User and Peer cannot be the same.' }
    });
    setDecryptedPreview('');
    return;
  }
  setIsLoading(true);
  resetStatus('session');
  setProcessStatus(prev => ({ ...prev, session: { status: 'loading', type: 'loading', message: 'Establishing secure session... (QKD running)' }}));
  await sleep(1500);

  try {
    const data = await initiateSession({ user_id: currentUser, peer_id: peerUser, simulate_eavesdropper: simulateEavesdropper });
    // success
    setProcessStatus({
      ...INITIAL_PROCESS_STATUS,
      session: { status: 'success', type: 'success', message: 'Secure session established!' }
    });
  } catch (err) {
    // err may be {status, body} from api.post helper
    let detailMessage = 'Key establishment failed.';
    let statusToSet = 'error';
    let typeToSet = 'error';

    if (err && err.status === 403) { // security error simulated
      statusToSet = 'eavesdropper';
      typeToSet = 'eavesdropper';
      detailMessage = (err.body && err.body.detail) || 'Attack detected. Session terminated.';
    } else if (err && err.body && err.body.detail) {
      detailMessage = err.body.detail;
    } else if (err && err.text) {
      detailMessage = err.text;
    } else if (err && err.message) {
      detailMessage = err.message;
    }
    setProcessStatus({
      ...INITIAL_PROCESS_STATUS,
      session: { status: statusToSet, type: typeToSet, message: detailMessage }
    });
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

  try {
    const data = await encryptFile({ user_id: currentUser, peer_id: peerUser, file });
    // data = { nonce, tag, ciphertext }
    setCryptoComponents(data);
    setProcessStatus(prev => ({ ...prev, encrypt: { status: 'success', type: 'success', message: 'File encrypted. Components ready.' }}));
  } catch (err) {
    let detailMessage = 'Encryption failed.';
    if (err && err.body && err.body.detail) detailMessage = err.body.detail;
    else if (err && err.text) detailMessage = err.text;
    else if (err && err.message) detailMessage = err.message || detailMessage;
    setProcessStatus(prev => ({ ...prev, encrypt: { status: 'error', type: 'error', message: detailMessage }}));
  } finally {
    setIsLoading(false);
  }
};


  const handleDecryptPreview = async (components) => {
  setIsLoading(true);
  resetStatus('decrypt');
  setProcessStatus(prev => ({ ...prev, decrypt: { status: 'loading', type: 'loading', message: 'Decrypting preview...' }}));
  await sleep(1000);

  try {
    const data = await decryptFilePreview({
      user_id: currentUser,
      peer_id: peerUser,
      nonce: components.nonce,
      tag: components.tag,
      ciphertext: components.ciphertext
    });
    // API returns { status, plaintext } or binary_file note
    setDecryptedPreview(data.plaintext || '');
    setProcessStatus(prev => ({ ...prev, decrypt: { status: 'success', type: 'success', message: 'Decryption preview successful.' }}));
  } catch (err) {
    let detailMessage = 'Decryption failed.';
    if (err && err.body && err.body.detail) detailMessage = err.body.detail;
    else if (err && err.text) detailMessage = err.text;
    else if (err && err.message) detailMessage = err.message || detailMessage;
    setProcessStatus(prev => ({ ...prev, decrypt: { status: 'error', type: 'error', message: detailMessage }}));
    setDecryptedPreview(`Error: ${detailMessage}`);
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