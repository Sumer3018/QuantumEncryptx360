import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  KeyRound,
  Lock,
  Unlock,
  Hourglass,
  Loader2,
  CheckCircle,
  XCircle,
  ShieldAlert,
} from 'lucide-react';
import clsx from 'clsx'; // Import clsx

// Keyframes for the "shake" animation
const shakeAnimation = {
  x: [0, -8, 8, -6, 6, -3, 3, 0],
  transition: { duration: 0.5, ease: 'easeInOut' },
};

// Map status types to icons and colors
const STATUS_CONFIG = {
  idle: {
    Icon: Hourglass,
    color: 'text-gray-500',
    animate: false,
    glow: false,
  },
  loading: {
    Icon: Loader2,
    color: 'text-blue-400',
    animate: 'spin',
    glow: true,
    glowColor: 'shadow-blue-500/30',
  },
  success: {
    Icon: CheckCircle,
    color: 'text-green-400',
    animate: 'pulse',
    glow: true,
    glowColor: 'shadow-green-500/30',
  },
  error: {
    Icon: XCircle,
    color: 'text-red-400',
    animate: 'shake',
    glow: true,
    glowColor: 'shadow-red-500/30',
  },
  eavesdropper: {
    Icon: ShieldAlert,
    color: 'text-red-400',
    animate: 'shake',
    glow: true,
    glowColor: 'shadow-red-500/50', // Stronger glow for attack
  },
};

export default function ProcessStep({ title, icon, status, message }) {
  const config = STATUS_CONFIG[status.status];
  const { Icon, color, animate, glow, glowColor } = config;

  const animationProps = {
    shake: { animate: shakeAnimation },
    spin: { animate: { rotate: 360 }, transition: { duration: 1, ease: 'linear', repeat: Infinity } },
    pulse: { initial: { scale: 1 }, animate: { scale: [1, 1.05, 1] }, transition: { duration: 1, ease: 'easeInOut', repeat: Infinity } }, // Slower pulse
  };

  return (
    <motion.div
      layout // Animates layout changes smoothly
      initial={{ opacity: 0, y: 15 }} // Slight vertical entrance
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className={clsx(
        "w-full rounded-lg p-3 transition-all duration-300",
        glow && `shadow-lg ${glowColor}` // Apply glow effect
      )}
    >
      {/* --- LAYOUT FIX: Increased spacing --- */}
      <div className="flex items-center space-x-8"> {/* Increased from space-x-4 */}
        
        {/* Status Icon */}
        <motion.div
          key={status.status} // Force re-render on status change
          className="flex-shrink-0 w-8 h-8 flex items-center justify-center" // Ensure fixed width
          {...(animate && animationProps[animate])}
        >
          <Icon className={`h-8 w-8 ${color}`} />
        </motion.div>
        
        {/* Process Icons (Sender -> Process -> Receiver) */}
        {/* --- ADDED ANIMATION --- */}
        <motion.div 
          className="flex-1 flex items-center justify-center space-x-3"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }} // Stagger the appearance slightly
        >
          <User className="h-6 w-6 text-gray-400" />
          <div className="w-16 border-t border-gray-600 border-dashed" />
          {/* Apply color to the central process icon */}
          <span className={clsx(color, 'transition-colors duration-300')}>{icon}</span> 
          <div className="w-16 border-t border-gray-600 border-dashed" />
          <User className="h-6 w-6 text-gray-400" />
        </motion.div>
      </div>
      
      {/* Status Message */}
      <AnimatePresence mode="wait">
        <motion.p
          key={message}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={`mt-3 text-center text-sm ${color}`} // Color matches icon
        >
          {message}
        </motion.p>
      </AnimatePresence>
    </motion.div>
  );
}