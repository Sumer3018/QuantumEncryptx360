import { useState } from 'react';
import { UploadCloud, Lock, Copy, FileText, X, Upload } from 'lucide-react';
import Button from './Button';
import AnimatedCard from './AnimatedCard';
import { motion, AnimatePresence } from 'framer-motion';
import clsx from 'clsx';

// --- UPDATED to accept 'status' prop ---
export default function Encryptor({
  onEncrypt,
  cryptoComponents,
  isLoading,
  isDisabled,
  status, // <-- New prop
}) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const removeFile = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setSelectedFile(null);
  };

  return (
    <AnimatedCard isDisabled={isDisabled}>
      <h2 className="mb-4 flex items-center text-xl font-semibold text-blue-300">
        <Lock className="mr-2 h-5 w-5" />
        Step 2: Encrypt File
      </h2>

      <div className="mb-4">
        <label
          htmlFor="file-upload"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={clsx(
            'flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 text-center transition-colors duration-300',
            isDisabled
              ? 'border-gray-700 bg-gray-800'
              : isDragOver
              ? 'border-blue-400 bg-blue-900/30'
              : 'border-gray-600 bg-gray-800 hover:border-blue-400'
          )}
        >
          <AnimatePresence mode="wait">
            {!selectedFile ? (
              <motion.div
                key="upload"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="flex flex-col items-center"
              >
                <UploadCloud className="h-10 w-10 text-gray-400" />
                <p className="mt-2 font-semibold text-white">
                  Drag & drop file or click to browse
                </p>
                <p className="text-xs text-gray-400">
                  Any file type (.txt, .docx, .jpg)
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="file"
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                className="relative flex flex-col items-center"
              >
                <FileText className="h-10 w-10 text-green-400" />
                <p className="mt-2 max-w-xs truncate font-semibold text-green-300">
                  {selectedFile.name}
                </p>
                <p className="text-xs text-gray-400">
                  {(selectedFile.size / 1024).toFixed(2)} KB
                </p>
                <button
                  onClick={removeFile}
                  className="absolute -top-3 -right-3 rounded-full bg-red-600 p-1 text-white shadow-lg hover:bg-red-500"
                >
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </label>
        <input
          id="file-upload"
          type="file"
          onChange={handleFileChange}
          disabled={isDisabled}
          className="hidden"
        />
      </div>

      <Button
        onClick={() => onEncrypt(selectedFile)}
        disabled={!selectedFile || isLoading}
        isLoading={isLoading && status.status === 'loading'}
        variant="success"
        className="w-full"
      >
        <Upload className="mr-2 h-5 w-5" />
        Encrypt
      </Button>

      {cryptoComponents.nonce && (
        <motion.div
          className="mt-6 space-y-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <CryptoOutput
            label="Nonce"
            value={cryptoComponents.nonce}
            onCopy={copyToClipboard}
          />
          <CryptoOutput
            label="Tag"
            value={cryptoComponents.tag}
            onCopy={copyToClipboard}
          />
          <CryptoOutput
            label="Ciphertext"
            value={cryptoComponents.ciphertext}
            onCopy={copyToClipboard}
          />
        </motion.div>
      )}
    </AnimatedCard>
  );
}

function CryptoOutput({ label, value, onCopy }) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-gray-400">
        {label}
      </label>
      <div className="flex">
        <input
          type="text"
          readOnly
          value={value}
          className="w-full rounded-l-md border border-gray-700 bg-gray-800 p-2 font-mono text-sm text-gray-300"
        />
        <button
          onClick={() => onCopy(value)}
          title={`Copy ${label}`}
          className="rounded-r-md border border-l-0 border-gray-700 bg-gray-700 p-2 text-gray-400 hover:bg-gray-600"
        >
          <Copy className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}