import { ClientPlatform, SyncPeer } from '../types';

/**
 * Detect client platform (iOS, Android, Web)
 */
export function detectClientPlatform(): { platform: ClientPlatform; deviceName: string } {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return { platform: 'Web', deviceName: 'Web Client' };
  }

  const ua = navigator.userAgent || '';
  const isIOS =
    /iPad|iPhone|iPod/i.test(ua) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);

  if (isIOS) {
    const isTablet = /iPad/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    return {
      platform: 'iOS',
      deviceName: isTablet ? 'iPad Client' : 'iPhone Client',
    };
  }

  if (isAndroid) {
    const isTablet = /Tablet/i.test(ua);
    return {
      platform: 'Android',
      deviceName: isTablet ? 'Android Tablet' : 'Android Phone',
    };
  }

  return {
    platform: 'Web',
    deviceName: 'Desktop Web Client',
  };
}

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

export interface RemoteObjectUpsertEvent {
  pageNumber: number;
  objectId: string;
  data: any;
  updatedBy: string;
  platform: ClientPlatform;
  timestamp: number;
}

export interface RemoteObjectRemoveEvent {
  pageNumber: number;
  objectId: string;
  removedBy: string;
  platform: ClientPlatform;
}

export interface RemotePageSnapshotEvent {
  pageNumber: number;
  json: string;
  updatedBy: string;
  platform: ClientPlatform;
}

export interface RemoteViewportSyncEvent {
  pageNumber: number;
  zoom: number;
  syncBy: string;
  platform: ClientPlatform;
}

type PeersListener = (peers: SyncPeer[]) => void;
type StatusListener = (status: ConnectionStatus) => void;
type ObjectUpsertListener = (event: RemoteObjectUpsertEvent) => void;
type ObjectRemoveListener = (event: RemoteObjectRemoveEvent) => void;
type PageSnapshotListener = (event: RemotePageSnapshotEvent) => void;
type ViewportListener = (event: RemoteViewportSyncEvent) => void;

class RealtimeSyncManager {
  private ws: WebSocket | null = null;
  private status: ConnectionStatus = 'disconnected';
  private roomId: string = 'global-pdf-session';
  private documentName: string = 'Document.pdf';
  private clientId: string = '';
  private platformInfo = detectClientPlatform();
  private heartbeatTimer: any = null;
  private reconnectTimer: any = null;
  private reconnectAttempts: number = 0;
  private shouldReconnect: boolean = true;
  private peers: SyncPeer[] = [];

  // Flag to avoid echo loops when applying remote updates
  public isRemoteUpdate: boolean = false;

  // Listeners
  private peersListeners: Set<PeersListener> = new Set();
  private statusListeners: Set<StatusListener> = new Set();
  private objectUpsertListeners: Set<ObjectUpsertListener> = new Set();
  private objectRemoveListeners: Set<ObjectRemoveListener> = new Set();
  private pageSnapshotListeners: Set<PageSnapshotListener> = new Set();
  private viewportListeners: Set<ViewportListener> = new Set();

  constructor() {
    if (typeof window !== 'undefined') {
      let storedId = sessionStorage.getItem('remix_pdf_client_id');
      if (!storedId) {
        storedId = `peer_${Math.random().toString(36).substring(2, 9)}`;
        sessionStorage.setItem('remix_pdf_client_id', storedId);
      }
      this.clientId = storedId;

      const urlParams = new URLSearchParams(window.location.search);
      const queryRoom = urlParams.get('room') || urlParams.get('roomId');
      if (queryRoom) {
        this.roomId = queryRoom;
      }
    }
  }

