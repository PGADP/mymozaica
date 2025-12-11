'use client';

import Link from 'next/link';
import { useState, useRef, useEffect } from 'react';
import { User, Settings, LogOut } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase/client';

interface HeaderProps {
  user: {
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

export default function Header({ user }: HeaderProps) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const supabase = createClient();

  // Fermer le dropdown en cliquant à l'extérieur
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Calculer les initiales
  const getInitials = () => {
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'MZ';
  };

  // Déconnexion
  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-border-ui shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Logo - cliquable vers la landing page */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-primary rounded-full group-hover:scale-105 transition-transform flex items-center justify-center text-white font-heading font-bold text-xl shadow-lg shadow-primary/20">
            M
          </div>
          <div className="flex flex-col">
            <span className="text-xl font-heading font-bold text-text-main leading-none">
              My Mozaïca
            </span>
            <span className="text-xs text-text-muted leading-none mt-0.5">
              Votre fresque de vie
            </span>
          </div>
        </Link>

        {/* Bulle Profil avec Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-11 h-11 bg-gradient-to-br from-[#2A9D8F] to-[#2A9D8F]/80 text-white font-bold rounded-full flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105 transition-all duration-200 border-2 border-white"
            aria-label="Menu utilisateur"
          >
            {getInitials()}
          </button>

          {/* Dropdown Menu */}
          {isDropdownOpen && (
            <div className="absolute right-0 mt-3 w-64 bg-white rounded-2xl shadow-2xl border border-[#FDF6E3] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
              {/* User Info */}
              <div className="px-4 py-4 border-b border-[#FDF6E3] bg-gradient-to-br from-[#FDF6E3]/50 to-white">
                <p className="text-sm font-bold text-[#2C3E50] truncate">
                  {user.first_name && user.last_name
                    ? `${user.first_name} ${user.last_name}`
                    : 'Mon compte'}
                </p>
                <p className="text-xs text-[#47627D] truncate">{user.email}</p>
              </div>

              {/* Menu Items */}
              <div className="py-2">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-3 text-sm text-[#2C3E50] hover:bg-[#FDF6E3] transition-colors"
                >
                  <Settings size={18} className="text-[#47627D]" />
                  <span className="font-medium">Paramètres du compte</span>
                </Link>

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-4 py-3 text-sm text-[#E76F51] hover:bg-[#E76F51]/5 transition-colors"
                >
                  <LogOut size={18} />
                  <span className="font-medium">Déconnexion</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
