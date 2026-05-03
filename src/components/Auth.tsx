import React from 'react';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth } from '../firebase';
import { LogIn, ArrowLeft } from 'lucide-react';
import { motion } from 'motion/react';

interface AuthProps {
  onCancel?: () => void;
}

export const Auth: React.FC<AuthProps> = ({ onCancel }) => {
  const handleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error: any) {
      if (error && (error.code === 'auth/cancelled-popup-request' || error.code === 'auth/popup-closed-by-user')) {
        console.log('Login popup cancelled by user.');
        return;
      }
      console.error('Login failed:', error);
      alert(`Login failed: ${error instanceof Error ? error.message : String(error)}\n\nJika Anda menjalankan ini di localhost, pastikan localhost telah ditambahkan ke Authorized Domains di Firebase Console (Authentication -> Settings -> Authorized domains).`);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="max-w-md w-full bg-white border border-slate-200 p-8 shadow-sm rounded-2xl border-slate-200 relative"
      >
        {onCancel && (
          <button 
            onClick={onCancel}
            className="absolute top-4 right-4 p-2 text-slate-900/50 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
        )}
        <h1 className="text-3xl font-serif mb-2 tracking-tight text-slate-900">Manajemen Jadwal Pelatihan</h1>
        <p className="text-slate-900/90 mb-8 font-mono text-sm uppercase tracking-wider italic">
          // SISTEM MANAJEMEN PELATIHAN
        </p>
        
        <button
          onClick={handleLogin}
          className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white shadow-sm py-4 px-6 font-bold tracking-wide font-sans rounded-full shadow-md hover:bg-indigo-700 transition-all hover:-translate-y-0.5 hover:shadow-lg"
        >
          <LogIn size={20} />
          Sign in with Google
        </button>
        
        <div className="mt-8 pt-8 border-t border-slate-200/10">
          <p className="text-xs font-mono text-slate-900/90 leading-relaxed">
            Authorized access only. Please sign in with your institutional account to manage schedules and facilitators.
          </p>
          {onCancel && (
            <button 
              onClick={onCancel}
              className="mt-4 w-full border border-slate-200 text-slate-900 rounded-full py-3 text-xs font-bold tracking-wide font-sans hover:bg-slate-50 transition-colors"
            >
              Kembali ke Halaman Publik
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};
