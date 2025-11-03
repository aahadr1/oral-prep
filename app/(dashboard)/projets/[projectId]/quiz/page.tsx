'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import QuizBuilder from '@/components/QuizBuilder';
import QuizBulkBuilder from '@/components/QuizBulkBuilder';
import QuizLibrary from '@/components/QuizLibrary';
import QuizReview from '@/components/QuizReview';
import type { ProjectDocument } from '@/lib/types';

type Tab = 'generate' | 'bulk' | 'library' | 'review';

export default function QuizPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  
  const [activeTab, setActiveTab] = useState<Tab>('bulk');
  const [documents, setDocuments] = useState<ProjectDocument[]>([]);
  const [projectName, setProjectName] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (!projectId) return;
    
    const loadProject = async () => {
      try {
        const { data: project, error } = await supabase
          .from('projects')
          .select('name, project_documents(*)')
          .eq('id', projectId)
          .single();

        if (error) throw error;
        if (!project) {
          router.push('/projets');
          return;
        }

        setProjectName(project.name);
        setDocuments(project.project_documents || []);
      } catch (error) {
        console.error('Error loading project:', error);
        router.push('/projets');
      } finally {
        setLoading(false);
      }
    };

    loadProject();
  }, [projectId]);

  const handleQuizCreated = () => {
    setRefreshKey(prev => prev + 1);
    setActiveTab('library');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.push(`/projets/${projectId}`)}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour au projet
        </button>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Apprendre avec des quiz</h1>
            <p className="text-gray-600">{projectName}</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex gap-8">
          <button
            onClick={() => setActiveTab('generate')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'generate'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              Générer
            </div>
          </button>

          <button
            onClick={() => setActiveTab('bulk')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'bulk'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Import massif
            </div>
          </button>

          <button
            onClick={() => setActiveTab('library')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'library'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              Bibliothèque
            </div>
          </button>

          <button
            onClick={() => setActiveTab('review')}
            className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
              activeTab === 'review'
                ? 'border-gray-900 text-gray-900'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              Révision
            </div>
          </button>
        </nav>
      </div>

      {/* Tab content */}
      <div className="pb-12">
        {activeTab === 'generate' && (
          <div>
            {documents.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Aucun document disponible
                </h3>
                <p className="text-gray-600 mb-6">
                  Ajoutez des documents à votre projet pour générer des quiz
                </p>
                <button
                  onClick={() => router.push(`/projets/${projectId}`)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
                >
                  Retour au projet
                </button>
              </div>
            ) : (
              <QuizBuilder
                projectId={projectId}
                documents={documents}
                onQuizCreated={handleQuizCreated}
              />
            )}
          </div>
        )}

        {activeTab === 'bulk' && (
          <div>
            <QuizBulkBuilder
              projectId={projectId}
              onCommitted={() => setActiveTab('library')}
            />
          </div>
        )}

        {activeTab === 'library' && (
          <QuizLibrary projectId={projectId} onRefresh={refreshKey} />
        )}

        {activeTab === 'review' && <QuizReview projectId={projectId} />}
      </div>

      {/* Help section */}
      {activeTab === 'generate' && documents.length > 0 && (
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <div className="flex gap-4">
            <div className="flex-shrink-0">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="font-medium text-gray-900 mb-2">Comment générer des quiz ?</h3>
              <ul className="text-sm text-gray-700 space-y-1">
                <li>• Donnez un titre à votre quiz</li>
                <li>• Sélectionnez les documents sources</li>
                <li>• Choisissez les types de questions (QCM, flashcards, questions ouvertes)</li>
                <li>• Ajustez la difficulté et le nombre de questions</li>
                <li>• Cliquez sur &quot;Générer le quiz&quot;</li>
                <li>• Prévisualisez et modifiez si nécessaire</li>
                <li>• Sauvegardez votre quiz dans la bibliothèque</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

