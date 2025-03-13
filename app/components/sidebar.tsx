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
    <aside className="w-1/5 p-4 bg-slate-100 h-screen fixed top-0 left-0 mt-16 shadow-md overflow-y-auto">
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold text-gray-900 mb-3">Communities</h2>
          {isLoading ? (
            <div className="text-gray-900">Loading communities...</div>
          ) : (
            <>
              <ul className="space-y-2 mb-2">
                {communities.map((community) => (
                  <Link href={`/communities/${community.id}`} key={community.id}>
                    <li className="px-3 py-2 text-gray-700 rounded-md hover:bg-slate-200 cursor-pointer transition-colors flex items-center">
                      <div className="w-6 h-6 rounded-full bg-green-100 mr-3 flex items-center justify-center">
                        <span className="text-green-600 text-xs">{community.name[0]}</span>
                      </div>
                      {community.name}
                    </li>
                  </Link>
                ))}
              </ul>
              
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="w-full px-3 py-2 text-gray-700 rounded-md hover:bg-slate-200 cursor-pointer transition-colors flex items-center"
              >
                <div className="w-6 h-6 rounded-full bg-green-100 mr-3 flex items-center justify-center">
                  <PlusCircle className="w-4 h-4 text-green-600" />
                </div>
                Create Community
              </button>
            </>
          )}
        </div>

        <div className="pt-4 border-t border-slate-200">
          <h3 className="text-sm font-medium text-gray-500 mb-3">TRENDING TODAY</h3>
          <div className="space-y-2">
            <div className="text-sm text-gray-600 hover:bg-slate-200 p-2 rounded-md cursor-pointer">
              Popular Posts
            </div>
            <div className="text-sm text-gray-600 hover:bg-slate-200 p-2 rounded-md cursor-pointer">
              New Posts
            </div>
          </div>
        </div>
      </div>

      <CreateCommunityModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCommunityCreated={refreshCommunities}
      />
    </aside>
  );
};

export default Sidebar;
  