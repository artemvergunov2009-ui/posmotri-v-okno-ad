import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CheckCircle, XCircle, Info, X } from 'lucide-react';
import { useNotification } from '@/contexts/NotificationContext';

export default function NotificationSystem() {
  const { notifications, removeNotification } = useNotification();

  return (
    <div className="fixed top-4 right-4 z-[9999] w-full max-w-sm pointer-events-none">
      <AnimatePresence>
        {notifications.map((notification) => (
          <motion.div
            key={notification.id}
            initial={{ opacity: 0, y: -50, x: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            className={`relative flex items-center gap-3 p-4 pr-10 mb-3 rounded-xl shadow-lg border pointer-events-auto
              ${notification.type === 'success' ? 'bg-green-50 border-green-200 text-green-800' : ''}
              ${notification.type === 'error' ? 'bg-red-50 border-red-200 text-red-800' : ''}
              ${notification.type === 'info' ? 'bg-blue-50 border-blue-200 text-blue-800' : ''}
            `}
          >
            {notification.type === 'success' && <CheckCircle className="w-5 h-5 text-green-600" />}
            {notification.type === 'error' && <XCircle className="w-5 h-5 text-red-600" />}
            {notification.type === 'info' && <Info className="w-5 h-5 text-blue-600" />}
            <span className="text-sm font-medium flex-1">{notification.message}</span>
            <button
              onClick={() => removeNotification(notification.id)}
              className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 transition-colors"
            >
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}