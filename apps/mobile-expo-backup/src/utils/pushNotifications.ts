import { Platform } from 'react-native';
import { isWeb } from './platform';

interface PushSubscription {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export class PushNotificationService {
  private static instance: PushNotificationService;
  private registration: ServiceWorkerRegistration | null = null;
  private subscription: PushSubscription | null = null;

  static getInstance(): PushNotificationService {
    if (!PushNotificationService.instance) {
      PushNotificationService.instance = new PushNotificationService();
    }
    return PushNotificationService.instance;
  }

  async initialize(): Promise<void> {
    if (!isWeb) {
      console.log('Push notifications are only supported on web platform');
      return;
    }

    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      console.log('Push notifications are not supported in this browser');
      return;
    }

    try {
      // Wait for service worker to be ready
      this.registration = await navigator.serviceWorker.ready;
      console.log('Service Worker ready for push notifications');
    } catch (error) {
      console.error('Failed to initialize push notifications:', error);
    }
  }

  async requestPermission(): Promise<boolean> {
    if (!isWeb) return false;

    try {
      const permission = await Notification.requestPermission();
      return permission === 'granted';
    } catch (error) {
      console.error('Failed to request notification permission:', error);
      return false;
    }
  }

  async subscribe(vapidPublicKey: string): Promise<PushSubscription | null> {
    if (!this.registration) {
      await this.initialize();
    }

    if (!this.registration) {
      console.error('Service Worker not registered');
      return null;
    }

    try {
      // Check if we have permission
      if (Notification.permission !== 'granted') {
        const granted = await this.requestPermission();
        if (!granted) {
          console.log('Notification permission denied');
          return null;
        }
      }

      // Subscribe to push notifications
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(vapidPublicKey)
      });

      // Convert subscription to our format
      const subscriptionJSON = subscription.toJSON();
      if (subscriptionJSON.endpoint && subscriptionJSON.keys) {
        this.subscription = {
          endpoint: subscriptionJSON.endpoint,
          keys: {
            p256dh: subscriptionJSON.keys.p256dh || '',
            auth: subscriptionJSON.keys.auth || ''
          }
        };

        console.log('Push notification subscription successful');
        return this.subscription;
      }

      return null;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      return null;
    }
  }

  async unsubscribe(): Promise<boolean> {
    if (!this.registration) return false;

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        await subscription.unsubscribe();
        this.subscription = null;
        console.log('Push notification unsubscribe successful');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      return false;
    }
  }

  async getSubscription(): Promise<PushSubscription | null> {
    if (this.subscription) return this.subscription;

    if (!this.registration) {
      await this.initialize();
    }

    if (!this.registration) return null;

    try {
      const subscription = await this.registration.pushManager.getSubscription();
      if (subscription) {
        const subscriptionJSON = subscription.toJSON();
        if (subscriptionJSON.endpoint && subscriptionJSON.keys) {
          this.subscription = {
            endpoint: subscriptionJSON.endpoint,
            keys: {
              p256dh: subscriptionJSON.keys.p256dh || '',
              auth: subscriptionJSON.keys.auth || ''
            }
          };
          return this.subscription;
        }
      }
      return null;
    } catch (error) {
      console.error('Failed to get push subscription:', error);
      return null;
    }
  }

  // Helper function to convert VAPID key
  private urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/\-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Send a test notification
  async sendTestNotification(): Promise<void> {
    if (!isWeb || !this.registration) return;

    try {
      await this.registration.showNotification('MUED テスト通知', {
        body: 'プッシュ通知が正しく設定されました！',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        tag: 'test-notification',
        requireInteraction: false
      });
    } catch (error) {
      console.error('Failed to show test notification:', error);
    }
  }
}