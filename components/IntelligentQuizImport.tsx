'use client';

import { useState } from 'react';
import { OralQuizQuestion } from '@/lib/types';

interface IntelligentQuizImportProps {
  onImportComplete: (data: { title: string; description: string; questions: OralQuizQuestion[] }) => void;
  onClose: () => void;
}

interface ImportStats {
  totalQuestions: number;
  questionsWithCriteria: number;
  averageCriteriaPerQuestion: string;
}

export default function IntelligentQuizImport({ onImportComplete, onClose }: IntelligentQuizImportProps) {
  const [step, setStep] = useState<'input' | 'preview'>('input');
  const [importText, setImportText] = useState('');
  const [autoCriteria, setAutoCriteria] = useState(true);
  const [maxQuestions, setMaxQuestions] = useState(250);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<string | null>(null);
  
  // Preview data
  const [previewTitle, setPreviewTitle] = useState('');
  const [previewDescription, setPreviewDescription] = useState('');
  const [previewQuestions, setPreviewQuestions] = useState<OralQuizQuestion[]>([]);
  const [stats, setStats] = useState<ImportStats | null>(null);
  
  // Question editing
  const [editingQuestionIndex, setEditingQuestionIndex] = useState<number | null>(null);

  const handleAnalyze = async () => {
    if (!importText.trim()) {
      setError('Veuillez entrer du texte à analyser');
      return;
    }

    setIsAnalyzing(true);
    setError(null);
    setProgress(10);

    try {
      setProgress(30);
      
      const response = await fetch('/api/oral-quiz/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: importText,
          autoCriteria,
          maxQuestions
        })
      });

      setProgress(70);

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || errorData.error || 'Erreur lors de l\'analyse');
      }

      const data = await response.json();
      
      setProgress(90);
      
      // Set preview data
      setPreviewTitle(data.title);
      setPreviewDescription(data.description);
      setPreviewQuestions(data.questions);
      setStats(data.stats);
      
      setProgress(100);
      setStep('preview');
      
    } catch (err: any) {
      console.error('Error analyzing text:', err);
      setError(err.message || 'Erreur lors de l\'analyse. Vérifiez le format de votre texte.');
    } finally {
      setIsAnalyzing(false);
      setTimeout(() => setProgress(0), 500);
    }
  };

  const handleImport = () => {
    if (previewQuestions.length === 0) {
      setError('Aucune question à importer');
      return;
    }

    onImportComplete({
      title: previewTitle,
      description: previewDescription,
      questions: previewQuestions
    });
  };

  const updateQuestion = (index: number, field: 'question' | 'criteria', value: any) => {
    const updated = [...previewQuestions];
    if (field === 'criteria') {
      updated[index].criteria = value;
    } else {
      updated[index].question = value;
    }
    setPreviewQuestions(updated);
  };

  const addCriterion = (questionIndex: number) => {
    const updated = [...previewQuestions];
    updated[questionIndex].criteria.push('');
    setPreviewQuestions(updated);
  };

  const removeCriterion = (questionIndex: number, criterionIndex: number) => {
    const updated = [...previewQuestions];
    updated[questionIndex].criteria = updated[questionIndex].criteria.filter((_, i) => i !== criterionIndex);
    setPreviewQuestions(updated);
  };

  const updateCriterion = (questionIndex: number, criterionIndex: number, value: string) => {
    const updated = [...previewQuestions];
    updated[questionIndex].criteria[criterionIndex] = value;
    setPreviewQuestions(updated);
  };

  const removeQuestion = (index: number) => {
    setPreviewQuestions(previewQuestions.filter((_, i) => i !== index));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {step === 'input' ? (
          /* === STEP 1: INPUT === */
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Import Intelligent de Questions</h2>
                <p className="text-gray-600 mt-1">
                  Collez vos questions et laissez l&apos;IA les analyser automatiquement
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* AI-Powered Notice */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 border-2 border-purple-200 rounded-lg p-4 mb-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-purple-500 rounded-lg flex items-center justify-center">
                    <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                    </svg>
                  </div>
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-purple-900 mb-1">Analyse Intelligente par GPT-4o</h3>
                  <p className="text-sm text-purple-800 mb-3">
                    L&apos;IA analysera votre texte peu importe son format et extraira automatiquement toutes les questions avec leurs critères d&apos;évaluation
                  </p>
                  
                  <div className="space-y-3">
                    {/* Auto-criteria toggle */}
                    <label className="flex items-center gap-3 cursor-pointer group">
                      <div className="relative">
                        <input
                          type="checkbox"
                          checked={autoCriteria}
                          onChange={(e) => setAutoCriteria(e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-purple-900 group-hover:text-purple-700">
                          Génération automatique de critères {autoCriteria ? '✓' : ''}
                        </span>
                        <p className="text-xs text-purple-700">
                          {autoCriteria 
                            ? "L'IA créera des critères d'évaluation pertinents pour chaque question"
                            : "Seuls les critères explicitement présents dans le texte seront extraits"
                          }
                        </p>
                      </div>
                    </label>

                    {/* Max questions */}
                    <div>
                      <label className="text-sm font-medium text-purple-900 block mb-1">
                        Nombre maximum de questions : <span className="text-purple-600 font-bold">{maxQuestions}</span>
                      </label>
                      <input
                        type="range"
                        min="10"
                        max="300"
                        step="10"
                        value={maxQuestions}
                        onChange={(e) => setMaxQuestions(Number(e.target.value))}
                        className="w-full h-2 bg-purple-200 rounded-lg appearance-none cursor-pointer"
                        style={{
                          background: `linear-gradient(to right, rgb(147 51 234) 0%, rgb(147 51 234) ${((maxQuestions - 10) / 290) * 100}%, rgb(233 213 255) ${((maxQuestions - 10) / 290) * 100}%, rgb(233 213 255) 100%)`
                        }}
                      />
                      <div className="flex justify-between text-xs text-purple-600 mt-1">
                        <span>10</span>
                        <span>150</span>
                        <span>300</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Input Area */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Texte à analyser
                </label>
                <textarea
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-purple-400 text-sm"
                  rows={14}
                  placeholder="Collez n'importe quel texte ici...

✨ L'IA GPT-4o analysera automatiquement votre texte et :
   • Extraira toutes les questions pertinentes
   • Identifiera ou créera des critères d'évaluation
   • Structurera le tout en quiz professionnel

📝 Exemples de textes acceptés :
   • Liste simple de questions
   • Cours ou notes avec concepts
   • Questions avec critères déjà définis
   • Texte libre sur un sujet
   • Tout format - l'IA comprend tout !"
                  disabled={isAnalyzing}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    {importText.length.toLocaleString()} caractères
                    {importText.length > 10000 && ` • ~${Math.ceil(importText.split('\n').filter(l => l.match(/^\d+\.|^-|^•/)).length)} questions détectées`}
                  </span>
                  {importText.length > 100000 && (
                    <span className="text-xs text-orange-600 font-medium">
                      ⚠️ Texte très long, l&apos;analyse peut prendre du temps
                    </span>
                  )}
                </div>
              </div>

              {/* AI Capabilities */}
              <details className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-4">
                <summary className="cursor-pointer font-medium text-purple-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Ce que l&apos;IA peut faire pour vous
                </summary>
                <div className="mt-3 space-y-3 text-sm">
                  <div className="flex gap-2">
                    <span className="text-purple-600 font-bold">✓</span>
                    <div>
                      <p className="font-medium text-purple-900">Extraction intelligente</p>
                      <p className="text-purple-700">Identifie automatiquement les questions dans n&apos;importe quel texte</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-purple-600 font-bold">✓</span>
                    <div>
                      <p className="font-medium text-purple-900">Génération de critères</p>
                      <p className="text-purple-700">Crée des critères d&apos;évaluation concrets et pertinents</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-purple-600 font-bold">✓</span>
                    <div>
                      <p className="font-medium text-purple-900">Analyse contextuelle</p>
                      <p className="text-purple-700">Comprend le sujet et adapte les questions en conséquence</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <span className="text-purple-600 font-bold">✓</span>
                    <div>
                      <p className="font-medium text-purple-900">Format flexible</p>
                      <p className="text-purple-700">Accepte tout format : liste, paragraphe, notes, cours complet...</p>
                    </div>
                  </div>
                  <div className="bg-white border border-purple-200 rounded p-3 mt-3">
                    <p className="font-semibold text-purple-900 mb-2">💡 Astuce Pro</p>
                    <p className="text-purple-800 text-xs">
                      Plus votre texte est détaillé et structuré, meilleurs seront les critères générés. 
                      N&apos;hésitez pas à coller des cours entiers, des notes de formation, ou même des transcriptions !
                    </p>
                  </div>
                </div>
              </details>

              {/* Error */}
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                  {error}
                </div>
              )}

              {/* Progress */}
              {isAnalyzing && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-700 font-medium">Analyse en cours...</span>
                    <span className="text-purple-600 font-medium">{progress}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="bg-gradient-to-r from-purple-500 to-blue-500 h-2.5 transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-purple-700 text-center font-medium">
                    {progress < 30 && '🔗 Connexion à GPT-4o...'}
                    {progress >= 30 && progress < 70 && '🧠 Analyse intelligente du texte en cours...'}
                    {progress >= 70 && progress < 90 && '✨ Structuration des questions et critères...'}
                    {progress >= 90 && '✅ Finalisation...'}
                  </p>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                disabled={isAnalyzing}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing || !importText.trim()}
                className="px-6 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-lg font-medium hover:from-purple-600 hover:to-purple-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isAnalyzing ? (
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
                    Analyser
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* === STEP 2: PREVIEW === */
          <div className="p-6">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Prévisualisation et Édition</h2>
                <p className="text-gray-600 mt-1">
                  Vérifiez et modifiez les questions avant l&apos;import final
                </p>
              </div>
              <button
                onClick={() => setStep('input')}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
              </button>
            </div>

            {/* Stats */}
            {stats && (
              <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3 mb-2">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <h3 className="font-semibold text-green-900">Import réussi !</h3>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">{stats.totalQuestions}</div>
                    <div className="text-xs text-gray-600">Questions</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-green-600">{stats.questionsWithCriteria}</div>
                    <div className="text-xs text-gray-600">Avec critères</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-purple-600">{stats.averageCriteriaPerQuestion}</div>
                    <div className="text-xs text-gray-600">Critères/question</div>
                  </div>
                </div>
              </div>
            )}

            {/* Title and Description */}
            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Titre du Quiz</label>
                <input
                  type="text"
                  value={previewTitle}
                  onChange={(e) => setPreviewTitle(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={previewDescription}
                  onChange={(e) => setPreviewDescription(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  rows={2}
                />
              </div>
            </div>

            {/* Questions List */}
            <div className="space-y-4 max-h-96 overflow-y-auto mb-6 pr-2">
              {previewQuestions.map((q, qIndex) => (
                <div key={qIndex} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-start justify-between mb-3">
                    <span className="text-sm font-medium text-gray-700">Question {qIndex + 1}</span>
                    <button
                      onClick={() => removeQuestion(qIndex)}
                      className="text-red-500 hover:text-red-700"
                      title="Supprimer cette question"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <textarea
                    value={q.question}
                    onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-3 resize-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    rows={2}
                  />

                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs font-medium text-gray-600">Critères d&apos;évaluation</span>
                      <button
                        onClick={() => addCriterion(qIndex)}
                        className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs hover:bg-purple-200 transition"
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
                          className="flex-1 px-3 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                          placeholder="Critère d'évaluation"
                        />
                        {q.criteria.length > 1 && (
                          <button
                            onClick={() => removeCriterion(qIndex, cIndex)}
                            className="text-red-500 hover:text-red-700"
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

            {/* Actions */}
            <div className="flex justify-between items-center">
              <button
                onClick={() => setStep('input')}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
              >
                ← Retour
              </button>
              <div className="flex gap-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition"
                >
                  Annuler
                </button>
                <button
                  onClick={handleImport}
                  disabled={previewQuestions.length === 0}
                  className="px-8 py-2 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold hover:from-green-600 hover:to-green-700 transition disabled:opacity-50 flex items-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Importer {previewQuestions.length} question{previewQuestions.length > 1 ? 's' : ''}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

