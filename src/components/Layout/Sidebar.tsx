import React from 'react';
import { PageId, NavigationItem } from '../../types';
import {
  LayoutDashboard,
  Glasses,
  Compass,
  Shirt,
  Settings,
  Sparkles,
} from 'lucide-react';
import { cn } from '../../utils';

interface SidebarProps {
  activePage: PageId;
  onNavigate: (page: PageId) => void;
}

const NAV_ITEMS: (NavigationItem & { icon: React.ReactNode })[] = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: <LayoutDashboard className="w-4 h-4" />,
  },
  {
    id: 'virtual-mirror',
    label: 'Virtual Mirror',
    icon: <Glasses className="w-4 h-4" />,
  },
  {
    id: 'explore',
    label: 'Explore Catalog',
    icon: <Compass className="w-4 h-4" />,
  },
  {
    id: 'wardrobe',
    label: 'My Wardrobe',
    icon: <Shirt className="w-4 h-4" />,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: <Settings className="w-4 h-4" />,
  },
];

export const Sidebar: React.FC<SidebarProps> = ({ activePage, onNavigate }) => {
  return (
    <aside className="w-64 h-screen bg-surface border-r border-surface-border flex flex-col justify-between select-none shrink-0">
      {/* App Branding */}
      <div>
        <div className="h-16 flex items-center px-6 border-b border-surface-border gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-accent-cyan flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-sm font-bold tracking-tight text-white flex items-center gap-1.5">
              <span>TRY-ON</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/20 text-primary-light border border-primary/30">
                DESKTOP
              </span>
            </div>
            <div className="text-[10px] text-muted-dark tracking-wide">
              Real-time Fitting Studio
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="p-4 space-y-1.5">
          <div className="px-3 pb-2 text-[10px] font-semibold text-muted-dark uppercase tracking-wider">
            Menu
          </div>
          {NAV_ITEMS.map((item) => {
            const isActive = activePage === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all group relative',
                  isActive
                    ? 'bg-primary text-white shadow-sm shadow-primary/20 font-semibold'
                    : 'text-muted hover:text-slate-200 hover:bg-surface-hover'
                )}
              >
                <span
                  className={cn(
                    'transition-colors',
                    isActive ? 'text-white' : 'text-muted group-hover:text-slate-200'
                  )}
                >
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {isActive && (
                  <span className="absolute right-3 w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* System Status footer */}
      <div className="p-4 border-t border-surface-border m-3 rounded-xl bg-background/50 border">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            <span className="text-xs font-semibold text-slate-200">Vision Engine</span>
          </div>
          <span className="text-[10px] font-mono text-muted">Ready</span>
        </div>
        <div className="text-[11px] text-muted-dark leading-tight">
          Webcam fitting engine idle. Click Virtual Mirror to begin session.
        </div>
      </div>
    </aside>
  );
};
