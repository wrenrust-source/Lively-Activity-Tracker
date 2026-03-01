import { useState, useEffect } from 'react';
import { Watch, Heart, WifiOff, Wifi } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';

interface SmartwatchConnectorProps {
  onHeartRateUpdate: (heartRate: number) => void;
}

export function SmartwatchConnector({ onHeartRateUpdate }: SmartwatchConnectorProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [heartRate, setHeartRate] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;

    if (isConnected) {
      // Simulate heart rate monitoring (in a real app, this would connect to actual device)
      interval = setInterval(() => {
        // Generate realistic heart rate between 60-100 bpm with variations
        const baseRate = 75;
        const variation = Math.floor(Math.random() * 20) - 10;
        const newRate = baseRate + variation;
        
        setHeartRate(newRate);
        onHeartRateUpdate(newRate);
      }, 2000);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isConnected, onHeartRateUpdate]);

  const toggleConnection = () => {
    setIsConnected(!isConnected);
  };

  return (
    <div className="rounded-lg border p-6 bg-white">
      <div className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div className="text-lg font-medium">Smart Watch</div>
        <Watch className="w-5 h-5 text-muted-foreground" />
      </div>
      <div className="flex items-center justify-between gap-6">
        <div>
          <div className="text-xs text-muted-foreground">Device</div>
          <div className="font-medium">{isConnected ? 'Smart Watch' : '—'}</div>
        </div>
        
        <div className="ml-auto w-full max-w-[360px]">
          <div className="bg-emerald-50 rounded-xl p-5 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
              <div className="bg-white/60 rounded-lg p-3">
                <Heart className="w-8 h-8 text-red-600" />
              </div>
              <div>
                <div className="text-xs text-muted-foreground">HR</div>
                <div className="text-4xl font-extrabold">{heartRate && heartRate > 0 ? heartRate : '-'}</div>
              </div>
            </div>
            <div className="text-xs text-muted-foreground">BPM</div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-between mt-4">
        <Badge variant={isConnected ? 'default' : 'secondary'} className="text-xs">
          {isConnected ? (
            <div className="flex items-center gap-1">
              <Wifi className="w-3 h-3" />
              Connected
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <WifiOff className="w-3 h-3" />
              Disconnected
            </div>
          )}
        </Badge>
        <Button
          variant="outline"
          size="sm"
          onClick={toggleConnection}
          className="h-8 text-xs"
        >
          {isConnected ? 'Disconnect' : 'Connect'}
        </Button>
      </div>
    </div>
  );
}