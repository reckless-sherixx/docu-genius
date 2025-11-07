'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { 
  Type, 
  Trash2,
  Save, 
  Loader2,
  AlertCircle,
  ZoomIn,
  ZoomOut,
  Undo,
  Redo,
  MousePointer,
  Move
} from 'lucide-react';

let pdfjs: any = null;

if (typeof window !== 'undefined') {
  import('react-pdf').then((module) => {
    pdfjs = module.pdfjs;
    pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
  });
}

interface PDFEditorProps {
  templateId: string;
}

interface TextElement {
  id: string;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize: number;
  fontFamily: string;
  color: string;
  page: number;
  originalText?: string; 
}

interface DeletedElement {
  id: string;
  page: number;
}

interface PageImage {
  pageNumber: number;
  imageUrl: string;
  width: number;
  height: number;
}

export default function EditablePDFEditor({ templateId }: PDFEditorProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const [pdfData, setPdfData] = useState<any>(null);
  const [numPages, setNumPages] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [currentTool, setCurrentTool] = useState<string>('select');
  const [scale, setScale] = useState(1.0);
  

  const [pageImages, setPageImages] = useState<PageImage[]>([]);
  
  // Editable elements
  const [textElements, setTextElements] = useState<TextElement[]>([]);
  const [deletedElements, setDeletedElements] = useState<DeletedElement[]>([]);
  const [selectedElement, setSelectedElement] = useState<string | null>(null);
  const [editingElement, setEditingElement] = useState<string | null>(null);
  
  // Dragging state
  const [draggingElement, setDraggingElement] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  
  // History for undo/redo
  const [history, setHistory] = useState<TextElement[][]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';
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
        
        // Extract text elements from PDF
        await extractTextFromPDF(data.data.downloadUrl);
        
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

  const extractTextFromPDF = async (pdfUrl: string) => {
    try {
      // Ensure pdfjs is loaded
      if (!pdfjs) {
        const module = await import('react-pdf');
        pdfjs = module.pdfjs;
        pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
      }

      // Load PDF document
      const loadingTask = pdfjs.getDocument(`${pdfProxyUrl}/${templateId}`);
      const pdf = await loadingTask.promise;
      
      const allTextElements: TextElement[] = [];
      
      // Extract text 
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const textContent = await page.getTextContent();
        const viewport = page.getViewport({ scale: 2 }); 
        
        textContent.items.forEach((item: any, index: number) => {
          // Keep ALL text including spaces for proper layout
          if (item.str) {
            const transform = item.transform;
            const x = transform[4] * 2; // Scale to match canvas
            const y = transform[5] * 2; // Scale to match canvas
            const fontSize = Math.sqrt(transform[0] * transform[0] + transform[1] * transform[1]) * 2;
            
            allTextElements.push({
              id: `text-${pageNum}-${index}`,
              text: item.str,
              x,
              y: viewport.height - y - fontSize, // Flip Y and adjust baseline
              width: item.width * 2,
              height: fontSize,
              fontSize,
              fontFamily: item.fontName || 'Arial',
              color: '#000000',
              page: pageNum,
              originalText: item.str,
            });
          }
        });
      }
      
      setTextElements(allTextElements);
      setHistory([allTextElements]);
      setHistoryIndex(0);
      
      console.log(`✅ Extracted ${allTextElements.length} text elements`);
      
      // Convert PDF pages to images (true Sejda-style)
      await convertPagesToImages(pdf);
    } catch (err) {
      console.error('❌ Error extracting text:', err);
    }
  };

  const convertPagesToImages = async (pdf: any) => {
    try {
      console.log('🖼️ Converting PDF pages to images...');
      const images: PageImage[] = [];
      
      for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
        const page = await pdf.getPage(pageNum);
        const viewport = page.getViewport({ scale: 2 }); // Higher quality
        
        // Create canvas
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        
        if (!context) continue;
        
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        
        // Render PDF page to canvas
        await page.render({
          canvasContext: context,
          viewport: viewport,
        }).promise;
        
        // Convert canvas to image data URL
        const imageDataUrl = canvas.toDataURL('image/png');
        images.push({
          pageNumber: pageNum,
          imageUrl: imageDataUrl,
          width: viewport.width,
          height: viewport.height,
        });
      }
      
      setPageImages(images);
      setNumPages(images.length);
      console.log(`✅ Converted ${images.length} pages to images`);
    } catch (err) {
      console.error('❌ Error converting pages to images:', err);
    }
  };

  const addToHistory = (newElements: TextElement[]) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newElements);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  const undo = () => {
    if (historyIndex > 0) {
      const previousState = history[historyIndex - 1];
      if (previousState) {
        setHistoryIndex(historyIndex - 1);
        setTextElements(previousState);
      }
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      const nextState = history[historyIndex + 1];
      if (nextState) {
        setHistoryIndex(historyIndex + 1);
        setTextElements(nextState);
      }
    }
  };

  const handleElementClick = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (currentTool === 'select') {
      setSelectedElement(elementId);
    } else if (currentTool === 'delete') {
      deleteElement(elementId);
    } else if (currentTool === 'text') {
      setEditingElement(elementId);
    }
  };

  const handleElementDoubleClick = (elementId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingElement(elementId);
    setCurrentTool('text');
  };

  const handleElementDragStart = (elementId: string, e: React.MouseEvent) => {
    if (currentTool !== 'move' && currentTool !== 'select') return;
    
    const element = textElements.find(el => el.id === elementId);
    if (!element) return;
    
    e.preventDefault();
    setDraggingElement(elementId);
    setDragOffset({
      x: e.clientX - element.x * scale,
      y: e.clientY - element.y * scale,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!draggingElement) return;
    
    e.preventDefault();
    const element = textElements.find(el => el.id === draggingElement);
    if (!element) return;
    
    const newX = (e.clientX - dragOffset.x) / scale;
    const newY = (e.clientY - dragOffset.y) / scale;
    
    const newElements = textElements.map(el =>
      el.id === draggingElement
        ? { ...el, x: newX, y: newY }
        : el
    );
    
    setTextElements(newElements);
  };

  const handleMouseUp = () => {
    if (draggingElement) {
      addToHistory(textElements);
      setDraggingElement(null);
    }
  };

  const updateElementText = (elementId: string, newText: string) => {
    const newElements = textElements.map(el =>
      el.id === elementId ? { ...el, text: newText } : el
    );
    setTextElements(newElements);
    addToHistory(newElements);
  };

  const deleteElement = (elementId: string) => {
    const element = textElements.find(el => el.id === elementId);
    if (!element) return;
    
    setDeletedElements([...deletedElements, { id: elementId, page: element.page }]);
    const newElements = textElements.filter(el => el.id !== elementId);
    setTextElements(newElements);
    addToHistory(newElements);
    setSelectedElement(null);
  };

  const addNewTextElement = (pageNumber: number, x: number, y: number) => {
    const newElement: TextElement = {
      id: `new-text-${Date.now()}`,
      text: 'New Text',
      x,
      y,
      width: 100,
      height: 20,
      fontSize: 16,
      fontFamily: 'Arial',
      color: '#000000',
      page: pageNumber,
    };
    
    const newElements = [...textElements, newElement];
    setTextElements(newElements);
    addToHistory(newElements);
    setEditingElement(newElement.id);
  };

  const handlePageClick = (e: React.MouseEvent<HTMLDivElement>, pageNumber: number) => {
    if (currentTool === 'text') {
      const rect = e.currentTarget.getBoundingClientRect();
      const x = (e.clientX - rect.left) / scale;
      const y = (e.clientY - rect.top) / scale;
      addNewTextElement(pageNumber, x, y);
    } else {
      setSelectedElement(null);
      setEditingElement(null);
    }
  };

  /**
   * Save edited PDF - Creates COMPLETELY NEW PDF from extracted data
   * 
   * Process:
   * 1. Frontend extracts ALL text from original PDF (positions, styles, content)
   * 2. User edits/moves/deletes text elements
   * 3. Send ALL extracted data to backend
   * 4. Backend creates NEW PDF:
   *    - Renders original pages as background images
   *    - Redraws all active text elements at their positions
   *    - Skips deleted elements
   * 
   * This is NOT modifying the original PDF - it's creating a new one from scratch!
   */
  const savePDF = async () => {
    setSaving(true);
    setError(null);

    try {
      console.log('💾 Creating new PDF from extracted data...');
      console.log(`📝 Sending ${textElements.length} text elements`);
      console.log(`🗑️ Sending ${deletedElements.length} deleted elements`);

      const response = await fetch(`${backendUrl}/api/pdf-editor/save-editable`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session?.user?.token}`,
        },
        body: JSON.stringify({
          templateId,
          textElements, // ALL extracted text data (original + new)
          deletedElements, // Elements user deleted
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save PDF');
      }

      const result = await response.json();

      if (result.success) {
        const expiryDate = new Date(result.data.expiresAt);
        console.log('✅ NEW PDF created successfully!');
        alert(
          `✅ New PDF created successfully from your edits!\n\nFile will expire at: ${expiryDate.toLocaleString()}\n\nRedirecting to templates...`
        );
        
        setTimeout(() => {
          router.push('/dashboard/templates');
        }, 2000);
      } else {
        throw new Error(result.message || 'Failed to save PDF');
      }
    } catch (err) {
      console.error('❌ Error creating new PDF:', err);
      setError(err instanceof Error ? err.message : 'Failed to create new PDF');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <Loader2 className="h-12 w-12 animate-spin text-[rgb(132,42,59)] mx-auto mb-4" />
          <p className="text-gray-600">Loading PDF editor...</p>
          <p className="text-sm text-gray-500 mt-2">Extracting editable text...</p>
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
            <h1 className="text-lg font-semibold">PDF Editor (Sejda-style)</h1>
            <span className="px-2 py-1 bg-blue-600 text-xs rounded-lg">
              {textElements.length} elements
            </span>
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
              onClick={undo}
              disabled={historyIndex <= 0}
              className="p-2 hover:bg-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo className="h-5 w-5" />
            </button>
            <button
              onClick={redo}
              disabled={historyIndex >= history.length - 1}
              className="p-2 hover:bg-gray-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo className="h-5 w-5" />
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
            title="Select and edit text"
          >
            <MousePointer className="h-4 w-4" />
            Select
          </button>

          <button
            onClick={() => setCurrentTool('move')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm ${
              currentTool === 'move' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
            title="Move text elements"
          >
            <Move className="h-4 w-4" />
            Move
          </button>

          <button
            onClick={() => setCurrentTool('text')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm ${
              currentTool === 'text' ? 'bg-blue-600' : 'hover:bg-gray-700'
            }`}
            title="Add new text"
          >
            <Type className="h-4 w-4" />
            Add Text
          </button>

          <button
            onClick={() => setCurrentTool('delete')}
            className={`px-3 py-2 rounded-lg transition flex items-center gap-2 text-sm ${
              currentTool === 'delete' ? 'bg-red-600' : 'hover:bg-gray-700'
            }`}
            title="Delete text"
          >
            <Trash2 className="h-4 w-4" />
            Delete
          </button>

          <div className="ml-auto text-sm text-gray-400">
            Double-click text to edit | Drag to move | Click to select
          </div>
        </div>
      </div>

      {/* Canvas-based PDF Viewer with Full Text Control */}
      <div 
        className="flex-1 overflow-auto bg-gray-900 p-8"
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        {pageImages.length > 0 ? (
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col items-center gap-6">
              {pageImages.map((pageImage) => (
                <div
                  key={`page_${pageImage.pageNumber}`}
                  className="relative shadow-2xl bg-white"
                  onClick={(e) => handlePageClick(e, pageImage.pageNumber)}
                  style={{
                    width: pageImage.width * scale,
                    height: pageImage.height * scale,
                  }}
                >
                  {/* Background image (PDF page without text layer) */}
                  <img
                    src={pageImage.imageUrl}
                    alt={`Page ${pageImage.pageNumber}`}
                    className="w-full h-full object-contain"
                    style={{
                      width: pageImage.width * scale,
                      height: pageImage.height * scale,
                    }}
                  />
                  
                  {/* Editable text overlay - Invisible by default, shown on hover/select */}
                  <div className="absolute inset-0 pointer-events-none">
                    {textElements
                      .filter((element) => element.page === pageImage.pageNumber)
                      .filter((element) => {
                        // Filter out deleted elements
                        return !deletedElements.some(
                          del => del.id === element.id && del.page === pageImage.pageNumber
                        );
                      })
                      .map((element) => {
                        const isSelected = selectedElement === element.id;
                        const isEditing = editingElement === element.id;
                        const isDragging = draggingElement === element.id;
                        
                        return (
                          <div
                            key={element.id}
                            className={`absolute pointer-events-auto cursor-pointer transition-opacity ${
                              isSelected
                                ? 'ring-2 ring-blue-500 bg-blue-50 bg-opacity-30 opacity-100'
                                : isDragging
                                ? 'opacity-50'
                                : 'opacity-0 hover:opacity-100 hover:ring-2 hover:ring-blue-300 hover:bg-blue-50 hover:bg-opacity-20'
                            }`}
                            style={{
                              left: element.x * scale,
                              top: element.y * scale,
                              minWidth: '4px',
                              fontSize: element.fontSize * scale,
                              fontFamily: element.fontFamily,
                              color: element.color,
                              whiteSpace: 'pre',
                              lineHeight: '1',
                              userSelect: 'none',
                              padding: '2px 4px',
                            }}
                            onClick={(e) => handleElementClick(element.id, e)}
                            onDoubleClick={(e) => handleElementDoubleClick(element.id, e)}
                            onMouseDown={(e) => handleElementDragStart(element.id, e)}
                          >
                            {isEditing ? (
                              <input
                                type="text"
                                value={element.text}
                                onChange={(e) => updateElementText(element.id, e.target.value)}
                                onBlur={() => setEditingElement(null)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') setEditingElement(null);
                                  if (e.key === 'Escape') setEditingElement(null);
                                }}
                                autoFocus
                                className="w-full h-full bg-yellow-100 border-2 border-blue-500 outline-none px-1 opacity-100"
                                style={{
                                  fontSize: element.fontSize * scale,
                                  fontFamily: element.fontFamily,
                                  color: element.color,
                                }}
                              />
                            ) : (
                              <span className="select-none">{element.text}</span>
                            )}
                          </div>
                        );
                      })}
                  </div>

                  {/* Page number indicator */}
                  <div className="absolute top-2 right-2 bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                    Page {pageImage.pageNumber} / {pageImages.length}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : pdfData?.downloadUrl ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center text-white">
              <Loader2 className="h-12 w-12 animate-spin mx-auto mb-4" />
              <p>Converting PDF pages to editable format...</p>
              <p className="text-sm text-gray-400 mt-2">Extracting all text elements</p>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
