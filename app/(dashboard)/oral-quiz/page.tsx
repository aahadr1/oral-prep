'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import OralQuizManager from '@/components/OralQuizManager';
// import RevisionManager from '@/components/RevisionManager';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import { OralQuizQuestion } from '@/lib/types';

// Import dynamically to avoid SSR issues with audio APIs
const OralQuizPlayer = dynamic(() => import('@/components/OralQuizPlayer'), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center items-center h-64">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
    </div>
  )
});

interface Question {
  id: string;
  question: string;
  criteria: string[];
}

export default function OralQuizPage() {
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [isQuizActive, setIsQuizActive] = useState(false);
  const [selectedQuizQuestions, setSelectedQuizQuestions] = useState<OralQuizQuestion[] | null>(null);
  const [activeTab, setActiveTab] = useState<'create' | 'saved'>('saved');
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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

  // Check if we're coming from a quiz play route
  useEffect(() => {
    const storedQuiz = sessionStorage.getItem('currentOralQuiz');
    if (storedQuiz) {
      const quiz = JSON.parse(storedQuiz);
      setSelectedQuizQuestions(quiz.questions);
      setIsQuizActive(true);
      sessionStorage.removeItem('currentOralQuiz');
    }
  }, []);

  // Add a new question
  const addQuestion = () => {
    const newQuestion: Question = {
      id: Date.now().toString(),
      question: '',
      criteria: ['']
    };
    setQuestions([...questions, newQuestion]);
  };

  // Update question
  const updateQuestion = (id: string, field: keyof Question, value: any) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, [field]: value } : q
    ));
  };

  // Add criteria to a question
  const addCriteria = (questionId: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { ...q, criteria: [...q.criteria, ''] }
        : q
    ));
  };

  // Update criteria
  const updateCriteria = (questionId: string, criteriaIndex: number, value: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            criteria: q.criteria.map((c, i) => i === criteriaIndex ? value : c)
          }
        : q
    ));
  };

  // Remove criteria
  const removeCriteria = (questionId: string, criteriaIndex: number) => {
    setQuestions(questions.map(q => 
      q.id === questionId 
        ? { 
            ...q, 
            criteria: q.criteria.filter((_, i) => i !== criteriaIndex)
          }
        : q
    ));
  };

  // Remove question
  const removeQuestion = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  // Start the quiz
  const startQuiz = () => {
    if (questions.length === 0 || questions.some(q => !q.question || q.criteria.filter(c => c.trim() !== '').length === 0)) {
      alert('Veuillez ajouter au moins une question avec des critères avant de commencer.');
      return;
    }
    setIsQuizActive(true);
  };

  // Complete quiz
  const completeQuiz = () => {
    setIsQuizActive(false);
    setSelectedQuizQuestions(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Quiz Oral</h1>
          <p className="text-gray-600 mt-1">
            Pratiquez vos réponses orales avec l&rsquo;agent vocal intelligent
          </p>
        </div>
      </div>

      {!isQuizActive ? (
        <div className="space-y-6">
          {/* Tab Navigation */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1">
            <div className="flex">
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
                  activeTab === 'saved'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Mes Quiz Sauvegardés
              </button>
              <button
                onClick={() => setActiveTab('create')}
                className={`flex-1 py-3 px-6 rounded-lg font-medium transition ${
                  activeTab === 'create'
                    ? 'bg-blue-500 text-white'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                Créer un Quiz Rapide
              </button>
            </div>
          </div>

          {/* Content based on active tab */}
          {activeTab === 'saved' && user && (
            <OralQuizManager userId={user.id} />
          )}
          
          {activeTab === 'create' && (
            <>
              {/* Questions Setup */}
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-xl font-semibold mb-6">Quiz Rapide (Non Sauvegardé)</h2>
                
                <div className="space-y-4">
                  {questions.map((question, qIndex) => (
                    <div key={question.id} className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="font-medium text-gray-900">Question {qIndex + 1}</h3>
                        <button
                          onClick={() => removeQuestion(question.id)}
                          className="text-red-500 hover:text-red-700 transition"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                      
                      <textarea
                        value={question.question}
                        onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                        placeholder="Entrez votre question..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">
                          Critères de réponse correcte:
                        </label>
                        {question.criteria.map((criterion, cIndex) => (
                          <div key={cIndex} className="flex items-center gap-2">
                            <span className="text-sm text-gray-500 w-6">{cIndex + 1}.</span>
                            <input
                              type="text"
                              value={criterion}
                              onChange={(e) => updateCriteria(question.id, cIndex, e.target.value)}
                              placeholder="Critère à mentionner dans la réponse..."
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            />
                            {question.criteria.length > 1 && (
                              <button
                                onClick={() => removeCriteria(question.id, cIndex)}
                                className="text-red-500 hover:text-red-700 transition"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                        <button
                          onClick={() => addCriteria(question.id)}
                          className="text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1 mt-2"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          Ajouter un critère
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  <button
                    onClick={addQuestion}
                    className="w-full py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:text-gray-900 hover:border-gray-400 transition flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Ajouter une question
                  </button>
                </div>
              </div>

              {/* Examples */}
              <div className="grid md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">💡 Exemple 1</h3>
                  <p className="text-sm text-blue-800 mb-2">
                    <strong>Question :</strong> Quels sont les trois piliers du développement durable ?
                  </p>
                  <p className="text-sm text-blue-700">
                    <strong>Critères :</strong> économique, social, environnemental
                  </p>
                </div>
                
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="font-semibold text-green-900 mb-2">📚 Exemple 2</h3>
                  <p className="text-sm text-green-800 mb-2">
                    <strong>Question :</strong> Quelles sont les causes de la Révolution française ?
                  </p>
                  <p className="text-sm text-green-700">
                    <strong>Critères :</strong> crise financière, inégalités, idées des Lumières
                  </p>
                </div>
                
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h3 className="font-semibold text-purple-900 mb-2">💼 Exemple 3</h3>
                  <p className="text-sm text-purple-800 mb-2">
                    <strong>Question :</strong> Comment motiver une équipe ?
                  </p>
                  <p className="text-sm text-purple-700">
                    <strong>Critères :</strong> reconnaissance, communication, objectifs clairs
                  </p>
                </div>
              </div>

              {/* Start Button */}
              {questions.length > 0 && (
                <div className="flex justify-center">
                  <button
                    onClick={startQuiz}
                    className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg font-bold text-lg hover:from-blue-700 hover:to-indigo-700 transition-all transform hover:scale-105 shadow-lg flex items-center gap-3"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                    Démarrer le Quiz Oral
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      ) : (
        /* Quiz Active View */
        <div className="space-y-6">
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Quiz en cours</h2>
            <p className="text-gray-700">
              {(selectedQuizQuestions || questions).length} question{(selectedQuizQuestions || questions).length > 1 ? 's' : ''} à traiter
            </p>
          </div>
          
          <OralQuizPlayer 
            questions={selectedQuizQuestions || questions.map(q => ({
              question: q.question,
              criteria: q.criteria.filter(c => c.trim() !== '')
            }))}
            onComplete={completeQuiz}
          />
        </div>
      )}
    </div>
  );
}