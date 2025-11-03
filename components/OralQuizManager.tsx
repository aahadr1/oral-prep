'use client';

import { useState, useEffect } from 'react';
import { OralQuiz, OralQuizQuestion } from '@/lib/types';
import { useRouter } from 'next/navigation';

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

  const handleStartQuiz = (quiz: OralQuiz) => {
    // Store the quiz in session storage for the player
    sessionStorage.setItem('currentOralQuiz', JSON.stringify(quiz));
    router.push(`/oral-quiz/play/${quiz.id}`);
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
                  className="flex-1 px-4 py-2 bg-green-500 text-white rounded-lg font-medium hover:bg-green-600 transition"
                >
                  Commencer
                </button>
                <button
                  onClick={() => handleEditQuiz(quiz)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200 transition"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
                      d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </button>
                <button
                  onClick={() => handleDeleteQuiz(quiz.id)}
                  className="px-4 py-2 bg-red-100 text-red-700 rounded-lg font-medium hover:bg-red-200 transition"
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
            <h2 className="text-2xl font-bold mb-6">
              {showEditModal ? 'Modifier le Quiz' : 'Créer un Quiz Oral'}
            </h2>

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
    </div>
  );
}
