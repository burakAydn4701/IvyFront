'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/app/lib/api';

interface Community {
  id: string;
  name: string;
}

export default function CommunityList() {
  const [communities, setCommunities] = useState<Community[]>([]);
  
  useEffect(() => {
    async function fetchCommunities() {
      try {
        const data = await api.getCommunities();
        setCommunities(data);
      } catch (error) {
        console.error('Failed to fetch communities:', error);
      }
    }
    
    fetchCommunities();
  }, []);
  
  return (
    <>
      {communities.map((community) => (
        <Link href={`/communities/${community.id}`} key={community.id}>
          <div className="flex items-center p-2 hover:bg-gray-100 rounded-lg">
            <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white mr-3">
              {community.name[0].toUpperCase()}
            </div>
            <span className="font-medium">{community.name}</span>
          </div>
        </Link>
      ))}
      <Link href="/create-community">
        <div className="flex items-center p-2 hover:bg-gray-100 rounded-lg text-green-600">
          <div className="w-10 h-10 rounded-full border-2 border-green-600 flex items-center justify-center mr-3">
            +
          </div>
          <span className="font-medium">Create Community</span>
        </div>
      </Link>
    </>
  );
} 