"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";

export interface MapMarkerData {
  id: string;
  label: string;
  markerType: string;
  position: { lng: number; lat: number };
}

const MARKER_COLORS: Record<string, string> = {
  player: "#c9892e",
  npc: "#5b9fd4",
  default: "#9c9285",
};

export function CampaignMap({
  markers,
  className,
}: {
  markers: MapMarkerData[];
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center =
      markers.length > 0 ? markers[0].position : { lng: 12.5, lat: 41.9 };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style:
        process.env.NEXT_PUBLIC_MAPLIBRE_STYLE ??
        "https://demotiles.maplibre.org/style.json",
      center: [center.lng, center.lat],
      zoom: 10,
      touchPitch: false,
    });

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    const onResize = () => map.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
    };
  }, [markers]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const render = () => {
      document.querySelectorAll(".tbrpg-marker").forEach((el) => el.remove());

      for (const marker of markers) {
        const color =
          MARKER_COLORS[marker.markerType] ?? MARKER_COLORS.default;

        const el = document.createElement("div");
        el.className = "tbrpg-marker";
        el.title = marker.label;
        el.style.cssText = `width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;cursor:pointer;`;

        new maplibregl.Marker({ element: el })
          .setLngLat([marker.position.lng, marker.position.lat])
          .setPopup(
            new maplibregl.Popup({ offset: 14, closeButton: false }).setText(
              marker.label,
            ),
          )
          .addTo(map);
      }
    };

    if (map.loaded()) render();
    else map.on("load", render);
  }, [markers]);

  return (
    <div
      ref={containerRef}
      className={
        className ??
        "h-full min-h-[240px] w-full overflow-hidden rounded-xl sm:min-h-[320px]"
      }
    />
  );
}
