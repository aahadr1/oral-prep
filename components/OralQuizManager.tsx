'use client';

import { useState, useEffect } from 'react';
import { OralQuiz, OralQuizQuestion } from '@/lib/types';
import { useRouter } from 'next/navigation';
import RevisionManager from './RevisionManager';

interface OralQuizManagerProps {
  userId: string;
}

export default function OralQuizManager({ userId }: OralQuizManagerProps) {
  const [quizzes, setQuizzes] = useState<OralQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedQuiz, setSelectedQuiz] = useState<OralQuiz | null>(null);
  const [quizTitle, setQuizTitle] = useState('');
  const [quizDescription, setQuizDescription] = useState('');
  const [questions, setQuestions] = useState<OralQuizQuestion[]>([
    { question: '', criteria: [''] }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [isImporting, setIsImporting] = useState(false);
  const [activeQuizId, setActiveQuizId] = useState<string | null>(null);
  const router = useRouter();

  // Fetch saved quizzes
  useEffect(() => {
    fetchQuizzes();
  }, []);

  const fetchQuizzes = async () => {
    try {
      const response = await fetch('/api/oral-quiz/list');
      if (!response.ok) throw new Error('Failed to fetch quizzes');
      const data = await response.json();
      setQuizzes(data);
    } catch (err) {
      console.error('Error fetching quizzes:', err);
      setError('Erreur lors du chargement des quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = () => {
    setQuizTitle('');
    setQuizDescription('');
    setQuestions([{ question: '', criteria: [''] }]);
    setShowCreateModal(true);
  };

  const handleImportQuiz = async () => {
    if (!importText.trim()) {
      setError('Veuillez coller du texte à analyser');
      return;
    }

    setIsImporting(true);
    setError(null);

    try {
      const response = await fetch('/api/oral-quiz/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: importText })
      });

      if (!response.ok) {
        throw new Error('Failed to import quiz');
      }

      const data = await response.json();
      
      // Populate the form with extracted data
      setQuizTitle(data.title);
      setQuizDescription(data.description);
      setQuestions(data.questions);
      
      // Close import modal and open create modal
      setShowImportModal(false);
      setImportText('');
      setShowCreateModal(true);
    } catch (err) {
      console.error('Error importing quiz:', err);
      setError('Erreur lors de l\'analyse du texte. Veuillez réessayer.');
    } finally {
      setIsImporting(false);
    }
  };

  const handleEditQuiz = (quiz: OralQuiz) => {
    setSelectedQuiz(quiz);
    setQuizTitle(quiz.title);
    setQuizDescription(quiz.description || '');
    setQuestions(quiz.questions);
    setShowEditModal(true);
  };

  const handleSaveQuiz = async () => {
    if (!quizTitle.trim()) {
      setError('Le titre est requis');
      return;
    }

    const validQuestions = questions.filter(q => q.question.trim());
    if (validQuestions.length === 0) {
      setError('Au moins une question est requise');
      return;
    }

    try {
      const endpoint = showEditModal && selectedQuiz 
        ? `/api/oral-quiz/${selectedQuiz.id}` 
        : '/api/oral-quiz/create';
      
      const method = showEditModal ? 'PUT' : 'POST';

      const response = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: quizTitle,
          description: quizDescription,
          questions: validQuestions.map(q => ({
            question: q.question,
            criteria: q.criteria.filter(c => c.trim())
          }))
        })
      });

      if (!response.ok) throw new Error('Failed to save quiz');

      await fetchQuizzes();
      setShowCreateModal(false);
      setShowEditModal(false);
      setError(null);
    } catch (err) {
      console.error('Error saving quiz:', err);
      setError('Erreur lors de la sauvegarde');
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce quiz ?')) return;

    try {
      const response = await fetch(`/api/oral-quiz/${quizId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete quiz');

      await fetchQuizzes();
    } catch (err) {
      console.error('Error deleting quiz:', err);
      setError('Erreur lors de la suppression');
    }
  };

  const handleStartQuiz = async (quiz: OralQuiz) => {
    try {
      setLoading(true);
      setError(null);
      
      // Créer les cartes de révision si elles n'existent pas
      const response = await fetch('/api/revision/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quiz_id: quiz.id })
      });

      if (!response.ok) {
        const errorData = await response.json();
        // Si les cartes existent déjà, c'est ok
        if (!errorData.message?.includes('already exist')) {
          console.error('Error creating cards:', errorData);
          setError('Erreur lors de la création des cartes : ' + (errorData.details || errorData.error));
          setLoading(false);
          return;
        }
      }

      // Passer en mode jeu avec révision
      setActiveQuizId(quiz.id);
      
    } catch (err) {
      console.error('Error starting quiz:', err);
      setError('Erreur lors du démarrage du quiz');
    } finally {
      setLoading(false);
    }
  };

  const addQuestion = () => {
    setQuestions([...questions, { question: '', criteria: [''] }]);
  };

  const removeQuestion = (index: number) => {
    setQuestions(questions.filter((_, i) => i !== index));
  };

  const updateQuestion = (index: number, question: string) => {
    const updated = [...questions];
    updated[index].question = question;
    setQuestions(updated);
  };

  const addCriterion = (questionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].criteria.push('');
    setQuestions(updated);
  };

  const removeCriterion = (questionIndex: number, criterionIndex: number) => {
    const updated = [...questions];
    updated[questionIndex].criteria = updated[questionIndex].criteria.filter((_, i) => i !== criterionIndex);
    setQuestions(updated);
  };

  const updateCriterion = (questionIndex: number, criterionIndex: number, value: string) => {
    const updated = [...questions];
    updated[questionIndex].criteria[criterionIndex] = value;
    setQuestions(updated);
  };

  // Si un quiz est actif, afficher le RevisionManager
  if (activeQuizId) {
    return (
      <div className="space-y-6">
        <button
          onClick={() => setActiveQuizId(null)}
          className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour à mes quiz
        </button>
        
        <RevisionManager quizId={activeQuizId} userId={userId} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Mes Quiz Oraux</h2>
          <p className="text-gray-600 mt-1">Créez et gérez vos quiz d&rsquo;entraînement oral</p>
        </div>
        <button
          onClick={handleCreateQuiz}
          className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-medium hover:from-blue-600 hover:to-blue-700 transform hover:scale-105 transition-all shadow-lg"
        >
          <span className="flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Nouveau Quiz
          </span>
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {/* Quiz List */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
        </div>
      ) : quizzes.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
              d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">Aucun quiz</h3>
          <p className="mt-1 text-sm text-gray-500">Commencez par créer votre premier quiz oral</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((quiz) => (
            <div key={quiz.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">{quiz.title}</h3>
              {quiz.description && (
                <p className="text-gray-600 text-sm mb-3">{quiz.description}</p>
              )}
              <div className="text-sm text-gray-500 mb-4">
                {quiz.questions.length} question{quiz.questions.length > 1 ? 's' : ''}
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleStartQuiz(quiz)}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg font-medium hover:from-green-600 hover:to-emerald-700 transition flex items-center justify-center shadow-md"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Commencer
                </button>
                <button
                  onClick={() => handleEditQuiz(quiz)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                  title="Modifier le quiz"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition"
                  title="Supprimer le quiz"
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
          <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold">
                {showEditModal ? 'Modifier le Quiz' : 'Créer un Quiz Oral'}
              </h2>
              {!showEditModal && (
                <button
                  onClick={() => setShowImportModal(true)}
                  className="px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transform hover:scale-105 transition-all shadow-md flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Import Intelligent
                </button>
              )}
            </div>

            <div className="space-y-6">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Titre du Quiz
                </label>
                <input
                  type="text"
                  value={quizTitle}
                  onChange={(e) => setQuizTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ex: Entretien Technique React"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description (optionnelle)
                </label>
                <textarea
                  value={quizDescription}
                  onChange={(e) => setQuizDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="Décrivez brièvement ce quiz..."
                />
              </div>

              {/* Questions */}
              <div>
                <div className="flex justify-between items-center mb-4">
                  <label className="text-sm font-medium text-gray-700">Questions</label>
                  <button
                    onClick={addQuestion}
                    className="px-3 py-1 bg-blue-100 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-200 transition"
                  >
                    Ajouter une Question
                  </button>
                </div>

                <div className="space-y-6">
                  {questions.map((q, qIndex) => (
                    <div key={qIndex} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-medium text-gray-700">
                          Question {qIndex + 1}
                        </span>
                        {questions.length > 1 && (
                          <button
                            onClick={() => removeQuestion(qIndex)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>

                      <textarea
                        value={q.question}
                        onChange={(e) => updateQuestion(qIndex, e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent mb-3"
                        rows={2}
                        placeholder="Entrez votre question..."
                      />

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-medium text-gray-600">Critères d&rsquo;évaluation</span>
                          <button
                            onClick={() => addCriterion(qIndex)}
                            className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300 transition"
                          >
                            + Critère
                          </button>
                        </div>

                        {q.criteria.map((criterion, cIndex) => (
                          <div key={cIndex} className="flex gap-2 mb-2">
                            <input
                              type="text"
                              value={criterion}
                              onChange={(e) => updateCriterion(qIndex, cIndex, e.target.value)}
                              className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Ex: Mentionne les hooks React"
                            />
                            {q.criteria.length > 1 && (
                              <button
                                onClick={() => removeCriterion(qIndex, cIndex)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
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
                onClick={handleSaveQuiz}
                className="px-6 py-2 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 transition"
              >
                {showEditModal ? 'Mettre à jour' : 'Créer le Quiz'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Intelligent Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6">
            <h2 className="text-2xl font-bold mb-4">Import Intelligent de Questions</h2>
            
            <p className="text-gray-600 mb-6">
              Collez votre texte ci-dessous et l&apos;IA analysera le contenu pour extraire automatiquement 
              les questions et critères d&apos;évaluation pour votre quiz oral.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Texte à analyser
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={10}
                  placeholder="Collez ici votre texte contenant des questions d'entretien, des sujets techniques, ou tout contenu à partir duquel générer des questions..."
                  disabled={isImporting}
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                  setError(null);
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                disabled={isImporting}
              >
                Annuler
              </button>
              <button
                onClick={handleImportQuiz}
                disabled={isImporting || !importText.trim()}
                className="px-6 py-2 bg-purple-500 text-white rounded-lg font-medium hover:bg-purple-600 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isImporting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Analyse en cours...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                        d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                    Analyser et Importer
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
