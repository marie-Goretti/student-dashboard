import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, User, Loader2 } from 'lucide-react';
import { getEtudiants } from '../../api/studentsService';

export default function StudentSearchBar({ autoFocus = false }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);
  const navigate = useNavigate();

  // --- Recherche avec debounce (300ms) pour ne pas spammer l'API à chaque frappe ---
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await getEtudiants({ search: query.trim() });
        setResults(data.results ?? data);
        setOpen(true);
      } catch (err) {
        console.error('Erreur recherche étudiant:', err);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  // --- Fermer le dropdown au clic extérieur ---
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (etudiant) => {
    setQuery('');
    setResults([]);
    setOpen(false);
    navigate(`/students/${etudiant.id_etu}`);
  };

  return (
    <div ref={containerRef} className="relative w-full max-w-md">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input
          type="text"
          autoFocus={autoFocus}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Rechercher un étudiant (nom, prénom, matricule)..."
          className="w-full border rounded-lg pl-10 pr-9 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        {loading && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 animate-spin" size={16} />
        )}
      </div>

      {open && (
        <div className="absolute z-20 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto">
          {results.length === 0 && !loading ? (
            <p className="text-sm text-gray-400 text-center py-4">Aucun étudiant trouvé.</p>
          ) : (
            results.map((etu) => (
              <button
                key={etu.id_etu}
                onClick={() => handleSelect(etu)}
                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 transition text-left"
              >
                <div className="p-1.5 bg-primary-50 rounded-full text-primary-600">
                  <User size={14} />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-800">{etu.nom} {etu.prenom}</p>
                  <p className="text-xs text-gray-400">{etu.matricule}</p>
                </div>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}