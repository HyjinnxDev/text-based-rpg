"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import type { CampaignMapConfig } from "@tbrpg/shared";
import { readMapPosition } from "@tbrpg/shared";
import { LoadingOverlay } from "@/components/ui";

export interface MapMarkerData {
  id: string;
  label: string;
  markerType: string;
  position: { lng?: number; lat?: number; x?: number; y?: number };
  portraitUrl?: string | null;
}

const MARKER_COLORS: Record<string, string> = {
  player: "#c9892e",
  npc: "#5b9fd4",
  default: "#9c9285",
};

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
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    setMapReady(false);

    const center = markers.length > 0 ? readMapPosition(markers[0].position) : { x: 0.5, y: 0.5 };

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapConfig
        ? EMPTY_STYLE
        : (process.env.NEXT_PUBLIC_MAPLIBRE_STYLE ?? "https://demotiles.maplibre.org/style.json"),
      center: mapConfig ? [center.x, center.y] : [center.x * 180, center.y * 90],
      zoom: mapConfig ? -0.2 : 4,
      maxZoom: mapConfig ? mapConfig.maxZoom + 1 : 18,
      minZoom: mapConfig ? -1 : 0,
      touchPitch: false,
    });

    if (mapConfig) {
      map.setMaxBounds([[-0.02, -0.02], [1.02, 1.02]]);
    }

    map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
    mapRef.current = map;

    map.on("load", () => {
      setMapReady(true);
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
    if (map.loaded()) setMapReady(true);

    const onResize = () => map.resize();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      map.remove();
      mapRef.current = null;
      setMapReady(false);
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
          MARKER_COLORS[marker.markerType] ?? MARKER_COLORS.default;

        const el = document.createElement("div");
        el.className = "tbrpg-marker";
        el.title = marker.label;

        if (marker.portraitUrl) {
          el.style.cssText = `width:36px;height:36px;border-radius:9999px;border:2px solid white;background:url(${marker.portraitUrl}) center/cover;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,.4);`;
        } else {
          el.style.cssText = `width:16px;height:16px;border-radius:9999px;background:${color};border:2px solid white;cursor:pointer;`;
        }

        new maplibregl.Marker({ element: el })
          .setLngLat([x, y])
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
    <div className="relative">
      <div
        ref={containerRef}
        className={
          className ??
          "h-full min-h-[240px] w-full overflow-hidden rounded-xl sm:min-h-[320px]"
        }
      />
      {!mapReady && <LoadingOverlay label="Loading map…" />}
    </div>
  );
}
