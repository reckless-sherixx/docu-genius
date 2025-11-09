import { Suspense } from 'react';
import FabricPDFEditor from '@/components/features/pdf/FabricPDFEditor';
import { Loader2 } from 'lucide-react';

export default async function PDFEditorPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="text-center">
            <Loader2 className="h-12 w-12 animate-spin text-[rgb(132,42,59)] mx-auto mb-4" />
            <p className="text-gray-600">Loading PDF editor...</p>
          </div>
        </div>
      }
    >
      <FabricPDFEditor templateId={id} />
    </Suspense>
  );
}
