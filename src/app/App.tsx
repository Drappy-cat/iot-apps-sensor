import React from "react";
import { RouterProvider } from "react-router";
import { ThemeProvider } from "next-themes";
import { router } from "./routes";
import { DevPageSwitcher } from "./components/DevPageSwitcher";
import { ViewportProvider, useViewport } from "./context/ViewportContext";
import { Monitor } from "lucide-react";

function AppContent() {
  const { viewportMode, toggleViewportMode } = useViewport();
  const isDev = import.meta.env.DEV;

  const isMobile = viewportMode === "mobile";
  const isTablet = viewportMode === "tablet";
  const isWeb = viewportMode === "web";

  const getContainerMaxWidth = () => {
    if (isMobile) return "430px";
    if (isTablet) return "768px";
    return "100%";
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: isWeb ? "var(--bg-app)" : "var(--bg-body)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        fontFamily: "'Inter', sans-serif",
        transition: "background 0.3s ease",
        padding: isWeb ? "0" : "16px 8px 32px",
      }}
    >
      {/* Device Simulation Banner (Hanya di Mode Dev saat simulasi frame Mobile/Tablet) */}
      {isDev && !isWeb && (
        <div
          style={{
            width: "100%",
            maxWidth: getContainerMaxWidth(),
            marginBottom: "8px",
            padding: "6px 14px",
            background: "rgba(15, 23, 42, 0.9)",
            borderRadius: "12px",
            color: "#94A3B8",
            fontSize: "11px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            border: "1px solid rgba(255, 255, 255, 0.08)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#10B981",
                display: "inline-block",
              }}
            />
            <span style={{ fontWeight: 600, color: "#F1F5F9" }}>
              {isMobile ? "📱 Frame Mobile (430px)" : "📱 Frame Tablet (768px)"}
            </span>
          </div>

          <button
            onClick={toggleViewportMode}
            title="Beralih ke tampilan Web Desktop lebar"
            style={{
              background: "rgba(56, 189, 248, 0.15)",
              border: "1px solid rgba(56, 189, 248, 0.3)",
              borderRadius: "6px",
              color: "#38BDF8",
              fontSize: "11px",
              padding: "2px 8px",
              cursor: "pointer",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Monitor size={12} /> Buka Web Mode (Full)
          </button>
        </div>
      )}

      {/* Main App Frame Container */}
      <div
        style={{
          width: "100%",
          maxWidth: getContainerMaxWidth(),
          minHeight: isWeb ? "100vh" : "calc(100vh - 56px)",
          position: "relative",
          background: "var(--bg-app)",
          boxShadow: isWeb ? "none" : "0px 10px 40px rgba(0,0,0,0.18), 0 0 0 1px rgba(0,0,0,0.06)",
          borderRadius: isWeb ? "0px" : "24px",
          overflow: "hidden",
          transition: "max-width 0.3s cubic-bezier(0.4, 0, 0.2, 1), border-radius 0.3s ease",
        }}
      >
        <RouterProvider router={router} />
        {/* Tombol Navigasi Dev: Otomatis HILANG saat build produksi / komersial */}
        <DevPageSwitcher />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
      <ViewportProvider>
        <AppContent />
      </ViewportProvider>
    </ThemeProvider>
  );
}