  public setSimulatedPlatform(platform: ClientPlatform, deviceName?: string) {
    const defaultName =
      platform === 'iOS'
        ? 'iPhone Client'
        : platform === 'Android'
        ? 'Android Client'
        : platform === 'Desktop'
        ? 'Desktop Client'
        : 'Web Client';

    this.platformInfo = {
      platform,
      deviceName: deviceName || defaultName,
    };

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.send({
        type: 'client:join',
        roomId: this.roomId,
        clientId: this.clientId,
        platform: this.platformInfo.platform,
        deviceName: this.platformInfo.deviceName,
        documentName: this.documentName,
      });
    }
  }

  public getClientId(): string {
    return this.clientId;
  }

  public getPlatform(): ClientPlatform {
    return this.platformInfo.platform;
  }

  public getDeviceName(): string {
    return this.platformInfo.deviceName;
  }

  public getStatus(): ConnectionStatus {
    return this.status;
  }

  public getPeers(): SyncPeer[] {
    return this.peers;
  }

  public getRoomId(): string {
    return this.roomId;
  }

  public connect(roomId?: string, documentName?: string) {
    if (roomId) this.roomId = roomId;
    if (documentName) this.documentName = documentName;
    this.shouldReconnect = true;

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.setStatus('connecting');

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const host = window.location.host;
      const wsUrl = `${protocol}//${host}/api/realtime`;

      const socket = new WebSocket(wsUrl);
      this.ws = socket;

      socket.onopen = () => {
        this.reconnectAttempts = 0;
        this.setStatus('connected');

        // Send join payload with platform metadata
        this.send({
          type: 'client:join',
          roomId: this.roomId,
          clientId: this.clientId,
          platform: this.platformInfo.platform,
          deviceName: this.platformInfo.deviceName,
          documentName: this.documentName,
        });

        this.startHeartbeat();
      };

      socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (err) {
          console.warn('[Realtime Sync] Failed to parse WebSocket message:', err);
        }
      };

      socket.onclose = () => {
        this.stopHeartbeat();
        this.setStatus('disconnected');
        if (this.shouldReconnect) {
          this.scheduleReconnect();
        }
      };

      socket.onerror = (err) => {
        console.warn('[Realtime Sync] WebSocket encountered error:', err);
        this.setStatus('error');
      };
    } catch (err) {
      console.warn('[Realtime Sync] Connection failed to initialize:', err);
      this.setStatus('error');
      if (this.shouldReconnect) {
        this.scheduleReconnect();
      }
    }
  }

  public disconnect() {
    this.shouldReconnect = false;
    this.stopHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.setStatus('disconnected');
  }

  private setStatus(newStatus: ConnectionStatus) {
    this.status = newStatus;
    this.statusListeners.forEach((l) => l(newStatus));
  }

  private handleMessage(msg: any) {
    switch (msg.type) {
      case 'sync:initial_state': {
        this.peers = msg.peers || [];
        this.peersListeners.forEach((l) => l(this.peers));

        // If server has stored page canvases, notify snapshot listeners
        if (msg.pageCanvases) {
          Object.entries(msg.pageCanvases).forEach(([pageStr, json]) => {
            const pageNumber = Number(pageStr);
            if (!isNaN(pageNumber) && json) {
              this.isRemoteUpdate = true;
              try {
                this.pageSnapshotListeners.forEach((l) =>
                  l({
                    pageNumber,
                    json: json as string,
                    updatedBy: 'server_initial',
                    platform: 'Web',
                  })
                );
              } finally {
                setTimeout(() => {
                  this.isRemoteUpdate = false;
                }, 50);
              }
            }
          });
        }
        break;
      }

      case 'peer:joined': {
        if (msg.peer && msg.peer.id !== this.clientId) {
          const filtered = this.peers.filter((p) => p.id !== msg.peer.id);
          this.peers = [...filtered, msg.peer];
          this.peersListeners.forEach((l) => l(this.peers));
        }
        break;
      }

      case 'peer:left': {
        if (msg.peerId) {
          this.peers = this.peers.filter((p) => p.id !== msg.peerId);
          this.peersListeners.forEach((l) => l(this.peers));
        }
        break;
      }

      case 'canvas:object:upsert': {
        if (msg.updatedBy !== this.clientId) {
          this.isRemoteUpdate = true;
          try {
            this.objectUpsertListeners.forEach((l) =>
              l({
                pageNumber: msg.pageNumber,
                objectId: msg.objectId,
                data: msg.data,
                updatedBy: msg.updatedBy,
                platform: msg.platform,
                timestamp: msg.timestamp || Date.now(),
              })
            );
          } finally {
            setTimeout(() => {
              this.isRemoteUpdate = false;
            }, 50);
          }
        }
        break;
      }

      case 'canvas:object:remove': {
        if (msg.removedBy !== this.clientId) {
          this.isRemoteUpdate = true;
          try {
            this.objectRemoveListeners.forEach((l) =>
              l({
                pageNumber: msg.pageNumber,
                objectId: msg.objectId,
                removedBy: msg.removedBy,
                platform: msg.platform,
              })
            );
          } finally {
            setTimeout(() => {
              this.isRemoteUpdate = false;
            }, 50);
          }
        }
        break;
      }

      case 'canvas:page:snapshot': {
        if (msg.updatedBy !== this.clientId) {
          this.isRemoteUpdate = true;
          try {
            this.pageSnapshotListeners.forEach((l) =>
              l({
                pageNumber: msg.pageNumber,
                json: msg.json,
                updatedBy: msg.updatedBy,
                platform: msg.platform,
              })
            );
          } finally {
            setTimeout(() => {
              this.isRemoteUpdate = false;
            }, 50);
          }
        }
        break;
      }

      case 'viewport:sync': {
        if (msg.syncBy !== this.clientId) {
          this.viewportListeners.forEach((l) =>
            l({
              pageNumber: msg.pageNumber,
              zoom: msg.zoom,
              syncBy: msg.syncBy,
              platform: msg.platform,
            })
          );
        }
        break;
      }

      case 'presence:pong':
        // Heartbeat confirmed
        break;

      default:
        break;
    }
  }

  private send(data: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
      } catch (e) {
        console.warn('[Realtime Sync] Failed to send WebSocket payload:', e);
      }
    }
  }

  // High-level broadcasting methods
  public broadcastObjectUpsert(pageNumber: number, objectId: string, data: any) {
    if (this.isRemoteUpdate) return;
    this.send({
      type: 'canvas:object:upsert',
      roomId: this.roomId,
      pageNumber,
      objectId,
      data,
    });
  }

  public broadcastObjectRemove(pageNumber: number, objectId: string) {
    if (this.isRemoteUpdate) return;
    this.send({
      type: 'canvas:object:remove',
      roomId: this.roomId,
      pageNumber,
      objectId,
    });
  }

  public broadcastPageSnapshot(pageNumber: number, json: string) {
    if (this.isRemoteUpdate) return;
    this.send({
      type: 'canvas:page:snapshot',
      roomId: this.roomId,
      pageNumber,
      json,
    });
  }

  public broadcastViewport(pageNumber: number, zoom: number) {
    this.send({
      type: 'viewport:sync',
      roomId: this.roomId,
      pageNumber,
      zoom,
    });
  }

  // Heartbeat & Reconnection
  private startHeartbeat() {
    this.stopHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      this.send({ type: 'presence:ping', timestamp: Date.now() });
    }, 20000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    this.reconnectAttempts += 1;
    // Exponential backoff: 1s, 2s, 4s, capped at 10s
    const delay = Math.min(10000, 1000 * Math.pow(1.5, this.reconnectAttempts));
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.shouldReconnect) {
        this.connect();
      }
    }, delay);
  }

  // Listener subscriptions
  public onPeersChange(fn: PeersListener) {
    this.peersListeners.add(fn);
    fn(this.peers);
    return () => this.peersListeners.delete(fn);
  }

  public onStatusChange(fn: StatusListener) {
    this.statusListeners.add(fn);
    fn(this.status);
    return () => this.statusListeners.delete(fn);
  }

  public onObjectUpsert(fn: ObjectUpsertListener) {
    this.objectUpsertListeners.add(fn);
    return () => this.objectUpsertListeners.delete(fn);
  }

  public onObjectRemove(fn: ObjectRemoveListener) {
    this.objectRemoveListeners.add(fn);
    return () => this.objectRemoveListeners.delete(fn);
  }

  public onPageSnapshot(fn: PageSnapshotListener) {
    this.pageSnapshotListeners.add(fn);
    return () => this.pageSnapshotListeners.delete(fn);
  }

  public onViewportSync(fn: ViewportListener) {
    this.viewportListeners.add(fn);
    return () => this.viewportListeners.delete(fn);
  }
}

export const realtimeSync = new RealtimeSyncManager();
