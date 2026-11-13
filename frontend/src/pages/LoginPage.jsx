import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as authService from "../api/authService";
import {
  Eye, EyeOff, LogIn, UserPlus, Lock, User, Mail,
  AlertCircle, CheckCircle2, Loader2, ArrowRight,
} from "lucide-react";

/* ─────────────────────────────────────────────────────────────────
   Composants définis EN DEHORS du composant principal
   => évite la recréation à chaque rendu (et la perte de focus)
───────────────────────────────────────────────────────────────── */
function EyeBtn({ show, toggle }) {
  return (
    <button
      type="button"
      onClick={toggle}
      tabIndex={-1}
      className="absolute right-3 top-1/2 -translate-y-1/2 text-ink/35 hover:text-ink transition cursor-pointer p-1"
    >
      {show ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  );
}

function Field({ id, label, icon: Icon, type = "text", value, onChange,
                 placeholder, right, autoComplete }) {
  return (
    <div>
      <label
        htmlFor={id}
        className="flex items-center gap-1.5 text-xs font-semibold text-navy-600 mb-1.5 tracking-wide uppercase"
      >
        {Icon && <Icon size={12} className="opacity-60" />}
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required
          className="w-full px-4 py-2.5 rounded-xl border border-cream-200 bg-cream-100
                     text-ink text-sm placeholder:text-ink/30
                     focus:outline-none focus:border-navy-400 focus:bg-white
                     focus:ring-2 focus:ring-navy-400/15 transition-all duration-200"
        />
        {right}
      </div>
    </div>
  );
}

/* ─── petit hook : mode courant vient de la route (/login ou /register) ─── */
function useMode() {
  const { pathname } = useLocation();
  return pathname === "/register" ? "register" : "login";
}

/* ═══════════════════════════════════════════════════════════════
   Composant principal
═══════════════════════════════════════════════════════════════ */
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

  /* reset à chaque changement de mode */
  useEffect(() => {
    setError("");
    setSuccess("");
    setForm(f => ({ ...f, password: "", confirm: "" }));
  }, [mode]);

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (isReg && form.password !== form.confirm) {
      setError("Les mots de passe ne correspondent pas.");
      return;
    }
    if (isReg && form.password.length < 8) {
      setError("Le mot de passe doit contenir au moins 8 caractères.");
      return;
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
        setSuccess("Compte créé ! Vous pouvez maintenant vous connecter.");
        setTimeout(() => navigate("/login"), 1800);
      } else {
        await login(form.username, form.password);
        navigate("/");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        (isReg ? "Erreur lors de la création du compte." : "Identifiants incorrects.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-4">

      {/* ─── card conteneur ─── */}
      <div className="w-full max-w-4xl bg-white rounded-3xl shadow-2xl shadow-navy-900/10 overflow-hidden flex min-h-[560px]">

        {/* ════ PANNEAU GAUCHE — branding ════ */}
        <div className="hidden md:flex flex-col justify-between w-2/5 bg-gradient-to-br from-navy-700 via-navy-600 to-navy-500 p-10 relative overflow-hidden select-none">
          <div className="absolute -top-16 -left-16 w-64 h-64 rounded-full bg-white/5" />
          <div className="absolute -bottom-20 -right-16 w-80 h-80 rounded-full bg-maroon-500/20" />
          <div className="absolute top-1/2 right-0 w-40 h-40 rounded-full bg-navy-400/30" />

          <div className="relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center mb-6 border border-white/20">
              <span className="text-white font-serif font-bold text-xl">L</span>
            </div>
            <p className="text-white/60 text-xs uppercase tracking-widest font-semibold mb-1">
              Lomé Business School
            </p>
            <h1 className="text-white font-serif text-3xl font-bold leading-tight">
              Tableau de bord<br />académique
            </h1>
          </div>

          <div className="relative z-10 space-y-4">
            <blockquote className="border-l-2 border-maroon-500 pl-4">
              <p className="text-white/70 text-sm italic leading-relaxed">
                "Analyser, comprendre,<br />décider."
              </p>
            </blockquote>

            <div className="text-white/50 text-xs">
              {isReg ? (
                <>Déjà un compte ?{" "}
                  <Link to="/login" className="text-white font-semibold hover:text-white/80 transition underline underline-offset-2">
                    Se connecter
                  </Link>
                </>
              ) : (
                <>Pas encore de compte ?{" "}
                  <Link to="/register" className="text-white font-semibold hover:text-white/80 transition underline underline-offset-2">
                    S'inscrire
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ════ PANNEAU DROIT — formulaire ════ */}
        <div className="flex-1 flex flex-col justify-center px-8 py-10 md:px-12">

          <div className="mb-8">
            <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider mb-4
                            ${isReg ? "bg-maroon-50 text-maroon-500" : "bg-navy-50 text-navy-500"}`}>
              {isReg ? <UserPlus size={13} /> : <LogIn size={13} />}
              {isReg ? "Inscription" : "Connexion"}
            </div>

            <h2 className="text-2xl font-serif font-bold text-ink leading-snug">
              {isReg ? "Créer un compte" : "Bon retour 👋"}
            </h2>
            <p className="text-ink/45 text-sm mt-1">
              {isReg
                ? "Remplissez le formulaire pour rejoindre la plateforme."
                : "Connectez-vous pour accéder à votre espace."}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-red-600 text-xs flex items-start gap-2.5">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-5 p-3.5 rounded-xl bg-emerald-50 border border-emerald-100 text-emerald-700 text-xs flex items-start gap-2.5">
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {isReg && (
              <div className="grid grid-cols-2 gap-3">
                <Field id="first_name" label="Prénom" icon={User}
                  value={form.first_name} onChange={set("first_name")}
                  placeholder="Marie" autoComplete="given-name" />
                <Field id="last_name" label="Nom" icon={User}
                  value={form.last_name} onChange={set("last_name")}
                  placeholder="Dupont" autoComplete="family-name" />
              </div>
            )}

            {isReg && (
              <Field id="email" label="Adresse email" icon={Mail} type="email"
                value={form.email} onChange={set("email")}
                placeholder="marie@lbs.tg" autoComplete="email" />
            )}

            <Field id="username" label="Nom d'utilisateur" icon={User}
              value={form.username} onChange={set("username")}
              placeholder="marie.dupont" autoComplete="username" />

            <Field id="password" label="Mot de passe" icon={Lock}
              type={showPwd ? "text" : "password"}
              value={form.password} onChange={set("password")}
              placeholder="••••••••"
              autoComplete={isReg ? "new-password" : "current-password"}
              right={<EyeBtn show={showPwd} toggle={() => setShowPwd(v => !v)} />} />

            {isReg && (
              <Field id="confirm" label="Confirmer le mot de passe" icon={Lock}
                type={showConf ? "text" : "password"}
                value={form.confirm} onChange={set("confirm")}
                placeholder="••••••••" autoComplete="new-password"
                right={<EyeBtn show={showConf} toggle={() => setShowConf(v => !v)} />} />
            )}

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-3 px-6 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2
                            transition-all duration-200 shadow-lg disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer
                            ${isReg
                              ? "bg-gradient-to-r from-maroon-500 to-maroon-600 hover:from-maroon-600 hover:to-maroon-500 shadow-maroon-500/25"
                              : "bg-gradient-to-r from-navy-500 to-navy-600 hover:from-navy-600 hover:to-navy-500 shadow-navy-500/25"}`}
              >
                {loading ? (
                  <><Loader2 size={16} className="animate-spin" /> Patientez...</>
                ) : (
                  <>{isReg ? "Créer mon compte" : "Se connecter"} <ArrowRight size={16} /></>
                )}
              </button>
            </div>
          </form>

          <p className="md:hidden mt-6 text-center text-xs text-ink/50">
            {isReg ? (
              <>Déjà un compte ?{" "}
                <Link to="/login" className="text-navy-500 font-semibold hover:underline">Se connecter</Link>
              </>
            ) : (
              <>Pas encore de compte ?{" "}
                <Link to="/register" className="text-maroon-500 font-semibold hover:underline">S'inscrire</Link>
              </>
            )}
          </p>

        </div>
      </div>
    </div>
  );
}
