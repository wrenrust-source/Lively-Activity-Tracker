import React, { useEffect, useRef, useState } from 'react';

interface CpxConnectorProps {
  onHeartRateUpdate: (bpm: number) => void;
}

const NUS_SERVICE = '6e400001-b5a3-f393-e0a9-e50e24dcca9e';
const NUS_TX_CHAR = '6e400003-b5a3-f393-e0a9-e50e24dcca9e'; // device -> central (notify)

export function CpxConnector({ onHeartRateUpdate }: CpxConnectorProps) {
  const [deviceName, setDeviceName] = useState<string | null>(null);
  const [bpm, setBpm] = useState<number | null>(null);
  const [connected, setConnected] = useState(false);

  // only show previously granted / known devices to the page
  const [knownDevices, setKnownDevices] = useState<BluetoothDevice[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);

  const charRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const deviceRef = useRef<BluetoothDevice | null>(null);
  const decoderRef = useRef(new TextDecoder());
  const recvBufferRef = useRef('');

  useEffect(() => {
    // load previously granted devices for this origin (if supported)
    if (navigator.bluetooth && (navigator.bluetooth as any).getDevices) {
      (navigator.bluetooth as any).getDevices()
        .then((devices: BluetoothDevice[]) => {
          if (devices?.length) {
            setKnownDevices(devices);
            setSelectedDeviceId(devices[0].id);
          }
        })
        .catch(() => {});
    }

    return () => {
      // cleanup on unmount
      disconnect().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // connect to a specific known device, or open the scan picker when deviceToUse is omitted
  async function connect(deviceToUse?: BluetoothDevice) {
    if (!navigator.bluetooth) {
      alert('Web Bluetooth not available. Use Chrome/Edge on macOS/Android.');
      return;
    }

    try {
      let device: BluetoothDevice | undefined = deviceToUse;

      if (!device) {
        // Try a filtered scan for the Nordic UART service first (preferred).
        try {
          device = await navigator.bluetooth.requestDevice({
            filters: [{ services: [NUS_SERVICE] }],
            optionalServices: [NUS_SERVICE],
          });
        } catch (err) {
          // If no devices are returned or filter is unsupported, fall back to acceptAllDevices
          device = await navigator.bluetooth.requestDevice({
            acceptAllDevices: true,
            optionalServices: [NUS_SERVICE],
          });
        }
      }

      if (!device) throw new Error('No device selected');

      // add to known devices list if not present
      setKnownDevices(prev => prev.find(d => d.id === device!.id) ? prev : [device!, ...prev]);

      deviceRef.current = device!;
      setDeviceName(device!.name ?? device!.id);
      device!.addEventListener('gattserverdisconnected', handleDisconnect);

      const server = await device!.gatt!.connect();
      const service = await server.getPrimaryService(NUS_SERVICE);
      const tx = await service.getCharacteristic(NUS_TX_CHAR);

      charRef.current = tx;
      await tx.startNotifications();
      tx.addEventListener('characteristicvaluechanged', handleNotify);

      setConnected(true);
      setBpm(null);
      onHeartRateUpdate(0);
    } catch (err) {
      console.error('Bluetooth connect failed', err);
      setConnected(false);
      deviceRef.current = null;
      charRef.current = null;
      onHeartRateUpdate(0);
    }
  }

  async function disconnect() {
    try {
      const char = charRef.current;
      if (char) {
        try {
          await char.stopNotifications();
        } catch {}
        char.removeEventListener('characteristicvaluechanged', handleNotify);
      }
      const dev = deviceRef.current;
      if (dev) {
        try {
          dev.removeEventListener('gattserverdisconnected', handleDisconnect);
        } catch {}
        if (dev.gatt && dev.gatt.connected) {
          dev.gatt.disconnect();
        }
      }
    } finally {
      deviceRef.current = null;
      charRef.current = null;
      setConnected(false);
      setBpm(null);
      onHeartRateUpdate(0);
    }
  }

  function handleDisconnect() {
    setConnected(false);
    setBpm(null);
    charRef.current = null;
    deviceRef.current = null;
    onHeartRateUpdate(0);
  }

  function handleNotify(ev: Event) {
    const target = ev.target as BluetoothRemoteGATTCharacteristic;
    const value = target?.value;
    if (!value) return;

    const text = decoderRef.current.decode(value.buffer);
    recvBufferRef.current += text;
    const parts = recvBufferRef.current.split('\n');
    recvBufferRef.current = parts.pop() ?? '';

    for (const line of parts) {
      const trimmed = line.trim();
      if (!trimmed) continue;

      // remove optional firmware debug prefix "DBG:" then try parse
      const cleaned = trimmed.replace(/^DBG:\s*/, '');
      const n = parseInt(cleaned, 10);

      if (!Number.isNaN(n) && n > 0) {
        // valid heart rate
        setBpm(n);
        onHeartRateUpdate(n);
      } else {
        // invalid / no HR -> treat as absent
        setBpm(null);
        onHeartRateUpdate(0);
      }
    }
  }

  return (
    <div className="rounded-lg border p-4 bg-white">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold">Circuit Playground</h3>
        <div className="text-sm text-muted-foreground">
          {connected ? 'Connected' : 'Disconnected'}
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">Device</div>
          <div className="font-medium">{deviceName ?? (connected ? 'Unknown' : '—')}</div>
        </div>

        <div>
          <div className="text-xs text-muted-foreground text-right">HR</div>
          <div className="font-medium text-right text-xl">{bpm && bpm > 0 ? bpm : '-'}</div>
        </div>
      </div>

      <div className="mt-3 flex gap-2 items-center">
        {knownDevices.length > 0 ? (
          <>
            <select
              className="px-2 py-1 border rounded"
              value={selectedDeviceId ?? ''}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
            >
              {knownDevices.map(d => (
                <option key={d.id} value={d.id}>
                  {d.name ?? d.id}
                </option>
              ))}
            </select>

            <button
              className="btn"
              onClick={() => {
                const dev = knownDevices.find(d => d.id === selectedDeviceId) ?? knownDevices[0];
                // if we have a known device use it, otherwise open the scan picker
                connect(dev);
              }}
            >
              Connect
            </button>
          </>
        ) : (
          <button
            className="btn"
            onClick={() => connect()}
          >
            Connect to Device
          </button>
        )}

        {connected && (
          <button
            className="btn text-red-500"
            onClick={() => disconnect()}
          >
            Disconnect
          </button>
        )}
      </div>
    </div>
  );
}