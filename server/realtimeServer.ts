import { WebSocket, WebSocketServer } from 'ws';
import type { Server as HttpServer } from 'http';

export type ClientPlatform = 'iOS' | 'Android' | 'Web' | 'Desktop';

export interface DeviceClient {
  id: string;
  roomId: string;
  platform: ClientPlatform;
  deviceName: string;
  color: string;
  lastSeen: number;
  ws: WebSocket;
}

export interface CanvasObjectState {
  id: string;
  pageNumber: number;
  data: any;
  updatedBy: string;
  platform: ClientPlatform;
  timestamp: number;
}

export interface RoomState {
  id: string;
  documentName: string;
  activePageIndex: number;
  zoom: number;
  clients: Map<string, DeviceClient>;
  objects: Map<string, CanvasObjectState>; // key: `${pageNumber}:${objectId}`
  pageCanvases: Map<number, string>; // pageNumber -> fabric JSON string snapshot
  lastModified: number;
}

// In-memory real-time state repository
const rooms = new Map<string, RoomState>();

const PLATFORM_COLORS: Record<ClientPlatform, string[]> = {
  iOS: ['#3b82f6', '#06b6d4', '#6366f1', '#0ea5e9'],
  Android: ['#10b981', '#14b8a6', '#22c55e', '#84cc16'],
  Web: ['#f59e0b', '#ec4899', '#8b5cf6', '#f97316'],
  Desktop: ['#64748b', '#a855f7', '#3b82f6', '#06b6d4'],
};

function getRandomColor(platform: ClientPlatform): string {
  const palette = PLATFORM_COLORS[platform] || PLATFORM_COLORS.Web;
  return palette[Math.floor(Math.random() * palette.length)];
}

export function getOrCreateRoom(roomId: string, documentName: string = 'Document.pdf'): RoomState {
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      id: roomId,
      documentName,
      activePageIndex: 0,
      zoom: 1.0,
      clients: new Map(),
      objects: new Map(),
      pageCanvases: new Map(),
      lastModified: Date.now(),
    };
    rooms.set(roomId, room);
  }
  return room;
}

export function getRoomSummary(roomId: string) {
  const room = rooms.get(roomId);
  if (!room) return null;

  return {
    id: room.id,
    documentName: room.documentName,
    activePageIndex: room.activePageIndex,
    zoom: room.zoom,
    peerCount: room.clients.size,
    peers: Array.from(room.clients.values()).map((c) => ({
      id: c.id,
      platform: c.platform,
      deviceName: c.deviceName,
      color: c.color,
      lastSeen: c.lastSeen,
    })),
    objectsCount: room.objects.size,
    lastModified: room.lastModified,
  };
}

