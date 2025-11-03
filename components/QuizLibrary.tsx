'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import type { Quiz, QuizItem } from '@/lib/types';

interface QuizLibraryProps {
  projectId: string;
  onRefresh?: number;
}

interface QuizWithItems extends Quiz {
  items: QuizItem[];
}

export default function QuizLibrary({ projectId, onRefresh }: QuizLibraryProps) {
  const supabase = createSupabaseBrowser();
  
  const [quizzes, setQuizzes] = useState<QuizWithItems[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedQuiz, setExpandedQuiz] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const loadQuizzes = async () => {
    try {
      const { data, error } = await supabase
        .from('quizzes')
        .select(`
          *,
          quiz_items (*)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const quizzesWithItems = (data || []).map(quiz => ({
        ...quiz,
        items: quiz.quiz_items || [],
      }));

      setQuizzes(quizzesWithItems as any);
    } catch (error) {
      console.error('Error loading quizzes:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuizzes();
  }, [projectId, onRefresh]);

  const deleteQuiz = async (quizId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce quiz ?')) return;

    try {
      const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
      if (error) throw error;
      
      setQuizzes(prev => prev.filter(q => q.id !== quizId));
    } catch (error) {
      console.error('Error deleting quiz:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const deleteItem = async (itemId: string, quizId: string) => {
    if (!confirm('Supprimer cette question ?')) return;

    try {
      const { error } = await supabase.from('quiz_items').delete().eq('id', itemId);
      if (error) throw error;

      setQuizzes(prev =>
        prev.map(q =>
          q.id === quizId
            ? { ...q, items: q.items.filter(i => i.id !== itemId) }
            : q
        )
      );
    } catch (error) {
      console.error('Error deleting item:', error);
      alert('Erreur lors de la suppression');
    }
  };

  const updateItem = async (itemId: string, quizId: string, updates: Partial<QuizItem>) => {
    try {
      const { error } = await supabase
        .from('quiz_items')
        .update(updates)
        .eq('id', itemId);

      if (error) throw error;

      setQuizzes(prev =>
        prev.map(q =>
          q.id === quizId
            ? {
                ...q,
                items: q.items.map(i =>
                  i.id === itemId ? { ...i, ...updates } : i
                ),
              }
            : q
        )
      );

      setEditingItem(null);
    } catch (error) {
      console.error('Error updating item:', error);
      alert('Erreur lors de la mise à jour');
    }
  };

  const exportQuiz = (quiz: QuizWithItems) => {
    const data = {
      title: quiz.title,
      description: quiz.description,
      items: quiz.items.map(item => ({
        type: item.type,
        question: item.question,
        options: item.options,
        answer: item.answer,
        explanation: item.explanation,
      })),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${quiz.title.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredQuizzes = quizzes.filter(quiz =>
    quiz.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  if (quizzes.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
        </div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun quiz pour l&apos;instant</h3>
        <p className="text-gray-600">Créez votre premier quiz dans l&apos;onglet &quot;Générer&quot;</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative">
        <input
          type="text"
          placeholder="Rechercher un quiz..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
        <svg className="w-5 h-5 text-gray-400 absolute left-3 top-2.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>

      {/* Quiz list */}
      <div className="space-y-3">
        {filteredQuizzes.map(quiz => (
          <div key={quiz.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {/* Quiz header */}
            <div className="p-4 flex items-center justify-between">
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-900 truncate">{quiz.title}</h3>
                <p className="text-sm text-gray-600 mt-0.5">
                  {quiz.items.length} question{quiz.items.length > 1 ? 's' : ''} • {quiz.description}
                </p>
              </div>
              
              <div className="flex items-center gap-2 ml-4">
                <button
                  onClick={() => setExpandedQuiz(expandedQuiz === quiz.id ? null : quiz.id)}
                  className="p-2 hover:bg-gray-100 rounded transition"
                  title="Afficher les questions"
                >
                  <svg
                    className={`w-5 h-5 text-gray-600 transition-transform ${
                      expandedQuiz === quiz.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                <button
                  onClick={() => exportQuiz(quiz)}
                  className="p-2 hover:bg-gray-100 rounded transition"
                  title="Exporter"
                >
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                </button>

                <button
                  onClick={() => deleteQuiz(quiz.id)}
                  className="p-2 hover:bg-red-50 rounded transition"
                  title="Supprimer"
                >
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Quiz items (expanded) */}
            {expandedQuiz === quiz.id && (
              <div className="border-t border-gray-200 bg-gray-50 p-4 space-y-3">
                {quiz.items.map((item, index) => (
                  <div key={item.id} className="bg-white rounded-lg p-4 border border-gray-200">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                        <span className="text-xs px-2 py-1 bg-gray-100 rounded text-gray-600">
                          {item.type === 'mcq' ? 'QCM' : item.type === 'flashcard' ? 'Flashcard' : 'Question ouverte'}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteItem(item.id, quiz.id)}
                        className="text-gray-400 hover:text-red-600 transition"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="text-sm text-gray-900 font-medium mb-2">{item.question}</div>

                    {item.type === 'mcq' && item.options && (
                      <div className="space-y-1 mb-2 text-sm text-gray-700">
                        {(Array.isArray(item.options) ? item.options : JSON.parse(item.options as any)).map((opt: string, i: number) => (
                          <div key={i}>• {opt}</div>
                        ))}
                      </div>
                    )}

                    <div className="text-sm text-green-700 mt-2">
                      <strong>Réponse:</strong> {item.answer}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

