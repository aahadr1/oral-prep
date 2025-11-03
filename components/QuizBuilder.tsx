'use client';

import { useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import type { ProjectDocument, QuizItemType } from '@/lib/types';

interface QuizBuilderProps {
  projectId: string;
  documents: ProjectDocument[];
  onQuizCreated?: () => void;
}

interface QuizConfig {
  title: string;
  sourceDocuments: string[];
  types: QuizItemType[];
  difficulty: 'facile' | 'moyen' | 'difficile';
  count: number;
  pageRange?: { from: number; to: number };
}

interface GeneratedQuizItem {
  type: QuizItemType;
  question: string;
  options?: string[];
  answer: string;
  explanation?: string;
}

export default function QuizBuilder({
  projectId,
  documents,
  onQuizCreated,
}: QuizBuilderProps) {
  const supabase = createSupabaseBrowser();
  
  const [config, setConfig] = useState<QuizConfig>({
    title: '',
    sourceDocuments: [],
    types: ['mcq'],
    difficulty: 'moyen',
    count: 10,
  });
  
  const [generatedItems, setGeneratedItems] = useState<GeneratedQuizItem[]>([]);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    setGenerating(true);
    setError(null);

    try {
      if (config.sourceDocuments.length === 0) {
        throw new Error('Sélectionnez au moins un document source');
      }

      if (config.types.length === 0) {
        throw new Error('Sélectionnez au moins un type de question');
      }

      // Call API to generate quiz
      const response = await fetch('/api/replicate/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          action: 'generate_quiz',
          documents: config.sourceDocuments,
          types: config.types,
          difficulty: config.difficulty,
          count: config.count,
          pageRange: config.pageRange,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Erreur lors de la génération');
      }

      const data = await response.json();
      setGeneratedItems(data.items);
    } catch (err: any) {
      console.error('Generation error:', err);
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      if (!config.title.trim()) {
        throw new Error('Donnez un titre au quiz');
      }

      // Create quiz
      const { data: quiz, error: quizError } = await supabase
        .from('quizzes')
        .insert({
          project_id: projectId,
          title: config.title,
          description: `${config.count} questions (${config.difficulty})`,
          created_by: user.id,
        })
        .select()
        .single();

      if (quizError) throw quizError;

      // Insert quiz items
      const itemsToInsert = generatedItems.map(item => ({
        quiz_id: quiz.id,
        type: item.type,
        question: item.question,
        options: item.options ? JSON.stringify(item.options) : null,
        answer: item.answer,
        explanation: item.explanation,
        source_document_id: config.sourceDocuments[0], // For simplicity, use first doc
      }));

      const { error: itemsError } = await supabase
        .from('quiz_items')
        .insert(itemsToInsert);

      if (itemsError) throw itemsError;

      // Reset state
      setConfig({
        title: '',
        sourceDocuments: [],
        types: ['mcq'],
        difficulty: 'moyen',
        count: 10,
      });
      setGeneratedItems([]);
      
      onQuizCreated?.();
    } catch (err: any) {
      console.error('Save error:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleType = (type: QuizItemType) => {
    setConfig(prev => ({
      ...prev,
      types: prev.types.includes(type)
        ? prev.types.filter(t => t !== type)
        : [...prev.types, type],
    }));
  };

  const toggleDocument = (docId: string) => {
    setConfig(prev => ({
      ...prev,
      sourceDocuments: prev.sourceDocuments.includes(docId)
        ? prev.sourceDocuments.filter(id => id !== docId)
        : [...prev.sourceDocuments, docId],
    }));
  };

  const editItem = (index: number, field: keyof GeneratedQuizItem, value: any) => {
    setGeneratedItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const removeItem = (index: number) => {
    setGeneratedItems(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Configuration */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration du quiz</h3>
        
        {/* Title */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Titre du quiz
          </label>
          <input
            type="text"
            value={config.title}
            onChange={(e) => setConfig(prev => ({ ...prev, title: e.target.value }))}
            placeholder="Ex: Quiz - Chapitre 3"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        {/* Source documents */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Documents sources
          </label>
          <div className="space-y-2">
            {documents.map(doc => (
              <label key={doc.id} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={config.sourceDocuments.includes(doc.id)}
                  onChange={() => toggleDocument(doc.id)}
                  className="rounded border-gray-300"
                />
                <span className="text-sm text-gray-900">{doc.name}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Question types */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Types de questions
          </label>
          <div className="flex gap-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.types.includes('mcq')}
                onChange={() => toggleType('mcq')}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-900">QCM</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.types.includes('flashcard')}
                onChange={() => toggleType('flashcard')}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-900">Flashcards</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={config.types.includes('open')}
                onChange={() => toggleType('open')}
                className="rounded border-gray-300"
              />
              <span className="text-sm text-gray-900">Questions ouvertes</span>
            </label>
          </div>
        </div>

        {/* Difficulty */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Difficulté
          </label>
          <div className="flex gap-2">
            {(['facile', 'moyen', 'difficile'] as const).map(level => (
              <button
                key={level}
                onClick={() => setConfig(prev => ({ ...prev, difficulty: level }))}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
                  config.difficulty === level
                    ? 'bg-gray-900 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {level.charAt(0).toUpperCase() + level.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Count */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nombre de questions
          </label>
          <input
            type="number"
            min="1"
            max="50"
            value={config.count}
            onChange={(e) => setConfig(prev => ({ ...prev, count: parseInt(e.target.value) || 1 }))}
            className="w-32 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>

        {/* Generate button */}
        <button
          onClick={handleGenerate}
          disabled={generating || config.sourceDocuments.length === 0}
          className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {generating ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Génération en cours...
            </>
          ) : (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Générer le quiz
            </>
          )}
        </button>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Preview generated items */}
      {generatedItems.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">
              Aperçu ({generatedItems.length} questions)
            </h3>
            <button
              onClick={handleSave}
              disabled={saving || !config.title.trim()}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {saving ? 'Sauvegarde...' : 'Sauvegarder le quiz'}
            </button>
          </div>

          <div className="space-y-4 max-h-96 overflow-y-auto">
            {generatedItems.map((item, index) => (
              <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase">
                    {item.type === 'mcq' ? 'QCM' : item.type === 'flashcard' ? 'Flashcard' : 'Question ouverte'}
                  </span>
                  <button
                    onClick={() => removeItem(index)}
                    className="text-gray-400 hover:text-red-600 transition"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>

                <div className="text-sm text-gray-900 font-medium mb-2">
                  {item.question}
                </div>

                {item.type === 'mcq' && item.options && (
                  <div className="space-y-1 mb-2">
                    {item.options.map((opt, i) => (
                      <div key={i} className="text-sm text-gray-700 flex items-center gap-2">
                        <span className="text-gray-400">{String.fromCharCode(65 + i)}.</span>
                        {opt}
                      </div>
                    ))}
                  </div>
                )}

                <div className="text-sm text-green-700 mt-2">
                  <strong>Réponse:</strong> {item.answer}
                </div>

                {item.explanation && (
                  <div className="text-xs text-gray-600 mt-2">
                    {item.explanation}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}


