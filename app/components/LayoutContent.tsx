'use client';

import { useEffect, useState } from 'react';
import Link from "next/link";
import { LogOut } from 'lucide-react';
import CommunityList from "@/app/components/CommunityList";

export default function LayoutContent({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userInfo, setUserInfo] = useState<any>(null);
  const [showDropdown, setShowDropdown] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const storedUserInfo = localStorage.getItem('userInfo');
    setIsLoggedIn(!!token);
    if (storedUserInfo) {
      setUserInfo(JSON.parse(storedUserInfo));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userInfo');
    window.location.href = '/login';
  };

  return (
    <div className="flex h-screen">
      {/* Left sidebar - fixed width */}
      <div className="w-[320px] fixed top-0 left-0 h-full border-r flex flex-col">
        <div className="p-4 flex-1">
          <h1 className="text-xl font-bold text-green-600 mb-6">IvyLeagueTr</h1>
          
          {isLoggedIn ? (
            <>
              <h2 className="font-medium mb-4">Communities</h2>
              <div className="space-y-3">
                <CommunityList />
              </div>
            </>
          ) : (
            <div className="space-y-3">
              <Link 
                href="/login"
                className="flex items-center p-3 hover:bg-gray-100 rounded-lg text-gray-700"
              >
                <span className="font-medium">Log In</span>
              </Link>
              <Link 
                href="/signup"
                className="flex items-center p-3 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <span className="font-medium">Sign Up</span>
              </Link>
            </div>
          )}
        </div>

        {/* User profile section at bottom */}
        {isLoggedIn && userInfo && (
          <div className="p-4 border-t relative">
            <div 
              className="flex items-center hover:bg-gray-100 p-2 rounded-lg cursor-pointer"
              onClick={() => setShowDropdown(!showDropdown)}
            >
              <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-green-500 mr-3">
                {userInfo.profile_photo_url ? (
                  <img
                    src={userInfo.profile_photo_url}
                    alt={userInfo.username}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white">
                    {userInfo.username?.[0]?.toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <span className="font-medium">
                {userInfo.username || 'User'}
              </span>
            </div>

            {/* Dropdown menu */}
            {showDropdown && (
              <div className="absolute bottom-full left-0 w-full p-2 bg-white border rounded-lg shadow-lg mb-2">
                <Link href="/profile" className="flex items-center p-2 hover:bg-gray-100 rounded-lg">
                  <span className="font-medium">Profile</span>
                </Link>
                <button
                  onClick={handleLogout}
                  className="flex items-center w-full p-2 hover:bg-gray-100 rounded-lg text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="font-medium">Log Out</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right sidebar - fixed width */}
      <div className="w-[320px] fixed top-0 right-0 h-full border-l">
        <div className="p-4">
          {/* Search input */}
          <div className="relative mb-6">
            <input
              type="text"
              placeholder="Search"
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Main content - centered with fixed width */}
      <div className="flex-1 ml-[320px] mr-[320px]">
        <div className="border-l border-r min-h-screen">
          {children}
        </div>
      </div>
    </div>
  );
} 