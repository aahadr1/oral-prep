'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface OralBlancSession {
  id: string;
  user_id: string;
  title: string;
  topic: string;
  created_at: string;
  updated_at: string;
}

interface OralBlancManagerProps {
  userId: string;
  onStartSession?: (session: OralBlancSession) => void;
}

export default function OralBlancManager({ userId, onStartSession }: OralBlancManagerProps) {
  const [sessions, setSessions] = useState<OralBlancSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedSession, setSelectedSession] = useState<OralBlancSession | null>(null);
  const [sessionTitle, setSessionTitle] = useState('');
  const [sessionTopic, setSessionTopic] = useState('');
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // Fetch saved sessions
  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const response = await fetch('/api/oral-blanc/list');
      if (!response.ok) throw new Error('Failed to fetch sessions');
      const data = await response.json();
      setSessions(data);
    } catch (err) {
      console.error('Error fetching sessions:', err);
      setError('Erreur lors du chargement des sessions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSession = () => {
    setSessionTitle('');
    setSessionTopic('');
    setShowCreateModal(true);
  };

  const handleEditSession = (session: OralBlancSession) => {
    setSelectedSession(session);
    setSessionTitle(session.title);
    setSessionTopic(session.topic);
    setShowEditModal(true);
  };

  const handleSaveSession = async () => {
    if (!sessionTitle.trim()) {
      setError('Le titre est requis');
      return;
    }

    if (!sessionTopic.trim()) {
      setError('Le sujet est requis');
      return;
    }

    try {
      const endpoint = showEditModal && selectedSession 
        ? `/api/oral-blanc/${selectedSession.id}` 
        : '/api/oral-blanc/create';
      
      const method = showEditModal ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: sessionTitle,
          topic: sessionTopic
        })
      });

      if (!response.ok) throw new Error('Failed to save session');

      await fetchSessions();
      setShowCreateModal(false);
      setShowEditModal(false);
      setError(null);
    } catch (err) {
      console.error('Error saving session:', err);
      setError('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteSession = async (sessionId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette session ?')) return;

    try {
      const response = await fetch(`/api/oral-blanc/${sessionId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete session');

      await fetchSessions();
    } catch (err) {
      console.error('Error deleting session:', err);
      setError('Erreur lors de la suppression');
    }
  };

  const handleStartSession = (session: OralBlancSession) => {
    if (onStartSession) {
      onStartSession(session);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mes Sessions d&rsquo;Oral Blanc</h2>
          <p className="text-gray-600 mt-1">Préparez-vous à affronter un jury de concours</p>
        </div>
        <button
          onClick={handleCreateSession}
          className="px-6 py-3 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transform hover:scale-105 transition-all shadow-lg"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouvelle Session
          </span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Session List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune session</h3>
          <p className="mt-1 text-sm text-gray-500">Commencez par créer votre première session d&rsquo;oral blanc</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {sessions.map((session) => (
            <div key={session.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{session.title}</h3>
              <div className="text-sm text-gray-600 mb-4 line-clamp-3">
                {session.topic.substring(0, 150)}
                {session.topic.length > 150 ? '...' : ''}
              </div>
              <div className="text-xs text-gray-500 mb-4">
                Créé le {new Date(session.created_at).toLocaleDateString('fr-FR')}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleStartSession(session)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition flex items-center justify-center shadow-md"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Commencer
                </button>
                <button
                  onClick={() => handleEditSession(session)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                  title="Modifier la session"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteSession(session.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition"
                  title="Supprimer la session"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {(showCreateModal || showEditModal) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold">
                {showEditModal ? 'Modifier la Session' : 'Créer une Session d\'Oral Blanc'}
              </h2>
            </div>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre de la Session
                </label>
                <input
                  type="text"
                  value={sessionTitle}
                  onChange={(e) => setSessionTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Ex: Préparation Concours - Histoire Contemporaine"
                />
              </div>

              {/* Topic */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Sujet / Matériel à Étudier
                  <span className="text-gray-500 text-xs ml-2">(Le jury posera des questions sur ce contenu)</span>
                </label>
                <textarea
                  value={sessionTopic}
                  onChange={(e) => setSessionTopic(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={15}
                  placeholder="Collez ici le texte, le cours, ou le document sur lequel le jury vous interrogera. Plus le contenu est détaillé, plus les questions seront pertinentes.

Exemple:
La Révolution Française (1789-1799)

Contexte:
- Crise financière de l'Ancien Régime
- Influence des idées des Lumières
- Tensions sociales entre ordres

Événements clés:
- 14 juillet 1789: Prise de la Bastille
- 26 août 1789: Déclaration des Droits de l'Homme
- 1792-1794: La Terreur

Conséquences:
- Fin de la monarchie absolue
- Émergence des principes républicains
- Impact sur l'Europe entière"
                />
                <p className="text-xs text-gray-500 mt-2">
                  💡 Conseil: Plus vous fournissez de détails, plus l&rsquo;oral blanc sera réaliste et adapté à vos besoins.
                </p>
              </div>

              {/* Example Card */}
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="font-semibold text-purple-900 mb-2">📚 Exemple d&rsquo;utilisation</h3>
                <p className="text-sm text-purple-800 mb-2">
                  Vous pouvez coller:
                </p>
                <ul className="text-sm text-purple-700 list-disc list-inside space-y-1">
                  <li>Des notes de cours complètes</li>
                  <li>Des articles académiques</li>
                  <li>Des résumés de livres</li>
                  <li>Des fiches de révision</li>
                  <li>Des documents PDF (copiez le texte)</li>
                </ul>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex justify-end gap-3 mt-8">
              <button
                onClick={() => {
                  setShowCreateModal(false);
                  setShowEditModal(false);
                  setError(null);
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSaveSession}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition"
              >
                {showEditModal ? 'Mettre à jour' : 'Créer la Session'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

