import React, { useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router";
import { motion, AnimatePresence } from "motion/react";
import {
  ArrowLeft,
  Eye,
  EyeOff,
  User,
  Mail,
  Lock,
  BadgeCheck,
  ChevronDown,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { registerUser, type User as AuthUser } from "../utils/authHelper";

interface FormData {
  namaLengkap: string;
  idOperator: string;
  email: string;
  role: string;
  password: string;
  confirmPassword: string;
  agree: boolean;
}

interface FieldError {
  namaLengkap?: string;
  idOperator?: string;
  email?: string;
  role?: string;
  password?: string;
  confirmPassword?: string;
  agree?: string;
}

const ROLES = [
  { value: "operator", label: "Operator", desc: "Pantau & kendalikan sistem" },
  { value: "admin", label: "Administrator", desc: "Akses penuh semua fitur" },
  { value: "viewer", label: "Viewer", desc: "Hanya lihat data & laporan" },
];

const calculatePasswordStrength = (pw: string) => {
  if (!pw) return { level: 0, label: "", color: "" };
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score <= 1) return { level: 1, label: "Lemah", color: "#EF4444" };
  if (score === 2) return { level: 2, label: "Cukup", color: "#F97316" };
  if (score === 3) return { level: 3, label: "Kuat", color: "#EAB308" };
  return { level: 4, label: "Sangat Kuat", color: "#22C55E" };
};

export function RegisterScreen() {
  const navigate = useNavigate();

  const [form, setForm] = useState<FormData>({
    namaLengkap: "",
    idOperator: "",
    email: "",
    role: "",
    password: "",
    confirmPassword: "",
    agree: false,
  });
  const [errors, setErrors] = useState<FieldError>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [success, setSuccess] = useState(false);

  // Field updater
  const setField = useCallback((key: keyof FormData, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  }, []);

  // Form validation
  const validate = useCallback((): boolean => {
    const nextErrors: FieldError = {};
    const nama = form.namaLengkap.trim();
    const idOp = form.idOperator.trim();
    const email = form.email.trim();

    if (!nama) nextErrors.namaLengkap = "Nama lengkap wajib diisi";
    else if (nama.length < 3) nextErrors.namaLengkap = "Minimal 3 karakter";

    if (!idOp) nextErrors.idOperator = "ID Operator wajib diisi";
    else if (!/^[A-Za-z0-9_-]{4,20}$/.test(idOp))
      nextErrors.idOperator = "4–20 karakter (huruf, angka, _, -)";

    if (!email) nextErrors.email = "Email wajib diisi";
    else if (!/\S+@\S+\.\S+/.test(email)) nextErrors.email = "Format email tidak valid";

    if (!form.role) nextErrors.role = "Pilih peran akun";

    if (!form.password) nextErrors.password = "Kata sandi wajib diisi";
    else if (form.password.length < 8) nextErrors.password = "Minimal 8 karakter";

    if (!form.confirmPassword) nextErrors.confirmPassword = "Konfirmasi kata sandi wajib diisi";
    else if (form.password !== form.confirmPassword)
      nextErrors.confirmPassword = "Kata sandi tidak cocok";

    if (!form.agree) nextErrors.agree = "Setujui syarat & ketentuan terlebih dahulu";

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [form]);

  // Form submit handler
  const handleSubmit = useCallback(() => {
    setSubmitted(true);
    if (!validate()) return;

    const newUser: AuthUser = {
      namaLengkap: form.namaLengkap.trim(),
      idOperator: form.idOperator.trim().toLowerCase(),
      email: form.email.trim(),
      role: form.role as any,
      password: form.password,
    };

    const res = registerUser(newUser);
    if (!res.success) {
      setErrors((prev) => ({ ...prev, idOperator: res.error }));
      return;
    }

    setSuccess(true);
    setTimeout(() => navigate("/login"), 2200);
  }, [form, validate, navigate]);

  // Memoized computations
  const pwStrength = useMemo(() => calculatePasswordStrength(form.password), [form.password]);
  const selectedRole = useMemo(() => ROLES.find((r) => r.value === form.role), [form.role]);

  /* ── Success overlay ── */
  if (success) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(155deg, #064E3B 0%, #065F46 50%, #047857 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Inter', sans-serif",
          gap: "20px",
          padding: "32px",
          boxSizing: "border-box",
        }}
      >
        <motion.div
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: "spring", duration: 0.6 }}
          style={{
            width: "90px",
            height: "90px",
            background: "rgba(255,255,255,0.12)",
            borderRadius: "28px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "2px solid rgba(255,255,255,0.2)",
          }}
        >
          <CheckCircle2 size={46} color="#34D399" strokeWidth={2} />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          style={{ textAlign: "center" }}
        >
          <h2 style={{ fontSize: "24px", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
            Registrasi Berhasil!
          </h2>
          <p style={{ fontSize: "14px", color: "rgba(255,255,255,0.65)", lineHeight: 1.6 }}>
            Akun <strong style={{ color: "#34D399" }}>{form.namaLengkap}</strong> telah dibuat.
            <br />
            Mengarahkan ke halaman login...
          </p>
        </motion.div>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.2, repeat: Infinity, ease: "linear" }}
          style={{
            width: "28px",
            height: "28px",
            border: "3px solid rgba(255,255,255,0.15)",
            borderTop: "3px solid #34D399",
            borderRadius: "50%",
            marginTop: "8px",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-app)",
        fontFamily: "'Inter', sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* ── Header ── */}
      <div
        style={{
          background: "linear-gradient(155deg, #064E3B 0%, #065F46 60%, #047857 100%)",
          padding: "52px 20px 28px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div style={{ position: "absolute", top: "-40px", right: "-40px", width: "160px", height: "160px", borderRadius: "50%", background: "rgba(255,255,255,0.05)" }} />
        <div style={{ position: "absolute", bottom: "-20px", left: "-30px", width: "120px", height: "120px", borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />

        {/* Back button */}
        <button
          onClick={() => navigate("/login")}
          style={{
            background: "rgba(255,255,255,0.12)",
            border: "1px solid rgba(255,255,255,0.18)",
            borderRadius: "12px",
            width: "38px",
            height: "38px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            marginBottom: "20px",
            backdropFilter: "blur(8px)",
          }}
        >
          <ArrowLeft size={18} color="white" strokeWidth={2.2} />
        </button>

        {/* Logo + Title */}
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "16px",
              background: "rgba(255,255,255,0.12)",
              border: "1.5px solid rgba(255,255,255,0.2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backdropFilter: "blur(8px)",
              flexShrink: 0,
            }}
          >
            <svg width="30" height="30" viewBox="0 0 68 68" fill="none">
              <rect x="9" y="30" width="50" height="32" rx="4" fill="white" fillOpacity="0.2" />
              <path d="M5 30L34 8L63 30" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
              <rect x="13" y="39" width="13" height="14" rx="3" fill="white" fillOpacity="0.55" />
              <rect x="42" y="39" width="13" height="14" rx="3" fill="white" fillOpacity="0.55" />
              <rect x="27" y="44" width="14" height="18" rx="3" fill="white" fillOpacity="0.75" />
              <path d="M34 13 C34 13, 43 19, 43 27 C43 31.5, 39 35, 34 35 C29 35, 25 31.5, 25 27 C25 19, 34 13, 34 13Z" fill="white" fillOpacity="0.9" />
              <path d="M34 13 L34 35" stroke="#34D399" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
          <div>
            <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#fff", margin: "0 0 3px", letterSpacing: "-0.4px" }}>
              Buat Akun Baru
            </h1>
            <p style={{ fontSize: "13px", color: "rgba(255,255,255,0.6)", margin: 0 }}>
              Magetan Greenhouse System
            </p>
          </div>
        </div>
      </div>

      {/* ── Form body ── */}
      <div
        style={{
          flex: 1,
          padding: "20px 16px 40px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          overflowY: "auto",
        }}
      >
        {/* Section: Info Pribadi */}
        <SectionLabel icon="👤" label="Informasi Pribadi" />

        <FormField
          label="Nama Lengkap"
          icon={<User size={15} color="var(--icon-muted)" />}
          error={submitted ? errors.namaLengkap : undefined}
        >
          <input
            type="text"
            placeholder="Contoh: Budi Santoso"
            value={form.namaLengkap}
            onChange={(e) => setField("namaLengkap", e.target.value)}
            className={`form-input-field ${submitted && errors.namaLengkap ? "input-error" : ""}`}
          />
        </FormField>

        <FormField
          label="ID Operator"
          icon={<BadgeCheck size={15} color="var(--icon-muted)" />}
          error={submitted ? errors.idOperator : undefined}
          hint="4–20 karakter, boleh angka & simbol _ -"
        >
          <input
            type="text"
            placeholder="Contoh: op_budi01"
            value={form.idOperator}
            onChange={(e) => setField("idOperator", e.target.value.toLowerCase())}
            className={`form-input-field ${submitted && errors.idOperator ? "input-error" : ""}`}
          />
        </FormField>

        <FormField
          label="Email"
          icon={<Mail size={15} color="var(--icon-muted)" />}
          error={submitted ? errors.email : undefined}
        >
          <input
            type="email"
            placeholder="contoh@email.com"
            value={form.email}
            onChange={(e) => setField("email", e.target.value)}
            className={`form-input-field ${submitted && errors.email ? "input-error" : ""}`}
          />
        </FormField>

        {/* Section: Peran */}
        <SectionLabel icon="🛡" label="Peran Akun" />

        <FormField label="Pilih Peran" error={submitted ? errors.role : undefined}>
          <div style={{ position: "relative" }}>
            <button
              type="button"
              onClick={() => setShowRoleMenu(!showRoleMenu)}
              style={{
                width: "100%",
                padding: "13px 16px",
                borderRadius: "12px",
                border: `1.5px solid ${submitted && errors.role ? "#EF4444" : showRoleMenu ? "#10B981" : "var(--border-subtle)"}`,
                background: "var(--bg-input)",
                fontSize: "14px",
                color: selectedRole ? "var(--text-primary)" : "var(--icon-muted)",
                fontFamily: "'Inter', sans-serif",
                cursor: "pointer",
                textAlign: "left",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                boxSizing: "border-box",
                transition: "border-color 0.2s ease, box-shadow 0.2s ease",
              }}
            >
              {selectedRole ? (
                <span>
                  <strong>{selectedRole.label}</strong>
                  <span style={{ color: "var(--text-muted)", fontSize: "12px" }}> — {selectedRole.desc}</span>
                </span>
              ) : (
                "Pilih peran akun..."
              )}
              <motion.div animate={{ rotate: showRoleMenu ? 180 : 0 }} transition={{ duration: 0.2 }}>
                <ChevronDown size={16} color="var(--icon-muted)" />
              </motion.div>
            </button>

            <AnimatePresence>
              {showRoleMenu && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.15 }}
                  style={{
                    position: "absolute",
                    top: "calc(100% + 6px)",
                    left: 0,
                    right: 0,
                    background: "var(--bg-card)",
                    borderRadius: "14px",
                    boxShadow: "0px 8px 24px rgba(0,0,0,0.12)",
                    border: "1px solid var(--border-subtle)",
                    overflow: "hidden",
                    zIndex: 50,
                  }}
                >
                  {ROLES.map((r) => (
                    <button
                      key={r.value}
                      onClick={() => {
                        setField("role", r.value);
                        setShowRoleMenu(false);
                      }}
                      style={{
                        width: "100%",
                        padding: "13px 16px",
                        background: form.role === r.value ? "var(--bg-success-light, #F0FDF4)" : "transparent",
                        border: "none",
                        borderBottom: "1px solid var(--bg-hover)",
                        cursor: "pointer",
                        textAlign: "left",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        fontFamily: "'Inter', sans-serif",
                        transition: "background 0.15s",
                      }}
                    >
                      <div>
                        <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--text-primary)" }}>
                          {r.label}
                        </p>
                        <p style={{ margin: 0, fontSize: "12px", color: "var(--text-muted)", marginTop: "2px" }}>
                          {r.desc}
                        </p>
                      </div>
                      {form.role === r.value && (
                        <CheckCircle2 size={16} color="#10B981" strokeWidth={2.5} />
                      )}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </FormField>

        {/* Section: Keamanan */}
        <SectionLabel icon="🔒" label="Keamanan" />

        <FormField
          label="Kata Sandi"
          icon={<Lock size={15} color="var(--icon-muted)" />}
          error={submitted ? errors.password : undefined}
        >
          <div style={{ position: "relative" }}>
            <input
              type={showPassword ? "text" : "password"}
              placeholder="Min. 8 karakter"
              value={form.password}
              onChange={(e) => setField("password", e.target.value)}
              className={`form-input-field ${submitted && errors.password ? "input-error" : ""}`}
              style={{ paddingRight: "44px" }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={eyeBtnStyle}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Strength meter */}
          {form.password.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              style={{ marginTop: "8px" }}
            >
              <div style={{ display: "flex", gap: "4px", marginBottom: "5px" }}>
                {[1, 2, 3, 4].map((l) => (
                  <div
                    key={l}
                    style={{
                      flex: 1,
                      height: "4px",
                      borderRadius: "4px",
                      background: l <= pwStrength.level ? pwStrength.color : "var(--border-subtle)",
                      transition: "background 0.3s",
                    }}
                  />
                ))}
              </div>
              <p style={{ fontSize: "11px", fontWeight: 600, color: pwStrength.color, margin: 0 }}>
                {pwStrength.label}
              </p>
            </motion.div>
          )}
        </FormField>

        <FormField
          label="Konfirmasi Kata Sandi"
          icon={<Lock size={15} color="var(--icon-muted)" />}
          error={submitted ? errors.confirmPassword : undefined}
        >
          <div style={{ position: "relative" }}>
            <input
              type={showConfirm ? "text" : "password"}
              placeholder="Ulangi kata sandi"
              value={form.confirmPassword}
              onChange={(e) => setField("confirmPassword", e.target.value)}
              className={`form-input-field ${submitted && errors.confirmPassword ? "input-error" : ""}`}
              style={{ paddingRight: "44px" }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              style={eyeBtnStyle}
            >
              {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {/* Match indicator */}
          {form.confirmPassword.length > 0 && form.password.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              style={{ display: "flex", alignItems: "center", gap: "5px", marginTop: "6px" }}
            >
              {form.password === form.confirmPassword ? (
                <>
                  <CheckCircle2 size={13} color="#22C55E" strokeWidth={2.5} />
                  <span style={{ fontSize: "11px", color: "#22C55E", fontWeight: 600 }}>Kata sandi cocok</span>
                </>
              ) : (
                <>
                  <AlertCircle size={13} color="#EF4444" strokeWidth={2.5} />
                  <span style={{ fontSize: "11px", color: "#EF4444", fontWeight: 600 }}>Kata sandi tidak cocok</span>
                </>
              )}
            </motion.div>
          )}
        </FormField>

        {/* Agreement */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: "12px",
            padding: "14px",
            background: "var(--bg-input)",
            borderRadius: "12px",
            border: `1.5px solid ${submitted && errors.agree ? "#EF4444" : "var(--border-subtle)"}`,
            cursor: "pointer",
            transition: "border-color 0.2s ease",
          }}
          onClick={() => setField("agree", !form.agree)}
        >
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "6px",
              border: `2px solid ${form.agree ? "#10B981" : "var(--border-strong)"}`,
              background: form.agree ? "#10B981" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              marginTop: "1px",
              transition: "all 0.2s",
            }}
          >
            {form.agree && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", duration: 0.3 }}>
                <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                  <path d="M1 4L3.5 6.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </motion.div>
            )}
          </div>
          <p style={{ fontSize: "13px", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
            Saya menyetujui <span style={{ color: "#10B981", fontWeight: 600 }}>Syarat & Ketentuan</span> serta{" "}
            <span style={{ color: "#10B981", fontWeight: 600 }}>Kebijakan Privasi</span> Magetan Greenhouse System.
          </p>
        </div>
        {submitted && errors.agree && (
          <p style={{ fontSize: "12px", color: "#EF4444", margin: "-6px 0 0 4px" }}>{errors.agree}</p>
        )}

        {/* Submit Button */}
        <motion.button
          onClick={handleSubmit}
          whileTap={{ scale: 0.97 }}
          style={{
            width: "100%",
            padding: "16px",
            borderRadius: "14px",
            background: "linear-gradient(135deg, #064E3B 0%, #10B981 100%)",
            border: "none",
            cursor: "pointer",
            color: "var(--bg-card)",
            fontSize: "15px",
            fontWeight: 700,
            fontFamily: "'Inter', sans-serif",
            letterSpacing: "0.3px",
            boxShadow: "0px 6px 20px rgba(16, 185, 129, 0.4)",
            marginTop: "4px",
          }}
        >
          Daftar Sekarang
        </motion.button>

        {/* Login link */}
        <p style={{ textAlign: "center", fontSize: "13px", color: "var(--text-muted)", margin: "4px 0 0" }}>
          Sudah punya akun?{" "}
          <button
            onClick={() => navigate("/login")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "#10B981",
              fontWeight: 700,
              fontSize: "13px",
              fontFamily: "'Inter', sans-serif",
              padding: 0,
            }}
          >
            Masuk di sini
          </button>
        </p>
      </div>
    </div>
  );
}

