import Link from 'next/link';

interface Project {
  id: string;
  name: string;
  created_at: string;
  document_count?: number;
}

export default function ProjectCard({ project }: { project: Project }) {
  const date = new Date(project.created_at).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <Link
      href={`/projets/${project.id}`}
      className="block bg-white rounded-xl border border-gray-200 p-6 hover:border-gray-300 hover:shadow-sm transition group"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center group-hover:bg-gray-900 transition">
            <svg className="w-5 h-5 text-gray-600 group-hover:text-white transition" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 group-hover:text-gray-700 transition">
              {project.name}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">Créé le {date}</p>
          </div>
        </div>
      </div>
      
      {project.document_count !== undefined && (
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span>{project.document_count} document{project.document_count > 1 ? 's' : ''}</span>
        </div>
      )}
    </Link>
  );
}

