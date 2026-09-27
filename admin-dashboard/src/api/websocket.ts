import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import type { DriverLocationPayload, RideEventPayload } from '../types';

export type ConnectionStatus = 'CONNECTED' | 'CONNECTING' | 'DISCONNECTED';

class WebSocketService {
  private client: Client | null = null;
  private statusListeners: ((status: ConnectionStatus) => void)[] = [];
  private isConnected = false;
  private pendingSubscriptions: (() => void)[] = [];

  public connect(onStatusChange?: (status: ConnectionStatus) => void) {
    if (onStatusChange) {
      this.statusListeners.push(onStatusChange);
    }

    if (this.client && this.client.active) {
      if (onStatusChange) onStatusChange(this.isConnected ? 'CONNECTED' : 'CONNECTING');
      return;
    }

    this.notifyStatus('CONNECTING');

    try {
      // Configure STOMP over SockJS to match Spring Boot backend (/ws)
      this.client = new Client({
        webSocketFactory: () => {
          try {
            const SockJSCtor = (SockJS as any)?.default || SockJS;
            return new SockJSCtor('https://rideflow-production-06dc.up.railway.app/ws');
          } catch (e) {
            console.warn('SockJS client instantiation fallback:', e);
            throw e;
          }
        },
        reconnectDelay: 5000, // Auto-reconnect every 5 seconds if connection drops
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
        debug: () => {
          // Uncomment for debug logs
        },
        onConnect: () => {
          this.isConnected = true;
          this.notifyStatus('CONNECTED');
          console.log('✅ Connected to RideFlow STOMP WebSocket Broker');
          this.pendingSubscriptions.forEach((sub) => {
            try {
              sub();
            } catch (err) {
              console.error('Subscription execution error:', err);
            }
          });
          this.pendingSubscriptions = [];
        },
        onDisconnect: () => {
          this.isConnected = false;
          this.notifyStatus('DISCONNECTED');
          console.warn('⚠️ Disconnected from RideFlow STOMP Broker');
        },
        onWebSocketError: (event) => {
          console.warn('WebSocket telemetry broker notice:', event);
          this.isConnected = false;
          this.notifyStatus('DISCONNECTED');
        },
        onStompError: (frame) => {
          console.warn('STOMP Protocol notice:', frame.headers['message']);
        },
      });

      this.client.activate();
    } catch (e) {
      console.warn('WebSocket connection activation caught:', e);
      this.notifyStatus('DISCONNECTED');
    }
  }

  // Subscribe to live taxi location updates
  public subscribeToDriverLocations(callback: (location: DriverLocationPayload) => void) {
    const doSubscribe = () => {
      if (!this.client || !this.isConnected) return () => {};
      try {
        const subscription = this.client.subscribe('/topic/drivers/location', (message) => {
          try {
            const payload: DriverLocationPayload = JSON.parse(message.body);
            callback(payload);
          } catch (err) {
            console.error('Error parsing driver location payload:', err);
          }
        });
        return () => {
          try {
            subscription.unsubscribe();
          } catch (e) {
            // Ignore teardown errors
          }
        };
      } catch (e) {
        console.warn('Failed to subscribe to /topic/drivers/location:', e);
        return () => {};
      }
    };

    if (this.isConnected) {
      return doSubscribe();
    } else {
      let unsubscribeFn: (() => void) | null = null;
      this.pendingSubscriptions.push(() => {
        unsubscribeFn = doSubscribe();
      });
      return () => {
        if (unsubscribeFn) unsubscribeFn();
      };
    }
  }

  // Subscribe to global ride lifecycle state changes (REQUESTED -> ACCEPTED -> COMPLETED)
  public subscribeToRideEvents(callback: (event: RideEventPayload) => void) {
    const doSubscribe = () => {
      if (!this.client || !this.isConnected) return () => {};
      try {
        const subscription = this.client.subscribe('/topic/rides', (message) => {
          try {
            const payload: RideEventPayload = JSON.parse(message.body);
            callback(payload);
          } catch (err) {
            console.error('Error parsing ride event payload:', err);
          }
        });
        return () => {
          try {
            subscription.unsubscribe();
          } catch (e) {
            // Ignore teardown errors
          }
        };
      } catch (e) {
        console.warn('Failed to subscribe to /topic/rides:', e);
        return () => {};
      }
    };

    if (this.isConnected) {
      return doSubscribe();
    } else {
      let unsubscribeFn: (() => void) | null = null;
      this.pendingSubscriptions.push(() => {
        unsubscribeFn = doSubscribe();
      });
      return () => {
        if (unsubscribeFn) unsubscribeFn();
      };
    }
  }

  public disconnect() {
    if (this.client) {
      try {
        this.client.deactivate();
      } catch (e) {
        console.warn('WebSocket deactivation notice:', e);
      }
      this.isConnected = false;
      this.notifyStatus('DISCONNECTED');
    }
  }

  private notifyStatus(status: ConnectionStatus) {
    this.statusListeners.forEach((listener) => {
      try {
        listener(status);
      } catch (e) {
        console.error('Listener notify error:', e);
      }
    });
  }
}

export const wsService = new WebSocketService();