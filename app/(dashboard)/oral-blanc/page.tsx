'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import OralBlancManager from '@/components/OralBlancManager';
import { createSupabaseBrowser } from '@/lib/supabase/client';

// Import dynamically to avoid SSR issues with audio APIs
const OralBlancPlayer = dynamic(() => import('@/components/OralBlancPlayer'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
    </div>
  )
});

interface OralBlancSession {
  id: string;
  user_id: string;
  title: string;
  topic: string;
  created_at: string;
  updated_at: string;
}

export default function OralBlancPage() {
  const router = useRouter();
  const [isSessionActive, setIsSessionActive] = useState(false);
  const [activeSession, setActiveSession] = useState<OralBlancSession | null>(null);
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'saved' | 'quick'>('saved');
  const [quickTopic, setQuickTopic] = useState('');
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUser(user);
    } catch (error) {
      console.error('Error checking user:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleStartSession = (session: OralBlancSession) => {
    setActiveSession(session);
    setIsSessionActive(true);
  };

  const handleStartQuickSession = () => {
    if (!quickTopic.trim()) {
      alert('Veuillez entrer un sujet avant de commencer.');
      return;
    }

    // Create a temporary session object for quick sessions
    const quickSession: OralBlancSession = {
      id: 'quick-' + Date.now(),
      user_id: user?.id || '',
      title: 'Session Rapide',
      topic: quickTopic,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    setActiveSession(quickSession);
    setIsSessionActive(true);
  };

  const completeSession = () => {
    setIsSessionActive(false);
    setActiveSession(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Oral Blanc</h1>
          <p className="text-gray-600 mt-1">
            Entraînez-vous avec un jury virtuel intelligent
          </p>
        </div>
      </div>

      {!isSessionActive ? (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
            <div className="flex">
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
                  activeTab === 'saved'
                    ? 'bg-purple-500 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mes Sessions Sauvegardées
              </button>
              <button
                onClick={() => setActiveTab('quick')}
                className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
                  activeTab === 'quick'
                    ? 'bg-purple-500 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Session Rapide
              </button>
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'saved' && user && (
            <OralBlancManager 
              userId={user.id} 
              onStartSession={handleStartSession}
            />
          )}
          
          {activeTab === 'quick' && (
            <>
              {/* Quick Session Setup */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-6">Session Rapide (Non Sauvegardée)</h2>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Sujet / Matériel d&rsquo;Étude
                      <span className="text-gray-500 text-xs ml-2">(Le jury posera des questions sur ce contenu)</span>
                    </label>
                    <textarea
                      value={quickTopic}
                      onChange={(e) => setQuickTopic(e.target.value)}
                      placeholder="Collez ici votre cours, document, ou sujet d'étude. Le jury vous interrogera sur ce contenu..."
                      rows={12}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* Examples */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">💡 Histoire</h3>
                  <p className="text-sm text-purple-800 mb-2">
                    <strong>Exemple:</strong> Collez un chapitre sur la Révolution Française avec dates clés, causes, conséquences...
                  </p>
                  <p className="text-sm text-purple-700">
                    Le jury vous interrogera sur les événements, les personnages, les concepts.
                  </p>
                </div>
                
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">📚 Sciences</h3>
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Exemple:</strong> Collez un cours de physique sur la thermodynamique, les formules, les principes...
                  </p>
                  <p className="text-sm text-blue-700">
                    Le jury testera votre compréhension des concepts et applications.
                  </p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">💼 Professionnel</h3>
                  <p className="text-sm text-green-800 mb-2">
                    <strong>Exemple:</strong> Collez la description d&rsquo;un projet, d&rsquo;une méthode, d&rsquo;un processus...
                  </p>
                  <p className="text-sm text-green-700">
                    Le jury vous questionnera sur vos choix, votre méthodologie.
                  </p>
                </div>
              </div>

              {/* Start Button */}
              {quickTopic.trim() && (
                <div className="flex justify-center">
                  <button
                    onClick={handleStartQuickSession}
                    className="px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg font-bold text-lg hover:from-purple-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg flex items-center gap-3"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    Démarrer l&rsquo;Oral Blanc
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Session Active View */
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {activeSession?.title || 'Session en cours'}
            </h2>
            <p className="text-gray-700 text-sm">
              Le jury vous interrogera sur le sujet fourni
            </p>
          </div>
          
          {activeSession && (
            <OralBlancPlayer 
              topic={activeSession.topic}
              onComplete={completeSession}
            />
          )}
        </div>
      )}
    </div>
  );
}

