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
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* Left Section - Logo Only */}
          <div className="flex items-center">
            <Link href="/" className="text-2xl font-bold text-green-600">
              IvyLeagueTr
            </Link>
          </div>

          {/* Right Section */}
          <div className="flex items-center">
            {isClient && isAuthenticated ? (
              <>
                <Link 
                  href="/messages" 
                  className="mr-6 text-gray-700 hover:text-green-600"
                >
                  <Mail className="w-6 h-6" />
                </Link>
                <div className="relative" ref={dropdownRef}>
                  {/* Profile Picture */}
                  <div 
                    className="w-10 h-10 rounded-full overflow-hidden border-2 border-green-500 cursor-pointer"
                    onClick={toggleDropdown}
                  >
                    {user?.profile_photo_url ? (
                      <Image
                        src={user.profile_photo_url}
                        alt="Profile"
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    ) : (
                      <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                        <span className="text-gray-500 text-sm font-bold">
                          {user?.username?.charAt(0)?.toUpperCase() || 'U'}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Dropdown (appears on click) */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded shadow-lg py-1 z-50">
                      <Link 
                        href="/profile" 
                        className="block px-4 py-2 text-gray-700 hover:bg-gray-100"
                        onClick={() => setIsDropdownOpen(false)}
                      >
                        Profile
                      </Link>
                      <button
                        onClick={() => {
                          handleLogout();
                          setIsDropdownOpen(false);
                        }}
                        className="block w-full text-left px-4 py-2 text-red-600 hover:bg-gray-100"
                      >
                        Logout
                      </button>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Link href="/login" className="px-3 py-2 text-gray-700 hover:text-green-600">
                  Login
                </Link>
                <Link href="/signup" className="px-3 py-2 bg-green-600 text-white hover:bg-green-700 rounded">
                  Sign Up
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
