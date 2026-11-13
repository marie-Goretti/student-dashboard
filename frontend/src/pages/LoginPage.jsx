import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, User, Lock, Eye, EyeOff, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';

/**
 * Illustration SVG stylisée reprenant la texture 3D du ruban plissé en éventail
 * dans les teintes bordeaux (#7A1620), acajou, cuivre chaleureux et crème de Lomé Business School.
 */
function PleatedRibbonIllustration() {
  // Génération des lamelles plissées le long de la double courbure en S
  const topFanLines = Array.from({ length: 42 }).map((_, i) => {
    const angle = (i / 42) * 180 - 20;
    const rad = (angle * Math.PI) / 180;
    const x1 = 150 + Math.cos(rad) * 45;
    const y1 = 140 + Math.sin(rad) * 45;
    const x2 = 150 + Math.cos(rad) * 190;
    const y2 = 140 + Math.sin(rad) * 190;
    const opacity = 0.4 + (i % 3) * 0.28;
    const strokeWidth = 2.4 + (i % 2) * 1.6;
    const color = i % 4 === 0 ? '#F5D5C8' : i % 3 === 0 ? '#D66A55' : i % 2 === 0 ? '#A62B37' : '#5E0E16';
    return { x1, y1, x2, y2, opacity, strokeWidth, color };
  });

  const bottomFanLines = Array.from({ length: 48 }).map((_, i) => {
    const angle = 70 + (i / 48) * 190;
    const rad = (angle * Math.PI) / 180;
    const x1 = 180 + Math.cos(rad) * 55;
    const y1 = 440 + Math.sin(rad) * 55;
    const x2 = 180 + Math.cos(rad) * 210;
    const y2 = 440 + Math.sin(rad) * 210;
    const opacity = 0.4 + (i % 3) * 0.28;
    const strokeWidth = 2.4 + (i % 2) * 1.6;
    const color = i % 4 === 0 ? '#FCE6DC' : i % 3 === 0 ? '#D8735E' : i % 2 === 0 ? '#A62B37' : '#5E0E16';
    return { x1, y1, x2, y2, opacity, strokeWidth, color };
  });

  return (
    <svg
      viewBox="0 0 380 580"
      className="absolute inset-0 w-full h-full object-cover pointer-events-none select-none"
      preserveAspectRatio="xMidYMid slice"
    >
      <defs>
        {/* Dégradé de fond sombre bordeaux / nuit */}
        <radialGradient id="bgGlow" cx="20%" cy="30%" r="80%">
          <stop offset="0%" stopColor="#4A0D14" />
          <stop offset="45%" stopColor="#250508" />
          <stop offset="100%" stopColor="#140204" />
        </radialGradient>

        {/* Dégradé du disque central */}
        <radialGradient id="discGlow" cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#4D0E15" />
          <stop offset="60%" stopColor="#240508" />
          <stop offset="100%" stopColor="#120204" />
        </radialGradient>

        {/* Ombre portée du disque */}
        <filter id="shadowDisc" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="12" stdDeviation="16" floodColor="#000" floodOpacity="0.75" />
        </filter>
      </defs>

      {/* Fond sombre texturé */}
      <rect width="100%" height="100%" fill="url(#bgGlow)" />

      {/* Boucle supérieure du ruban plissé */}
      <g>
        {topFanLines.map((line, idx) => (
          <line
            key={`top-${idx}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.color}
            strokeWidth={line.strokeWidth}
            strokeOpacity={line.opacity}
            strokeLinecap="round"
          />
        ))}
      </g>

      {/* Disque d'ombrage central autour duquel s'enroule le ruban */}
      <circle
        cx="160"
        cy="290"
        r="75"
        fill="url(#discGlow)"
        filter="url(#shadowDisc)"
        stroke="#59131C"
        strokeWidth="1.5"
      />

      {/* Boucle inférieure du ruban plissé */}
      <g>
        {bottomFanLines.map((line, idx) => (
          <line
            key={`bot-${idx}`}
            x1={line.x1}
            y1={line.y1}
            x2={line.x2}
            y2={line.y2}
            stroke={line.color}
            strokeWidth={line.strokeWidth}
            strokeOpacity={line.opacity}
            strokeLinecap="round"
          />
        ))}
      </g>
    </svg>
  );
}

export default function LoginPage({ initialMode = 'register' }) {
  const [isRegister, setIsRegister] = useState(initialMode === 'register');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!username.trim() || !password) {
      setError('Veuillez renseigner tous les champs obligatoires.');
      return;
    }

    if (isRegister && password !== confirmPassword) {
      setError('Les deux mots de passe ne correspondent pas.');
      return;
    }

    setLoading(true);

    try {
      if (isRegister) {
        // En mode inscription
        try {
          await login(username.trim(), password);
          navigate('/');
        } catch {
          setError(
            "L'accès à la plateforme est strictement réservé aux membres de Lomé Business School. Contactez l'administration pour activer votre compte."
          );
        }
      } else {
        // En mode connexion
        await login(username.trim(), password);
        navigate('/');
      }
    } catch {
      setError("Identifiants incorrects. Vérifiez votre nom d'utilisateur et votre mot de passe.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = () => {
    setError("L'authentification Google SSO sera prochainement synchronisée avec votre compte étudiant ou enseignant LBS.");
  };

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center p-3 sm:p-6 lg:p-10 font-sans selection:bg-maroon-500 selection:text-white">
      {/* Carte principale bicolore avec coins arrondis */}
      <div className="bg-white rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl shadow-navy-950/15 border border-cream-200 w-full max-w-4xl grid grid-cols-1 md:grid-cols-12 overflow-hidden relative">
        
        {/* ========================================================================= */}
        {/* COLONNE GAUCHE (45%) : RUBAN PLISSÉ ÉVENTAIL 3D & ONGLETS DÉBORDANTS       */}
        {/* ========================================================================= */}
        <div className="md:col-span-5 relative min-h-[220px] md:min-h-[560px] bg-[#1a0407] flex flex-col justify-between overflow-hidden">
          
          {/* Illustration du ruban plissé en S */}
          <PleatedRibbonIllustration />

          {/* En-tête discret de la colonne gauche */}
          <div className="relative z-10 p-6 flex items-center justify-between">
            <span className="text-white/80 font-bold text-xs tracking-wider uppercase drop-shadow-sm">
              EduPulse
            </span>
            <span className="text-[10px] text-white/50 uppercase tracking-widest font-medium">
              LBS
            </span>
          </div>

          {/* SÉLECTEUR D'ONGLETS VERTICAL DÉBORDANT (STYLE EXACT DE LA MAQUETTE) */}
          <div className="hidden md:flex flex-col gap-2.5 absolute right-0 top-1/2 -translate-y-1/2 z-30 w-36">
            
            {/* Onglet SIGN UP */}
            <div className="relative flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(true);
                  setError('');
                  setSuccess('');
                }}
                className={`relative py-2.5 px-6 rounded-l-full font-bold text-xs tracking-wider uppercase transition-all cursor-pointer text-center w-32 ${
                  isRegister
                    ? 'bg-white text-ink shadow-[-6px_4px_16px_rgba(0,0,0,0.18)] translate-x-1'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                SIGN UP
                {/* Raccord concave supérieur vers le blanc */}
                {isRegister && (
                  <div className="absolute -top-3.5 right-0 w-3.5 h-3.5 overflow-hidden pointer-events-none">
                    <div className="w-7 h-7 rounded-full border-r-[7px] border-b-[7px] border-white translate-x-[0.5px] -translate-y-[0.5px]" />
                  </div>
                )}
                {/* Raccord concave inférieur vers le blanc */}
                {isRegister && (
                  <div className="absolute -bottom-3.5 right-0 w-3.5 h-3.5 overflow-hidden pointer-events-none">
                    <div className="w-7 h-7 rounded-full border-r-[7px] border-t-[7px] border-white translate-x-[0.5px] translate-y-[0.5px]" />
                  </div>
                )}
              </button>
            </div>

            {/* Onglet LOGIN */}
            <div className="relative flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setIsRegister(false);
                  setError('');
                  setSuccess('');
                }}
                className={`relative py-2.5 px-6 rounded-l-full font-bold text-xs tracking-wider uppercase transition-all cursor-pointer text-center w-32 ${
                  !isRegister
                    ? 'bg-white text-ink shadow-[-6px_4px_16px_rgba(0,0,0,0.18)] translate-x-1'
                    : 'text-white/70 hover:text-white hover:bg-white/10'
                }`}
              >
                LOGIN
                {/* Raccord concave supérieur vers le blanc */}
                {!isRegister && (
                  <div className="absolute -top-3.5 right-0 w-3.5 h-3.5 overflow-hidden pointer-events-none">
                    <div className="w-7 h-7 rounded-full border-r-[7px] border-b-[7px] border-white translate-x-[0.5px] -translate-y-[0.5px]" />
                  </div>
                )}
                {/* Raccord concave inférieur vers le blanc */}
                {!isRegister && (
                  <div className="absolute -bottom-3.5 right-0 w-3.5 h-3.5 overflow-hidden pointer-events-none">
                    <div className="w-7 h-7 rounded-full border-r-[7px] border-t-[7px] border-white translate-x-[0.5px] translate-y-[0.5px]" />
                  </div>
                )}
              </button>
            </div>

          </div>

          {/* Pied de colonne gauche */}
          <div className="relative z-10 p-6">
            <p className="text-white/40 text-[10px] font-medium uppercase tracking-widest">
              Lomé Business School • 2026
            </p>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* COLONNE DROITE (55%) : FORMULAIRE ÉPURÉ BLANC                             */}
        {/* ========================================================================= */}
        <div className="md:col-span-7 bg-white p-6 sm:p-10 lg:p-12 flex flex-col justify-center relative z-20">
          
          {/* Bascule mobile pour petits écrans */}
          <div className="flex md:hidden items-center justify-center gap-2 mb-6 bg-cream-100 p-1.5 rounded-full border border-cream-200">
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className={`flex-1 py-1.5 px-4 rounded-full text-xs font-bold uppercase transition ${
                isRegister ? 'bg-maroon-500 text-white shadow-xs' : 'text-ink/60'
              }`}
            >
              SIGN UP
            </button>
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              className={`flex-1 py-1.5 px-4 rounded-full text-xs font-bold uppercase transition ${
                !isRegister ? 'bg-maroon-500 text-white shadow-xs' : 'text-ink/60'
              }`}
            >
              LOGIN
            </button>
          </div>

          {/* Badge rond supérieur avec l'icône utilisateur bordeaux */}
          <div className="flex justify-center mb-2">
            <div className="w-16 h-16 rounded-full bg-gradient-to-b from-[#8C232E] to-[#540E15] text-white flex items-center justify-center shadow-lg shadow-maroon-900/25 border border-maroon-400/20">
              {isRegister ? (
                <UserPlus size={26} className="text-white drop-shadow-sm" />
              ) : (
                <User size={26} className="text-white drop-shadow-sm" />
              )}
            </div>
          </div>

          {/* Titre central en majuscules grasses */}
          <h1 className="text-center font-extrabold text-xl sm:text-2xl tracking-wider text-ink mb-6 uppercase">
            {isRegister ? 'SIGN UP' : 'LOGIN'}
          </h1>

          {/* Affichage des messages d'erreur ou d'information */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-maroon-50 border border-maroon-200 text-maroon-700 text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <div className="leading-snug">{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs flex items-start gap-2">
              <CheckCircle2 size={15} className="shrink-0 mt-0.5" />
              <div className="leading-snug">{success}</div>
            </div>
          )}

          {/* Formulaire de saisie */}
          <form onSubmit={handleSubmit} className="space-y-4 max-w-sm mx-auto w-full">
            
            {/* Champ Email / Identifiant avec préfixe @ */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-ink mb-1">
                <span className="text-ink/70">@</span>
                <span>Email Address</span>
              </label>
              <input
                type="text"
                required
                placeholder="name@example.com"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-[#FAF3F0] border border-[#ECD9D5] text-ink placeholder:text-ink/30 text-sm focus:outline-none focus:border-maroon-500 focus:bg-white focus:ring-2 focus:ring-maroon-500/15 transition-all"
              />
            </div>

            {/* Champ Mot de passe avec icône cadenas */}
            <div>
              <label className="flex items-center gap-1.5 text-xs font-bold text-ink mb-1">
                <Lock size={12} className="text-ink/70" />
                <span>Password</span>
              </label>
              <div className="relative flex items-center">
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="•••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white border border-slate-200 text-ink placeholder:text-ink/30 text-sm focus:outline-none focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/15 transition-all tracking-wider"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-ink/40 hover:text-ink transition cursor-pointer p-1"
                  tabIndex={-1}
                  aria-label={showPassword ? "Masquer" : "Afficher"}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Champ Confirmation du mot de passe (mode SIGN UP) */}
            {isRegister && (
              <div>
                <label className="flex items-center gap-1.5 text-xs font-bold text-ink mb-1">
                  <Lock size={12} className="text-ink/70" />
                  <span>Confirm Password</span>
                </label>
                <div className="relative flex items-center">
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    required
                    placeholder="•••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 pr-10 rounded-xl bg-white border border-slate-200 text-ink placeholder:text-ink/30 text-sm focus:outline-none focus:border-maroon-500 focus:ring-2 focus:ring-maroon-500/15 transition-all tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 text-ink/40 hover:text-ink transition cursor-pointer p-1"
                    tabIndex={-1}
                    aria-label={showConfirmPassword ? "Masquer" : "Afficher"}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>
            )}

            {/* Bouton d'action pilule centré (bordeaux foncé LBS avec ombre) */}
            <div className="pt-2 flex justify-center">
              <button
                type="submit"
                disabled={loading}
                className="w-40 py-2.5 px-6 rounded-full bg-gradient-to-r from-[#7A1620] to-[#590E16] hover:from-[#8C1B26] hover:to-[#6B121B] active:scale-98 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-maroon-900/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    <span>Patientez...</span>
                  </>
                ) : (
                  <span>{isRegister ? 'SIGN UP' : 'LOGIN'}</span>
                )}
              </button>
            </div>
          </form>

          {/* Séparateur OR */}
          <div className="text-center my-3 max-w-sm mx-auto w-full">
            <span className="text-[11px] font-bold text-ink/35 tracking-wider uppercase">
              OR
            </span>
          </div>

          {/* Bouton Google SSO */}
          <div className="max-w-sm mx-auto w-full">
            <button
              type="button"
              onClick={handleGoogleAuth}
              className="w-full py-2 px-4 rounded-xl bg-slate-100 hover:bg-slate-200/80 border border-slate-200/70 text-ink font-semibold text-xs flex items-center justify-center gap-2 shadow-2xs transition cursor-pointer"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 10.04 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Google</span>
            </button>
          </div>

        </div>

      </div>
    </div>
  );
}
