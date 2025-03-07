'use client';
import React from 'react';

type User = {
  id: string;
  username: string;
  profile_photo_url?: string;
};

interface UserListProps {
  users: User[];
  selectedUser: User | null;
  onSelectUser: (user: User) => void;
}

export default function UserList({ users, selectedUser, onSelectUser }: UserListProps) {
  return (
    <div className="h-full overflow-y-auto">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-800">Contacts</h2>
      </div>
      <ul>
        {users.map(user => (
          <li 
            key={user.id}
            className={`p-4 flex items-center cursor-pointer hover:bg-gray-100 ${
              selectedUser?.id === user.id ? 'bg-gray-100' : ''
            }`}
            onClick={() => onSelectUser(user)}
          >
            <div className="w-10 h-10 rounded-full overflow-hidden border-2 border-green-500 mr-3">
              {user.profile_photo_url ? (
                <img
                  src={user.profile_photo_url}
                  alt={user.username}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-500 text-sm font-bold">
                    {user.username.charAt(0).toUpperCase()}
                  </span>
                </div>
              )}
            </div>
            <span className="font-medium text-gray-800">{user.username}</span>
          </li>
        ))}
        {users.length === 0 && (
          <li className="p-4 text-gray-500 text-center">No users available</li>
        )}
      </ul>
    </div>
  );
} 