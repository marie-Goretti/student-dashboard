import { useState, useEffect } from "react";
import { useNavigate, useLocation, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import * as authService from "../api/authService";
import {
  Eye, EyeOff, LogIn, UserPlus, Lock, User, Mail,
  AlertCircle, CheckCircle2, Loader2, ArrowRight,
} from "lucide-react";

/* ─── Definis EN DEHORS pour eviter le remontage a chaque frappe ─── */
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
        className="flex items-center gap-1.5 text-[11px] font-medium text-ink/40 mb-1.5 tracking-wide uppercase"
      >
        {Icon && <Icon size={11} className="opacity-50" />}
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
          className="w-full px-3.5 py-2.5 rounded-lg border border-gray-100 bg-gray-50
                     text-ink text-sm placeholder:text-ink/25
                     focus:outline-none focus:border-navy-300 focus:bg-white
                     focus:ring-1 focus:ring-navy-200 transition-all duration-200"
        />
        {right}
      </div>
    </div>
  );
}

/* ─── petit hook : mode courant vient de la route ─── */
function useMode() {
  const { pathname } = useLocation();
  return pathname === "/register" ? "register" : "login";
}

/* ════════════════════════════════════════════════════════════════════
   COMPOSANT PRINCIPAL
   ════════════════════════════════════════════════════════════════════ */
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

  /* reset a chaque changement de mode */
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
      setError("Le mot de passe doit contenir au moins 8 caracteres."); return;
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
        setSuccess("Compte cree ! Vous pouvez maintenant vous connecter.");
        setTimeout(() => navigate("/login"), 1800);
      } else {
        await login(form.username, form.password);
        navigate("/");
      }
    } catch (err) {
      const msg =
        err?.response?.data?.error ||
        err?.response?.data?.detail ||
        (isReg ? "Erreur lors de la creation du compte." : "Identifiants incorrects.");
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-cream p-4">
      <div className="w-full max-w-3xl bg-white rounded-2xl overflow-hidden flex min-h-[520px] border border-gray-100">

        {/* ════ PANNEAU GAUCHE — branding ════ */}
        <div className="hidden md:flex flex-col justify-between w-2/5 bg-navy-600 p-10 relative overflow-hidden select-none">
          <div className="absolute inset-0 bg-gradient-to-br from-navy-700 to-navy-500 opacity-80" />
          <div className="relative z-10">
            <img
              src="/lbs-perform-logo.png"
              alt="LBS Perform"
              className="h-10 w-auto object-contain brightness-0 invert mb-8"
            />
            <p className="text-white/40 text-[10px] uppercase tracking-widest font-medium mb-2">
              Lome Business School
            </p>
            <h1 className="text-white font-serif text-2xl font-semibold leading-snug">
              Tableau de bord<br />académique
            </h1>
          </div>

          <div className="relative z-10 space-y-4">
            <blockquote className="border-l-2 border-white/20 pl-4">
              <p className="text-white/50 text-sm italic leading-relaxed">
                "Analyser, comprendre,<br />décider."
              </p>
            </blockquote>
            <div className="text-white/40 text-xs">
              {isReg ? (
                <>Déjà un compte ?{" "}
                  <Link to="/login" className="text-white/70 font-medium hover:text-white transition underline underline-offset-2">
                    Se connecter
                  </Link>
                </>
              ) : (
                <>Pas encore de compte ?{" "}
                  <Link to="/register" className="text-white/70 font-medium hover:text-white transition underline underline-offset-2">
                    S'inscrire
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>

        {/* ════ PANNEAU DROIT — formulaire ════ */}
        <div className="flex-1 flex flex-col justify-center px-8 py-10 md:px-10">

          <div className="mb-7">
            <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium uppercase tracking-wider mb-4
                            ${isReg ? "bg-maroon-50 text-maroon-500" : "bg-navy-50 text-navy-500"}`}>
              {isReg ? <UserPlus size={11} /> : <LogIn size={11} />}
              {isReg ? "Inscription" : "Connexion"}
            </div>
            <h2 className="text-xl font-semibold text-ink leading-snug">
              {isReg ? "Créer un compte" : "Bon retour"}
            </h2>
            <p className="text-ink/40 text-sm mt-1">
              {isReg
                ? "Remplissez le formulaire pour rejoindre la plateforme."
                : "Connectez-vous pour accéder à votre espace."}
            </p>
          </div>

          {error && (
            <div className="mb-5 p-3 rounded-lg bg-red-50 border border-red-100 text-red-500 text-xs flex items-start gap-2">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          {success && (
            <div className="mb-5 p-3 rounded-lg bg-emerald-50 border border-emerald-100 text-emerald-600 text-xs flex items-start gap-2">
              <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
              <span>{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {isReg && (
              <div className="grid grid-cols-2 gap-3">
                <Field id="first_name" label="Prenom" icon={User}
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

            <div className="pt-1">
              <button
                type="submit"
                disabled={loading}
                className={`w-full py-2.5 px-6 rounded-lg font-medium text-sm text-white flex items-center justify-center gap-2 
                            transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer
                            ${isReg
                              ? "bg-maroon-500 hover:bg-maroon-600"
                              : "bg-navy-600 hover:bg-navy-700"}`}
              >
                {loading ? (
                  <><Loader2 size={15} className="animate-spin" /> Patientez...</>
                ) : (
                  <>{isReg ? "Créer mon compte" : "Se connecter"} <ArrowRight size={15} /></>
                )}
              </button>
            </div>
          </form>

          {/* lien de bascule (mobile uniquement) */}
          <p className="md:hidden mt-5 text-center text-xs text-ink/40">
            {isReg ? (
              <>Déjà un compte ?{" "}
                <Link to="/login" className="text-navy-500 font-medium hover:underline">Se connecter</Link>
              </>
            ) : (
              <>Pas encore de compte ?{" "}
                <Link to="/register" className="text-maroon-500 font-medium hover:underline">S'inscrire</Link>
              </>
            )}
          </p>

        </div>
      </div>
    </div>
  );
}
