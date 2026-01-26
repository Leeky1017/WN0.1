import React from 'react';
import { Download, Star, Settings } from 'lucide-react';

interface Extension {
  id: string;
  name: string;
  description: string;
  installed: boolean;
  rating: number;
}

export function ExtensionsView() {
  const extensions: Extension[] = [
    {
      id: '1',
      name: 'Markdown Enhanced',
      description: 'Syntax highlighting and preview for Markdown',
      installed: true,
      rating: 4.8,
    },
    {
      id: '2',
      name: 'Word Editor',
      description: 'Edit and format Word documents',
      installed: true,
      rating: 4.6,
    },
    {
      id: '3',
      name: 'Grammar Check',
      description: 'Real-time grammar and spell checking',
      installed: false,
      rating: 4.7,
    },
  ];

  return (
    <>
      <div className="h-11 flex items-center justify-between px-3 border-b border-[var(--border-default)]">
        <span className="text-[11px] uppercase text-[var(--text-tertiary)] font-medium tracking-wide">Extensions</span>
      </div>

      <div className="overflow-y-auto">
        {extensions.map((ext) => (
          <div
            key={ext.id}
            className="p-3 border-b border-[var(--border-subtle)] hover:bg-[var(--bg-hover)] transition-colors"
          >
            <div className="mb-2">
              <div className="text-[13px] text-[var(--text-primary)] mb-1">{ext.name}</div>
              <div className="text-[11px] text-[var(--text-tertiary)] leading-relaxed mb-2">
                {ext.description}
              </div>
              <div className="flex items-center gap-1 text-[11px] text-[var(--text-tertiary)]">
                <Star className="w-3 h-3 fill-yellow-500 text-yellow-500" />
                <span>{ext.rating}</span>
              </div>
            </div>
            <div className="flex gap-2">
              {ext.installed ? (
                <>
                  <button className="h-6 px-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-active)] rounded text-[11px] text-[var(--text-secondary)] transition-colors flex items-center gap-1">
                    <Settings className="w-3 h-3" />
                    Settings
                  </button>
                  <button className="h-6 px-2 bg-[var(--bg-secondary)] hover:bg-[var(--bg-active)] rounded text-[11px] text-[var(--text-secondary)] transition-colors">
                    Disable
                  </button>
                </>
              ) : (
                <button className="h-6 px-2 bg-[var(--accent-primary)] hover:bg-[var(--accent-hover)] rounded text-[11px] text-white transition-colors flex items-center gap-1">
                  <Download className="w-3 h-3" />
                  Install
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
