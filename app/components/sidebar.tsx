'use client';
import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import Link from 'next/link';
import { PlusCircle } from 'lucide-react';
import CreateCommunityModal from './create-community-modal';

interface Community {
  id: string;
  name: string;
  // Add other community properties as needed
}

export const Sidebar = () => {
  const [communities, setCommunities] = useState<Community[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    const fetchCommunities = async () => {
      try {
        const data = await api.getCommunities();
        setCommunities(data);
      } catch (error) {
        console.error('Failed to fetch communities:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCommunities();
  }, []);

  const refreshCommunities = async () => {
    try {
      const data = await api.getCommunities();
      setCommunities(data);
    } catch (error) {
      console.error('Failed to fetch communities:', error);
    }
  };

  return (
    <div className="flex flex-col space-y-6">
      {/* Communities section */}
      <div>
        <h2 className="text-base font-semibold text-[rgb(var(--foreground))] mb-3">
          Communities
        </h2>
        <div className="space-y-2">
          {communities.map((community) => (
            <Link 
              href={`/communities/${community.id}`} 
              key={community.id}
              className="flex items-center px-3 py-2 rounded-lg hover:bg-[rgb(var(--accent))] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[rgb(var(--primary))] flex items-center justify-center text-[rgb(var(--background))]">
                {community.name[0]}
              </div>
              <span className="ml-3 text-[rgb(var(--foreground))]">
                {community.name}
              </span>
            </Link>
          ))}
        </div>
        
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="w-full mt-4 px-3 py-2 text-[rgb(var(--primary))] rounded-lg
                   hover:bg-[rgb(var(--accent))] transition-colors flex items-center"
        >
          <PlusCircle className="w-5 h-5 mr-2" />
          Create Community
        </button>
      </div>

      {/* Trending section */}
      <div className="pt-4 border-t border-[rgb(var(--muted))/20]">
        <h3 className="text-sm font-medium text-[rgb(var(--muted))] mb-3">
          TRENDING TODAY
        </h3>
        <div className="space-y-2">
          <div className="px-3 py-2 rounded-lg hover:bg-[rgb(var(--accent))] cursor-pointer transition-colors">
            <span className="text-sm text-[rgb(var(--foreground))]">Popular Posts</span>
          </div>
          <div className="px-3 py-2 rounded-lg hover:bg-[rgb(var(--accent))] cursor-pointer transition-colors">
            <span className="text-sm text-[rgb(var(--foreground))]">New Posts</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
  