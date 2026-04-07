import Ably from 'ably';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Ably client with API key
const apiKey = process.env.ABLY_API_KEY;

if (!apiKey) {
  console.warn('ABLY_API_KEY not set. Real-time chat will use fallback polling.');
}

// Create Ably client
export const ablyClient = apiKey ? new Ably.Realtime(apiKey) : null;

// Channel name generator for project-specific chat rooms
export const getChatChannelName = (projectId) => `chat:${projectId}`;

// Publish message to Ably channel
export const publishChatMessage = async (projectId, message) => {
  if (!ablyClient) {
    console.warn('Ably not configured, skipping real-time publish');
    return;
  }

  try {
    const channel = ablyClient.channels.get(getChatChannelName(projectId));
    await channel.publish('message', message);
  } catch (error) {
    console.error('Failed to publish to Ably:', error);
  }
};

// Publish reaction update to Ably channel
export const publishReactionUpdate = async (projectId, messageId, reactions) => {
  if (!ablyClient) {
    console.warn('Ably not configured, skipping real-time reaction update');
    return;
  }

  try {
    const channel = ablyClient.channels.get(getChatChannelName(projectId));
    await channel.publish('reaction', { messageId, reactions });
  } catch (error) {
    console.error('Failed to publish reaction to Ably:', error);
  }
};

export default ablyClient;
