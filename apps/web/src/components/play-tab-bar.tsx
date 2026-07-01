"use client";

import { BookOpen, Map, Scroll } from "lucide-react";

export function PlayTabBar({
  activeTab,
  onTabChange,
}: {
  activeTab: "scene" | "map" | "codex";
  onTabChange: (tab: "scene" | "map" | "codex") => void;
}) {
  const tabs = [
    { id: "scene" as const, label: "Scene", icon: BookOpen },
    { id: "map" as const, label: "Map", icon: Map },
    { id: "codex" as const, label: "Codex", icon: Scroll },
  ];

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur-md lg:hidden safe-bottom"
      aria-label="Play view"
    >
      <div className="mx-auto flex max-w-lg">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors ${
              activeTab === id
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            aria-current={activeTab === id ? "page" : undefined}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </button>
        ))}
      </div>
    </nav>
  );
}