export function setupRealtimeServer(server: HttpServer): WebSocketServer {
  const wss = new WebSocketServer({
    server,
    path: '/api/realtime',
  });

  console.info('[Realtime Cloud Backend] WebSocket synchronization server initialized at /api/realtime');

  wss.on('connection', (ws: WebSocket, req) => {
    let clientInfo: DeviceClient | null = null;

    ws.on('message', (messageRaw: string) => {
      try {
        const payload = JSON.parse(messageRaw.toString());
        const { type } = payload;

        switch (type) {
          case 'client:join': {
            const { roomId = 'default-sync-session', clientId, platform = 'Web', deviceName = 'Client Device', documentName } = payload;
            const room = getOrCreateRoom(roomId, documentName);

            // Deregister from previous room if any
            if (clientInfo && clientInfo.roomId !== roomId) {
              const oldRoom = rooms.get(clientInfo.roomId);
              if (oldRoom) {
                oldRoom.clients.delete(clientInfo.id);
                broadcastToRoom(oldRoom, {
                  type: 'peer:left',
                  peerId: clientInfo.id,
                  platform: clientInfo.platform,
                });
              }
            }

            const color = getRandomColor(platform);
            clientInfo = {
              id: clientId || `client_${Math.random().toString(36).substring(2, 9)}`,
              roomId,
              platform,
              deviceName,
              color,
              lastSeen: Date.now(),
              ws,
            };

            room.clients.set(clientInfo.id, clientInfo);
            room.lastModified = Date.now();

            console.info(`[Realtime Sync] Peer joined room "${roomId}": ${clientInfo.deviceName} (${platform}, ID: ${clientInfo.id})`);

            // Send authoritative initial state to the newly joined device
            const initialPayload = {
              type: 'sync:initial_state',
              roomId: room.id,
              documentName: room.documentName,
              activePageIndex: room.activePageIndex,
              zoom: room.zoom,
              myClient: {
                id: clientInfo.id,
                platform: clientInfo.platform,
                deviceName: clientInfo.deviceName,
                color: clientInfo.color,
              },
              peers: Array.from(room.clients.values()).map((c) => ({
                id: c.id,
                platform: c.platform,
                deviceName: c.deviceName,
                color: c.color,
                lastSeen: c.lastSeen,
              })),
              objects: Array.from(room.objects.values()),
              pageCanvases: Object.fromEntries(room.pageCanvases),
            };

            ws.send(JSON.stringify(initialPayload));

            // Broadcast to other peers in the room
            broadcastToRoom(
              room,
              {
                type: 'peer:joined',
                peer: {
                  id: clientInfo.id,
                  platform: clientInfo.platform,
                  deviceName: clientInfo.deviceName,
                  color: clientInfo.color,
                  lastSeen: clientInfo.lastSeen,
                },
              },
              clientInfo.id
            );
            break;
          }

          case 'canvas:object:upsert': {
            if (!clientInfo) return;
            const { roomId, pageNumber, objectId, data } = payload;
            const room = rooms.get(roomId);
            if (!room) return;

            const key = `${pageNumber}:${objectId}`;
            const objectState: CanvasObjectState = {
              id: objectId,
              pageNumber,
              data,
              updatedBy: clientInfo.id,
              platform: clientInfo.platform,
              timestamp: Date.now(),
            };
            room.objects.set(key, objectState);
            room.lastModified = Date.now();

            // Broadcast to all other devices in the session (iOS, Android, Web)
            broadcastToRoom(
              room,
              {
                type: 'canvas:object:upsert',
                pageNumber,
                objectId,
                data,
                updatedBy: clientInfo.id,
                platform: clientInfo.platform,
                timestamp: objectState.timestamp,
              },
              clientInfo.id
            );
            break;
          }

          case 'canvas:object:remove': {
            if (!clientInfo) return;
            const { roomId, pageNumber, objectId } = payload;
            const room = rooms.get(roomId);
            if (!room) return;

            const key = `${pageNumber}:${objectId}`;
            room.objects.delete(key);
            room.lastModified = Date.now();

            broadcastToRoom(
              room,
              {
                type: 'canvas:object:remove',
                pageNumber,
                objectId,
                removedBy: clientInfo.id,
                platform: clientInfo.platform,
              },
              clientInfo.id
            );
            break;
          }

          case 'canvas:page:snapshot': {
            if (!clientInfo) return;
            const { roomId, pageNumber, json } = payload;
            const room = rooms.get(roomId);
            if (!room) return;

            room.pageCanvases.set(pageNumber, json);
            room.lastModified = Date.now();

            broadcastToRoom(
              room,
              {
                type: 'canvas:page:snapshot',
                pageNumber,
                json,
                updatedBy: clientInfo.id,
                platform: clientInfo.platform,
              },
              clientInfo.id
            );
            break;
          }

          case 'viewport:sync': {
            if (!clientInfo) return;
            const { roomId, pageNumber, zoom } = payload;
            const room = rooms.get(roomId);
            if (!room) return;

            if (pageNumber !== undefined) room.activePageIndex = pageNumber;
            if (zoom !== undefined) room.zoom = zoom;
            room.lastModified = Date.now();

            broadcastToRoom(
              room,
              {
                type: 'viewport:sync',
                pageNumber: room.activePageIndex,
                zoom: room.zoom,
                syncBy: clientInfo.id,
                platform: clientInfo.platform,
              },
              clientInfo.id
            );
            break;
          }

          case 'presence:ping': {
            if (clientInfo) {
              clientInfo.lastSeen = Date.now();
              ws.send(JSON.stringify({ type: 'presence:pong', timestamp: Date.now() }));
            }
            break;
          }

          default:
            break;
        }
      } catch (err: any) {
        console.warn('[Realtime Sync] Invalid WebSocket message received:', err?.message);
      }
    });

    ws.on('close', () => {
      if (clientInfo) {
        const room = rooms.get(clientInfo.roomId);
        if (room) {
          room.clients.delete(clientInfo.id);
          console.info(`[Realtime Sync] Peer disconnected: ${clientInfo.deviceName} (${clientInfo.platform})`);

          broadcastToRoom(room, {
            type: 'peer:left',
            peerId: clientInfo.id,
            platform: clientInfo.platform,
          });

          // Clean up empty room after 1 hour if unused
          if (room.clients.size === 0) {
            setTimeout(() => {
              const checkRoom = rooms.get(room.id);
              if (checkRoom && checkRoom.clients.size === 0) {
                rooms.delete(room.id);
              }
            }, 3600000);
          }
        }
      }
    });

    ws.on('error', (err) => {
      console.warn('[Realtime Sync] WebSocket connection error:', err?.message);
    });
  });

  // Heartbeat interval to prune stale mobile connections
  setInterval(() => {
    const now = Date.now();
    rooms.forEach((room) => {
      room.clients.forEach((client, clientId) => {
        if (now - client.lastSeen > 60000) {
          try {
            client.ws.terminate();
          } catch {
            // ignore
          }
          room.clients.delete(clientId);
          broadcastToRoom(room, {
            type: 'peer:left',
            peerId: clientId,
            platform: client.platform,
          });
        }
      });
    });
  }, 30000);

  return wss;
}

function broadcastToRoom(room: RoomState, message: any, excludeClientId?: string) {
  const raw = JSON.stringify(message);
  room.clients.forEach((client) => {
    if (client.id !== excludeClientId && client.ws.readyState === WebSocket.OPEN) {
      try {
        client.ws.send(raw);
      } catch (err) {
        console.warn(`[Realtime Sync] Failed to send message to peer ${client.id}:`, err);
      }
    }
  });
}
