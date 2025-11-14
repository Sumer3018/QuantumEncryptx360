import { motion } from 'framer-motion';

// This component will wrap our UI sections and animate them in
export default function AnimatedCard({ children, className, isDisabled = false }) {
  return (
    <motion.div
      // This will be controlled by App.jsx to stagger the animations
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ duration: 0.5 }}
      className={`p-6 bg-gray-900 rounded-lg ring-1 ring-gray-700 ${
        isDisabled && 'opacity-50 grayscale pointer-events-none'
      } ${className}`}
    >
      {children}
    </motion.div>
  );
}