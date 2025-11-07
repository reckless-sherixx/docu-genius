'use client';

import { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Document, Page, pdfjs } from 'react-pdf';
import { 
  Type, 
  Image as ImageIcon, 
  Highlighter, 
  Square, 
  PenTool,  
  Save, 
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo
} from 'lucide-react';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';


if (typeof window !== 'undefined') {
  pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
}

interface PDFEditorProps {
  templateId: string;
}

interface Edit {
  type: 'text' | 'image' | 'signature' | 'highlight' | 'shape';
  page: number;
  text?: string;
  position?: { x: number; y: number };
  style?: any;
  coordinates?: any;
  shapeType?: string;
  color?: string;
}

export default function PDFEditor({ templateId }: PDFEditorProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [pdfData, setPdfData] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentTool, setCurrentTool] = useState<string>('select');
  const [scale, setScale] = useState(1.0);
  const [edits, setEdits] = useState<Edit[]>([]);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [clickPosition, setClickPosition] = useState<{ x: number; y: number; page: number } | null>(null);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
  // Use Next.js API proxy to avoid IDM/CORS issues
  const pdfProxyUrl = `/api/proxy/pdf`;

  useEffect(() => {
    if (session?.user?.token && templateId) {
      loadPDF();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId, session?.user?.token]);

  const loadPDF = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`${backendUrl}/api/pdf-editor/${templateId}/edit`, {
        headers: {
          Authorization: `Bearer ${session?.user?.token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to load PDF');
      }

      const data = await response.json();

      if (data.success) {
        setPdfData(data.data);
        
        // Show notification if OCR was applied
        if (data.data.pdfData?.ocrApplied) {
          alert('✅ OCR applied! Scanned document is now editable.');
        }
      } else {
        throw new Error(data.message || 'Failed to load PDF');
      }
    } catch (err) {
      console.error('❌ Error loading PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to load PDF');
    } finally {
      setLoading(false);
    }
  };

  const savePDF = async () => {
    setSaving(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/pdf-editor/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.user?.token}`,
        },
        body: JSON.stringify({
          templateId,
          editedContent: {
            edits,
          },
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save PDF');
      }

      const result = await response.json();

      if (result.success) {
        const expiryDate = new Date(result.data.expiresAt);
        alert(
          `✅ PDF saved successfully!\n\nFile will expire at: ${expiryDate.toLocaleString()}\n\nRedirecting to templates...`
        );
        
        // Redirect to templates page after 2 seconds
        setTimeout(() => {
          router.push('/dashboard/templates');
        }, 2000);
      } else {
        throw new Error(result.message || 'Failed to save PDF');
      }
    } catch (err) {
      console.error('❌ Error saving PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to save PDF');
    } finally {
      setSaving(false);
    }
  };

  const handlePageClick = (event: React.MouseEvent<HTMLDivElement>, pageNumber: number) => {
    if (currentTool === 'text') {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      
      setClickPosition({ x, y, page: pageNumber });
      setShowTextInput(true);
    }
  };

  const addText = () => {
    if (!textInput.trim() || !clickPosition) return;

    const newEdit: Edit = {
      type: 'text',
      page: clickPosition.page,
      text: textInput,
      position: { x: clickPosition.x, y: clickPosition.y },
      style: {
        fontSize: 12,
        fontFamily: 'Helvetica',
        color: '#000000',
      },
    };

    setEdits([...edits, newEdit]);
    setTextInput('');
    setShowTextInput(false);
    setClickPosition(null);
    setCurrentTool('select');
  };

  const addHighlight = (pageNumber: number) => {
    // Example highlight
    const newEdit: Edit = {
      type: 'highlight',
      page: pageNumber,
      coordinates: {
        x: 100,
        y: 200,
        width: 150,
        height: 20,
      },
      color: '#FFFF00',
    };

    setEdits([...edits, newEdit]);
  };

  const undoEdit = () => {
    if (edits.length > 0) {
      setEdits(edits.slice(0, -1));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[rgb(132,42,59)] mx-auto mb-4" />
          <p className="text-gray-600">Loading PDF editor...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="max-w-md p-6 bg-red-50 border border-red-200 rounded-lg">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-6 w-6 text-red-600 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-900 mb-2">Error Loading PDF</h3>
              <p className="text-sm text-red-700">{error}</p>
              <button
                onClick={() => router.push('/dashboard/templates')}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
              >
                Back to Templates
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen bg-gray-900">
      {/* Toolbar */}
      <div className="bg-gray-800 text-white border-b border-gray-700">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold">PDF Editor</h1>
            {pdfData?.pdfData?.ocrApplied && (
              <span className="px-2 py-1 bg-yellow-600 text-xs rounded-lg">
                OCR Applied ✓
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setScale(Math.max(0.5, scale - 0.1))}
              className="p-2 hover:bg-gray-700 rounded-lg transition"
              title="Zoom Out"
            >
              <ZoomOut className="h-5 w-5" />
            </button>
            <span className="text-sm px-3">{Math.round(scale * 100)}%</span>
            <button
              onClick={() => setScale(Math.min(2.0, scale + 0.1))}
              className="p-2 hover:bg-gray-700 rounded-lg transition"
              title="Zoom In"
            >
              <ZoomIn className="h-5 w-5" />
            </button>

            <div className="w-px h-6 bg-gray-700 mx-2" />

            <button
              onClick={undoEdit}
              disabled={edits.length === 0}
              className="p-2 hover:bg-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo className="h-5 w-5" />
            </button>

            <div className="w-px h-6 bg-gray-700 mx-2" />

            <button
              onClick={savePDF}
              disabled={saving}
              className="px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save (2-hour expiry)
                </>
              )}
            </button>

            <button
              onClick={() => router.push('/dashboard/templates')}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </div>

        {/* Tools */}
        <div className="flex items-center gap-2 px-4 py-3 border-t border-gray-700">
          <button
            onClick={() => setCurrentTool('select')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm ${
              currentTool === 'select' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <Square className="h-4 w-4" />
            Select
          </button>

          <button
            onClick={() => setCurrentTool('text')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm ${
              currentTool === 'text' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <Type className="h-4 w-4" />
            Add Text
          </button>

          <button
            onClick={() => setCurrentTool('highlight')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm ${
              currentTool === 'highlight' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <Highlighter className="h-4 w-4" />
            Highlight
          </button>

          <button
            onClick={() => setCurrentTool('shape')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm ${
              currentTool === 'shape' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <Square className="h-4 w-4" />
            Shapes
          </button>

          <button
            onClick={() => setCurrentTool('signature')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm ${
              currentTool === 'signature' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
          >
            <PenTool className="h-4 w-4" />
            Signature
          </button>

          <div className="ml-auto text-sm text-gray-400">
            {edits.length} edit{edits.length !== 1 ? 's' : ''} applied
          </div>
        </div>
      </div>

      {/* PDF Viewer */}
      <div className="flex-1 overflow-auto bg-gray-900 p-8">
        {pdfData?.downloadUrl && (
          <div className="max-w-4xl mx-auto">
            <Document
              file={`${pdfProxyUrl}/${templateId}`}
              onLoadSuccess={({ numPages }: { numPages: number }) => setNumPages(numPages)}
              onLoadError={(error) => {
                console.error('❌ PDF Load Error:', error);
                setError('Failed to load PDF document');
              }}
              loading={
                <div className="flex items-center justify-center p-12 bg-white rounded-lg">
                  <Loader2 className="h-8 w-8 animate-spin text-[rgb(132,42,59)]" />
                </div>
              }
              className="flex flex-col items-center gap-6"
            >
              {Array.from(new Array(numPages), (el, index) => (
                <div
                  key={`page_${index + 1}`}
                  className="relative shadow-2xl"
                  onClick={(e) => handlePageClick(e, index + 1)}
                >
                  <Page
                    pageNumber={index + 1}
                    scale={scale}
                    className="bg-white"
                  />
                  
                  {/* Render edits on this page */}
                  {edits
                    .filter((edit) => edit.page === index + 1)
                    .map((edit, editIndex) => (
                      <div
                        key={editIndex}
                        className="absolute pointer-events-none"
                        style={{
                          left: edit.position?.x || edit.coordinates?.x || 0,
                          top: edit.position?.y || edit.coordinates?.y || 0,
                        }}
                      >
                        {edit.type === 'text' && (
                          <span
                            style={{
                              fontSize: edit.style?.fontSize || 12,
                              color: edit.style?.color || '#000000',
                              fontFamily: edit.style?.fontFamily || 'sans-serif',
                            }}
                          >
                            {edit.text}
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              ))}
            </Document>
          </div>
        )}
      </div>

      {/* Text Input Modal */}
      {showTextInput && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Text</h3>
            
            <textarea
              value={textInput}
              onChange={(e) => setTextInput(e.target.value)}
              placeholder="Enter text to add..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent resize-none"
              rows={4}
              autoFocus
            />

            <div className="flex items-center gap-3 mt-4">
              <button
                onClick={() => {
                  setShowTextInput(false);
                  setTextInput('');
                  setClickPosition(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={addText}
                disabled={!textInput.trim()}
                className="flex-1 px-4 py-2 bg-[rgb(132,42,59)] hover:bg-[rgb(139,42,52)] text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition"
              >
                Add Text
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
