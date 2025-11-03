'use client';

import { useState } from 'react';
import type { QuestionDraft } from '@/lib/quiz/types';

interface Props {
  projectId: string;
  onCommitted?: (batchId: string) => void;
}

export default function QuizBulkBuilder({ projectId, onCommitted }: Props) {
  const [text, setText] = useState('');
  const [name, setName] = useState('Lot de 30 questions');
  const [items, setItems] = useState<QuestionDraft[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/quiz/import/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, text, targetCount: 30 }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors de la génération');
      }
      const data = await res.json();
      setItems(data.items || []);
    } catch (e: any) {
      setError(e?.message || 'Erreur inconnue');
    } finally {
      setLoading(false);
    }
  };

  const commit = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/quiz/import/bulk/commit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, name, items }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Erreur lors de l\'enregistrement');
      }
      const data = await res.json();
      if (onCommitted) onCommitted(data.batchId);
      // reset
      setText('');
      setItems([]);
    } catch (e: any) {
      setError(e?.message || 'Erreur inconnue');
    } finally {
      setSaving(false);
    }
  };

  const editItem = (idx: number, updater: (d: QuestionDraft) => QuestionDraft) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? updater({ ...it }) : it)));
  };

  const removeItem = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Nom du lot</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Coller vos notes/questions</label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder="Collez des questions ou des notes non structurées..."
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900"
          />
        </div>
        <button
          onClick={generate}
          disabled={loading || text.trim().length < 10}
          className="w-full px-4 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Génération en cours...' : 'Générer 30 questions'}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">{error}</div>
      )}

      {items.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Aperçu ({items.length})</h3>
            <button
              onClick={commit}
              disabled={saving}
              className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition disabled:opacity-50"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer le lot'}
            </button>
          </div>
          <div className="space-y-4 max-h-[600px] overflow-y-auto">
            {items.map((it, idx) => (
              <div key={idx} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <input
                      value={it.question}
                      onChange={(e) => editItem(idx, (d) => ({ ...d, question: e.target.value }))}
                      className="w-full mb-2 px-3 py-2 rounded border border-gray-300 text-sm"
                    />
                    <textarea
                      value={it.canonicalAnswer}
                      onChange={(e) => editItem(idx, (d) => ({ ...d, canonicalAnswer: e.target.value }))}
                      rows={2}
                      className="w-full mb-2 px-3 py-2 rounded border border-gray-300 text-sm"
                    />
                    <div className="mb-2">
                      <div className="text-xs font-medium text-gray-600 mb-1">Points clés (3–5)</div>
                      <div className="flex flex-col gap-1">
                        {it.keyPoints.map((kp, kIdx) => (
                          <div key={kIdx} className="flex gap-2 items-center">
                            <input
                              value={kp}
                              onChange={(e) => editItem(idx, (d) => ({
                                ...d,
                                keyPoints: d.keyPoints.map((k, ii) => (ii === kIdx ? e.target.value : k)),
                              }))}
                              className="flex-1 px-3 py-1.5 rounded border border-gray-300 text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                    {it.hints !== undefined && (
                      <input
                        value={it.hints || ''}
                        onChange={(e) => editItem(idx, (d) => ({ ...d, hints: e.target.value }))}
                        placeholder="Indice (optionnel)"
                        className="w-full mb-2 px-3 py-2 rounded border border-gray-300 text-sm"
                      />
                    )}
                    {/* Follow-ups (read-only summary to keep UI compact) */}
                    {it.followups && it.followups.length > 0 && (
                      <div className="text-xs text-gray-600 mt-1">
                        Suivis: {it.followups.map((f, i) => f.prompt).join(' • ')}
                      </div>
                    )}
                  </div>
                  <button
                    onClick={() => removeItem(idx)}
                    className="text-gray-400 hover:text-red-600 transition"
                    title="Supprimer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}




