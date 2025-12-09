'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import * as fabric from 'fabric';
import {
    Type,
    Save,
    Loader2,
    ZoomIn,
    ZoomOut,
    Undo,
    Redo,
    Bold,
    Italic,
    Underline,
    ChevronDown,
    Trash2,
    AlignLeft,
    AlignCenter,
    AlignRight,
    Copy,
    Image as ImageIcon,
    Square,
    Circle,
    Minus,
    List,
    ListOrdered,
    X,
    Tags,
    User,
    Building,
    Calendar,
    DollarSign,
    MapPin,
    UserCheck,
    Hash,
    Mail,
    Phone,
    ChevronRight
} from 'lucide-react';

// Dynamically import pdfjs
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
    isBold?: boolean;
    isItalic?: boolean;
    isUnderline?: boolean;
    textAlign?: string;
    angle?: number;
    isPlaceholder?: boolean; // Mark as dynamic placeholder
    variableName?: string; // Variable name like {{FIRST_NAME}}
}

interface PageCanvas {
    pageNumber: number;
    canvas: fabric.Canvas | null;
    imageUrl: string;
    width: number;
    height: number;
}

interface NlpEntity {
    type: string;
    text: string;
    start: number;
    end: number;
    confidence: number;
}

// Entity type colors for sidebar display
const ENTITY_TYPE_CONFIG: Record<string, { color: string; bgColor: string; icon: React.ComponentType<{ className?: string }> }> = {
    PERSON: { color: '#2563EB', bgColor: '#DBEAFE', icon: User },
    ORGANIZATION: { color: '#7C3AED', bgColor: '#EDE9FE', icon: Building },
    DATE: { color: '#059669', bgColor: '#D1FAE5', icon: Calendar },
    MONEY: { color: '#D97706', bgColor: '#FEF3C7', icon: DollarSign },
    LOCATION: { color: '#DC2626', bgColor: '#FEE2E2', icon: MapPin },
    ROLE: { color: '#0891B2', bgColor: '#CFFAFE', icon: UserCheck },
    GENDER_PRONOUN: { color: '#EC4899', bgColor: '#FCE7F3', icon: User },
    IDENTIFIER: { color: '#6366F1', bgColor: '#E0E7FF', icon: Hash },
    EMAIL: { color: '#0D9488', bgColor: '#CCFBF1', icon: Mail },
    PHONE: { color: '#8B5CF6', bgColor: '#F3E8FF', icon: Phone },
};

const FONT_FAMILIES = [
    'Arial',
    'Times New Roman',
    'Courier New',
    'Georgia',
    'Verdana',
    'Helvetica',
    'Trebuchet MS',
    'Comic Sans MS'
];

const FONT_SIZES = [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 28, 32, 36, 48, 60, 72, 96];
const COLORS = ['#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF', '#808080', '#FFA500', '#800080', '#008080'];

// Map PDF fonts to web fonts
const PDF_FONT_MAP: Record<string, string> = {
    'Times-Roman': 'Times New Roman',
    'Times-Bold': 'Times New Roman',
    'Times-Italic': 'Times New Roman',
    'Times-BoldItalic': 'Times New Roman',
    'Helvetica': 'Arial',
    'Helvetica-Bold': 'Arial',
    'Helvetica-Oblique': 'Arial',
    'Courier': 'Courier New',
    'Courier-Bold': 'Courier New',
    'Symbol': 'Symbol',
    'ZapfDingbats': 'Arial',
};

