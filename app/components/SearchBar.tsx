'use client';

import { Search } from 'lucide-react';
import { useState } from 'react';

export default function SearchBar() {
  const [query, setQuery] = useState('');

  return (
    <div className="relative">
      <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none">
        <Search className="h-4 w-4 text-[rgb(var(--muted))]" />
      </div>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search"
        className="w-full pl-10 pr-4 py-2 bg-[rgb(var(--surface))] 
                 border border-[rgb(var(--muted))/20] rounded-full
                 text-[rgb(var(--foreground))] placeholder-[rgb(var(--muted))]
                 focus:outline-none focus:ring-2 focus:ring-[rgb(var(--primary))]"
      />
    </div>
  );
} 