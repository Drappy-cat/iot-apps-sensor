import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import "./SplashScreen.css";

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
        if (p >= 100) {
          clearInterval(id);
          return 100;
        }
        return p + 2.5;
      });
    }, 35);
    return () => clearInterval(id);
  }, [phase]);

  const isLoading = phase === "loading" || phase === "done";

  return (
    <div className="splash-container">
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
            pointerEvents: "none",
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
            pointerEvents: "none",
          }}
        />
      ))}

      {/* ── Horizontal glowing strip ── */}
      <div className="splash-glow-strip" />

      {/* ══ Main content container (Responsive Portrait & Landscape) ══ */}
      <div className="splash-content">
        {/* Left Column in Landscape / Top in Portrait: Brand & Logo */}
        <div className="splash-brand-section">
          {/* Logo with strict 1:1 Aspect Ratio (Never stretched) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.4, y: 30 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
            className="splash-logo-box"
          >
            {/* Glow ring */}
            <motion.div
              animate={{ scale: [1, 1.15, 1], opacity: [0.3, 0.6, 0.3] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="splash-glow-ring"
            />
            <svg className="splash-logo-svg" viewBox="0 0 68 68" fill="none">
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
              <path
                d="M34 13 C34 13, 43 19, 43 27 C43 31.5, 39 35, 34 35 C29 35, 25 31.5, 25 27 C25 19, 34 13, 34 13Z"
                fill="white"
                fillOpacity="0.92"
              />
              <path d="M34 13 L34 35" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" />
              <path d="M27 24 Q34 21 41 24" stroke="#34D399" strokeWidth="1.3" strokeLinecap="round" fill="none" />
            </svg>
          </motion.div>

          {/* Brand Titles */}
          <AnimatePresence>
            {phase !== "logo" && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="splash-brand-titles"
              >
                <p className="splash-greeting">SELAMAT DATANG DI</p>
                <h1 className="splash-title-white">Magetan</h1>
                <h1 className="splash-title-accent">Greenhouse</h1>
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
                className="splash-tagline-container"
              >
                <div className="splash-tagline-pill">
                  <span style={{ fontSize: "14px" }}>🌿</span>
                  <span className="splash-tagline-text">
                    Sistem Otomasi Cerdas · NPK 7-in-1 IoT
                  </span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column in Landscape / Bottom Section in Portrait: Loading & Badges */}
        <div className={`splash-action-section ${isLoading ? "is-loading" : ""}`}>
          {/* Loading Section */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="splash-loading-box"
              >
                {/* Label row */}
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    width: "100%",
                  }}
                >
                  <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.6)", fontWeight: 500 }}>
                    Memuat sistem...
                  </span>
                  <span style={{ fontSize: "12px", color: "#34D399", fontWeight: 700 }}>
                    {Math.min(100, Math.round(progress))}%
                  </span>
                </div>

                {/* Track */}
                <div
                  style={{
                    width: "100%",
                    height: "6px",
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
                      boxShadow: "0px 0px 10px rgba(52,211,153,0.7)",
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

          {/* Feature Badges */}
          <AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="splash-badges-wrapper"
              >
                {["🌡 Suhu", "💧 Irigasi", "🌬 Ventilasi"].map((label) => (
                  <div key={label} className="splash-badge-item">
                    {label}
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Version Footer ── */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="splash-version-text"
      >
        v1.2.0 · © 2025 Magetan Greenhouse
      </motion.p>
    </div>
  );
}
