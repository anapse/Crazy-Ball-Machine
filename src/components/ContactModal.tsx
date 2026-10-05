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
    <div className="absolute inset-0 z-50 flex items-center justify-center p-3 bg-black/85 backdrop-blur-sm animate-fade-in pointer-events-auto select-none">
      <div className="relative w-full max-w-[88%] sm:max-w-xs wood-panel p-4 rounded-3xl border-4 border-amber-600 shadow-2xl text-amber-100 flex flex-col">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 w-7 h-7 rounded-full bg-stone-900/80 border border-amber-500/80 flex items-center justify-center text-amber-300 hover:bg-stone-800 active:scale-95"
        >
          <X size={15} />
        </button>

        {/* Title */}
        <div className="flex items-center gap-1.5 mb-3">
          <Mail className="text-yellow-400" size={20} />
          <h2 className="text-lg font-carnival gold-text">CONTÁCTANOS</h2>
        </div>

        {submitted ? (
          <div className="py-6 flex flex-col items-center text-center gap-2">
            <CheckCircle2 size={36} className="text-emerald-400 animate-bounce" />
            <p className="text-sm font-bold text-amber-200">¡Mensaje Enviado!</p>
            <p className="text-[11px] text-amber-300/80">
              Gracias por tus comentarios y sugerencias para Crazy Ball Machine.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-bold text-amber-300 uppercase">Tu Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jugador@ejemplo.com"
                className="w-full px-2.5 py-1.5 rounded-xl bg-stone-950/90 border border-amber-800/80 text-amber-100 text-xs focus:outline-none focus:border-amber-400 shadow-inner"
              />
            </div>

            <div className="flex flex-col gap-0.5">
              <label className="text-[10px] font-bold text-amber-300 uppercase">Mensaje</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe tus sugerencias o reportes..."
                rows={3}
                required
                className="w-full px-2.5 py-1.5 rounded-xl bg-stone-950/90 border border-amber-800/80 text-amber-100 text-xs focus:outline-none focus:border-amber-400 resize-none shadow-inner"
              />
            </div>

            <div className="flex items-center justify-between text-[10px] text-amber-300/70 pt-0.5">
              <div className="flex items-center gap-1">
                <Globe size={11} />
                <span>Crazy Ball Machine</span>
              </div>
            </div>

            <button
              type="submit"
              className="mt-1 wood-button py-2 rounded-xl flex items-center justify-center gap-1.5 font-carnival text-yellow-300 text-xs active:scale-95"
            >
              <Send size={13} />
              <span>ENVIAR MENSAJE</span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
