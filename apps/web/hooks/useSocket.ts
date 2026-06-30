import { useEffect } from 'react';
import { socket } from '../lib/socket';

export function useSocket(event: string, callback: (...args: any[]) => void) {
  useEffect(() => {
    // Automatically connect on initialization
    socket.connect();
    socket.on(event, callback);

    return () => {
      // Clean up listeners and disconnect on destruction
      socket.off(event, callback);
    };
  }, [event, callback]);

  return socket;
}
