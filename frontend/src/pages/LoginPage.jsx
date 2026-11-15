import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as authService from "../api/authService";
import {
  Eye, EyeOff, Lock, User, Mail,
  AlertCircle, CheckCircle2, Loader2, ArrowRight, ChevronRight,
} from "lucide-react";

/* ─── Bouton œil mot de passe ─── */
function EyeBtn({ show, toggle }) {
  return (
    <button
      type="button"
      onClick={toggle}
      tabIndex={-1}
      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/80 transition cursor-pointer p-1"
    >
      {show ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );
}

/* ─── Champ de saisie ─── */
function Field({ id, label, icon: Icon, type = "text", value, onChange,
                 placeholder, right, autoComplete }) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-xs font-semibold text-white/50 tracking-widest uppercase"
        style={{ fontFamily: "'Inter', sans-serif" }}
      >
        {label}
      </label>
      <div className="relative">
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-white/30 pointer-events-none">
          {Icon && <Icon size={15} />}
        </div>
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="w-full pl-10 pr-10 py-3 rounded-xl
                     border
                     text-white text-sm placeholder:text-white/25
                     focus:outline-none
                     focus:ring-0 transition-all duration-200"
          style={{
            fontFamily: "'Inter', sans-serif",
            backdropFilter: "blur(4px)",
            background: "rgba(255,255,255,0.07)",
            borderColor: "rgba(255,255,255,0.12)",
          }}
          onFocus={(e) => {
            e.target.style.background = "rgba(255,255,255,0.11)";
            e.target.style.borderColor = "rgba(255,255,255,0.30)";
          }}
          onBlur={(e) => {
            e.target.style.background = "rgba(255,255,255,0.07)";
            e.target.style.borderColor = "rgba(255,255,255,0.12)";
          }}
        />
        {right}
      </div>
    </div>
  );
}

/* ─── Hook mode ─── */
function useMode() {
  const { pathname } = useLocation();
  return pathname === "/register" ? "register" : "login";
}

