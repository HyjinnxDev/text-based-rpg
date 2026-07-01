"use client";

import { useEffect, useRef } from "react";
import maplibregl from "maplibre-gl";
import type { CampaignMapConfig } from "@tbrpg/shared";
import { readMapPosition } from "@tbrpg/shared";

export interface MapMarkerData {
  id: string;
  label: string;
  markerType: string;
  position: { lng?: number; lat?: number; x?: number; y?: number };
  portraitUrl?: string | null;
}

const EMPTY_STYLE: maplibregl.StyleSpecification = {
  version: 8,
  sources: {},
  layers: [],
};

export function CampaignMap({
  markers,
  mapConfig,
  className,
}: {
  markers: MapMarkerData[];
  mapConfig?: CampaignMapConfig | null;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const center = markers.length > 0 ? readMapPosition(markers[0].position) : { x: 0.5, y: 0.5 };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapConfig ? EMPTY_STYLE : (process.env.NEXT_PUBLIC_MAPLIBRE_STYLE ?? "https://demotiles.maplibre.org/style.json"),
      center: mapConfig ? [center.x, center.y] : [center.x * 180, center.y * 90],
      zoom: mapConfig ? -0.2 : 4,
      maxZoom: mapConfig ? mapConfig.maxZoom + 1 : 18,
      minZoom: mapConfig ? -1 : 0,
    });

    if (mapConfig) {
      map.setMaxBounds([[-0.02, -0.02], [1.02, 1.02]]);
    }

    map.addControl(new maplibregl.NavigationControl(), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      if (!mapConfig) return;

      map.addSource("campaign-tiles", {
        type: "raster",
        tiles: [mapConfig.tileUrlTemplate],
        tileSize: 256,
        bounds: [0, 0, 1, 1],
        minzoom: mapConfig.minZoom,
        maxzoom: mapConfig.maxZoom,
      });
      map.addLayer({
        id: "campaign-tiles",
        type: "raster",
        source: "campaign-tiles",
      });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [mapConfig]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const render = () => {
      document.querySelectorAll(".tbrpg-marker").forEach((el) => el.remove());

      for (const marker of markers) {
        const { x, y } = readMapPosition(marker.position);
        const color =
          marker.markerType === "player"
            ? "#f59e0b"
            : marker.markerType === "npc"
              ? "#60a5fa"
              : "#a8a29e";

        const el = document.createElement("div");
        el.className = "tbrpg-marker";
        el.title = marker.label;

        if (marker.portraitUrl) {
          el.style.cssText = `width:36px;height:36px;border-radius:9999px;border:2px solid white;background:url(${marker.portraitUrl}) center/cover;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4);`;
        } else {
          el.style.cssText = `width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;cursor:pointer;`;
        }

        new maplibregl.Marker({ element: el })
          .setLngLat([x, y])
          .setPopup(new maplibregl.Popup({ offset: 12 }).setText(marker.label))
          .addTo(map);
      }
    };

    if (map.loaded()) render();
    else map.on("load", render);
  }, [markers]);

  return (
    <div
      ref={containerRef}
      className={className ?? "h-full min-h-[320px] w-full rounded-xl overflow-hidden"}
    />
  );
}
