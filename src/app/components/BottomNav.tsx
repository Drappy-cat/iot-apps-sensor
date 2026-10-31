import { useNavigate, useLocation } from "react-router";
import { Home, BarChart2, Cpu, Clock, Settings } from "lucide-react";
import { motion } from "motion/react";
import { hapticLight } from "../services/hapticsService";
import { useViewport } from "../context/ViewportContext";

const navItems = [
  { icon: Home, label: "Beranda", path: "/dashboard" },
  { icon: BarChart2, label: "Riwayat", path: "/analytics" },
  { icon: Cpu, label: "Offline", path: "/offline" },
  { icon: Clock, label: "Jadwal", path: "/schedule" },
  { icon: Settings, label: "Pengaturan", path: "/settings" },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();
  const { viewportMode } = useViewport();

  const isWeb = viewportMode === "web";
  const isTablet = viewportMode === "tablet";

  return (
    <div
      style={{
        position: "fixed",
        bottom: isWeb ? "16px" : 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: isWeb ? "calc(100% - 32px)" : "100%",
        maxWidth: isWeb ? "640px" : isTablet ? "768px" : "430px",
        background: "var(--bg-card)",
        border: isWeb ? "1px solid var(--border-subtle)" : "none",
        borderTop: isWeb ? "1px solid var(--border-subtle)" : "1px solid var(--bg-hover)",
        borderRadius: isWeb ? "24px" : 0,
        boxShadow: isWeb ? "0px 12px 36px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.05)" : "0px -2px 12px rgba(0,0,0,0.06)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: isWeb ? "10px 16px" : "10px 0 16px",
        zIndex: 100,
        fontFamily: "'Inter', sans-serif",
        backdropFilter: "blur(12px)",
        transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      }}
    >
      {navItems.map(({ icon: Icon, label, path }) => {
        const isActive = location.pathname === path;
        return (
          <motion.button
            key={path}
            whileTap={{ scale: 0.85 }}
            onClick={() => { hapticLight(); navigate(path); }}
            style={{
              display: "flex",
              flexDirection: isWeb ? "row" : "column",
              alignItems: "center",
              gap: isWeb ? "8px" : "4px",
              background: isWeb && isActive ? "rgba(59, 130, 246, 0.1)" : "none",
              border: "none",
              cursor: "pointer",
              padding: isWeb ? "6px 14px" : "4px 8px",
              borderRadius: isWeb ? "12px" : "0",
              position: "relative",
              transition: "background 0.2s ease",
            }}
          >
            <motion.div
              animate={{
                color: isActive ? "#3B82F6" : "var(--icon-muted)",
                y: isWeb ? 0 : isActive ? -4 : 0,
                scale: isActive ? 1.15 : 1,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
              }}
            >
              <Icon size={isWeb ? 20 : 22} strokeWidth={isActive ? 2.5 : 1.8} />
            </motion.div>
            
            <motion.span
              animate={{
                color: isActive ? "#3B82F6" : "var(--icon-muted)",
                opacity: isActive ? 1 : 0.8,
              }}
              transition={{ duration: 0.3 }}
              style={{
                fontSize: isWeb ? "13px" : "11px",
                fontWeight: isActive ? 600 : 400,
              }}
            >
              {label}
            </motion.span>
          </motion.button>
        );
      })}
    </div>
  );
}
