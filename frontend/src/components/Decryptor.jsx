import { useState } from 'react';
import { Unlock, Eye, Download } from 'lucide-react';
import Button from './Button';
import AnimatedCard from './AnimatedCard';
import { motion } from 'framer-motion';

const API_BASE_URL = 'http://localhost:8000/api/v1';

export default function Decryptor({
  onDecryptPreview,
  isLoading,
  isDisabled,
  currentUser,
  peerUser,
  status,
}) {
  const [components, setComponents] = useState({
    nonce: '',
    tag: '',
    ciphertext: '',
  });

  const handleChange = (e) => {
    setComponents({ ...components, [e.target.name]: e.target.value });
  };
  
  const handleDownload = async () => {
    const formData = new FormData();
    formData.append('user_id', currentUser);
    formData.append('peer_id', peerUser);
    formData.append('nonce', components.nonce);
    formData.append('tag', components.tag);
    formData.append('ciphertext', components.ciphertext);

    try {
      const response = await fetch(`${API_BASE_URL}/decrypt-file`, {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.detail || 'Download failed');
      }
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'decrypted_file';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      alert(`Error: ${error.message}`);
    }
  };

  return (
    <AnimatedCard isDisabled={isDisabled}>
      <h2 className="mb-4 flex items-center text-xl font-semibold text-blue-300">
        <Unlock className="mr-2 h-5 w-5" />
        Step 3: Decrypt
      </h2>

      <div className="mb-6 space-y-4">
        <CryptoInput
          label="Nonce"
          name="nonce"
          value={components.nonce}
          onChange={handleChange}
          disabled={isDisabled}
        />
        <CryptoInput
          label="Tag"
          name="tag"
          value={components.tag}
          onChange={handleChange}
          disabled={isDisabled}
        />
        <CryptoInput
          label="Ciphertext"
          name="ciphertext"
          value={components.ciphertext}
          onChange={handleChange}
          disabled={isDisabled}
        />
      </div>

      {/* Button Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Button
          onClick={() => onDecryptPreview(components)}
          disabled={isLoading}
          isLoading={isLoading && status.status === 'loading'}
          variant="ghost" 
          className="bg-purple-600 hover:bg-purple-500 text-white"
        >
          <Eye className="mr-2 h-5 w-5" />
          Preview Decryption
        </Button>
        
        {/*
          --- THIS IS THE FIX ---
          Changed <Example> to </Button>
        */}
        <Button
          onClick={handleDownload}
          disabled={isLoading}
          variant="primary"
        >
          <Download className="mr-2 h-5 w-5" />
          Download Decrypted File
        </Button>
      </div>
    </AnimatedCard>
  );
}

// Helper component for the text inputs
function CryptoInput({ label, name, value, onChange, disabled }) {
  return (
    <div>
      <label
        htmlFor={name}
        className="mb-2 block text-sm font-medium text-gray-300"
      >
        {label}:
      </label>
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="w-full rounded-lg border border-gray-600 bg-gray-700 p-2 font-mono text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        placeholder={`Paste ${label} here...`}
      />
    </div>
  );
}