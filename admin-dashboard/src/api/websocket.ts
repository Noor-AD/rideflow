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

    // Configure STOMP over SockJS to match Spring Boot backend (/ws)
    this.client = new Client({
      webSocketFactory: () => new SockJS('https://rideflow-production-06dc.up.railway.app/ws'),
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
        this.pendingSubscriptions.forEach((sub) => sub());
        this.pendingSubscriptions = [];
      },
      onDisconnect: () => {
        this.isConnected = false;
        this.notifyStatus('DISCONNECTED');
        console.warn('⚠️ Disconnected from RideFlow STOMP Broker');
      },
      onStompError: (frame) => {
        console.error('❌ STOMP Protocol Error:', frame.headers['message'], frame.body);
      },
    });

    this.client.activate();
  }

  // Subscribe to live taxi location updates
  public subscribeToDriverLocations(callback: (location: DriverLocationPayload) => void) {
    const doSubscribe = () => {
      if (!this.client || !this.isConnected) return () => {};
      const subscription = this.client.subscribe('/topic/drivers/location', (message) => {
        try {
          const payload: DriverLocationPayload = JSON.parse(message.body);
          callback(payload);
        } catch (err) {
          console.error('Error parsing driver location payload:', err);
        }
      });
      return () => subscription.unsubscribe();
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
      const subscription = this.client.subscribe('/topic/rides', (message) => {
        try {
          const payload: RideEventPayload = JSON.parse(message.body);
          callback(payload);
        } catch (err) {
          console.error('Error parsing ride event payload:', err);
        }
      });
      return () => subscription.unsubscribe();
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
      this.client.deactivate();
      this.isConnected = false;
      this.notifyStatus('DISCONNECTED');
    }
  }

  private notifyStatus(status: ConnectionStatus) {
    this.statusListeners.forEach((listener) => listener(status));
  }
}

export const wsService = new WebSocketService();