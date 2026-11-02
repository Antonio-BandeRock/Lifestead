// Opens a link the computer app was started with, or handed while open
// (2026-11-02, 1.0.79.3). Today that is one kind: a tester's request,
// lifesteaddev://approve?r=CODE, from the request page's Open in Lifestead
// button, which goes to Approve a Tester, approved at once. Anything else
// is ignored. On a phone, and on an installer built before 1.0.79.3, it
// does nothing; expo-router reads a phone's links by itself.
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { isDeveloperBuild } from '../lib/appVariant';
import { getDesktopBridge, isDesktopApp } from '../lib/desktop/bridge';

/** The approve screen's address for a link, or null for any other link. */
export function routeForDesktopLink(link: string): string | null {
  const match = /^[a-z]+:\/\/approve\/?\?r=([A-Za-z0-9_-]+)/i.exec(link.trim());
  return match ? `/approve?r=${match[1]}` : null;
}

export function DesktopLinkWatcher() {
  const router = useRouter();
  useEffect(() => {
    if (!isDesktopApp() || !isDeveloperBuild()) return;
    const links = getDesktopBridge().links;
    if (!links) return;
    const take = () => {
      void links.take().then((link) => {
        const route = link ? routeForDesktopLink(link) : null;
        if (route) router.push(route as never);
      });
    };
    take();
    return links.onWaiting(take);
  }, [router]);
  return null;
}