/* ── Pure Subcomponents ── */

function SectionLabel({ icon, label }: { icon: string; label: string }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "8px", paddingTop: "4px" }}>
      <span style={{ fontSize: "14px" }}>{icon}</span>
      <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--icon-muted)", textTransform: "uppercase", letterSpacing: "0.7px" }}>
        {label}
      </span>
      <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
    </div>
  );
}

function FormField({
  label,
  icon,
  error,
  hint,
  children,
}: {
  label: string;
  icon?: React.ReactNode;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "6px" }}>
        {icon}
        <label style={{ fontSize: "12px", fontWeight: 600, color: "var(--text-muted)" }}>{label}</label>
      </div>
      {children}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18 }}
            style={{ display: "flex", alignItems: "center", gap: "4px", marginTop: "5px" }}
          >
            <AlertCircle size={12} color="#EF4444" strokeWidth={2.5} />
            <p style={{ fontSize: "11px", color: "#EF4444", margin: 0, fontWeight: 500 }}>{error}</p>
          </motion.div>
        )}
      </AnimatePresence>
      {!error && hint && (
        <p style={{ fontSize: "11px", color: "var(--icon-muted)", margin: "4px 0 0 2px" }}>{hint}</p>
      )}
    </div>
  );
}

const eyeBtnStyle: React.CSSProperties = {
  position: "absolute",
  right: "13px",
  top: "50%",
  transform: "translateY(-50%)",
  background: "none",
  border: "none",
  cursor: "pointer",
  color: "var(--icon-muted)",
  padding: "4px",
  display: "flex",
  alignItems: "center",
};
