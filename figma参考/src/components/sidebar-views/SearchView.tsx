import React, { useState } from 'react';
import { Search, X } from 'lucide-react';

export function SearchView() {
  const [searchQuery, setSearchQuery] = useState('');

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-default)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">Search</span>
      </div>

      <div className="p-3">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
          <input
            type="text"
            placeholder="Search files..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-7 pl-8 pr-7 bg-[var(--bg-secondary)] border border-[var(--border-default)] rounded text-[13px] text-[var(--text-primary)] placeholder-[var(--text-tertiary)] outline-none focus:border-[var(--text-tertiary)] transition-colors"
          />
          {searchQuery && (
            <button 
              onClick={() => setSearchQuery('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center hover:bg-[var(--bg-hover)] rounded transition-colors"
            >
              <X className="w-3 h-3 text-[var(--text-tertiary)]" />
            </button>
          )}
        </div>

        <div className="text-[13px] text-[var(--text-tertiary)] text-center py-16">
          No results
        </div>
      </div>
    </>
  );
}
