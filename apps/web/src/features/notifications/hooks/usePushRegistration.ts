import { useCallback, useEffect, useState } from 'react';

import { notificationsApi } from '../api/notifications.api';

/**
 * VAPID keys travel as base64url; PushManager wants raw bytes. Backed by an
 * explicit ArrayBuffer because applicationServerKey rejects a view that might
 * sit on a SharedArrayBuffer.
 */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padded = (base64 + '='.repeat((4 - (base64.length % 4)) % 4))
    .replace(/-/g, '+')
    .replace(/_/g, '/');
  const raw = window.atob(padded);

  const view = new Uint8Array(new ArrayBuffer(raw.length));
  for (let index = 0; index < raw.length; index += 1) view[index] = raw.charCodeAt(index);
  return view;
}

type PushState = 'unsupported' | 'unconfigured' | 'default' | 'granted' | 'denied';

/**
 * Owns the service worker registration and the browser push subscription.
 * Permission is only ever requested from a click - browsers reject it
 * otherwise, and an unprompted permission dialog is hostile anyway.
 */
export function usePushRegistration() {
  const [state, setState] = useState<PushState>('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      setState('unsupported');
      return;
    }

    void (async () => {
      const { publicKey } = await notificationsApi.pushConfig().catch(() => ({ publicKey: null }));
      if (!publicKey) {
        setState('unconfigured');
        return;
      }
      setState(Notification.permission as PushState);
    })();
  }, []);

  const enable = useCallback(async (): Promise<void> => {
    setBusy(true);
    try {
      const { publicKey } = await notificationsApi.pushConfig();
      if (!publicKey) {
        setState('unconfigured');
        return;
      }

      const permission = await Notification.requestPermission();
      setState(permission as PushState);
      if (permission !== 'granted') return;

      const registration = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const existing = await registration.pushManager.getSubscription();
      const subscription =
        existing ??
        (await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(publicKey),
        }));

      const json = subscription.toJSON() as { endpoint?: string; keys?: Record<string, string> };
      if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return;

      await notificationsApi.subscribe({
        endpoint: json.endpoint,
        keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
        userAgent: navigator.userAgent.slice(0, 300),
      });
    } finally {
      setBusy(false);
    }
  }, []);

  return { state, busy, enable };
}
