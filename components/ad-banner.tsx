'use client';

import { useEffect, useRef, useState } from 'react';
import { ADSENSE, adsConfigured, type AdPlacement } from '../lib/ads';

const RAIL_MIN_WIDTH = 1400;

let adScript: Promise<void> | undefined;
function loadAds() {
  return adScript ??= new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE.publisherId}`;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Ad service unavailable'));
    document.head.appendChild(script);
  });
}

// Side rails stay unmounted below this width so a hidden, zero-width unit never
// consumes an ad request meant for a visible one.
function useRailRoom() {
  const [room, setRoom] = useState(false);
  useEffect(() => {
    const query = window.matchMedia(`(min-width: ${RAIL_MIN_WIDTH}px)`);
    const update = () => setRoom(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);
  return room;
}

// Ads render nothing until AdSense IDs exist, so `?adpreview=1` draws the space
// each placement will occupy. Opt-in per visit; ordinary visitors never see it.
function useLayoutPreview() {
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    setPreview(new URLSearchParams(location.search).has('adpreview'));
  }, []);
  return preview;
}

export function AdBanner({ placement = 'bottom' }: { placement?: AdPlacement }) {
  const slot = useRef<HTMLModElement>(null);
  const requested = useRef(false);
  const [failed, setFailed] = useState(false);
  const railRoom = useRailRoom();
  const preview = useLayoutPreview();
  const vertical = placement === 'left' || placement === 'right';
  const live = adsConfigured(placement);
  const enabled = live && (!vertical || railRoom);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    loadAds().then(() => {
      if (cancelled || !slot.current) return;
      const request = () => {
        if (cancelled || requested.current || !slot.current?.getBoundingClientRect().width) return;
        requested.current = true;
        observer?.disconnect();
        try {
          const adsWindow = window as Window & { adsbygoogle?: object[] };
          (adsWindow.adsbygoogle ??= []).push({});
        } catch {
          setFailed(true);
        }
      };
      observer = new ResizeObserver(request);
      observer.observe(slot.current);
      request();
    }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; observer?.disconnect(); };
  }, [enabled]);

  if (vertical && !railRoom) return null;
  if (preview && !live)
    return (
      <aside className={`ad-banner ad-${placement}`} aria-label="Advertisement">
        <span className="ad-label">Advertisement</span>
        <div className="ad-placeholder">{placement} · {vertical ? '160×600' : 'responsive'}</div>
      </aside>
    );
  if (!enabled || failed) return null;
  return (
    <aside className={`ad-banner ad-${placement}`} aria-label="Advertisement">
      <span className="ad-label">Advertisement</span>
      <ins ref={slot} className="adsbygoogle" style={{ display: 'block' }}
        data-ad-client={ADSENSE.publisherId} data-ad-slot={ADSENSE.slots[placement]}
        data-ad-format={vertical ? 'vertical' : 'horizontal'} data-full-width-responsive="false"
        data-adtest={ADSENSE.testMode ? 'on' : undefined} />
    </aside>
  );
}
