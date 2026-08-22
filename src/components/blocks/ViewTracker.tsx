"use client";

import { useEffect } from "react";

export function ViewTracker({ slug }: { slug: string }) {
  useEffect(() => {
    const key = `memento_viewed_${slug}`;
    try {
      if (sessionStorage.getItem(key)) return;
      sessionStorage.setItem(key, "1");
    } catch {
      /* private mode */
    }
    fetch(`/api/i/${slug}/view`, { method: "POST", keepalive: true }).catch(
      () => {},
    );
  }, [slug]);
  return null;
}
