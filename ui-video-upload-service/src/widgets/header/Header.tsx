import { useState, useEffect } from 'react';
import { Sparkles } from 'lucide-react';
import { apiClient } from '@/shared/api/client';
import { cn } from '@/shared/lib/utils';

export function Header() {
  const [isConnected, setIsConnected] = useState<boolean>(true);

  useEffect(() => {
    const checkConnection = async () => {
      try {
        const health = await apiClient.checkHealth();
        setIsConnected(health);
      } catch {
        setIsConnected(false);
      }
    };

    checkConnection();
    const interval = setInterval(checkConnection, 30000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="h-16 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 flex items-center justify-between sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-gradient-to-br from-primary to-primary/80 rounded-lg shadow-md">
          <Sparkles className="h-5 w-5 text-primary-foreground" />
        </div>
        <div className="flex flex-col">
          <h1 className="text-lg font-bold tracking-tight">Загрузи ка видосик, братиш</h1>
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Прямо сейчас</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <div className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all",
          isConnected 
            ? "bg-green-500/10 text-green-600 border border-green-500/20" 
            : "bg-red-500/10 text-red-600 border border-red-500/20"
        )}>
          <div className={cn(
            "w-2 h-2 rounded-full",
            isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
          )} />
          {isConnected ? "Connected" : "Disconnected"}
        </div>
      </div>
    </header>
  );
}
