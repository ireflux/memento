"use client";

import { useEffect, useRef, useState } from "react";
import { getTrack } from "@/lib/music-library";

/**
 * 背景音乐播放器。
 * - track 无 url（未上架）时不渲染任何 UI；
 * - 微信内尝试通过 WeixinJSBridgeReady 事件自动播放（视为用户手势上下文），
 *   非微信环境退化为首次触摸时尝试一次。
 */
export function MusicPlayer({ trackId }: { trackId?: string }) {
  const track = getTrack(trackId);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!track?.url) return;
    const el = audioRef.current;
    if (!el) return;
    el.volume = 0.55;
    el.loop = true;

    let cancelled = false;
    const tryPlay = () => {
      if (cancelled) return;
      el.play().then(
        () => !cancelled && setPlaying(true),
        () => setPlaying(false),
      );
    };

    // 微信内置浏览器：JSBridge 就绪后才允许有声 autoplay
    document.addEventListener("WeixinJSBridgeReady", tryPlay, { once: true });
    // 通用兜底：首次触摸/点击时尝试启动一次
    const onceGesture = () => {
      document.removeEventListener("WeixinJSBridgeReady", tryPlay);
      tryPlay();
    };
    document.addEventListener("touchstart", onceGesture, { once: true });

    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    el.addEventListener("play", onPlay);
    el.addEventListener("pause", onPause);

    return () => {
      cancelled = true;
      document.removeEventListener("WeixinJSBridgeReady", tryPlay);
      document.removeEventListener("touchstart", onceGesture);
      el.removeEventListener("play", onPlay);
      el.removeEventListener("pause", onPause);
      el.pause();
    };
  }, [track?.url]);

  if (!track?.url) return null;

  const toggle = () => {
    const el = audioRef.current;
    if (!el) return;
    if (el.paused) {
      void el.play().catch(() => setPlaying(false));
    } else {
      el.pause();
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
