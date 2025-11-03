import Link from 'next/link';
import { createSupabaseServer } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import ProjectCard from '@/components/ProjectCard';
import EmptyState from '@/components/EmptyState';

export default async function ProjectsPage() {
  const user = await getCurrentUser();
  const supabase = await createSupabaseServer();

  // Fetch user's projects with document count
  const { data: projects } = await supabase
    .from('projects')
    .select('*, project_documents(count)')
    .eq('owner_id', user?.id)
    .order('created_at', { ascending: false });

  const projectsWithCount = projects?.map((p) => ({
    ...p,
    document_count: p.project_documents?.[0]?.count || 0,
  }));

  return (
    <div className="max-w-6xl">
      {/* Prominent ORAL QUIZ Button */}
      <div className="mb-8 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl shadow-lg p-8 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-3xl font-bold mb-2 flex items-center gap-3">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
              ORAL QUIZ
            </h2>
            <p className="text-lg opacity-90">
              Pratiquez vos examens oraux avec notre agent vocal intelligent
            </p>
          </div>
          <Link
            href="/oral-quiz"
            className="px-8 py-4 bg-white text-indigo-600 rounded-lg font-bold text-lg hover:bg-gray-100 transition-all transform hover:scale-105 shadow-md flex items-center gap-2"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Commencer le Quiz Oral
          </Link>
        </div>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold text-gray-900">Mes Projets</h1>
          <p className="text-gray-600 mt-1">
            Gérez vos projets de préparation aux examens oraux
          </p>
        </div>
        <Link
          href="/projets/nouveau"
          className="px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Créer un projet
        </Link>
      </div>

      {!projectsWithCount || projectsWithCount.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200">
          <EmptyState
            title="Aucun projet pour l'instant"
            description="Créez votre premier projet pour commencer votre préparation"
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projectsWithCount.map((project) => (
            <ProjectCard key={project.id} project={project} />
          ))}
        </div>
      )}
    </div>
  );
}

