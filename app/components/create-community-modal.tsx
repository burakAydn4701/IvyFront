'use client';
import { useState } from 'react';
import { X, ImagePlus } from 'lucide-react';
import { api } from '@/app/lib/api';

interface CreateCommunityModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCommunityCreated: () => void;
}

export default function CreateCommunityModal({ isOpen, onClose, onCommunityCreated }: CreateCommunityModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [profilePhoto, setProfilePhoto] = useState<File | null>(null);
  const [bannerImage, setBannerImage] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await api.createCommunity({
        name,
        description,
        profile_photo: profilePhoto || undefined,
        banner_image: bannerImage || undefined,
      });

      setName('');
      setDescription('');
      setProfilePhoto(null);
      setBannerImage(null);
      onCommunityCreated();
      onClose();
    } catch (error) {
      console.error('Failed to create community:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-500 hover:text-gray-700"
        >
          <X className="w-6 h-6" />
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create a Community</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="banner" className="block text-gray-900 font-bold mb-2">
              Banner Image
            </label>
            <div className="relative h-32 bg-gray-100 rounded-lg overflow-hidden">
              {bannerImage ? (
                <img
                  src={URL.createObjectURL(bannerImage)}
                  alt="Banner preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImagePlus className="w-8 h-8 text-gray-400" />
                </div>
              )}
              <input
                type="file"
                id="banner"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && setBannerImage(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label htmlFor="profile" className="block text-gray-900 font-bold mb-2">
              Profile Photo
            </label>
            <div className="relative w-24 h-24 bg-gray-100 rounded-full overflow-hidden">
              {profilePhoto ? (
                <img
                  src={URL.createObjectURL(profilePhoto)}
                  alt="Profile preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <ImagePlus className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <input
                type="file"
                id="profile"
                accept="image/*"
                onChange={(e) => e.target.files?.[0] && setProfilePhoto(e.target.files[0])}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
          </div>

          <div>
            <label htmlFor="name" className="block text-gray-900 font-bold mb-2">
              Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500"
              required
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-gray-900 font-bold mb-2">
              Description
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-500 min-h-[100px]"
              required
            />
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create Community'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
} 