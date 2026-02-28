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
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-lg font-medium">Smart Watch</CardTitle>
        <Watch className="w-5 h-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
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
        
        {isConnected && (
          <div className="flex items-center gap-3 p-4 bg-accent rounded-xl">
            <Heart className="w-8 h-8 text-red-500 animate-pulse" />
            <div>
              <div className="text-3xl font-bold">{heartRate}</div>
              <div className="text-xs text-muted-foreground">BPM</div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}