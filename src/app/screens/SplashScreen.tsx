import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";

type Phase = "logo" | "brand" | "tagline" | "loading" | "done";

const phases: Phase[] = ["logo", "brand", "tagline", "loading", "done"];
const phaseDurations: Record<Phase, number> = {
  logo: 800,
  brand: 700,
  tagline: 600,
  loading: 1400,
  done: 0,
};

export function SplashScreen() {
  const navigate = useNavigate();
  const [phase, setPhase] = useState<Phase>("logo");
  const [progress, setProgress] = useState(0);

  /* Phase sequencer */
  useEffect(() => {
    let elapsed = 0;
    const timers: ReturnType<typeof setTimeout>[] = [];

    phases.forEach((p) => {
      const t = setTimeout(() => setPhase(p), elapsed);
      timers.push(t);
      elapsed += phaseDurations[p];
    });

    // Total duration before navigate
    const total = phases.reduce((s, p) => s + phaseDurations[p], 0);
    const nav = setTimeout(() => navigate("/login"), total + 200);
    timers.push(nav);

    return () => timers.forEach(clearTimeout);
  }, [navigate]);

  /* Progress bar during "loading" phase */
  useEffect(() => {
    if (phase !== "loading") return;
    setProgress(0);
    const id = setInterval(() => {
      setProgress((p) => {
        if (p >= 100) { clearInterval(id); return 100; }
        return p + 2.5;
      });
    }, 35);
    return () => clearInterval(id);
  }, [phase]);

  const isLoading = phase === "loading" || phase === "done";

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(155deg, #064E3B 0%, #065F46 30%, #047857 60%, #059669 85%, #10B981 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Inter', sans-serif",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* ── Decorative circles ── */}
      {[
        { top: "-120px", right: "-80px", size: 300, opacity: 0.06 },
        { top: "60px",   right: "-60px", size: 180, opacity: 0.04 },
        { bottom: "-140px", left: "-80px", size: 340, opacity: 0.06 },
        { bottom: "100px",  left: "-50px", size: 160, opacity: 0.04 },
      ].map((c, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            top: c.top,
            right: c.right,
            bottom: c.bottom,
            left: c.left,
            width: `${c.size}px`,
            height: `${c.size}px`,
            borderRadius: "50%",
            background: `rgba(255,255,255,${c.opacity})`,
          }}
        />
      ))}

      {/* ── Floating sparkles ── */}
      {[
        { top: "12%", left: "8%",  size: 6,  delay: 0.0 },
        { top: "20%", left: "88%", size: 5,  delay: 0.6 },
        { top: "55%", left: "5%",  size: 8,  delay: 1.1 },
        { top: "75%", left: "82%", size: 6,  delay: 0.4 },
        { top: "40%", left: "92%", size: 4,  delay: 0.9 },
        { top: "65%", left: "14%", size: 5,  delay: 0.2 },
        { top: "85%", left: "50%", size: 4,  delay: 1.3 },
      ].map((s, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, scale: 0 }}
          animate={{ opacity: [0, 0.7, 0], scale: [0, 1, 0], y: [0, -30, -60] }}
          transition={{
            duration: 3,
            delay: s.delay,
            repeat: Infinity,
            repeatDelay: 1.5,
            ease: "easeOut",
          }}
          style={{
            position: "absolute",
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            borderRadius: "50%",
            background: "rgba(255,255,255,0.6)",
          }}
        />
      ))}

      {/* ── Horizontal glowing strip ── */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "-20%",
          width: "140%",
          height: "1px",
          background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
          transform: "translateY(-50%)",
        }}
      />

      {/* ══ Main content ══ */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "0",
          zIndex: 10,
          width: "100%",
          padding: "0 32px",
          boxSizing: "border-box",
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.4, y: 30 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
          style={{
            width: "120px",
            height: "120px",
            borderRadius: "36px",
            background: "rgba(255,255,255,0.12)",
            border: "2px solid rgba(255,255,255,0.2)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backdropFilter: "blur(12px)",
            marginBottom: "32px",
            position: "relative",
            boxShadow: "0px 0px 60px rgba(16, 185, 129, 0.4), 0px 8px 32px rgba(0,0,0,0.25)",
          }}
        >
          {/* Glow ring */}
          <motion.div
            animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            style={{
              position: "absolute",
              inset: "-12px",
              borderRadius: "46px",
              border: "2px solid rgba(52, 211, 153, 0.4)",
              pointerEvents: "none",
            }}
          />
          <svg width="68" height="68" viewBox="0 0 68 68" fill="none">
            {/* Greenhouse body */}
            <rect x="9" y="30" width="50" height="32" rx="4" fill="white" fillOpacity="0.2" />
            {/* Roof */}
            <path d="M5 30L34 8L63 30" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
            {/* Windows */}
            <rect x="13" y="39" width="13" height="14" rx="3" fill="white" fillOpacity="0.55" />
            <rect x="42" y="39" width="13" height="14" rx="3" fill="white" fillOpacity="0.55" />
            {/* Door */}
            <rect x="27" y="44" width="14" height="18" rx="3" fill="white" fillOpacity="0.75" />
            {/* Leaf */}
            <path d="M34 13 C34 13, 43 19, 43 27 C43 31.5, 39 35, 34 35 C29 35, 25 31.5, 25 27 C25 19, 34 13, 34 13Z"
              fill="white" fillOpacity="0.92" />
            <path d="M34 13 L34 35" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" />
            <path d="M27 24 Q34 21 41 24" stroke="#34D399" strokeWidth="1.3" strokeLinecap="round" fill="none" />
          </svg>
        </motion.div>

        {/* Brand name */}
        <AnimatePresence>
          {(phase !== "logo") && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: "easeOut" }}
              style={{ textAlign: "center", marginBottom: "10px" }}
            >
              <p
                style={{
                  fontSize: "11px",
                  fontWeight: 600,
                  color: "rgba(255,255,255,0.5)",
                  letterSpacing: "4px",
                  textTransform: "uppercase",
                  marginBottom: "10px",
                }}
              >
                SELAMAT DATANG DI
              </p>
              <h1
                style={{
                  fontSize: "38px",
                  fontWeight: 900,
                  color: "var(--bg-card)",
                  letterSpacing: "-1px",
                  lineHeight: 1.1,
                  margin: "0 0 4px",
                }}
              >
                Magetan
              </h1>
              <h1
                style={{
                  fontSize: "38px",
                  fontWeight: 900,
                  color: "#34D399",
                  letterSpacing: "-1px",
                  lineHeight: 1.1,
                  margin: 0,
                  textShadow: "0px 0px 30px rgba(52,211,153,0.5)",
                }}
              >
                Greenhouse
              </h1>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tagline */}
        <AnimatePresence>
          {(phase === "tagline" || phase === "loading" || phase === "done") && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{ textAlign: "center", marginBottom: "52px" }}
            >
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "8px",
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                  borderRadius: "30px",
                  padding: "8px 18px",
                  backdropFilter: "blur(8px)",
                }}
              >
                <span style={{ fontSize: "14px" }}>🌿</span>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "rgba(255,255,255,0.8)",
                    letterSpacing: "0.2px",
                  }}
                >
                  Sistem Otomasi Cerdas · NPK 7-in-1 IoT
                </span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Loading section */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              style={{
                width: "220px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: "14px",
              }}
            >
              {/* Label row */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  width: "100%",
                }}
              >
                <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.5)", fontWeight: 500 }}>
                  Memuat sistem...
                </span>
                <span style={{ fontSize: "12px", color: "rgba(52,211,153,0.9)", fontWeight: 700 }}>
                  {Math.min(100, Math.round(progress))}%
                </span>
              </div>

              {/* Track */}
              <div
                style={{
                  width: "100%",
                  height: "5px",
                  background: "rgba(255,255,255,0.15)",
                  borderRadius: "10px",
                  overflow: "hidden",
                }}
              >
                <motion.div
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "linear", duration: 0.1 }}
                  style={{
                    height: "100%",
                    background: "linear-gradient(90deg, #34D399, #10B981)",
                    borderRadius: "10px",
                    boxShadow: "0px 0px 8px rgba(52,211,153,0.6)",
                  }}
                />
              </div>

              {/* Animated dots */}
              <div style={{ display: "flex", gap: "8px" }}>
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ scale: [0.6, 1.2, 0.6], opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1, delay: i * 0.22, repeat: Infinity }}
                    style={{
                      width: "7px",
                      height: "7px",
                      borderRadius: "50%",
                      background: "#34D399",
                    }}
                  />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── Feature badges (bottom) ── */}
      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            style={{
              position: "absolute",
              bottom: "70px",
              display: "flex",
              gap: "10px",
            }}
          >
            {["🌡 Suhu", "💧 Irigasi", "🌬 Ventilasi"].map((label) => (
              <div
                key={label}
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.12)",
                  borderRadius: "20px",
                  padding: "5px 12px",
                  fontSize: "11px",
                  fontWeight: 500,
                  color: "rgba(255,255,255,0.65)",
                  backdropFilter: "blur(6px)",
                }}
              >
                {label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Version ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        style={{
          position: "absolute",
          bottom: "28px",
          fontSize: "11px",
          color: "rgba(255,255,255,0.25)",
          fontWeight: 400,
        }}
      >
        v1.2.0 · © 2025 Magetan Greenhouse
      </motion.p>
    </div>
  );
}
