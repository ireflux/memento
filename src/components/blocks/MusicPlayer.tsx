"use client";

import { useEffect, useRef, useState } from "react";
import { getTrack } from "@/lib/music-library";

export function MusicPlayer({ trackId }: { trackId?: string }) {
  const track = getTrack(trackId);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!track?.url || !audioRef.current) return;
    const el = audioRef.current;
    el.volume = 0.55;
    el.loop = true;
  }, [track?.url]);

  if (!track?.url) {
    return track ? (
      <div
        className="fixed bottom-4 left-1/2 z-40 -translate-x-1/2 rounded-full px-3 py-1 text-[10px]"
        style={{
          background: "var(--tk-surface)",
          color: "var(--tk-muted)",
        }}
      >
        🎵 {track.title}
      </div>
    ) : null;
  }

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (playing) {
      el.pause();
      setPlaying(false);
    } else {
      void el.play().then(
        () => setPlaying(true),
        () => setPlaying(false),
      );
    }
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={playing ? "暂停音乐" : "播放音乐"}
      className="fixed right-4 top-16 z-50 flex h-11 w-11 items-center justify-center rounded-full shadow-lg backdrop-blur"
      style={{ background: "var(--tk-surface)", color: "var(--tk-primary)" }}
    >
      <span
        className={`text-lg ${playing ? "animate-spin [animation-duration:3s]" : ""}`}
      >
        💿
      </span>
      <audio ref={audioRef} src={track.url} preload="none" />
    </button>
  );
}
