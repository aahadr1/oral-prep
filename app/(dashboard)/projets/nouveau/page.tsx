'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Uploader from '@/components/Uploader';
import { processPDF } from '@/lib/actions/pdf';
import { createSupabaseBrowser } from '@/lib/supabase/client';

export default function NewProjectPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      setError('Veuillez donner un nom à votre projet');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const supabase = createSupabaseBrowser();

      // Get current user
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setError('Vous devez être connecté');
        return;
      }

      // Create project
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: name.trim(),
          owner_id: user.id,
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // Upload files if any
      if (files.length > 0) {
        setUploadProgress({ current: 0, total: files.length });

        for (let i = 0; i < files.length; i++) {
          const file = files[i];
          const filePath = `users/${user.id}/${project.id}/docs/${file.name}`;

          // Upload to storage
          const { error: uploadError } = await supabase.storage
            .from('project-docs')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Upload error:', uploadError);
            // Continue with other files even if one fails
          } else {
            // Add document record
            const { data: doc } = await supabase.from('project_documents').insert({
              project_id: project.id,
              name: file.name,
              path: filePath,
              size_bytes: file.size,
              content_type: file.type || 'application/octet-stream',
            }).select().single();

            // If PDF, pre-render pages and index images
            if (doc && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
              try {
                // Create a signed URL to read the PDF we just uploaded
                const { data: signed } = await supabase.storage
                  .from('project-docs')
                  .createSignedUrl(filePath, 60 * 10);
                if (signed?.signedUrl) {
                  const result = await processPDF(
                    signed.signedUrl,
                    doc.id,
                    project.id,
                    user.id
                  );
                  if (!result.success) {
                    console.error('PDF processing failed:', result.error);
                  }
                }
              } catch (e) {
                console.error('Pre-render PDF pages failed:', e);
              }
            }
          }

          setUploadProgress({ current: i + 1, total: files.length });
        }
      }

      // Redirect to project page
      router.push(`/projets/${project.id}`);
      router.refresh();
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Une erreur est survenue');
      setLoading(false);
      setUploadProgress(null);
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900">Créer un projet</h1>
        <p className="text-gray-600 mt-1">
          Ajoutez vos documents et commencez votre préparation
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 p-8">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-6">
            {error}
          </div>
        )}

        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
              Nom du projet <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
              disabled={loading}
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition disabled:opacity-50"
              placeholder="Ex: Préparation examen de mathématiques"
            />
            <p className="text-xs text-gray-500 mt-1">
              {name.length}/120 caractères
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Documents source
            </label>
            <Uploader onFilesChange={setFiles} maxFiles={10} maxSize={50 * 1024 * 1024} />
          </div>
        </div>

        {uploadProgress && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <p className="text-sm text-blue-700">
                Envoi des documents... ({uploadProgress.current}/{uploadProgress.total})
              </p>
            </div>
          </div>
        )}

        <div className="flex items-center gap-3 mt-8 pt-6 border-t border-gray-200">
          <button
            type="button"
            onClick={() => router.back()}
            disabled={loading}
            className="px-5 py-2.5 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="submit"
            disabled={loading || !name.trim()}
            className="px-5 py-2.5 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Création en cours...' : 'Terminé'}
          </button>
        </div>
      </form>
    </div>
  );
}

