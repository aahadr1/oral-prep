import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  // Redirect to projects if already authenticated
  if (user) {
    redirect('/projets');
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="w-full max-w-md px-6">
        {children}
      </div>
    </div>
  );
}

