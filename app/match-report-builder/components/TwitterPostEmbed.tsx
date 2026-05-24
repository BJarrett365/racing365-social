"use client";

import { useEffect, useRef } from "react";

const TWITTER_WIDGETS_SRC = "https://platform.twitter.com/widgets.js";

declare global {
  interface Window {
    twttr?: {
      widgets: {
        load: (element?: HTMLElement) => void;
      };
    };
  }
}

let widgetsLoadPromise: Promise<void> | null = null;

function loadTwitterWidgets(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.twttr?.widgets) {
    window.twttr.widgets.load();
    return Promise.resolve();
  }
  if (widgetsLoadPromise) return widgetsLoadPromise;

  widgetsLoadPromise = new Promise((resolve) => {
    const existing = document.querySelector(`script[src="${TWITTER_WIDGETS_SRC}"]`);
    if (existing) {
      existing.addEventListener("load", () => {
        window.twttr?.widgets.load();
        resolve();
      });
      return;
    }

    const script = document.createElement("script");
    script.src = TWITTER_WIDGETS_SRC;
    script.async = true;
    script.onload = () => {
      window.twttr?.widgets.load();
      resolve();
    };
    document.body.appendChild(script);
  });

  return widgetsLoadPromise;
}

type Props = {
  url: string;
};

export function TwitterPostEmbed({ url }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void loadTwitterWidgets().then(() => {
      if (containerRef.current && window.twttr?.widgets) {
        window.twttr.widgets.load(containerRef.current);
      }
    });
  }, [url]);

  return (
    <div
      ref={containerRef}
      className="overflow-hidden rounded-xl border"
      style={{ borderColor: "var(--border)", background: "var(--surface)" }}
    >
      <blockquote className="twitter-tweet" data-theme="dark" data-dnt="true">
        <a href={url} />
      </blockquote>
    </div>
  );
}
