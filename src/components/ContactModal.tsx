import React from 'react';
import { X, Mail, Globe, Send, CheckCircle2 } from 'lucide-react';

interface ContactModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ContactModal: React.FC<ContactModalProps> = ({ isOpen, onClose }) => {
  const [submitted, setSubmitted] = React.useState(false);
  const [message, setMessage] = React.useState('');
  const [email, setEmail] = React.useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setMessage('');
      setEmail('');
      onClose();
    }, 1800);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-sm wood-panel p-5 rounded-3xl border-4 border-amber-600 shadow-2xl text-amber-100 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-stone-900/80 border border-amber-500/80 flex items-center justify-center text-amber-300 hover:bg-stone-800 active:scale-95"
        >
          <X size={18} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-2 mb-4">
          <Mail className="text-yellow-400" size={24} />
          <h2 className="text-xl font-carnival gold-text">CONTÁCTANOS</h2>
        </div>

        {submitted ? (
          <div className="py-8 flex flex-col items-center text-center gap-3">
            <CheckCircle2 size={48} className="text-emerald-400 animate-bounce" />
            <p className="text-base font-bold text-amber-200">¡Mensaje Enviado!</p>
            <p className="text-xs text-amber-300/80">
              Gracias por tus comentarios y sugerencias para Crazy Ball Machine.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-amber-300 uppercase">Tu Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@ejemplo.com"
                className="w-full px-3 py-2 rounded-xl bg-stone-900/90 border border-amber-800/80 text-amber-100 text-sm focus:outline-none focus:border-amber-400"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-amber-300 uppercase">Mensaje</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe tus sugerencias o reportes..."
                rows={4}
                required
                className="w-full px-3 py-2 rounded-xl bg-stone-900/90 border border-amber-800/80 text-amber-100 text-sm focus:outline-none focus:border-amber-400 resize-none"
              />
            </div>

            <div className="flex items-center justify-between text-[11px] text-amber-300/70 pt-1">
              <div className="flex items-center gap-1">
                <Globe size={13} />
                <span>ANAPSE Arcade Games</span>
              </div>
            </div>

            <button
              type="submit"
              className="mt-2 wood-button py-2.5 rounded-xl flex items-center justify-center gap-2 font-carnival text-yellow-300 text-sm active:scale-95"
            >
              <Send size={16} />
              <span>ENVIAR MENSAJE</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
