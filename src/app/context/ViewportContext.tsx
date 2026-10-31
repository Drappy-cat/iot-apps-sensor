import React, { createContext, useContext, useState, useEffect } from "react";

export type ViewportMode = "mobile" | "tablet" | "web";

interface ViewportContextType {
  viewportMode: ViewportMode;
  setViewportMode: (mode: ViewportMode) => void;
  toggleViewportMode: () => void;
  isWebMode: boolean;
  isMobileMode: boolean;
  isTabletMode: boolean;
}

const ViewportContext = createContext<ViewportContextType | undefined>(undefined);

const VIEWPORT_STORAGE_KEY = "gh_viewport_mode";

export function ViewportProvider({ children }: { children: React.ReactNode }) {
  const [viewportMode, setViewportModeState] = useState<ViewportMode>(() => {
    try {
      const saved = localStorage.getItem(VIEWPORT_STORAGE_KEY);
      if (saved === "mobile" || saved === "tablet" || saved === "web") {
        return saved;
      }
    } catch (e) {
      // Ignore localStorage errors
    }
    return "mobile";
  });

  const setViewportMode = (mode: ViewportMode) => {
    setViewportModeState(mode);
    try {
      localStorage.setItem(VIEWPORT_STORAGE_KEY, mode);
    } catch (e) {
      // Ignore localStorage errors
    }
  };

  const toggleViewportMode = () => {
    setViewportMode(viewportMode === "mobile" ? "web" : "mobile");
  };

  // Sync across tabs/windows if needed
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === VIEWPORT_STORAGE_KEY && (e.newValue === "mobile" || e.newValue === "tablet" || e.newValue === "web")) {
        setViewportModeState(e.newValue as ViewportMode);
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  return (
    <ViewportContext.Provider
      value={{
        viewportMode,
        setViewportMode,
        toggleViewportMode,
        isWebMode: viewportMode === "web",
        isMobileMode: viewportMode === "mobile",
        isTabletMode: viewportMode === "tablet",
      }}
    >
      {children}
    </ViewportContext.Provider>
  );
}

export function useViewport() {
  const context = useContext(ViewportContext);
  if (!context) {
    return {
      viewportMode: "mobile" as ViewportMode,
      setViewportMode: () => {},
      toggleViewportMode: () => {},
      isWebMode: false,
      isMobileMode: true,
      isTabletMode: false,
    };
  }
  return context;
}

