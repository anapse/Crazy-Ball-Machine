import React, { useState, useEffect } from 'react';
import { onAuthStateChanged, signOut, User } from 'firebase/auth';
import { auth } from '../../utils/firebase';
import { AdminLogin } from './AdminLogin';
import { AdminDashboard } from './AdminDashboard';

interface AdminPortalProps {
  onExit: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({ onExit }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLocalAdmin, setIsLocalAdmin] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch {
      // ignore
    }
    setIsLocalAdmin(false);
    setUser(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center text-amber-300 font-carnival">
        Cargando portal de administración...
      </div>
    );
  }

  if (!user && !isLocalAdmin) {
    return (
      <AdminLogin
        onSuccess={() => setIsLocalAdmin(true)}
        onExit={onExit}
      />
    );
  }

  return (
    <AdminDashboard
      onLogout={handleLogout}
      onExitToGame={onExit}
    />
  );
};
