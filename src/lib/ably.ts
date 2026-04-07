import { useEffect, useRef, useCallback } from 'react';
import Ably from 'ably';

const ABLY_API_KEY = import.meta.env.VITE_ABLY_API_KEY;

let ablyClient: Ably.Realtime | null = null;

export const getAblyClient = () => {
  if (!ABLY_API_KEY) {
    console.warn('Ably API key not configured');
    return null;
  }
  
  if (!ablyClient) {
    ablyClient = new Ably.Realtime(ABLY_API_KEY);
  }
  
  return ablyClient;
};

export const getChatChannelName = (projectId: string) => `chat:${projectId}`;

export const useAblyChat = (projectId: string | undefined, onMessage: (message: any) => void, onReaction: (data: any) => void) => {
  const channelRef = useRef<any>(null);

  useEffect(() => {
    if (!projectId) return;
    
    const client = getAblyClient();
    if (!client) return;

    const channelName = getChatChannelName(projectId);
    const channel = client.channels.get(channelName);
    channelRef.current = channel;

    // Subscribe to new messages
    const messageHandler = (message: any) => {
      if (message.name === 'message') {
        onMessage(message.data);
      } else if (message.name === 'reaction') {
        onReaction(message.data);
      }
    };

    channel.subscribe(messageHandler);

    return () => {
      channel.unsubscribe(messageHandler);
    };
  }, [projectId, onMessage, onReaction]);

  return channelRef;
};
