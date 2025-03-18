'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { Mail } from 'lucide-react';
import { api } from '../lib/api';

export default function Navbar() {
  const router = useRouter();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<{ username?: string; profile_photo_url?: string } | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsClient(true);
    const token = localStorage.getItem('authToken');

    if (token) {
      setIsAuthenticated(true);
      const userInfo = localStorage.getItem('userInfo');
      if (userInfo) {
        try {
          setUser(JSON.parse(userInfo));
        } catch (e) {
          console.error('Failed to parse user info:', e);
        }
      }

      api.getCurrentUser()
        .then(userData => {
          setUser(userData);
          localStorage.setItem('userInfo', JSON.stringify(userData));
        })
        .catch(error => {
          console.error('Failed to fetch user data:', error);
        });
    }
    
    // Add click outside listener to close dropdown
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    setIsAuthenticated(false);
    setUser(null);
    router.push('/login');
  };

  const toggleDropdown = () => {
    setIsDropdownOpen(!isDropdownOpen);
  };

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b bg-[rgb(var(--surface))]">
      <div className="px-4">
        <div className="flex h-16 items-center justify-between">
          <Link 
            href="/" 
            className="text-[rgb(var(--primary))] text-xl font-bold"
          >
            IvyLeagueTr
          </Link>
          
          {/* Navigation links */}
          <div className="flex items-center space-x-2">
            <Link 
              href="/login" 
              className="px-3 py-2 text-[rgb(var(--muted))] hover:text-[rgb(var(--primary))] transition-colors"
            >
              Login
            </Link>
            <Link 
              href="/signup" 
              className="px-3 py-2 bg-[rgb(var(--primary))] text-[rgb(var(--background))] hover:opacity-90 rounded transition-opacity"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}
