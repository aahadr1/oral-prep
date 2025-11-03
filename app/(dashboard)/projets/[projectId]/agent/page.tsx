import { notFound, redirect } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export default async function AgentPage({
  params,
}: {
  params: Promise<{ projectId: string }>;
}) {
  const { projectId } = await params;
  const user = await getCurrentUser();
  const supabase = await createSupabaseServer();

  // Fetch project with documents
  const { data: project } = await supabase
    .from('projects')
    .select('*, project_documents(*)')
    .eq('id', projectId)
    .eq('owner_id', user?.id)
    .single();

  if (!project) {
    notFound();
  }

  // If there's only one document, redirect directly to it
  if (project.project_documents?.length === 1) {
    redirect(`/projets/${projectId}/agent/${project.project_documents[0].id}`);
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <Link
          href={`/projets/${projectId}`}
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-4 transition"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Retour au projet
        </Link>
        
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gray-900 rounded-xl flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-semibold text-gray-900">Apprendre avec l&apos;agent</h1>
            <p className="text-gray-600">{project.name}</p>
          </div>
        </div>
      </div>

      {/* Document Selection */}
      {project.project_documents && project.project_documents.length > 0 ? (
        <div>
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Sélectionnez un document à analyser
          </h2>
          <div className="space-y-3">
            {project.project_documents.map((doc: any) => (
              <Link
                key={doc.id}
                href={`/projets/${projectId}/agent/${doc.id}`}
                className="block bg-white rounded-xl border border-gray-200 p-4 hover:border-gray-900 transition group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center group-hover:bg-gray-900 transition">
                    <svg className="w-6 h-6 text-gray-600 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate group-hover:text-gray-900">
                      {doc.name}
                    </h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {(doc.size_bytes / 1024 / 1024).toFixed(2)} Mo
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-gray-900 transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ) : (
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
            Ajoutez des documents à votre projet pour commencer à utiliser l&apos;agent IA
          </p>
          <Link
            href={`/projets/${projectId}`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition"
          >
            Retour au projet
          </Link>
        </div>
      )}

      {/* Help Section */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
        <div className="flex gap-4">
          <div className="flex-shrink-0">
            <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Comment utiliser l&apos;agent IA ?</h3>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Sélectionnez un document ci-dessus</li>
              <li>• Naviguez entre les pages avec les flèches ← →</li>
              <li>• Cliquez sur &quot;Expliquer cette page&quot; pour une analyse complète</li>
              <li>• Sélectionnez du texte pour poser des questions spécifiques</li>
              <li>• Sauvegardez les explications utiles comme notes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}

