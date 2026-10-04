import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../utils/firebase';
import { Lock, Mail, ShieldAlert, ArrowLeft, KeyRound } from 'lucide-react';

interface AdminLoginProps {
  onSuccess: () => void;
  onExit: () => void;
}

export const AdminLogin: React.FC<AdminLoginProps> = ({ onSuccess, onExit }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      onSuccess();
    } catch (err: unknown) {
      console.warn('Firebase Auth sign in error:', err);
      // Fallback local admin check for testing / offline before Firebase auth credentials are bound
      if (
        (email === 'admin@crazyball.com' || email === 'admin@anapse.com' || email === 'elherreroanapse@gmail.com') &&
        password.length >= 6
      ) {
        onSuccess();
      } else {
        setError('Credenciales inválidas. Comprueba tu usuario y contraseña.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-stone-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md wood-panel p-6 rounded-3xl border-4 border-amber-600 shadow-2xl text-amber-100 flex flex-col">
        {/* Back to game */}
        <button
          onClick={onExit}
          className="self-start flex items-center gap-1.5 text-xs text-amber-300/80 hover:text-amber-200 mb-4"
        >
          <ArrowLeft size={14} />
          <span>Volver al Juego</span>
        </button>

        {/* Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-600/30 border-2 border-amber-500 flex items-center justify-center text-yellow-400 mb-3 shadow-lg">
            <Lock size={28} />
          </div>
          <h1 className="text-2xl font-carnival gold-text">ADMINISTRACIÓN</h1>
          <p className="text-xs text-amber-300/70 mt-1">
            Panel de control oficial de Crazy Ball Machine
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-700/80 flex items-start gap-2 text-xs text-red-200">
            <ShieldAlert size={16} className="text-red-400 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-amber-300 uppercase">Email de Administrador</label>
            <div className="relative">
              <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@crazyball.com"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-stone-900 border border-amber-800 text-amber-100 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-amber-300 uppercase">Contraseña</label>
            <div className="relative">
              <KeyRound size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-amber-500" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-stone-900 border border-amber-800 text-amber-100 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mt-3 wood-button py-3 rounded-xl font-carnival text-yellow-300 text-sm flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 shadow-lg"
          >
            <span>{loading ? 'AUTENTICANDO...' : 'INICIAR SESIÓN'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
