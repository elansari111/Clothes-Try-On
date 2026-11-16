import React from 'react';
import { PageId } from '../../types';
import { Bell, Sparkles, MonitorCheck, HelpCircle } from 'lucide-react';

interface HeaderProps {
  activePage: PageId;
  onNavigateToMirror?: () => void;
}

const PAGE_TITLES: Record<PageId, { title: string; subtitle: string }> = {
  dashboard: {
    title: 'Dashboard',
    subtitle: 'Welcome to your real-time virtual fitting studio',
  },
  'virtual-mirror': {
    title: 'Virtual Mirror',
    subtitle: 'Position yourself in front of the webcam to try clothes live',
  },
  explore: {
    title: 'Explore Catalog',
    subtitle: 'Browse interactive garments designed for instant virtual try-on',
  },
  wardrobe: {
    title: 'My Wardrobe',
    subtitle: 'Access and review your saved clothes and favourite fits',
  },
  settings: {
    title: 'Settings & Preferences',
    subtitle: 'Configure camera resolutions, pose tracking parameters and system options',
  },
};

export const Header: React.FC<HeaderProps> = ({ activePage, onNavigateToMirror }) => {
  const meta = PAGE_TITLES[activePage] || { title: 'App', subtitle: '' };

  return (
    <header className="h-16 border-b border-surface-border bg-surface/70 backdrop-blur-md px-8 flex items-center justify-between select-none shrink-0 sticky top-0 z-20">
      <div>
        <h1 className="text-base font-bold text-white tracking-tight">{meta.title}</h1>
        <p className="text-xs text-muted truncate hidden sm:block">{meta.subtitle}</p>
      </div>

      <div className="flex items-center gap-3">
        {/* Quick Launch Mirror Button (header shortcut) */}
        {activePage !== 'virtual-mirror' && onNavigateToMirror && (
          <button
            onClick={onNavigateToMirror}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-primary/10 border border-primary/30 text-primary-light hover:bg-primary/20 text-xs font-semibold transition-all"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary-light" />
            <span>Launch Mirror</span>
          </button>
        )}

        <div className="h-4 w-[1px] bg-surface-border mx-1" />

        {/* Status indicators */}
        <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-surface border border-surface-border text-muted text-xs">
          <MonitorCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-mono">1280x720 • 30fps</span>
        </div>

        {/* Notifications & Help (visual only) */}
        <button
          className="p-2 rounded-lg bg-surface border border-surface-border text-muted hover:text-slate-200 transition-colors"
          title="Help & Guides"
        >
          <HelpCircle className="w-4 h-4" />
        </button>
        <button
          className="p-2 rounded-lg bg-surface border border-surface-border text-muted hover:text-slate-200 transition-colors relative"
          title="Notifications"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full" />
        </button>
      </div>
    </header>
  );
};
