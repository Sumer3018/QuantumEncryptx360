import { motion } from 'framer-motion';
import clsx from 'clsx';
import { Loader2 } from 'lucide-react';

export default function Button({
  children,
  onClick,
  disabled = false,
  isLoading = false,
  variant = 'primary',
  className = '',
}) {
  const variants = {
    primary: 'bg-blue-600 text-white',
    success: 'bg-green-600 text-white',
    danger: 'bg-red-600 text-white',
    ghost: 'bg-gray-700 text-gray-200',
  };

  return (
    <motion.button
      onClick={onClick}
      disabled={disabled || isLoading}
      className={clsx(
        'relative flex w-full items-center justify-center rounded-lg px-6 py-3 font-semibold transition-colors overflow-hidden', // Added overflow-hidden
        'disabled:bg-gray-500 disabled:cursor-not-allowed',
        variants[variant],
        className
      )}
      whileTap={{ scale: 0.98 }}
    >
      {/* NEW: Animated Shimmer Effect
        This is a pseudo-element that will animate on hover.
      */}
      <motion.span
        className="absolute inset-0 block h-full w-full"
        whileHover={{
          background:
            'linear-gradient(100deg, rgba(255,255,255,0) 0%, rgba(255,255,255,0.2) 50%, rgba(255,255,255,0) 100%)',
          backgroundPosition: ['-100% 0%', '200% 0%'],
          transition: { duration: 1.2, ease: 'linear', repeat: Infinity },
        }}
      />

      {/* Content (Spinner or Text) */}
      <span className="relative z-10 flex items-center justify-center">
        {isLoading ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute"
          >
            <Loader2 className="h-5 w-5 animate-spin" />
          </motion.div>
        ) : (
          <span className="flex items-center justify-center">{children}</span>
        )}
      </span>
    </motion.button>
  );
}