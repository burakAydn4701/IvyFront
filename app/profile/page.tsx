'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '../lib/api';

type User = {
  id: string;
  username: string;
  email: string;
  profile_photo_url?: string;
};

// Define the expected response type from updateProfilePhoto
interface ProfilePhotoUpdateResponse {
  success: boolean;
  profile_photo_url: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Check if user is authenticated
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/login');
      return;
    }

    // Fetch user data
    const fetchUserData = async () => {
      try {
        setIsLoading(true);
        const userData = await api.getCurrentUser();
        setUser(userData);
        setUsername(userData.username || '');
        setEmail(userData.email || '');
        
        // Store user info in localStorage for navbar
        localStorage.setItem('userInfo', JSON.stringify(userData));
      } catch (error) {
        console.error('Failed to fetch user data:', error);
        localStorage.removeItem('authToken');
        router.push('/login');
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserData();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      const updatedUser = await api.updateProfile({ username, email });
      setUser(updatedUser);
      // Update localStorage for navbar
      localStorage.setItem('userInfo', JSON.stringify(updatedUser));
      setSuccess('Profile updated successfully!');
      setIsEditing(false);
    } catch (err) {
      setError('Failed to update profile. Please try again.');
      console.error('Error updating profile:', err);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    
    const file = e.target.files[0];
    setError('');
    setSuccess('');
    
    try {
      const result = await api.updateProfilePhoto(file) as ProfilePhotoUpdateResponse;
      console.log('Profile photo updated:', result);
      
      // Update the user state with the new profile photo URL
      if (result && result.profile_photo_url) {
        setUser(prev => prev ? { ...prev, profile_photo_url: result.profile_photo_url } : null);
        
        // Update localStorage for navbar
        const userInfo = localStorage.getItem('userInfo');
        if (userInfo) {
          const parsedUserInfo = JSON.parse(userInfo);
          parsedUserInfo.profile_photo_url = result.profile_photo_url;
          localStorage.setItem('userInfo', JSON.stringify(parsedUserInfo));
        }
        
        setSuccess('Profile photo updated successfully!');
      }
    } catch (err) {
      setError('Failed to update profile photo. Please try again.');
      console.error('Error updating profile photo:', err);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

  if (isLoading) {
    return <div className="container mx-auto p-4">Loading...</div>;
  }

  if (!user) {
    return <div className="container mx-auto p-4">User not found</div>;
  }

  const buttonStyle = {
    backgroundColor: 'white',
    color: '#000000',
    fontWeight: 900,
    padding: '8px 16px',
    borderRadius: '4px',
    border: '3px solid #000000',
    boxShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
    cursor: 'pointer',
    fontSize: '16px'
  };

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Your Profile</h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          <p>{error}</p>
          <button className="mt-2 bg-red-500 text-white px-4 py-2 rounded" onClick={() => setError('')}>Try Again</button>
        </div>
      )}
      
      {success && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          <p>{success}</p>
        </div>
      )}
      
      <div className="bg-white shadow-md rounded-lg p-6 mb-6">
        <div className="flex flex-col items-center mb-6">
          <div className="relative mb-4">
            <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-green-500">
              {user.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt="Profile"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src = "https://via.placeholder.com/80";
                  }}
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-xl font-bold">
                    {user.username?.charAt(0)?.toUpperCase() || 'U'}
                  </span>
                </div>
              )}
            </div>
            <div 
              onClick={triggerFileInput}
              className="absolute -bottom-1 -right-1 bg-green-500 text-white p-1 rounded-full shadow-md hover:bg-green-600 cursor-pointer"
              title="Change profile photo"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="white" className="w-3.5 h-3.5">
                <path d="M5.433 13.917l1.262-3.155A4 4 0 017.58 9.42l6.92-6.918a2.121 2.121 0 013 3l-6.92 6.918c-.383.383-.84.685-1.343.886l-3.154 1.262a.5.5 0 01-.65-.65z" />
                <path d="M3.5 5.75c0-.69.56-1.25 1.25-1.25H10A.75.75 0 0010 3H4.75A2.75 2.75 0 002 5.75v9.5A2.75 2.75 0 004.75 18h9.5A2.75 2.75 0 0017 15.25V10a.75.75 0 00-1.5 0v5.25c0 .69-.56 1.25-1.25 1.25h-9.5c-.69 0-1.25-.56-1.25-1.25v-9.5z" />
              </svg>
            </div>
          </div>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handlePhotoUpload}
          />
          <h2 className="text-2xl font-bold text-gray-800">{user.username}</h2>
          <p className="text-gray-700 font-medium">{user.email}</p>
        </div>
        
        {isEditing ? (
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="username">
                Username
              </label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div className="mb-6">
              <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                required
              />
            </div>
            <div className="flex justify-between items-center">
              <button
                type="button"
                onClick={triggerFileInput}
                style={buttonStyle}
              >
                Update Photo
              </button>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setUsername(user.username || '');
                    setEmail(user.email || '');
                  }}
                  style={buttonStyle}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={buttonStyle}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </form>
        ) : (
          <div className="flex justify-end">
            <button
              onClick={() => setIsEditing(true)}
              style={buttonStyle}
            >
              Edit Profile
            </button>
          </div>
        )}
      </div>
    </div>
  );
} 