'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase/client';
import DocumentViewer from '@/components/DocumentViewer';
import AgentSidebar from '@/components/AgentSidebar';
import type { ProjectDocument } from '@/lib/types';

export default function AgentDocumentPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const documentId = params.documentId as string;
  const router = useRouter();
  const supabase = createSupabaseBrowser();
  
  const [document, setDocument] = useState<ProjectDocument | null>(null);
  const [documentUrl, setDocumentUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [currentPageText, setCurrentPageText] = useState('');

  useEffect(() => {
    if (!projectId || !documentId) return;
    
    const loadDocument = async () => {
      try {
        // Fetch document metadata
        const { data: doc, error: docError } = await supabase
          .from('project_documents')
          .select('*')
          .eq('id', documentId)
          .single();

        if (docError) throw docError;
        if (!doc) throw new Error('Document not found');

        // Verify ownership through project
        const { data: project } = await supabase
          .from('projects')
          .select('id')
          .eq('id', projectId)
          .single();

        if (!project) {
          router.push('/projets');
          return;
        }

        setDocument(doc);

        // Get signed URL for document
        const { data: urlData } = await supabase.storage
          .from('project-docs')
          .createSignedUrl(doc.path, 3600); // 1 hour

        if (urlData?.signedUrl) {
          setDocumentUrl(urlData.signedUrl);
        } else {
          throw new Error('Could not generate document URL');
        }
      } catch (err: any) {
        console.error('Error loading document:', err);
        setError(err.message || 'Erreur lors du chargement du document');
      } finally {
        setLoading(false);
      }
    };

    loadDocument();
  }, [projectId, documentId]);


  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">Chargement du document...</p>
        </div>
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <div className="text-red-500 mb-2">
            <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-gray-900 font-medium mb-4">{error || 'Document introuvable'}</p>
          <button
            onClick={() => router.push(`/projets/${projectId}/agent`)}
            className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
          >
            Retour
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      {/* Top bar */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push(`/projets/${projectId}/agent`)}
            className="p-2 hover:bg-gray-100 rounded transition"
            title="Retour"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="font-semibold text-gray-900">{document.name}</h1>
            <p className="text-xs text-gray-500">Agent IA - Analyse page par page</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <span>Page {currentPage}</span>
        </div>
      </div>

      {/* Main content: Document viewer + Agent sidebar */}
      <div className="flex-1 flex overflow-hidden">
        {/* Document viewer (left side) */}
        <div className="flex-1">
          <DocumentViewer
            documentUrl={documentUrl}
            documentName={document.name}
            contentType={document.content_type}
            onPageChange={setCurrentPage}
            onTextExtracted={setCurrentPageText}
          />
        </div>

        {/* Agent sidebar (right side) */}
        <div className="w-96 flex-shrink-0">
          <AgentSidebar
            projectId={projectId}
            documentId={documentId}
            documentName={document.name}
            currentPage={currentPage}
            currentPageText={currentPageText}
          />
        </div>
      </div>
    </div>
  );
}