/* ══════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ══════════════════════════════════════════════ */
export default function AuthPage() {
  const mode      = useMode();
  const isReg     = mode === "register";
  const navigate  = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    username: "", password: "", confirm: "",
    email: "", first_name: "", last_name: "",
  });
  const [showPwd,  setShowPwd]  = useState(false);
  const [showConf, setShowConf] = useState(false);
  const [error,    setError]    = useState("");
  const [success,  setSuccess]  = useState("");
  const [loading,  setLoading]  = useState(false);

  useEffect(() => {
    setError(""); setSuccess("");
    setForm(f => ({ ...f, password: "", confirm: "" }));
  }, [mode]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(""); setSuccess("");

    if (isReg && form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas."); return;
    }
    if (isReg && form.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères."); return;
    }

    setLoading(true);
    try {
      if (isReg) {
        await authService.register({
          username:   form.username,
          password:   form.password,
          email:      form.email,
          first_name: form.first_name,
          last_name:  form.last_name,
        });
        setSuccess("Compte créé ! Redirection vers la connexion...");
        setTimeout(() => navigate("/login"), 1800);
      } else {
        await login(form.username, form.password);
        navigate("/");
      }
    } catch (err) {
      const data = err?.response?.data;
      const msg =
        typeof data === "string"
          ? data
          : data?.detail ||
            data?.non_field_errors?.[0] ||
            Object.values(data || {})?.[0]?.[0] ||
            "Une erreur est survenue. Vérifiez vos identifiants.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 flex"
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      {/* ════════════════════════════════════════
          PANNEAU GAUCHE — Image + branding
          ════════════════════════════════════════ */}
      <div
        className="hidden lg:flex lg:w-[55%] xl:w-[58%] relative flex-col"
        style={{
          backgroundImage: "url('/campus-banner.png')",
          backgroundSize: "cover",
          backgroundPosition: "center 30%",
        }}
      >
        {/* Dégradé sombre */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0B1220]/80 via-[#0B1220]/50 to-[#0B1220]/20" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0B1220]/90 via-transparent to-transparent" />

        {/* Contenu superposé */}
        <div className="relative flex flex-col justify-between h-full p-10 xl:p-14">

          {/* Logo / Nom école en haut */}
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl bg-white/15 border border-white/20 flex items-center justify-center text-white font-bold text-sm tracking-wider backdrop-blur-sm"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              LBS
            </div>
            <span
              className="text-white/90 font-semibold text-lg tracking-tight"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Lomé Business School
            </span>
          </div>

          {/* Texte au centre-bas */}
          <div>
            <div className="mb-6">
              <span
                className="inline-block px-3 py-1 rounded-full bg-white/10 border border-white/15 text-white/70 text-xs font-medium tracking-wider backdrop-blur-sm mb-5"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Plateforme de Pilotage Académique
              </span>
              <h1
                className="text-4xl xl:text-5xl font-bold text-white leading-tight mb-4"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Pilotez la réussite<br />
                <span className="text-white/60">académique.</span>
              </h1>
              <p
                className="text-white/55 text-base leading-relaxed max-w-md"
                style={{ fontFamily: "'Inter', sans-serif" }}
              >
                Accédez aux tableaux de bord, analyses de performance et
                recommandations pédagogiques en temps réel.
              </p>
            </div>

            {/* Bullets features */}
            <div className="space-y-2.5">
              {[
                "Suivi des performances par niveau & module",
                "Alertes et recommandations automatiques",
                "Analyses des rattrapages & résultats",
              ].map((feat) => (
                <div
                  key={feat}
                  className="flex items-center gap-2.5 text-white/60 text-sm"
                  style={{ fontFamily: "'Inter', sans-serif" }}
                >
                  <ChevronRight size={14} className="text-white/40 shrink-0" />
                  {feat}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ════════════════════════════════════════
          PANNEAU DROIT — Formulaire
          ════════════════════════════════════════ */}
      <div
        className="flex-1 flex flex-col justify-center items-center overflow-y-auto px-6 py-10"
        style={{ background: "#0F1829" }}
      >
        <div className="w-full max-w-[420px]">

          {/* Logo mobile uniquement */}
          <div className="flex items-center gap-2.5 mb-10 lg:hidden">
            <div
              className="w-9 h-9 rounded-xl bg-white/10 border border-white/15 flex items-center justify-center text-white font-bold text-xs"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              LBS
            </div>
            <span
              className="text-white/80 font-semibold text-base"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              Lomé Business School
            </span>
          </div>

          {/* En-tête formulaire */}
          <div className="mb-8">
            <h2
              className="text-2xl font-bold text-white mb-2 leading-tight"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {isReg ? "Créer un compte" : "Bon retour 👋"}
            </h2>
            <p
              className="text-white/40 text-sm"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              {isReg
                ? "Remplissez le formulaire pour rejoindre la plateforme."
                : "Connectez-vous pour accéder à votre espace."}
            </p>
          </div>

          {/* Messages d'erreur / succès */}
          {error && (
            <div
              className="mb-5 p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div
              className="mb-5 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-start gap-2.5"
              style={{ fontFamily: "'Inter', sans-serif" }}
            >
              <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          {/* Formulaire */}
          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Prénom + Nom (inscription) */}
            {isReg && (
              <div className="grid grid-cols-2 gap-3">
                <Field
                  id="first_name" label="Prénom" icon={User}
                  value={form.first_name} onChange={set("first_name")}
                  placeholder="Marie" autoComplete="given-name"
                />
                <Field
                  id="last_name" label="Nom" icon={User}
                  value={form.last_name} onChange={set("last_name")}
                  placeholder="Dupont" autoComplete="family-name"
                />
              </div>
            )}

            {/* Email (inscription) */}
            {isReg && (
              <Field
                id="email" label="Adresse e-mail" icon={Mail} type="email"
                value={form.email} onChange={set("email")}
                placeholder="marie@lbs.tg" autoComplete="email"
              />
            )}

            {/* Nom d'utilisateur */}
            <Field
              id="username" label="Nom d'utilisateur" icon={User}
              value={form.username} onChange={set("username")}
              placeholder="marie.dupont" autoComplete="username"
            />

            {/* Mot de passe */}
            <Field
              id="password"
              label="Mot de passe"
              icon={Lock}
              type={showPwd ? "text" : "password"}
              value={form.password}
              onChange={set("password")}
              placeholder="••••••••"
              autoComplete={isReg ? "new-password" : "current-password"}
              right={<EyeBtn show={showPwd} toggle={() => setShowPwd(v => !v)} />}
            />

            {/* Confirmation (inscription) */}
            {isReg && (
              <Field
                id="confirm"
                label="Confirmer le mot de passe"
                icon={Lock}
                type={showConf ? "text" : "password"}
                value={form.confirm}
                onChange={set("confirm")}
                placeholder="••••••••"
                autoComplete="new-password"
                right={<EyeBtn show={showConf} toggle={() => setShowConf(v => !v)} />}
              />
            )}

            {/* Bouton submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-6 rounded-xl font-semibold text-sm flex items-center justify-center gap-2
                           transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                style={{
                  fontFamily: "'Inter', sans-serif",
                  background: isReg
                    ? "linear-gradient(135deg, #8B2323 0%, #A83232 100%)"
                    : "linear-gradient(135deg, #1E3A5F 0%, #2563EB 100%)",
                  color: "#fff",
                  boxShadow: isReg
                    ? "0 4px 24px rgba(139, 35, 35, 0.35)"
                    : "0 4px 24px rgba(37, 99, 235, 0.35)",
                }}
              >
                {loading ? (
                  <><Loader2 size={15} className="animate-spin" /> Patientez...</>
                ) : (
                  <>{isReg ? "Créer mon compte" : "Se connecter"} <ArrowRight size={15} /></>
                )}
              </button>
            </div>
          </form>

          {/* Lien de bascule */}
          <p
            className="mt-6 text-center text-sm text-white/35"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            {isReg ? (
              <>
                Déjà un compte ?{" "}
                <Link
                  to="/login"
                  className="text-blue-400 font-semibold hover:text-blue-300 transition"
                >
                  Se connecter
                </Link>
              </>
            ) : (
              <>
                Pas encore de compte ?{" "}
                <Link
                  to="/register"
                  className="text-red-400 font-semibold hover:text-red-300 transition"
                >
                  S'inscrire
                </Link>
              </>
            )}
          </p>

          {/* Footer discret */}
          <p
            className="mt-10 text-center text-xs text-white/20"
            style={{ fontFamily: "'Inter', sans-serif" }}
          >
            © {new Date().getFullYear()} Lomé Business School — Plateforme académique
          </p>
        </div>
      </div>
    </div>
  );
}
