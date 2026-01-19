import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/option';
import Link from 'next/link';

async function getOrganizations(token: string) {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000'}/api/v1/organization`,
      {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        cache: 'no-store'
      }
    );

    if (response.ok) {
      const data = await response.json();
      return data.success && data.data ? data.data : [];
    }
    return [];
  } catch (error) {
    console.error('Error fetching organizations:', error);
    return [];
  }
}

export default async function DashboardRootPage() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.token) {
    redirect('/login');
  }

  const organizations = await getOrganizations(session.user.token);
  
  if (organizations.length > 0) {
    redirect(`/dashboard/${organizations[0].id}`);
  }
  
  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-lg p-8 text-center">
        <div className="w-16 h-16 bg-[rgb(132,42,59)]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg 
            className="w-8 h-8 text-[rgb(132,42,59)]" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" 
            />
          </svg>
        </div>
        
        <h1 className="text-2xl font-bold text-[rgb(48,48,48)] mb-3">
          No Organization Yet
        </h1>
        
        <p className="text-gray-600 mb-8">
          You need to create or join an organization to start using DocuGenius. 
          Organizations help you manage templates and collaborate with your team.
        </p>
        
        <Link
          href="/onboarding"
          className="inline-block w-full bg-[rgb(132,42,59)] hover:bg-[rgb(152,52,69)] text-white font-medium py-3 px-6 rounded-lg transition-colors"
        >
          Create or Join Organization
        </Link>
        
        <p className="text-sm text-gray-500 mt-6">
          Have a PIN? You can join an existing organization instantly.
        </p>
      </div>
    </div>
  );
}

