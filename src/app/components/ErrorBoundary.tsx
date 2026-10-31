import { useRouteError, useNavigate } from "react-router";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { motion } from "motion/react";

export function RouteErrorBoundary() {
  const error = useRouteError() as any;
  const navigate = useNavigate();

  const errorMessage =
    error?.statusText || error?.message || "Terjadi kendala saat memuat halaman.";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-app)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <div
        style={{
          background: "var(--bg-card)",
          borderRadius: "20px",
          padding: "28px 24px",
          maxWidth: "380px",
          width: "100%",
          textAlign: "center",
          boxShadow: "var(--glow-card)",
          border: "1px solid var(--border-subtle)",
        }}
      >
        <div
          style={{
            width: "56px",
            height: "56px",
            borderRadius: "16px",
            background: "rgba(239, 68, 68, 0.12)",
            color: "#EF4444",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
          }}
        >
          <AlertTriangle size={28} />
        </div>

        <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--text-heading)", margin: "0 0 8px" }}>
          Terjadi Kesalahan Sistem
        </h2>

        <p style={{ fontSize: "12.5px", color: "var(--text-muted)", margin: "0 0 20px", lineHeight: 1.5 }}>
          {errorMessage}
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => window.location.reload()}
            style={{
              padding: "12px",
              borderRadius: "12px",
              background: "#2563EB",
              color: "#FFFFFF",
              border: "none",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <RefreshCw size={15} />
            <span>Muat Ulang Halaman</span>
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate("/dashboard")}
            style={{
              padding: "12px",
              borderRadius: "12px",
              background: "var(--bg-hover)",
              color: "var(--text-primary)",
              border: "1px solid var(--border-subtle)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Home size={15} />
            <span>Kembali ke Beranda</span>
          </motion.button>
        </div>
      </div>
    </div>
  );
}
