'use client';

import { useRouter, usePathname } from 'next/navigation';
import ModuleCard from './ModuleCard';

interface Module {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface ProjectModulesProps {
  modules: Module[];
}

export default function ProjectModules({ modules }: ProjectModulesProps) {
  const router = useRouter();
  const pathname = usePathname();
  
  // Extract projectId from pathname
  const projectId = pathname.split('/')[2];
  
  const handleModuleClick = (moduleId: string) => {
    if (moduleId === 'agent') {
      router.push(`/projets/${projectId}/agent`);
    } else if (moduleId === 'quiz') {
      router.push(`/projets/${projectId}/quiz`);
    } else {
      alert('Module en cours de développement');
    }
  };

  return (
    <>
      {/* Learning Modules */}
      <div className="mb-8">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Modules d&apos;apprentissage</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {modules.map((module) => (
            <ModuleCard
              key={module.id}
              title={module.title}
              description={module.description}
              icon={module.icon}
              onClick={() => handleModuleClick(module.id)}
            />
          ))}
        </div>
      </div>

      {/* Oral Practice */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Entraînement oral</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ModuleCard
            title="Tester mes connaissances à l&apos;oral"
            description="Pratiquez avec des questions orales courtes et ciblées"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            }
            variant="primary"
            onClick={() => handleModuleClick('oral-practice')}
          />
          <ModuleCard
            title="Faire un oral blanc complet"
            description="Simulez un examen oral dans les conditions réelles"
            icon={
              <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            }
            variant="primary"
            onClick={() => handleModuleClick('oral-exam')}
          />
        </div>
      </div>
    </>
  );
}