export default function FabricPDFEditor({ templateId: initialTemplateId }: PDFEditorProps) {
    const { data: session } = useSession();
    const router = useRouter();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [currentTool, setCurrentTool] = useState<string>('select');
    const [scale, setScale] = useState(1.0);
    const [showTextLayer, setShowTextLayer] = useState(true); // Toggle text visibility
    const [templateId, setTemplateId] = useState(initialTemplateId); // Track current template ID
    const [showNlpSidebar, setShowNlpSidebar] = useState(false); // Toggle NLP sidebar
    const [nlpEntities, setNlpEntities] = useState<NlpEntity[]>([]); // NLP extracted entities
    const [expandedEntityTypes, setExpandedEntityTypes] = useState<Set<string>>(new Set()); // Expanded entity type groups

    // Canvas refs
    const canvasRefs = useRef<{ [key: number]: HTMLCanvasElement | null }>({});
    const fabricCanvases = useRef<{ [key: number]: fabric.Canvas }>({});

    // Page data
    const [pageCanvases, setPageCanvases] = useState<PageCanvas[]>([]);
    const [textElements, setTextElements] = useState<TextElement[]>([]);

    // Selected object state
    const [selectedObject, setSelectedObject] = useState<fabric.Object | null>(null);
    const [selectedPage, setSelectedPage] = useState<number | null>(null);

    // UI state
    const [showFontSizeMenu, setShowFontSizeMenu] = useState(false);
    const [showFontFamilyMenu, setShowFontFamilyMenu] = useState(false);
    const [showColorPicker, setShowColorPicker] = useState(false);

    // History
    const [history, setHistory] = useState<any[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);

    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:4000';

    useEffect(() => {
        if (session?.user?.token && templateId) {
            loadPDF();
        }
    }, [templateId, session?.user?.token]);

    // Cleanup canvases on unmount
    useEffect(() => {
        return () => {
            Object.values(fabricCanvases.current).forEach(canvas => {
                canvas.dispose();
            });
        };
    }, []);

    const loadPDF = async () => {
        setLoading(true);
        setError(null);

        try {
            console.log('📥 Step 1: Loading original PDF...');

            const pdfUrl = `/api/proxy/pdf/${templateId}`;

            if (!pdfjs) {
                const module = await import('react-pdf');
                pdfjs = module.pdfjs;
                pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
            }

            const loadingTask = pdfjs.getDocument(pdfUrl);
            const pdf = await loadingTask.promise;

            console.log(`✅ PDF loaded: ${pdf.numPages} pages`);

            console.log('📝 Step 2: Getting PDF data...');
            // Get PDF data from backend (includes saved text elements)
            const pdfDataResponse = await fetch(`${backendUrl}/api/pdf-editor/${templateId}/open`, {
                headers: {
                    Authorization: `Bearer ${session?.user?.token}`,
                },
            });

            if (!pdfDataResponse.ok) {
                throw new Error('Failed to get PDF data');
            }

            const pdfDataResult = await pdfDataResponse.json();
            const pdfData = pdfDataResult.data.pdfData;
            const savedTextElements = pdfDataResult.data.savedTextElements;

            let extractedText: TextElement[];

            // Check if we have saved text elements from a previous edit session
            if (savedTextElements && savedTextElements.textElements && savedTextElements.textElements.length > 0) {
                console.log('✅ Using saved text elements from previous session:', savedTextElements.textElements.length, 'elements');
                extractedText = savedTextElements.textElements;
            } else {
                console.log('📝 Step 3: Extracting text from original PDF...');
                // Extract text with better font detection (only for new PDFs)
                extractedText = await extractTextFromPDF(pdf);
                console.log(`✅ Extracted ${extractedText.length} text blocks`);
            }

            console.log('🔨 Step 4: Getting editable PDF...');
            // Send to backend to get editable PDF URL
            const response = await fetch(`${backendUrl}/api/pdf-editor/prepare-editable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.user?.token}`,
                },
                body: JSON.stringify({
                    templateId,
                }),
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Backend error:', errorText);
                throw new Error(`Failed to prepare editable PDF: ${response.status}`);
            }

            const editableResult = await response.json();
            const { editablePdfUrl, extractedText: backendExtractedText, pages: backendPages, nlpEntities: backendNlpEntities } = editableResult;
            console.log('✅ Editable PDF URL retrieved');

            // Store NLP entities from backend
            if (backendNlpEntities && backendNlpEntities.length > 0) {
                console.log(`📊 Loaded ${backendNlpEntities.length} NLP entities from backend`);
                setNlpEntities(backendNlpEntities);
                // Auto-expand all entity types initially
                const entityTypes = new Set<string>(backendNlpEntities.map((e: NlpEntity) => e.type));
                setExpandedEntityTypes(entityTypes);
            } else {
                console.log('📊 No NLP entities received from backend');
                setNlpEntities([]);
            }

            // If frontend extraction failed or returned minimal results, use backend OCR text
            if (extractedText.length < 3 && backendExtractedText && backendExtractedText.trim().length > 50) {
                console.log('📝 Frontend extraction minimal, using backend OCR text...');
                // Parse backend OCR text into text elements with proper formatting
                const rawText = backendExtractedText;
                const ocrTextElements: TextElement[] = [];
                const pageHeight = (backendPages?.[0]?.height || 800) * 2; // Scale for canvas
                const pageWidth = (backendPages?.[0]?.width || 600) * 2;  // Scale for canvas
                
                const LEFT_MARGIN = 60;
                const RIGHT_MARGIN = 60;
                const TOP_MARGIN = 60;
                const LINE_HEIGHT = 26;
                const FONT_SIZE = 18;
                const MAX_TEXT_WIDTH = pageWidth - LEFT_MARGIN - RIGHT_MARGIN;
                const CHARS_PER_LINE = Math.floor(MAX_TEXT_WIDTH / (FONT_SIZE * 0.55)); // Approximate chars per line
                
                let currentY = TOP_MARGIN;
                let currentPage = 1;
                let elementIndex = 0;

                const wrapTextToLines = (text: string, maxChars: number): string[] => {
                    const words = text.split(' ');
                    const lines: string[] = [];
                    let currentLine = '';
                    
                    for (const word of words) {
                        if (word.length > maxChars) {
                            if (currentLine) {
                                lines.push(currentLine);
                                currentLine = '';
                            }
                            // Split long word into chunks
                            for (let i = 0; i < word.length; i += maxChars) {
                                lines.push(word.substring(i, i + maxChars));
                            }
                            continue;
                        }
                        
                        const testLine = currentLine ? `${currentLine} ${word}` : word;
                        if (testLine.length <= maxChars) {
                            currentLine = testLine;
                        } else {
                            if (currentLine) lines.push(currentLine);
                            currentLine = word;
                        }
                    }
                    if (currentLine) lines.push(currentLine);
                    return lines;
                };
                
                // Split text into paragraphs
                const paragraphs = rawText.split(/\n\n+/).filter((p: string) => p.trim());
                
                for (const paragraph of paragraphs) {
                    // Skip page break markers
                    if (paragraph.includes('--- Page Break ---')) {
                        currentPage++;
                        currentY = TOP_MARGIN;
                        continue;
                    }
                    
                    // Split paragraph into lines (preserve single newlines)
                    const rawLines = paragraph.split('\n').filter((l: string) => l.trim());
                    
                    for (const rawLine of rawLines) {
                        const trimmedLine = rawLine.trim();
                        if (!trimmedLine) continue;
                        
                        // Wrap long lines to fit within page width
                        const wrappedLines = wrapTextToLines(trimmedLine, CHARS_PER_LINE);
                        
                        for (const line of wrappedLines) {
                            // Check if we need to wrap to next page
                            if (currentY + LINE_HEIGHT > pageHeight - TOP_MARGIN) {
                                currentPage++;
                                currentY = TOP_MARGIN;
                            }
                            
                            // Create text element for each wrapped line
                            ocrTextElements.push({
                                id: `ocr-text-${elementIndex}-${Date.now()}`,
                                text: line,
                                x: LEFT_MARGIN,
                                y: currentY,
                                width: MAX_TEXT_WIDTH,
                                height: LINE_HEIGHT,
                                fontSize: FONT_SIZE,
                                fontFamily: 'Arial',
                                color: '#000000',
                                page: currentPage,
                                isBold: false,
                                isItalic: false,
                                isUnderline: false,
                                textAlign: 'left',
                                angle: 0,
                            });
                            
                            currentY += LINE_HEIGHT;
                            elementIndex++;
                        }
                    }
                    
                    // Add spacing between paragraphs
                    currentY += LINE_HEIGHT * 0.5;
                }
                
                if (ocrTextElements.length > 0) {
                    extractedText = ocrTextElements;
                    console.log(`✅ Created ${ocrTextElements.length} text elements from backend OCR across ${currentPage} page(s)`);
                }
            }

            console.log('🖼️ Step 5: Loading editable PDF for canvas rendering...');
            // Load the new PDF without text
            const editableLoadingTask = pdfjs.getDocument(editablePdfUrl);
            const editablePdf = await editableLoadingTask.promise;

            // Convert pages to images (now without text)
            const pageImages = await convertPagesToImages(editablePdf);
            setPageCanvases(pageImages);

            // Use the extracted/saved text for editing
            setTextElements(extractedText);

            // Initialize history
            setHistory([extractedText]);
            setHistoryIndex(0);

            setLoading(false);

            // Initialize Fabric canvases after render
            setTimeout(() => initializeFabricCanvases(pageImages, extractedText), 100);

        } catch (err) {
            console.error('❌ Error loading PDF:', err);
            setError(err instanceof Error ? err.message : 'Failed to load PDF');
            setLoading(false);
        }
    };

    const convertPagesToImages = async (pdf: any): Promise<PageCanvas[]> => {
        const images: PageCanvas[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 2 });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');

            if (!context) continue;

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            // Fill with white background first
            context.fillStyle = 'white';
            context.fillRect(0, 0, canvas.width, canvas.height);

            // Render page (backend already removed text, so this is clean)
            await page.render({
                canvasContext: context,
                viewport: viewport,
            }).promise;

            const imageDataUrl = canvas.toDataURL('image/png');
            images.push({
                pageNumber: pageNum,
                canvas: null,
                imageUrl: imageDataUrl,
                width: viewport.width,
                height: viewport.height,
            });

            console.log(`✅ Page ${pageNum} converted to image`);
        }

        console.log(`✅ Converted ${images.length} pages`);
        return images;
    };

    const extractTextFromPDF = async (pdf: any): Promise<TextElement[]> => {
        console.log('🔍 Extracting text with Sejda-style grouping algorithm...');
        const allTextElements: TextElement[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 2 });

            // Group text items into logical text blocks (like Sejda does)
            const textBlocks = groupTextItems(textContent.items, viewport);

            textBlocks.forEach((block, index) => {
                allTextElements.push({
                    id: `text-${pageNum}-${index}-${Date.now()}`,
                    text: block.text,
                    x: block.x,
                    y: block.y,
                    width: block.width,
                    height: block.height,
                    fontSize: block.fontSize,
                    fontFamily: block.fontFamily,
                    color: '#000000',
                    page: pageNum,
                    isBold: block.isBold,
                    isItalic: block.isItalic,
                    isUnderline: false,
                    textAlign: 'left',
                    angle: 0,
                });
            });
        }

        console.log(`✅ Extracted ${allTextElements.length} text blocks with Sejda-style grouping`);
        return allTextElements;
    };

    // Sejda-style text grouping: Merge nearby text items into coherent blocks
    const groupTextItems = (items: any[], viewport: any) => {
        const textBlocks: any[] = [];
        let currentBlock: any = null;

        items.forEach((item: any, idx: number) => {
            if (!item.str || !item.str.trim()) return;

            const transform = item.transform;
            const [scaleX, skewY, skewX, scaleY, x, y] = transform;

            // Font detection
            const pdfFontName = item.fontName || '';
            const fontFamily = PDF_FONT_MAP[pdfFontName] || 'Arial';
            const isBold = pdfFontName.includes('Bold');
            const isItalic = pdfFontName.includes('Italic') || pdfFontName.includes('Oblique');

            // Calculate font size
            const fontSize = Math.sqrt(scaleX * scaleX + skewY * skewY);
            const scaledFontSize = fontSize * 2;

            // Calculate position
            const posX = x * 2;
            const posY = viewport.height - (y * 2) - scaledFontSize;
            const width = item.width * 2;

            // Check if this item should be merged with current block
            // More strict conditions to preserve layout
            if (currentBlock &&
                Math.abs(currentBlock.y - posY) < scaledFontSize * 0.15 && // STRICTER: Same line (within 15% of font size)
                posX >= (currentBlock.x + currentBlock.width - 5) && // Text comes after previous
                posX <= (currentBlock.x + currentBlock.width + scaledFontSize * 0.8) && // STRICTER: Not too far horizontally
                currentBlock.fontFamily === fontFamily &&
                Math.abs(currentBlock.fontSize - scaledFontSize) < 2 && // Similar font size
                currentBlock.isBold === isBold &&
                currentBlock.isItalic === isItalic) {

                // Merge with current block
                const space = posX - (currentBlock.x + currentBlock.width);
                // Add space only if there's a noticeable gap
                currentBlock.text += (space > scaledFontSize * 0.2 ? ' ' : '') + item.str;
                currentBlock.width = (posX + width) - currentBlock.x;

            } else {
                // Start new block (preserve more individual text elements)
                if (currentBlock) {
                    textBlocks.push(currentBlock);
                }

                currentBlock = {
                    text: item.str,
                    x: posX,
                    y: posY,
                    width: width,
                    height: scaledFontSize * 1.2,
                    fontSize: scaledFontSize,
                    fontFamily: fontFamily,
                    isBold: isBold,
                    isItalic: isItalic,
                };
            }
        });

        // Push last block
        if (currentBlock) {
            textBlocks.push(currentBlock);
        }

        console.log(`📦 Grouped ${items.length} items into ${textBlocks.length} text blocks`);
        return textBlocks;
    };

    const initializeFabricCanvases = (pages: PageCanvas[], texts: TextElement[]) => {
        console.log('🎨 Initializing Fabric.js canvases...');

        // Dispose existing canvases first to prevent "already initialized" error
        Object.values(fabricCanvases.current).forEach(canvas => {
            try {
                canvas.dispose();
            } catch (e) {
                console.warn('⚠️ Error disposing canvas:', e);
            }
        });
        fabricCanvases.current = {};

        pages.forEach(page => {
            const canvasEl = canvasRefs.current[page.pageNumber];
            if (!canvasEl) return;

            // Create Fabric canvas
            const fabricCanvas = new fabric.Canvas(canvasEl, {
                width: page.width * scale,
                height: page.height * scale,
                backgroundColor: '#ffffff',
                selection: currentTool === 'select',
            });

            // Load background image
            fabric.FabricImage.fromURL(page.imageUrl).then((img: any) => {
                img.set({
                    left: 0,
                    top: 0,
                    scaleX: scale,
                    scaleY: scale,
                    selectable: false,
                    evented: false,
                });
                fabricCanvas.backgroundImage = img;
                fabricCanvas.renderAll();
            });

            // Add text objects
            texts
                .filter(t => t.page === page.pageNumber)
                .forEach(textEl => {
                    addTextToCanvas(fabricCanvas, textEl);
                });

            // Event listeners
            fabricCanvas.on('selection:created', (e: any) => handleObjectSelected(e, page.pageNumber));
            fabricCanvas.on('selection:updated', (e: any) => handleObjectSelected(e, page.pageNumber));
            fabricCanvas.on('selection:cleared', () => handleObjectDeselected());
            fabricCanvas.on('object:modified', (e: any) => handleObjectModified(e, page.pageNumber));

            // Double-click to add new text at click position
            fabricCanvas.on('mouse:dblclick', (e: any) => handleDoubleClick(e, page.pageNumber));

            fabricCanvases.current[page.pageNumber] = fabricCanvas;
        });

        console.log('✅ Fabric.js canvases initialized');
    };

    const addTextToCanvas = (canvas: fabric.Canvas, textEl: TextElement) => {
        // Calculate the actual text width to prevent unwanted line breaks
        // Create a temporary canvas context to measure text
        const ctx = document.createElement('canvas').getContext('2d');
        if (ctx) {
            const fontStyle = `${textEl.isBold ? 'bold' : 'normal'} ${textEl.isItalic ? 'italic' : 'normal'} ${textEl.fontSize * scale}px ${textEl.fontFamily}`;
            ctx.font = fontStyle;
            const metrics = ctx.measureText(textEl.text);
            const measuredWidth = metrics.width;

            // Calculate max width to keep text within page bounds
            const pageWidth = canvas.width || 800;
            const leftMargin = textEl.x * scale;
            const rightMargin = 40 * scale; // Right padding
            const maxAllowedWidth = pageWidth - leftMargin - rightMargin;

            // Use measured width but cap it to page bounds
            const calculatedWidth = Math.min(measuredWidth * 1.1, maxAllowedWidth);
            var estimatedWidth = Math.max(calculatedWidth, Math.min(textEl.width * scale, maxAllowedWidth), 100 * scale);
        } else {
            // Fallback if canvas context not available
            const pageWidth = canvas.width || 800;
            const leftMargin = textEl.x * scale;
            const maxAllowedWidth = pageWidth - leftMargin - 40 * scale;
            var estimatedWidth = Math.min(Math.max(textEl.width * scale * 1.2, 100 * scale), maxAllowedWidth);
        }

        const textbox = new fabric.Textbox(textEl.text, {
            left: textEl.x * scale,
            top: textEl.y * scale,
            width: estimatedWidth,
            fontSize: textEl.fontSize * scale,
            fontFamily: textEl.fontFamily,
            fill: textEl.color,
            fontWeight: textEl.isBold ? 'bold' : 'normal',
            fontStyle: textEl.isItalic ? 'italic' : 'normal',
            underline: textEl.isUnderline || false,
            textAlign: (textEl.textAlign as any) || 'left',
            angle: textEl.angle || 0,

            // Editing properties
            editable: true,
            selectable: true,

            // Visual controls
            hasControls: true,
            hasBorders: true,
            cornerStyle: 'circle',
            cornerColor: '#2563eb',
            borderColor: '#2563eb',
            cornerSize: 8,
            transparentCorners: false,

            // Text wrapping - enable word wrapping
            splitByGrapheme: false,
            lineHeight: 1.2,
            charSpacing: 0,

            // Prevent auto-sizing issues
            lockScalingFlip: true,
            noScaleCache: false,
        });

        // Store element ID in object
        (textbox as any).elementId = textEl.id;
        (textbox as any).pageNumber = textEl.page;

        canvas.add(textbox);
    };

    const handleObjectSelected = (e: any, pageNumber: number) => {
        const obj = e.selected?.[0] || e.target;
        setSelectedObject(obj);
        setSelectedPage(pageNumber);
        setShowFontSizeMenu(false);
        setShowFontFamilyMenu(false);
        setShowColorPicker(false);
    };

    const handleObjectDeselected = () => {
        setSelectedObject(null);
        setSelectedPage(null);
        setShowFontSizeMenu(false);
        setShowFontFamilyMenu(false);
        setShowColorPicker(false);
    };

    const handleObjectModified = (e: any, pageNumber: number) => {
        saveCurrentState();
    };

    const handleDoubleClick = (e: any, pageNumber: number) => {
        // Don't add text if clicking on an existing object
        if (e.target) return;

        const canvas = fabricCanvases.current[pageNumber];
        if (!canvas) return;

        // Get click position from the event
        const pointer = canvas.getPointer(e.e);
        
        addNewTextAtPosition(pageNumber, pointer.x, pointer.y);
    };

    const addNewTextAtPosition = (pageNumber: number, x: number, y: number) => {
        const canvas = fabricCanvases.current[pageNumber];
        if (!canvas) return;

        const newTextbox = new fabric.Textbox('Type here...', {
            left: x,
            top: y,
            width: 200 * scale,
            fontSize: 16 * scale,
            fontFamily: 'Arial',
            fill: '#000000',

            // Editing
            editable: true,
            selectable: true,

            // Visual
            hasControls: true,
            hasBorders: true,
            cornerStyle: 'circle',
            cornerColor: '#2563eb',
            borderColor: '#2563eb',
            cornerSize: 8,
            transparentCorners: false,

            // Text properties
            splitByGrapheme: false,
            lineHeight: 1.16,
            charSpacing: 0,
            textAlign: 'left',
        });

        (newTextbox as any).elementId = `new-text-${Date.now()}`;
        (newTextbox as any).pageNumber = pageNumber;

        canvas.add(newTextbox);
        canvas.setActiveObject(newTextbox);

        // Auto-enter edit mode and select all text
        newTextbox.enterEditing();
        newTextbox.selectAll();

        canvas.renderAll();

        setSelectedObject(newTextbox);
        setSelectedPage(pageNumber);
        saveCurrentState();
    };

    const addNewText = (pageNumber: number) => {
        const canvas = fabricCanvases.current[pageNumber];
        if (!canvas) return;

        const centerX = (canvas.width / 2) - (100 * scale);
        const centerY = (canvas.height / 2) - (20 * scale);

        const newTextbox = new fabric.Textbox('Click to edit text', {
            left: centerX,
            top: centerY,
            width: 200 * scale,
            fontSize: 16 * scale,
            fontFamily: 'Arial',
            fill: '#000000',

            // Editing
            editable: true,
            selectable: true,

            // Visual
            hasControls: true,
            hasBorders: true,
            cornerStyle: 'circle',
            cornerColor: '#2563eb',
            borderColor: '#2563eb',
            cornerSize: 8,
            transparentCorners: false,

            // Text properties
            splitByGrapheme: false,
            lineHeight: 1.16,
            charSpacing: 0,
            textAlign: 'left',
        });

        (newTextbox as any).elementId = `new-text-${Date.now()}`;
        (newTextbox as any).pageNumber = pageNumber;

        canvas.add(newTextbox);
        canvas.setActiveObject(newTextbox);

        // Auto-enter edit mode
        newTextbox.enterEditing();
        newTextbox.selectAll();

        canvas.renderAll();

        setSelectedObject(newTextbox);
        setSelectedPage(pageNumber);
        saveCurrentState();
    };

    const updateSelectedObjectProperty = (property: string, value: any) => {
        if (!selectedObject || !selectedPage) return;

        const canvas = fabricCanvases.current[selectedPage];
        if (!canvas) return;

        (selectedObject as any).set(property, value);
        canvas.renderAll();
        saveCurrentState();
    };

    const deleteSelectedObject = () => {
        if (!selectedObject || !selectedPage) return;

        const canvas = fabricCanvases.current[selectedPage];
        if (!canvas) return;

        canvas.remove(selectedObject);
        canvas.renderAll();
        setSelectedObject(null);
        setSelectedPage(null);
        saveCurrentState();
    };

    const saveCurrentState = () => {
        const allTextElements = extractAllTextFromCanvases();
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(allTextElements);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
    };

    const extractAllTextFromCanvases = (): TextElement[] => {
        const elements: TextElement[] = [];

        Object.entries(fabricCanvases.current).forEach(([pageNum, canvas]) => {
            canvas.getObjects().forEach((obj: any) => {
                if (obj.type === 'textbox') {
                    elements.push({
                        id: obj.elementId || `text-${Date.now()}`,
                        text: obj.text || '',
                        x: obj.left / scale,
                        y: obj.top / scale,
                        width: obj.width / scale,
                        height: obj.height / scale,
                        fontSize: obj.fontSize / scale,
                        fontFamily: obj.fontFamily,
                        color: obj.fill,
                        page: parseInt(pageNum),
                        isBold: obj.fontWeight === 'bold',
                        isItalic: obj.fontStyle === 'italic',
                        isUnderline: obj.underline,
                        textAlign: obj.textAlign,
                        angle: obj.angle,
                    });
                }
            });
        });

        return elements;
    };

    const undo = () => {
        if (historyIndex > 0) {
            setHistoryIndex(historyIndex - 1);
            restoreState(history[historyIndex - 1]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            setHistoryIndex(historyIndex + 1);
            restoreState(history[historyIndex + 1]);
        }
    };

    const restoreState = (elements: TextElement[]) => {
        // Clear all canvases
        Object.values(fabricCanvases.current).forEach(canvas => {
            canvas.getObjects().forEach((obj: any) => {
                if (obj.type === 'textbox') {
                    canvas.remove(obj);
                }
            });
        });

        // Re-add elements
        elements.forEach(el => {
            const canvas = fabricCanvases.current[el.page];
            if (canvas) {
                addTextToCanvas(canvas, el);
                canvas.renderAll();
            }
        });
    };

    // Handle entity click - find and highlight the text in the canvas
    const handleEntityClick = (entity: NlpEntity) => {
        console.log('🔍 Searching for entity:', entity.text, 'type:', entity.type);
        
        // Search through all textboxes in all canvases to find the entity text
        let found = false;
        
        Object.entries(fabricCanvases.current).forEach(([pageNum, canvas]) => {
            if (found) return;
            
            canvas.getObjects().forEach((obj: any) => {
                if (found) return;
                if (obj.type === 'textbox') {
                    const textContent = obj.text?.toLowerCase() || '';
                    const searchText = entity.text.toLowerCase();
                    
                    // Check if this textbox contains the entity text
                    if (textContent.includes(searchText) || searchText.includes(textContent.trim())) {
                        found = true;
                        console.log(`✅ Found entity "${entity.text}" on page ${pageNum}`);
                        
                        // Scroll the canvas container to this page
                        const canvasElement = canvasRefs.current[parseInt(pageNum)];
                        if (canvasElement) {
                            canvasElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        
                        // Select and highlight the object
                        canvas.setActiveObject(obj);
                        setSelectedObject(obj);
                        setSelectedPage(parseInt(pageNum));
                        
                        // Flash highlight effect
                        const originalColor = obj.fill;
                        const config = ENTITY_TYPE_CONFIG[entity.type];
                        const highlightColor = config?.color || '#2563EB';
                        
                        obj.set('fill', highlightColor);
                        canvas.renderAll();
                        
                        // Reset after flash
                        setTimeout(() => {
                            obj.set('fill', originalColor);
                            canvas.renderAll();
                        }, 1000);
                        
                        return;
                    }
                }
            });
        });
        
        if (!found) {
            console.log('⚠️ Entity text not found in canvas textboxes:', entity.text);
            // Still try to scroll to the general area based on text position
            // The entity.start gives us the character offset in the raw text
        }
    };

    const savePDF = async () => {
        setSaving(true);
        setError(null);

        try {
            console.log('💾 Saving PDF edits (temporary)...');

            const allTextElements = extractAllTextFromCanvases();

            // Save edits - keeps as temporary
            const response = await fetch(`${backendUrl}/api/pdf-editor/save-editable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.user?.token}`,
                },
                body: JSON.stringify({
                    templateId,
                    textElements: allTextElements,
                    deletedElements: [],
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to save PDF');
            }

            const result = await response.json();

            if (result.success) {
                // Update current templateId if a new one was created
                if (result.data?.templateId && result.data.templateId !== templateId) {
                    setTemplateId(result.data.templateId);
                }
                alert('✅ Changes saved! Click "Save as Template" to save permanently.');
            }
        } catch (err) {
            console.error('❌ Error saving PDF:', err);
            setError(err instanceof Error ? err.message : 'Failed to save PDF');
        } finally {
            setSaving(false);
        }
    };

    const saveAsPermanentTemplate = async () => {
        setSaving(true);
        setError(null);

        try {
            console.log('💾 Saving as permanent template...');

            const allTextElements = extractAllTextFromCanvases();

            // First save current edits
            const saveResponse = await fetch(`${backendUrl}/api/pdf-editor/save-editable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.user?.token}`,
                },
                body: JSON.stringify({
                    templateId,
                    textElements: allTextElements,
                    deletedElements: [],
                }),
            });

            if (!saveResponse.ok) {
                throw new Error('Failed to save PDF');
            }

            const saveResult = await saveResponse.json();
            const savedTemplateId = saveResult.data?.templateId || templateId;

            // Now save as permanent template
            const permanentResponse = await fetch(`${backendUrl}/api/pdf-editor/save-permanent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.user?.token}`,
                },
                body: JSON.stringify({
                    templateId: savedTemplateId,
                }),
            });

            if (!permanentResponse.ok) {
                throw new Error('Failed to save template permanently');
            }

            const permanentResult = await permanentResponse.json();

            if (permanentResult.success) {
                alert('✅ Template saved permanently! It will appear in your templates list.');
                router.push('/dashboard/templates');
            }
        } catch (err) {
            console.error('❌ Error saving permanent template:', err);
            setError(err instanceof Error ? err.message : 'Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-[rgb(132,42,59)] mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading PDF Editor...</p>
                    <p className="text-sm text-gray-500 mt-2">Initializing Fabric.js canvas...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <div className="text-red-600 text-xl mb-4">❌ Error</div>
                    <p className="text-gray-700 mb-4">{error}</p>
                    <button
                        onClick={() => router.push('/dashboard/templates')}
                        className="px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded transition"
                    >
                        Back to Templates
                    </button>
                </div>
            </div>
        );
    }

    const selectedTextbox = selectedObject?.type === 'textbox' ? (selectedObject as fabric.Textbox) : null;

    const addImage = () => {
        if (!selectedPage) return;

        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = (event) => {
                const imgUrl = event.target?.result as string;
                const canvas = fabricCanvases.current[selectedPage];
                if (!canvas) return;

                fabric.Image.fromURL(imgUrl, {}).then((img: fabric.Image) => {
                    img.scale(0.5);
                    img.set({
                        left: 100,
                        top: 100,
                        selectable: true,
                    });
                    canvas.add(img);
                    canvas.setActiveObject(img);
                    canvas.renderAll();
                });
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const addShape = (shapeType: 'rectangle' | 'circle') => {
        if (!selectedPage) return;

        const canvas = fabricCanvases.current[selectedPage];
        if (!canvas) return;

        let shape: fabric.Object;

        if (shapeType === 'rectangle') {
            shape = new fabric.Rect({
                left: 100,
                top: 100,
                width: 150,
                height: 100,
                fill: 'transparent',
                stroke: '#000000',
                strokeWidth: 2,
                selectable: true,
            });
        } else {
            shape = new fabric.Circle({
                left: 100,
                top: 100,
                radius: 50,
                fill: 'transparent',
                stroke: '#000000',
                strokeWidth: 2,
                selectable: true,
            });
        }

        canvas.add(shape);
        canvas.setActiveObject(shape);
        canvas.renderAll();
    };

    const addHorizontalLine = () => {
        if (!selectedPage) return;

        const canvas = fabricCanvases.current[selectedPage];
        if (!canvas) return;

        const line = new fabric.Line([50, 100, 450, 100], {
            stroke: '#000000',
            strokeWidth: 2,
            selectable: true,
            hasControls: true,
            lockRotation: false,
        });

        canvas.add(line);
        canvas.setActiveObject(line);
        canvas.renderAll();
    };

    const addBulletList = () => {
        if (!selectedPage) return;

        const canvas = fabricCanvases.current[selectedPage];
        if (!canvas) return;

        const listText = new fabric.Textbox('• Item 1\n• Item 2\n• Item 3', {
            left: 100,
            top: 100,
            width: 300,
            fontSize: 16,
            fill: '#000000',
            fontFamily: 'Arial',
            selectable: true,
            editable: true,
        });

        canvas.add(listText);
        canvas.setActiveObject(listText);
        canvas.renderAll();

        // Add to textElements
        const newTextElement: TextElement = {
            id: `list-${Date.now()}`,
            text: listText.text || '',
            x: listText.left || 0,
            y: listText.top || 0,
            width: listText.width || 300,
            height: listText.height || 100,
            fontSize: 16,
            fontFamily: 'Arial',
            color: '#000000',
            page: selectedPage,
        };

        setTextElements([...textElements, newTextElement]);
    };

    const addNumberedList = () => {
        if (!selectedPage) return;

        const canvas = fabricCanvases.current[selectedPage];
        if (!canvas) return;

        const listText = new fabric.Textbox('1. Item 1\n2. Item 2\n3. Item 3', {
            left: 100,
            top: 100,
            width: 300,
            fontSize: 16,
            fill: '#000000',
            fontFamily: 'Arial',
            selectable: true,
            editable: true,
        });

        canvas.add(listText);
        canvas.setActiveObject(listText);
        canvas.renderAll();

        // Add to textElements
        const newTextElement: TextElement = {
            id: `list-${Date.now()}`,
            text: listText.text || '',
            x: listText.left || 0,
            y: listText.top || 0,
            width: listText.width || 300,
            height: listText.height || 100,
            fontSize: 16,
            fontFamily: 'Arial',
            color: '#000000',
            page: selectedPage,
        };

        setTextElements([...textElements, newTextElement]);
    };

    const deleteSelected = () => {
        if (!selectedObject || !selectedPage) return;

        const canvas = fabricCanvases.current[selectedPage];
        if (!canvas) return;

        canvas.remove(selectedObject);
        canvas.renderAll();
        setSelectedObject(null);

        // If it's text, also remove from textElements
        if (selectedObject.type === 'textbox') {
            const textId = (selectedObject as any).id;
            setTextElements(textElements.filter(el => el.id !== textId));
        }
    };

    return (
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Top Toolbar */}
            <div className="bg-white border-b border-gray-200 shadow-sm">
                <div className="flex items-center justify-between px-4 py-2">
                    <div className="flex items-center gap-1">
                        {/* Add Elements */}
                        <div className="flex gap-1 border-r border-gray-200 pr-2 mr-2">
                            <button
                                onClick={addImage}
                                disabled={!selectedPage}
                                className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-gray-100 rounded border border-gray-300 transition disabled:opacity-50 text-sm"
                                title="Add Image"
                            >
                                <ImageIcon className="h-4 w-4" />
                                <span>Image</span>
                            </button>
                            <button
                                onClick={addBulletList}
                                disabled={!selectedPage}
                                className="p-1.5 bg-white hover:bg-gray-100 rounded border border-gray-300 transition disabled:opacity-50"
                                title="Add Bullet List"
                            >
                                <List className="h-4 w-4" />
                            </button>
                            <button
                                onClick={addNumberedList}
                                disabled={!selectedPage}
                                className="p-1.5 bg-white hover:bg-gray-100 rounded border border-gray-300 transition disabled:opacity-50"
                                title="Add Numbered List"
                            >
                                <ListOrdered className="h-4 w-4" />
                            </button>
                            <button
                                onClick={addHorizontalLine}
                                disabled={!selectedPage}
                                className="p-1.5 bg-white hover:bg-gray-100 rounded border border-gray-300 transition disabled:opacity-50"
                                title="Add Horizontal Line"
                            >
                                <Minus className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => addShape('rectangle')}
                                disabled={!selectedPage}
                                className="p-1.5 bg-white hover:bg-gray-100 rounded border border-gray-300 transition disabled:opacity-50"
                                title="Add Rectangle"
                            >
                                <Square className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => addShape('circle')}
                                disabled={!selectedPage}
                                className="p-1.5 bg-white hover:bg-gray-100 rounded border border-gray-300 transition disabled:opacity-50"
                                title="Add Circle"
                            >
                                <Circle className="h-4 w-4" />
                            </button>
                        </div>

                        {/* Undo/Redo */}
                        <button
                            onClick={undo}
                            disabled={historyIndex <= 0}
                            className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 transition"
                            title="Undo"
                        >
                            <Undo className="h-4 w-4" />
                        </button>
                        <button
                            onClick={redo}
                            disabled={historyIndex >= history.length - 1}
                            className="p-2 hover:bg-gray-100 rounded disabled:opacity-30 transition"
                            title="Redo"
                        >
                            <Redo className="h-4 w-4" />
                        </button>

                        {/* Delete */}
                        {selectedObject && (
                            <button
                                onClick={deleteSelected}
                                className="p-2 hover:bg-red-100 text-red-600 rounded transition"
                                title="Delete Selected"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}

                        <div className="w-px h-6 bg-gray-300 mx-1" />

                        {/* Zoom */}
                        <button
                            onClick={() => setScale(Math.max(0.5, scale - 0.1))}
                            className="p-2 hover:bg-gray-100 rounded transition"
                        >
                            <ZoomOut className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-medium min-w-[50px] text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={() => setScale(Math.min(2, scale + 0.1))}
                            className="p-2 hover:bg-gray-100 rounded transition"
                        >
                            <ZoomIn className="h-4 w-4" />
                        </button>

                        <div className="w-px h-6 bg-gray-300 mx-1" />

                        {/* Toggle Text Layer */}
                        <button
                            onClick={() => {
                                setShowTextLayer(!showTextLayer);
                                // Toggle visibility of all text objects
                                Object.values(fabricCanvases.current).forEach(canvas => {
                                    canvas.getObjects().forEach((obj: any) => {
                                        if (obj.type === 'textbox') {
                                            obj.set('visible', !showTextLayer);
                                        }
                                    });
                                    canvas.renderAll();
                                });
                            }}
                            className={`px-3 py-2 text-sm rounded transition flex items-center gap-2 ${showTextLayer ? 'bg-[rgb(132,42,59)] text-white' : 'bg-gray-200 hover:bg-gray-300'
                                }`}
                            title={showTextLayer ? 'Hide Text Layer' : 'Show Text Layer'}
                        >
                            <Type className="h-4 w-4" />
                            {showTextLayer ? 'Text: ON' : 'Text: OFF'}
                        </button>

                        {/* Toggle NLP Entities Sidebar */}
                        <button
                            onClick={() => setShowNlpSidebar(!showNlpSidebar)}
                            className={`px-3 py-2 text-sm rounded transition flex items-center gap-2 ${showNlpSidebar ? 'bg-[rgb(132,42,59)] text-white' : 'bg-gray-200 hover:bg-gray-300'
                                }`}
                            title={showNlpSidebar ? 'Hide NLP Entities' : 'Show NLP Entities'}
                        >
                            <Tags className="h-4 w-4" />
                            Entities {nlpEntities.length > 0 && `(${nlpEntities.length})`}
                        </button>

                        <div className="w-px h-6 bg-gray-300 mx-1" />

                        {/* Save Draft */}
                        <button
                            onClick={savePDF}
                            disabled={saving}
                            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white text-sm rounded shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save Draft
                                </>
                            )}
                        </button>

                        {/* Save as Template (Permanent) */}
                        <button
                            onClick={saveAsPermanentTemplate}
                            disabled={saving}
                            className="px-4 py-2 bg-[rgb(132,42,59)] hover:bg-[rgb(112,32,49)] text-white text-sm rounded shadow-sm transition disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4" />
                                    Save as Template
                                </>
                            )}
                        </button>

                        <button
                            onClick={() => router.push('/dashboard/templates')}
                            className="px-4 py-2 text-sm hover:bg-gray-100 rounded transition"
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                {/* Formatting Toolbar (shows when text selected) */}
                {selectedTextbox && (
                    <div className="flex items-center gap-1 px-4 py-2 border-t border-gray-200 bg-rose-50">
                        {/* Bold */}
                        <button
                            onClick={() => updateSelectedObjectProperty('fontWeight', selectedTextbox.fontWeight === 'bold' ? 'normal' : 'bold')}
                            className={`p-2 rounded transition ${selectedTextbox.fontWeight === 'bold' ? 'bg-[rgb(132,42,59)] text-white' : 'bg-white hover:bg-gray-100'
                                }`}
                        >
                            <Bold className="h-4 w-4" />
                        </button>

                        {/* Italic */}
                        <button
                            onClick={() => updateSelectedObjectProperty('fontStyle', selectedTextbox.fontStyle === 'italic' ? 'normal' : 'italic')}
                            className={`p-2 rounded transition ${selectedTextbox.fontStyle === 'italic' ? 'bg-[rgb(132,42,59)] text-white' : 'bg-white hover:bg-gray-100'
                                }`}
                        >
                            <Italic className="h-4 w-4" />
                        </button>

                        {/* Underline */}
                        <button
                            onClick={() => updateSelectedObjectProperty('underline', !selectedTextbox.underline)}
                            className={`p-2 rounded transition ${selectedTextbox.underline ? 'bg-[rgb(132,42,59)] text-white' : 'bg-white hover:bg-gray-100'
                                }`}
                        >
                            <Underline className="h-4 w-4" />
                        </button>

                        <div className="w-px h-6 bg-gray-300 mx-1" />

                        {/* Font Size */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowFontSizeMenu(!showFontSizeMenu);
                                    setShowFontFamilyMenu(false);
                                    setShowColorPicker(false);
                                }}
                                className="px-3 py-1.5 bg-white hover:bg-gray-100 rounded border border-gray-300 transition flex items-center gap-2 text-sm"
                            >
                                {Math.round((selectedTextbox.fontSize || 16) / scale)}
                                <ChevronDown className="h-3 w-3" />
                            </button>
                            {showFontSizeMenu && (
                                <div className="absolute top-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 max-h-64 overflow-y-auto">
                                    {FONT_SIZES.map(size => (
                                        <button
                                            key={size}
                                            onClick={() => {
                                                updateSelectedObjectProperty('fontSize', size * scale);
                                                setShowFontSizeMenu(false);
                                            }}
                                            className="block w-full px-4 py-2 text-left hover:bg-blue-50 text-sm"
                                        >
                                            {size}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Font Family */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowFontFamilyMenu(!showFontFamilyMenu);
                                    setShowFontSizeMenu(false);
                                    setShowColorPicker(false);
                                }}
                                className="px-3 py-1.5 bg-white hover:bg-gray-100 rounded border border-gray-300 transition flex items-center gap-2 text-sm min-w-[140px]"
                            >
                                <span className="truncate">{selectedTextbox.fontFamily}</span>
                                <ChevronDown className="h-3 w-3" />
                            </button>
                            {showFontFamilyMenu && (
                                <div className="absolute top-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-50">
                                    {FONT_FAMILIES.map(font => (
                                        <button
                                            key={font}
                                            onClick={() => {
                                                updateSelectedObjectProperty('fontFamily', font);
                                                setShowFontFamilyMenu(false);
                                            }}
                                            className="block w-full px-4 py-2 text-left hover:bg-blue-50 text-sm"
                                            style={{ fontFamily: font }}
                                        >
                                            {font}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Color Picker */}
                        <div className="relative">
                            <button
                                onClick={() => {
                                    setShowColorPicker(!showColorPicker);
                                    setShowFontSizeMenu(false);
                                    setShowFontFamilyMenu(false);
                                }}
                                className="p-2 bg-white hover:bg-gray-100 rounded border border-gray-300"
                            >
                                <div
                                    className="w-5 h-5 rounded border"
                                    style={{ backgroundColor: selectedTextbox.fill as string }}
                                />
                            </button>
                            {showColorPicker && (
                                <div className="absolute top-full mt-1 bg-white border border-gray-300 rounded shadow-lg z-50 p-2">
                                    <div className="grid grid-cols-6 gap-2 mb-2">
                                        {COLORS.map(color => (
                                            <button
                                                key={color}
                                                onClick={() => {
                                                    updateSelectedObjectProperty('fill', color);
                                                    setShowColorPicker(false);
                                                }}
                                                className="w-8 h-8 rounded border-2 hover:border-blue-500"
                                                style={{ backgroundColor: color }}
                                            />
                                        ))}
                                    </div>
                                    <input
                                        type="color"
                                        value={selectedTextbox.fill as string}
                                        onChange={(e) => updateSelectedObjectProperty('fill', e.target.value)}
                                        className="w-full h-8 rounded"
                                    />
                                </div>
                            )}
                        </div>

                        <div className="w-px h-6 bg-gray-300 mx-1" />

                        {/* Text Align */}
                        <button
                            onClick={() => updateSelectedObjectProperty('textAlign', 'left')}
                            className={`p-2 rounded transition ${selectedTextbox.textAlign === 'left' ? 'bg-[rgb(132,42,59)] text-white' : 'bg-white hover:bg-gray-100'
                                }`}
                        >
                            <AlignLeft className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => updateSelectedObjectProperty('textAlign', 'center')}
                            className={`p-2 rounded transition ${selectedTextbox.textAlign === 'center' ? 'bg-[rgb(132,42,59)] text-white' : 'bg-white hover:bg-gray-100'
                                }`}
                        >
                            <AlignCenter className="h-4 w-4" />
                        </button>
                        <button
                            onClick={() => updateSelectedObjectProperty('textAlign', 'right')}
                            className={`p-2 rounded transition ${selectedTextbox.textAlign === 'right' ? 'bg-[rgb(132,42,59)] text-white' : 'bg-white hover:bg-gray-100'
                                }`}
                        >
                            <AlignRight className="h-4 w-4" />
                        </button>

                        <div className="w-px h-6 bg-gray-300 mx-1" />

                        {/* Delete */}
                        <button
                            onClick={deleteSelectedObject}
                            className="p-2 bg-white hover:bg-red-50 text-red-600 rounded border border-gray-300 transition"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Tools Bar */}
                <div className="flex items-center gap-2 px-4 py-2 border-t border-gray-200 bg-gray-50">
                    <button
                        onClick={() => setCurrentTool('select')}
                        className={`px-3 py-1.5 rounded transition text-sm flex items-center gap-2 ${currentTool === 'select' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100 border border-gray-300'
                            }`}
                    >
                        <Type className="h-4 w-4" />
                        Select
                    </button>

                    <button
                        onClick={() => setCurrentTool('text')}
                        className={`px-3 py-1.5 rounded transition text-sm flex items-center gap-2 ${currentTool === 'text' ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-100 border border-gray-300'
                            }`}
                    >
                        <Type className="h-4 w-4" />
                        Add Text
                    </button>

                    <span className="text-xs text-gray-500 ml-2">
                        {currentTool === 'text' ? 'Click "Add Text" on any page' : 'Double-click text to edit, drag to move'}
                    </span>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex flex-1 overflow-hidden">
                {/* Center - PDF Canvas */}
                <div className="flex-1 overflow-auto bg-gray-100 p-8 relative">
                    <div className="max-w-5xl mx-auto space-y-8">
                        {pageCanvases.map((page) => (
                            <div
                                key={`page-${page.pageNumber}`}
                                className="relative bg-white shadow-lg"
                            >
                                <canvas
                                    ref={(el) => {
                                        canvasRefs.current[page.pageNumber] = el;
                                    }}
                                    id={`canvas-page-${page.pageNumber}`}
                                    className="w-full h-full"
                                />

                            {/* Page controls */}
                            <div className="absolute bottom-4 right-4 flex items-center gap-2">
                                <span className="bg-gray-800 bg-opacity-75 text-white px-3 py-1 rounded text-sm">
                                    Page {page.pageNumber} / {pageCanvases.length}
                                </span>
                                {currentTool === 'text' && (
                                    <button
                                        onClick={() => addNewText(page.pageNumber)}
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1 shadow-lg transition"
                                    >
                                        <Type className="h-3 w-3" />
                                        Add Text
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
                </div>

                {/* NLP Entities Sidebar */}
                {showNlpSidebar && (
                    <div className="w-80 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
                        {/* Sidebar Header */}
                        <div className="p-4 border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between">
                                <h3 className="font-semibold text-gray-800 flex items-center gap-2">
                                    <Tags className="h-5 w-5 text-[rgb(132,42,59)]" />
                                    Extracted Entities
                                </h3>
                                <button
                                    onClick={() => setShowNlpSidebar(false)}
                                    className="p-1 hover:bg-gray-200 rounded transition"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                            <p className="text-xs text-gray-500 mt-1">
                                {nlpEntities.length} entities found (≥80% confidence)
                            </p>
                        </div>

                        {/* Entities List */}
                        <div className="flex-1 overflow-auto p-2">
                            {nlpEntities.length === 0 ? (
                                <div className="text-center py-8 text-gray-500">
                                    <Tags className="h-12 w-12 mx-auto mb-3 opacity-30" />
                                    <p className="text-sm">No entities extracted</p>
                                    <p className="text-xs mt-1">Entities will appear here after PDF processing</p>
                                </div>
                            ) : (
                                // Group entities by type
                                Object.entries(
                                    nlpEntities.reduce((acc, entity) => {
                                        if (!acc[entity.type]) acc[entity.type] = [];
                                        acc[entity.type]!.push(entity);
                                        return acc;
                                    }, {} as Record<string, NlpEntity[]>)
                                ).sort((a, b) => b[1].length - a[1].length).map(([type, entities]) => {
                                    const config = ENTITY_TYPE_CONFIG[type] || { color: '#6B7280', bgColor: '#F3F4F6', icon: Hash };
                                    const IconComponent = config.icon;
                                    const isExpanded = expandedEntityTypes.has(type);

                                    return (
                                        <div key={type} className="mb-2">
                                            {/* Entity Type Header */}
                                            <button
                                                onClick={() => {
                                                    setExpandedEntityTypes(prev => {
                                                        const newSet = new Set(prev);
                                                        if (newSet.has(type)) {
                                                            newSet.delete(type);
                                                        } else {
                                                            newSet.add(type);
                                                        }
                                                        return newSet;
                                                    });
                                                }}
                                                className="w-full flex items-center justify-between p-2 rounded-lg hover:bg-gray-100 transition"
                                                style={{ backgroundColor: isExpanded ? config.bgColor : 'transparent' }}
                                            >
                                                <div className="flex items-center gap-2">
                                                    <IconComponent className="h-4 w-4" style={{ color: config.color }} />
                                                    <span className="font-medium text-sm" style={{ color: config.color }}>
                                                        {type.replace(/_/g, ' ')}
                                                    </span>
                                                    <span className="text-xs bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded-full">
                                                        {entities.length}
                                                    </span>
                                                </div>
                                                <ChevronRight
                                                    className={`h-4 w-4 text-gray-400 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
                                                />
                                            </button>

                                            {/* Entity Items */}
                                            {isExpanded && (
                                                <div className="ml-2 mt-1 space-y-1">
                                                    {entities.map((entity, idx) => (
                                                        <button
                                                            key={`${type}-${idx}`}
                                                            onClick={() => handleEntityClick(entity)}
                                                            className="w-full text-left p-2 rounded-md hover:bg-gray-100 transition group"
                                                        >
                                                            <div className="flex items-center justify-between">
                                                                <span
                                                                    className="text-sm font-medium truncate max-w-[180px]"
                                                                    style={{ color: config.color }}
                                                                    title={entity.text}
                                                                >
                                                                    {entity.text}
                                                                </span>
                                                                <span className="text-xs text-gray-400 ml-2">
                                                                    {Math.round(entity.confidence * 100)}%
                                                                </span>
                                                            </div>
                                                        </button>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}
