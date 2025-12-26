import { redirect } from 'next/navigation';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/option';

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
    redirect('/sign-in');
  }

  const organizations = await getOrganizations(session.user.token);
  
  if (organizations.length === 0) {
    redirect('/onboarding');
  }
  
  // Redirect to first organization
  redirect(`/dashboard/${organizations[0].id}`);
}

