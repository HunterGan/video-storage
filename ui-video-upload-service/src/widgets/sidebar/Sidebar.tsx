import {  FileText, Settings, HelpCircle, Sparkles, Upload, Video } from 'lucide-react';
import { cn } from '@/shared/lib/utils';

export type MenuItem = 'videos' | 'upload' | 'analysis' | 'history' | 'settings' | 'help';

interface SidebarProps {
  activeItem: MenuItem;
  onItemSelect: (item: MenuItem) => void;
}

export function Sidebar({ activeItem, onItemSelect }: SidebarProps) {
  const menuItems: { id: MenuItem; label: string; icon: React.ReactNode }[] = [
    { id: 'videos', label: 'Видео', icon: <Video className="h-5 w-5" /> },
    { id: 'upload', label: 'Загрузить', icon: <Upload className="h-5 w-5" /> },
    // { id: 'analysis', label: 'Image Analysis', icon: <ImageIcon className="h-5 w-5" /> },
    { id: 'history', label: 'History', icon: <FileText className="h-5 w-5" /> },
    { id: 'settings', label: 'Settings', icon: <Settings className="h-5 w-5" /> },
    { id: 'help', label: 'Help', icon: <HelpCircle className="h-5 w-5" /> },
  ];

  return (
    <aside className="w-64 border-r bg-card flex flex-col shadow-lg">
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 px-2">
          <div className="p-1.5 bg-primary/10 rounded-md">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <span className="text-sm font-semibold">Video Admin</span>
        </div>
      </div>
      
      <nav className="flex-1 p-3 space-y-1">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onItemSelect(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group",
              activeItem === item.id
                ? "bg-primary text-primary-foreground shadow-md"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground hover:translate-x-0.5"
            )}
          >
            <span className={cn(
              "transition-colors",
              activeItem === item.id ? "text-primary-foreground" : "text-current opacity-80 group-hover:opacity-100"
            )}>
              {item.icon}
            </span>
            {item.label}
            {activeItem === item.id && (
              <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground/50" />
            )}
          </button>
        ))}
      </nav>
      
      <div className="p-3 border-t">
        <div className="flex items-center justify-between px-3 py-2 rounded-lg bg-muted/50">
          <span className="text-xs text-muted-foreground">Video Admin</span>
          <span className="text-xs font-medium text-muted-foreground">v1.0.0</span>
        </div>
      </div>
    </aside>
  );
}
