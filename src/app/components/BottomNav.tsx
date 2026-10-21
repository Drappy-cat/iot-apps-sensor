import { useNavigate, useLocation } from "react-router";
import { Home, BarChart2, Clock, Settings } from "lucide-react";
import { motion } from "motion/react";
import { hapticLight } from "../services/hapticsService";

const navItems = [
  { icon: Home, label: "Beranda", path: "/dashboard" },
  { icon: BarChart2, label: "Riwayat", path: "/analytics" },
  { icon: Clock, label: "Jadwal", path: "/schedule" },
  { icon: Settings, label: "Pengaturan", path: "/settings" },
];

export function BottomNav() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: "50%",
        transform: "translateX(-50%)",
        width: "100%",
        maxWidth: "430px",
        background: "var(--bg-card)",
        borderTop: "1px solid var(--bg-hover)",
        boxShadow: "0px -2px 12px rgba(0,0,0,0.06)",
        display: "flex",
        justifyContent: "space-around",
        alignItems: "center",
        padding: "10px 0 16px",
        zIndex: 100,
        fontFamily: "'Inter', sans-serif",
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
              flexDirection: "column",
              alignItems: "center",
              gap: "4px",
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 16px",
              position: "relative",
            }}
          >
            <motion.div
              animate={{
                color: isActive ? "#3B82F6" : "var(--icon-muted)",
                y: isActive ? -4 : 0,
                scale: isActive ? 1.15 : 1,
              }}
              transition={{
                type: "spring",
                stiffness: 400,
                damping: 15,
              }}
            >
              <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
            </motion.div>
            
            <motion.span
              animate={{
                color: isActive ? "#3B82F6" : "var(--icon-muted)",
                opacity: isActive ? 1 : 0.8,
              }}
              transition={{ duration: 0.3 }}
              style={{
                fontSize: "11px",
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
