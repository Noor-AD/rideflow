// mobile/src/api/websocket.ts
import 'text-encoding'; // 👈 Polyfills TextEncoder/TextDecoder for React Native
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type { DriverLocationPayload, RideEventPayload, ChatMessage } from '../types';

export type ConnectionStatus = 'CONNECTING' | 'CONNECTED' | 'DISCONNECTED' | 'ERROR';

const getWebSocketUrl = (): string => {
  return 'https://rideflow-production-06dc.up.railway.app/ws';
};

class MobileWebSocketService {
  private client: Client | null = null;
  private statusListeners: ((status: ConnectionStatus) => void)[] = [];
  private pendingSubscriptions: (() => void)[] = [];
  public status: ConnectionStatus = 'DISCONNECTED';

  // 2. Initialize STOMP client over SockJS
  public connect(onStatusChange?: (status: ConnectionStatus) => void): void {
    if (onStatusChange) {
      this.statusListeners.push(onStatusChange);
    }

    if (this.client && this.client.active) {
      if (onStatusChange) onStatusChange(this.status);
      return;
    }

    this.updateStatus('CONNECTING');

    this.client = new Client({
      // Create SockJS factory compatible with React Native
      webSocketFactory: () => new SockJS(getWebSocketUrl()) as any,
      connectHeaders: {},
      debug: (msg: string) => {
        // Uncomment to see raw STOMP frames during debugging
        // console.log('[Mobile STOMP]', msg);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    this.client.onConnect = () => {
      console.log('✅ Mobile App Connected to RideFlow STOMP Broker');
      this.updateStatus('CONNECTED');

      // Flush any subscriptions that were requested while connecting
      while (this.pendingSubscriptions.length > 0) {
        const subAction = this.pendingSubscriptions.shift();
        if (subAction) subAction();
      }
    };

    this.client.onStompError = (frame) => {
      console.error('❌ Broker reported STOMP error:', frame.headers['message']);
      this.updateStatus('ERROR');
    };

    this.client.onWebSocketClose = () => {
      console.warn('⚠️ Mobile WebSocket connection closed');
      this.updateStatus('DISCONNECTED');
    };

    this.client.activate();
  }

  // 3. Driver: Stream GPS Coordinates to Spring Boot (/app/rides/{rideId}/location)
  public sendDriverLocation(payload: DriverLocationPayload, rideId?: number): void {
    if (!this.client || !this.client.connected) {
      return;
    }

    const destination = rideId ? `/app/rides/${rideId}/location` : '/app/driver/location';
    this.client.publish({
      destination,
      body: JSON.stringify(payload),
    });
  }

  // 4a. Rider: Subscribe to Live Driver GPS Coordinates for an active ride
  public subscribeToDriverLocation(
    rideId: number,
    callback: (location: { latitude: number; longitude: number; bearing?: number; speed?: number }) => void
  ): () => void {
    const topic = `/topic/rides/${rideId}/location`;

    const executeSubscription = () => {
      if (!this.client || !this.client.connected) return;

      const sub = this.client.subscribe(topic, (message: IMessage) => {
        try {
          const data = JSON.parse(message.body);
          if (data && typeof data.latitude === 'number' && typeof data.longitude === 'number') {
            callback({
              latitude: data.latitude,
              longitude: data.longitude,
              bearing: data.bearing,
              speed: data.speed,
            });
          }
        } catch (err) {
          console.error(`Failed to parse driver location update from ${topic}:`, err);
        }
      });

      return sub;
    };

    if (this.client && this.client.connected) {
      const sub = executeSubscription();
      return () => sub?.unsubscribe();
    } else {
      let subInstance: any = null;
      this.pendingSubscriptions.push(() => {
        subInstance = executeSubscription();
      });
      return () => {
        if (subInstance) subInstance.unsubscribe();
      };
    }
  }

  // 4. Rider: Subscribe to Live Driver Approaching Telemetry for a specific ride
  public subscribeToRideUpdates(
    rideId: number,
    callback: (event: RideEventPayload) => void
  ): () => void {
    const topic = `/topic/rides/${rideId}`;

    const executeSubscription = () => {
      if (!this.client || !this.client.connected) return;

      const sub = this.client.subscribe(topic, (message: IMessage) => {
        try {
          const data: RideEventPayload = JSON.parse(message.body);
          callback(data);
        } catch (err) {
          console.error(`Failed to parse ride update from ${topic}:`, err);
        }
      });

      return sub;
    };

    if (this.client && this.client.connected) {
      const sub = executeSubscription();
      return () => sub?.unsubscribe();
    } else {
      let subInstance: any = null;
      this.pendingSubscriptions.push(() => {
        subInstance = executeSubscription();
      });
      return () => {
        if (subInstance) subInstance.unsubscribe();
      };
    }
  }

  // 5. Driver: Subscribe to Incoming Ride Dispatch Requests
  public subscribeToDriverDispatch(
    driverId: number,
    callback: (ride: any) => void
  ): () => void {
    // Subscribes to the broadcast dispatch feed for online drivers
    const topic = '/topic/drivers/requests';

    const executeSubscription = () => {
      if (!this.client || !this.client.connected) return;

      const sub = this.client.subscribe(topic, (message: IMessage) => {
        try {
          const data = JSON.parse(message.body);
          callback(data);
        } catch (err) {
          console.error(`Failed to parse driver dispatch from ${topic}:`, err);
        }
      });

      return sub;
    };

    if (this.client && this.client.connected) {
      const sub = executeSubscription();
      return () => sub?.unsubscribe();
    } else {
      let subInstance: any = null;
      this.pendingSubscriptions.push(() => {
        subInstance = executeSubscription();
      });
      return () => {
        if (subInstance) subInstance.unsubscribe();
      };
    }
  }

  // 6. In-App Live Chat: Send a message to /app/rides/{rideId}/chat
  public sendChatMessage(rideId: number, message: ChatMessage): void {
    if (!this.client || !this.client.connected) {
      console.warn('Cannot send chat message: WebSocket disconnected');
      return;
    }

    this.client.publish({
      destination: `/app/rides/${rideId}/chat`,
      body: JSON.stringify(message),
    });
  }

  // 7. In-App Live Chat: Subscribe to real-time messages for an active ride
  public subscribeToRideChat(
    rideId: number,
    callback: (message: ChatMessage) => void
  ): () => void {
    const topic = `/topic/rides/${rideId}/chat`;

    const executeSubscription = () => {
      if (!this.client || !this.client.connected) return;

      const sub = this.client.subscribe(topic, (message: IMessage) => {
        try {
          const data: ChatMessage = JSON.parse(message.body);
          callback(data);
        } catch (err) {
          console.error(`Failed to parse chat message from ${topic}:`, err);
        }
      });

      return sub;
    };

    if (this.client && this.client.connected) {
      const sub = executeSubscription();
      return () => sub?.unsubscribe();
    } else {
      let subInstance: any = null;
      this.pendingSubscriptions.push(() => {
        subInstance = executeSubscription();
      });
      return () => {
        if (subInstance) subInstance.unsubscribe();
      };
    }
  }

  // 8. Clean Disconnect on Logout
  public disconnect(): void {
    if (this.client) {
      this.client.deactivate();
      this.client = null;
    }
    this.updateStatus('DISCONNECTED');
  }

  private updateStatus(newStatus: ConnectionStatus): void {
    this.status = newStatus;
    this.statusListeners.forEach((listener) => listener(newStatus));
  }
}

export const mobileWs = new MobileWebSocketService();