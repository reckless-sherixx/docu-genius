'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useOrganizationId } from '@/hooks/use-organization-id';
import * as fabric from 'fabric';
import SignatureCanvas from 'react-signature-canvas';
import { toast } from 'sonner';
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
    ChevronRight,
    Clock,
    Gift,
    FileText,
    Pen
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

interface ImageElement {
    id: string;
    type: 'image' | 'signature';
    dataUrl: string;
    x: number;
    y: number;
    width: number;
    height: number;
    scaleX: number;
    scaleY: number;
    angle: number;
    page: number;
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
    DURATION: { color: '#F59E0B', bgColor: '#FEF3C7', icon: Clock },
    BENEFIT: { color: '#10B981', bgColor: '#D1FAE5', icon: Gift },
    LEGAL_TERM: { color: '#6B7280', bgColor: '#F3F4F6', icon: FileText },
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
    const organizationId = useOrganizationId();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [saving, setSaving] = useState(false);
    const [currentTool, setCurrentTool] = useState<string>('select');
    const [scale, setScale] = useState(1.0);
    const [showTextLayer, setShowTextLayer] = useState(true); 
    const [templateId, setTemplateId] = useState(initialTemplateId); 
    const [showNlpSidebar, setShowNlpSidebar] = useState(false); 
    const [nlpEntities, setNlpEntities] = useState<NlpEntity[]>([]); 
    const [expandedEntityTypes, setExpandedEntityTypes] = useState<Set<string>>(new Set());
    const [userRole, setUserRole] = useState<"ADMIN" | "CREATOR" | null>(null); 

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

    // Signature modal state
    const [showSignatureModal, setShowSignatureModal] = useState(false);
    const signatureCanvasRef = useRef<SignatureCanvas>(null);

    const [showPinModal, setShowPinModal] = useState(false);
    const [pin, setPin] = useState('');
    const [pinError, setPinError] = useState<string | null>(null);

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

    // Fetch user's role in the organization
    useEffect(() => {
        const fetchUserRole = async () => {
            if (!session?.user?.token || !organizationId) return;

            try {
                const response = await fetch(
                    `${backendUrl}/api/v1/organization/${organizationId}/members`,
                    {
                        headers: {
                            Authorization: `Bearer ${session.user.token}`,
                        },
                        cache: 'no-store',
                    }
                );

                if (response.ok) {
                    const data = await response.json();
                    if (data.success && data.data) {
                        const currentMember = data.data.find(
                            (m: any) => m.email === session.user?.email
                        );
                        if (currentMember) {
                            setUserRole(currentMember.role);
                        }
                    }
                }
            } catch (err) {
                console.error('Error fetching user role:', err);
            }
        };

        fetchUserRole();
    }, [session, organizationId]);

    const loadPDF = async () => {
        setLoading(true);
        setError(null);

        try {

            const pdfUrl = `/api/proxy/pdf/${templateId}`;

            if (!pdfjs) {
                const module = await import('react-pdf');
                pdfjs = module.pdfjs;
                pdfjs.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
            }

            const loadingTask = pdfjs.getDocument(pdfUrl);
            const pdf = await loadingTask.promise;

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

            if (savedTextElements && savedTextElements.textElements && savedTextElements.textElements.length > 0) {

                extractedText = savedTextElements.textElements;
            } else {
              
                extractedText = await extractTextFromPDF(pdf);
               
            }
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

            // Store NLP entities from backend
            if (backendNlpEntities && backendNlpEntities.length > 0) {
                setNlpEntities(backendNlpEntities);
                const entityTypes = new Set<string>(backendNlpEntities.map((e: NlpEntity) => e.type));
                setExpandedEntityTypes(entityTypes);
            } else {
                setNlpEntities([]);
            }

        
            if (extractedText.length < 3 && backendExtractedText && backendExtractedText.trim().length > 50) {
                const rawText = backendExtractedText;
                const ocrTextElements: TextElement[] = [];
                const pageHeight = (backendPages?.[0]?.height || 800) * 2;
                const pageWidth = (backendPages?.[0]?.width || 600) * 2;  
                
                const LEFT_MARGIN = 60;
                const RIGHT_MARGIN = 60;
                const TOP_MARGIN = 60;
                const LINE_HEIGHT = 26;
                const FONT_SIZE = 18;
                const MAX_TEXT_WIDTH = pageWidth - LEFT_MARGIN - RIGHT_MARGIN;
                const CHARS_PER_LINE = Math.floor(MAX_TEXT_WIDTH / (FONT_SIZE * 0.55)); 
                
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
                    
                    // Split paragraph into lines 
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
                }
            }

            const editableLoadingTask = pdfjs.getDocument(editablePdfUrl);
            const editablePdf = await editableLoadingTask.promise;

            // Convert pages to images 
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

            context.fillStyle = 'white';
            context.fillRect(0, 0, canvas.width, canvas.height);

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

        }

        return images;
    };

    const extractTextFromPDF = async (pdf: any): Promise<TextElement[]> => {
        const allTextElements: TextElement[] = [];

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
            const page = await pdf.getPage(pageNum);
            const textContent = await page.getTextContent();
            const viewport = page.getViewport({ scale: 2 });

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
        return allTextElements;
    };

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
            if (currentBlock &&
                Math.abs(currentBlock.y - posY) < scaledFontSize * 0.15 && 
                posX >= (currentBlock.x + currentBlock.width - 5) && 
                posX <= (currentBlock.x + currentBlock.width + scaledFontSize * 0.8) && 
                currentBlock.fontFamily === fontFamily &&
                Math.abs(currentBlock.fontSize - scaledFontSize) < 2 && 
                currentBlock.isBold === isBold &&
                currentBlock.isItalic === isItalic) {

                // Merge with current block
                const space = posX - (currentBlock.x + currentBlock.width);
                currentBlock.text += (space > scaledFontSize * 0.2 ? ' ' : '') + item.str;
                currentBlock.width = (posX + width) - currentBlock.x;

            } else {
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
    };

    const addTextToCanvas = (canvas: fabric.Canvas, textEl: TextElement) => {
        const ctx = document.createElement('canvas').getContext('2d');
        if (ctx) {
            const fontStyle = `${textEl.isBold ? 'bold' : 'normal'} ${textEl.isItalic ? 'italic' : 'normal'} ${textEl.fontSize * scale}px ${textEl.fontFamily}`;
            ctx.font = fontStyle;
            const metrics = ctx.measureText(textEl.text);
            const measuredWidth = metrics.width;
           
            const pageWidth = canvas.width || 800;
            const leftMargin = textEl.x * scale;
            const rightMargin = 40 * scale; 
            const maxAllowedWidth = pageWidth - leftMargin - rightMargin;

            const calculatedWidth = Math.min(measuredWidth * 1.1, maxAllowedWidth);
            var estimatedWidth = Math.max(calculatedWidth, Math.min(textEl.width * scale, maxAllowedWidth), 100 * scale);
        } else {
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

            // Text wrapping 
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
        if (e.target) return;

        const canvas = fabricCanvases.current[pageNumber];
        if (!canvas) return;

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

    const extractAllImagesFromCanvases = (): ImageElement[] => {
        const images: ImageElement[] = [];

        Object.entries(fabricCanvases.current).forEach(([pageNum, canvas]) => {
            const allObjects = canvas.getObjects();
            
            allObjects.forEach((obj: any, index: number) => {
                if (obj.type === 'image') {
                    try {
                        const dataUrl = obj.toDataURL({ format: 'png' });                        
                        images.push({
                            id: obj.elementId || `img-${pageNum}-${index}-${Date.now()}`,
                            type: obj.isSignature ? 'signature' : 'image',
                            dataUrl: dataUrl,
                            x: obj.left || 0,
                            y: obj.top || 0,
                            width: (obj.width || 100) * (obj.scaleX || 1),
                            height: (obj.height || 100) * (obj.scaleY || 1),
                            scaleX: obj.scaleX || 1,
                            scaleY: obj.scaleY || 1,
                            angle: obj.angle || 0,
                            page: parseInt(pageNum),
                        });
                    } catch (err) {
                        console.warn('Could not extract image data:', err);
                    }
                }
            });
        });

        console.log(`📸 Total images extracted: ${images.length}`);
        return images;
    };

    const saveCurrentState = () => {
        const allTextElements = extractAllTextFromCanvases();
        const newHistory = history.slice(0, historyIndex + 1);
        newHistory.push(allTextElements);
        setHistory(newHistory);
        setHistoryIndex(newHistory.length - 1);
        setTextElements(allTextElements);
    };

    const undo = () => {
        if (historyIndex > 0) {
            const newIndex = historyIndex - 1;
            setHistoryIndex(newIndex);
            restoreState(history[newIndex]);
        }
    };

    const redo = () => {
        if (historyIndex < history.length - 1) {
            const newIndex = historyIndex + 1;
            setHistoryIndex(newIndex);
            restoreState(history[newIndex]);
        }
    };

    const restoreState = (elements: TextElement[]) => {
        // Clear all textboxes from all canvases
        Object.values(fabricCanvases.current).forEach(canvas => {
            const objectsToRemove = canvas.getObjects().filter((obj: any) => obj.type === 'textbox');
            objectsToRemove.forEach((obj: any) => canvas.remove(obj));
        });

        // Re-add elements
        elements.forEach(el => {
            const canvas = fabricCanvases.current[el.page];
            if (canvas) {
                addTextToCanvas(canvas, el);
            }
        });

        // Render all canvases
        Object.values(fabricCanvases.current).forEach(canvas => canvas.renderAll());
        
        setTextElements(elements);
    };

    // Handle entity click
    const handleEntityClick = (entity: NlpEntity) => {
        let found = false;
        const config = ENTITY_TYPE_CONFIG[entity.type];
        const highlightColor = config?.color || '#2563EB';
        
        Object.entries(fabricCanvases.current).forEach(([pageNum, canvas]) => {
            if (found) return;
            
            canvas.getObjects().forEach((obj: any) => {
                if (found) return;
                if (obj.type === 'textbox') {
                    const textContent = obj.text || '';
                    const textContentLower = textContent.toLowerCase();
                    const searchText = entity.text.toLowerCase();
                    
                    // Find the exact position of the entity within the textbox
                    const startIndex = textContentLower.indexOf(searchText);
                    
                    if (startIndex !== -1) {
                        found = true;
                        const endIndex = startIndex + entity.text.length;
                        console.log(`✅ Found entity "${entity.text}" on page ${pageNum} at position ${startIndex}-${endIndex}`);
                        
                        // Scroll the canvas container to this page
                        const canvasElement = canvasRefs.current[parseInt(pageNum)];
                        if (canvasElement) {
                            canvasElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                        
                        // Select the textbox first
                        canvas.setActiveObject(obj);
                        setSelectedObject(obj);
                        setSelectedPage(parseInt(pageNum));
                        
                        // Use Fabric.js text selection to highlight just the entity text
                        // Enter editing mode to show selection
                        obj.enterEditing();
                        obj.selectionStart = startIndex;
                        obj.selectionEnd = endIndex;
                        
                        // Apply highlight styling to selected text
                        obj.setSelectionStyles({
                            fill: highlightColor,
                            textBackgroundColor: config?.bgColor || '#DBEAFE',
                        }, startIndex, endIndex);
                        
                        canvas.renderAll();
                        
                        // Exit editing mode after a brief moment but keep the highlight
                        setTimeout(() => {
                            obj.exitEditing();
                            canvas.renderAll();
                            
                            // Remove highlight after 3 seconds
                            setTimeout(() => {
                                obj.setSelectionStyles({
                                    fill: '#000000',
                                    textBackgroundColor: '',
                                }, startIndex, endIndex);
                                canvas.renderAll();
                            }, 3000);
                        }, 100);
                        
                        return;
                    }
                }
            });
        });
        
        if (!found) {
            console.log('⚠️ Entity text not found in canvas textboxes:', entity.text);
        }
    };


    const saveAsPermanentTemplate = async () => {
        setSaving(true);
        setError(null);

        try {
            const allTextElements = extractAllTextFromCanvases();
            const allImageElements = extractAllImagesFromCanvases();

            const saveResponse = await fetch(`${backendUrl}/api/pdf-editor/save-editable`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.user?.token}`,
                },
                body: JSON.stringify({
                    templateId,
                    textElements: allTextElements,
                    imageElements: allImageElements,
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
                toast.success('Template saved permanently! It will appear in your templates list.');
                router.push(`/dashboard/${organizationId}/templates`);
            }
        } catch (err) {
            console.error('❌ Error saving permanent template:', err);
            setError(err instanceof Error ? err.message : 'Failed to save template');
        } finally {
            setSaving(false);
        }
    };

    const generateDocument = async () => {
        setPinError(null);
        
        if (!pin || pin.length !== 4) {
            setPinError('Please enter your 4-digit PIN');
            return;
        }

        setShowPinModal(false);
        setSaving(true);
        setError(null);

        try {

            const allTextElements = extractAllTextFromCanvases();
            const allImageElements = extractAllImagesFromCanvases();

            const response = await fetch(`${backendUrl}/api/pdf-editor/generate-document`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${session?.user?.token}`,
                },
                body: JSON.stringify({
                    templateId,
                    textElements: allTextElements,
                    imageElements: allImageElements,
                    pin: pin,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Failed to generate document');
            }

            if (result.success) {
                toast.success(`Document ${result.data.documentNumber} generated successfully!`);
                setPin('');
                router.push(`/dashboard/${organizationId}/generated-documents`);
            }
        } catch (err) {
            console.error('❌ Error generating document:', err);
            setError(err instanceof Error ? err.message : 'Failed to generate document');
            toast.error(err instanceof Error ? err.message : 'Failed to generate document');
        } finally {
            setSaving(false);
        }
    };

    const handleGenerateClick = () => {
        setPin('');
        setPinError(null);
        setShowPinModal(true);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-gray-50">
                <div className="text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-[rgb(132,42,59)] mx-auto mb-4" />
                    <p className="text-gray-600 font-medium">Loading PDF Editor...</p>
                    <p className="text-sm text-gray-500 mt-2">Initializing document...</p>
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
                        onClick={() => router.push(`/dashboard/${organizationId}/templates`)}
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

                fabric.FabricImage.fromURL(imgUrl, {}).then((img: fabric.Image) => {
                    img.scale(0.5);
                    (img as any).set({
                        left: 100,
                        top: 100,
                        selectable: true,
                        elementId: `img-${Date.now()}`,
                        isSignature: false,
                    });
                    canvas.add(img);
                    canvas.setActiveObject(img);
                    canvas.renderAll();
                    saveCurrentState();
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
            <div className="bg-gradient-to-r from-gray-50 to-white border-b-2 border-gray-200 shadow-md">
                <div className="flex items-center justify-between px-6 py-3">
                    <div className="flex items-center gap-2">
                        {/* Add Elements */}
                        <div className="flex gap-1.5 border-r-2 border-gray-300 pr-3 mr-3">
                            <button
                                onClick={addImage}
                                disabled={!selectedPage}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-blue-50 hover:border-blue-400 rounded-lg border border-gray-300 transition-all disabled:opacity-50 text-sm font-medium shadow-sm"
                                title="Add Image"
                            >
                                <ImageIcon className="h-4 w-4 text-gray-700" />
                                <span className="text-gray-700">Image</span>
                            </button>
                            <button
                                onClick={addBulletList}
                                disabled={!selectedPage}
                                className="p-2 bg-white hover:bg-blue-50 hover:border-blue-400 rounded-lg border border-gray-300 transition-all disabled:opacity-50 shadow-sm"
                                title="Add Bullet List"
                            >
                                <List className="h-4 w-4 text-gray-700" />
                            </button>
                            <button
                                onClick={addNumberedList}
                                disabled={!selectedPage}
                                className="p-2 bg-white hover:bg-blue-50 hover:border-blue-400 rounded-lg border border-gray-300 transition-all disabled:opacity-50 shadow-sm"
                                title="Add Numbered List"
                            >
                                <ListOrdered className="h-4 w-4 text-gray-700" />
                            </button>
                            <button
                                onClick={addHorizontalLine}
                                disabled={!selectedPage}
                                className="p-2 bg-white hover:bg-blue-50 hover:border-blue-400 rounded-lg border border-gray-300 transition-all disabled:opacity-50 shadow-sm"
                                title="Add Horizontal Line"
                            >
                                <Minus className="h-4 w-4 text-gray-700" />
                            </button>
                            <button
                                onClick={() => addShape('rectangle')}
                                disabled={!selectedPage}
                                className="p-2 bg-white hover:bg-blue-50 hover:border-blue-400 rounded-lg border border-gray-300 transition-all disabled:opacity-50 shadow-sm"
                                title="Add Rectangle"
                            >
                                <Square className="h-4 w-4 text-gray-700" />
                            </button>
                            <button
                                onClick={() => addShape('circle')}
                                disabled={!selectedPage}
                                className="p-2 bg-white hover:bg-blue-50 hover:border-blue-400 rounded-lg border border-gray-300 transition-all disabled:opacity-50 shadow-sm"
                                title="Add Circle"
                            >
                                <Circle className="h-4 w-4 text-gray-700" />
                            </button>
                            <button
                                onClick={() => setShowSignatureModal(true)}
                                disabled={!selectedPage}
                                className="flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-purple-50 hover:border-purple-400 rounded-lg border border-gray-300 transition-all disabled:opacity-50 text-sm font-medium shadow-sm"
                                title="Add Signature"
                            >
                                <Pen className="h-4 w-4 text-purple-600" />
                                <span className="text-gray-700">Sign</span>
                            </button>
                        </div>

                        {/* Undo/Redo */}
                        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-300 shadow-sm">
                            <button
                                onClick={undo}
                                disabled={historyIndex <= 0}
                                className="p-2 hover:bg-blue-50 rounded-l-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Undo (Ctrl+Z)"
                            >
                                <Undo className="h-4 w-4 text-gray-700" />
                            </button>
                            <div className="w-px h-5 bg-gray-300" />
                            <button
                                onClick={redo}
                                disabled={historyIndex >= history.length - 1}
                                className="p-2 hover:bg-blue-50 rounded-r-lg disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                                title="Redo (Ctrl+Y)"
                            >
                                <Redo className="h-4 w-4 text-gray-700" />
                            </button>
                        </div>

                        {/* Delete */}
                        {selectedObject && (
                            <button
                                onClick={deleteSelected}
                                className="p-2 bg-white hover:bg-red-50 text-red-600 rounded-lg border border-red-300 shadow-sm transition-all"
                                title="Delete Selected (Delete)"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        )}

                        <div className="w-px h-6 bg-gray-300 mx-1" />

                        {/* Zoom */}
                        <button
                            onClick={() => {
                                const newScale = Math.max(0.5, scale - 0.1);
                                setScale(newScale);
                                const currentElements = extractAllTextFromCanvases();
                                setTimeout(() => initializeFabricCanvases(pageCanvases, currentElements), 100);
                            }}
                            className="p-2 hover:bg-gray-100 rounded transition"
                            title="Zoom Out"
                        >
                            <ZoomOut className="h-4 w-4" />
                        </button>
                        <span className="text-sm font-medium min-w-[50px] text-center">
                            {Math.round(scale * 100)}%
                        </span>
                        <button
                            onClick={() => {
                                const newScale = Math.min(2, scale + 0.1);
                                setScale(newScale);
                                const currentElements = extractAllTextFromCanvases();
                                setTimeout(() => initializeFabricCanvases(pageCanvases, currentElements), 100);
                            }}
                            className="p-2 hover:bg-gray-100 rounded transition"
                            title="Zoom In"
                        >
                            <ZoomIn className="h-4 w-4" />
                        </button>

                        <div className="w-px h-8 bg-gray-300 mx-2" />

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
                            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm ${showTextLayer ? 'bg-[rgb(132,42,59)] text-white hover:bg-[rgb(112,32,49)]' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                                }`}
                            title={showTextLayer ? 'Hide Text Layer' : 'Show Text Layer'}
                        >
                            <Type className="h-4 w-4" />
                            {showTextLayer ? 'Text: ON' : 'Text: OFF'}
                        </button>

                        {/* Toggle NLP Entities Sidebar */}
                        <button
                            onClick={() => setShowNlpSidebar(!showNlpSidebar)}
                            className={`px-4 py-2 text-sm rounded-lg font-medium transition-all flex items-center gap-2 shadow-sm ${showNlpSidebar ? 'bg-[rgb(132,42,59)] text-white hover:bg-[rgb(112,32,49)]' : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-100'
                                }`}
                            title={showNlpSidebar ? 'Hide NLP Entities' : 'Show NLP Entities'}
                        >
                            <Tags className="h-4 w-4" />
                            Entities {nlpEntities.length > 0 && `(${nlpEntities.length})`}
                        </button>

                        <div className="w-px h-8 bg-gray-300 mx-2" />

                        {/* Role-based action button */}
                        {userRole === "CREATOR" ? (
                            <button
                                onClick={handleGenerateClick}
                                disabled={saving}
                                className="px-5 py-2.5 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white text-sm rounded-lg shadow-md transition-all disabled:opacity-50 flex items-center gap-2 font-medium"
                            >
                                {saving ? (
                                    <>
                                        <Loader2 className="h-4 w-4 animate-spin" />
                                        Generating...
                                    </>
                                ) : (
                                    <>
                                        <FileText className="h-4 w-4" />
                                        Generate Document
                                    </>
                                )}
                            </button>
                        ) : (
                            <button
                                onClick={saveAsPermanentTemplate}
                                disabled={saving}
                                className="px-5 py-2.5 bg-gradient-to-r from-[rgb(132,42,59)] to-[rgb(112,32,49)] hover:from-[rgb(112,32,49)] hover:to-[rgb(92,22,39)] text-white text-sm rounded-lg shadow-md transition-all disabled:opacity-50 flex items-center gap-2 font-medium"
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
                        )}

                        <button
                            onClick={() => router.push(`/dashboard/${organizationId}/templates`)}
                            className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg border border-gray-300 transition-all font-medium shadow-sm"
                        >
                            Cancel
                        </button>
                    </div>
                </div>

                {/* Formatting Toolbar (shows when text selected) */}
                {selectedTextbox && (
                    <div className="flex items-center gap-2 px-6 py-3 border-t-2 border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div className="text-xs font-semibold text-gray-600 mr-2">TEXT FORMATTING</div>
                        
                        {/* Bold */}
                        <button
                            onClick={() => updateSelectedObjectProperty('fontWeight', selectedTextbox.fontWeight === 'bold' ? 'normal' : 'bold')}
                            className={`p-2 rounded-lg transition-all shadow-sm ${selectedTextbox.fontWeight === 'bold' ? 'bg-[rgb(132,42,59)] text-white' : 'bg-white hover:bg-blue-100 border border-gray-300'
                                }`}
                            title="Bold"
                        >
                            <Bold className="h-4 w-4" />
                        </button>

                        {/* Italic */}
                        <button
                            onClick={() => updateSelectedObjectProperty('fontStyle', selectedTextbox.fontStyle === 'italic' ? 'normal' : 'italic')}
                            className={`p-2 rounded-lg transition-all shadow-sm ${selectedTextbox.fontStyle === 'italic' ? 'bg-[rgb(132,42,59)] text-white' : 'bg-white hover:bg-blue-100 border border-gray-300'
                                }`}
                            title="Italic"
                        >
                            <Italic className="h-4 w-4" />
                        </button>

                        {/* Underline */}
                        <button
                            onClick={() => updateSelectedObjectProperty('underline', !selectedTextbox.underline)}
                            className={`p-2 rounded-lg transition-all shadow-sm ${selectedTextbox.underline ? 'bg-[rgb(132,42,59)] text-white' : 'bg-white hover:bg-blue-100 border border-gray-300'
                                }`}
                            title="Underline"
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
                                className="px-4 py-2 bg-white hover:bg-blue-100 rounded-lg border border-gray-300 transition-all flex items-center gap-2 text-sm font-medium shadow-sm min-w-[70px]"
                            >
                                {Math.round((selectedTextbox.fontSize || 16) / scale)}px
                                <ChevronDown className="h-3 w-3" />
                            </button>
                            {showFontSizeMenu && (
                                <div className="absolute top-full mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
                                    {FONT_SIZES.map(size => (
                                        <button
                                            key={size}
                                            onClick={() => {
                                                updateSelectedObjectProperty('fontSize', size * scale);
                                                setShowFontSizeMenu(false);
                                            }}
                                            className="block w-full px-5 py-2.5 text-left hover:bg-blue-50 text-sm transition-colors"
                                        >
                                            {size}px
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
                                className="px-4 py-2 bg-white hover:bg-blue-100 rounded-lg border border-gray-300 transition-all flex items-center gap-2 text-sm font-medium shadow-sm min-w-[160px]"
                            >
                                <span className="truncate">{selectedTextbox.fontFamily}</span>
                                <ChevronDown className="h-3 w-3" />
                            </button>
                            {showFontFamilyMenu && (
                                <div className="absolute top-full mt-2 bg-white border border-gray-300 rounded-lg shadow-xl z-50">
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
                        <div className="flex items-center gap-1 bg-white rounded-lg border border-gray-300 shadow-sm p-0.5">
                            <button
                                onClick={() => updateSelectedObjectProperty('textAlign', 'left')}
                                className={`p-2 rounded-lg transition-all ${selectedTextbox.textAlign === 'left' ? 'bg-[rgb(132,42,59)] text-white' : 'hover:bg-blue-50'
                                    }`}
                                title="Align Left"
                            >
                                <AlignLeft className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => updateSelectedObjectProperty('textAlign', 'center')}
                                className={`p-2 rounded-lg transition-all ${selectedTextbox.textAlign === 'center' ? 'bg-[rgb(132,42,59)] text-white' : 'hover:bg-blue-50'
                                    }`}
                                title="Align Center"
                            >
                                <AlignCenter className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => updateSelectedObjectProperty('textAlign', 'right')}
                                className={`p-2 rounded-lg transition-all ${selectedTextbox.textAlign === 'right' ? 'bg-[rgb(132,42,59)] text-white' : 'hover:bg-blue-50'
                                    }`}
                                title="Align Right"
                            >
                                <AlignRight className="h-4 w-4" />
                            </button>
                        </div>

                        <div className="w-px h-6 bg-gray-300 mx-1" />

                        {/* Delete */}
                        <button
                            onClick={deleteSelectedObject}
                            className="p-2 bg-white hover:bg-red-50 text-red-600 rounded-lg border-2 border-red-300 transition-all shadow-sm"
                            title="Delete (Del)"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    </div>
                )}

                {/* Tools Bar */}
                <div className="flex items-center gap-3 px-6 py-3 border-t-2 border-gray-200 bg-gradient-to-r from-gray-50 to-gray-100">
                    <div className="text-xs font-semibold text-gray-600 mr-1">TOOLS:</div>
                    <button
                        onClick={() => setCurrentTool('select')}
                        className={`px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-2 shadow-sm ${currentTool === 'select' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' : 'bg-white hover:bg-blue-50 border border-gray-300 text-gray-700'
                            }`}
                    >
                        <Type className="h-4 w-4" />
                        Select
                    </button>

                    <button
                        onClick={() => setCurrentTool('text')}
                        className={`px-4 py-2 rounded-lg transition-all text-sm font-medium flex items-center gap-2 shadow-sm ${currentTool === 'text' ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-md' : 'bg-white hover:bg-blue-50 border border-gray-300 text-gray-700'
                            }`}
                    >
                        <Type className="h-4 w-4" />
                        Add Text
                    </button>

                    <span className="text-xs text-gray-600 ml-3 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-200">
                        {currentTool === 'text' ? '💡 Click "Add Text" on any page to insert text' : '💡 Double-click text to edit, drag to move'}
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

            {/* Signature Modal */}
            {showSignatureModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-[600px] max-w-[90vw]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Pen className="h-5 w-5 text-[rgb(132,42,59)]" />
                                Add Your Signature
                            </h3>
                            <button
                                onClick={() => {
                                    setShowSignatureModal(false);
                                    signatureCanvasRef.current?.clear();
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-3">Draw your signature below using your mouse or touchscreen</p>
                            <div className="border-2 border-gray-300 rounded-lg bg-gray-50">
                                <SignatureCanvas
                                    ref={signatureCanvasRef}
                                    canvasProps={{
                                        width: 552,
                                        height: 200,
                                        className: 'signature-canvas rounded-lg cursor-crosshair',
                                    }}
                                    backgroundColor="white"
                                    penColor="black"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-between gap-3">
                            <button
                                onClick={() => signatureCanvasRef.current?.clear()}
                                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg transition font-medium"
                            >
                                Clear
                            </button>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        setShowSignatureModal(false);
                                        signatureCanvasRef.current?.clear();
                                    }}
                                    className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-300 transition font-medium"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (signatureCanvasRef.current && !signatureCanvasRef.current.isEmpty()) {
                                            const signatureDataUrl = signatureCanvasRef.current.toDataURL('image/png');
                                            if (selectedPage) {
                                                const canvas = fabricCanvases.current[selectedPage];
                                                if (canvas) {
                                                    fabric.FabricImage.fromURL(signatureDataUrl).then((img: any) => {
                                                        img.set({
                                                            left: 100 * scale,
                                                            top: 100 * scale,
                                                            scaleX: 0.3 * scale,
                                                            scaleY: 0.3 * scale,
                                                            selectable: true,
                                                            isSignature: true, // Mark as signature for extraction
                                                            elementId: `sig-${Date.now()}`,
                                                        });
                                                        canvas.add(img);
                                                        canvas.setActiveObject(img);
                                                        canvas.renderAll();
                                                        saveCurrentState();
                                                    });
                                                }
                                            }
                                            setShowSignatureModal(false);
                                            signatureCanvasRef.current.clear();
                                        }
                                    }}
                                    className="px-6 py-2 bg-[rgb(132,42,59)] hover:bg-[rgb(112,32,49)] text-white rounded-lg transition font-medium shadow-lg"
                                >
                                    Add Signature
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {showPinModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px] max-w-[90vw]">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <FileText className="h-5 w-5 text-green-600" />
                                Enter Document Generation PIN
                            </h3>
                            <button
                                onClick={() => {
                                    setShowPinModal(false);
                                    setPin('');
                                    setPinError(null);
                                }}
                                className="p-2 hover:bg-gray-100 rounded-lg transition"
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>
                        
                        <div className="mb-4">
                            <p className="text-sm text-gray-600 mb-3">Enter your 4-digit document generation PIN to confirm</p>
                            <input
                                type="password"
                                value={pin}
                                onChange={(e) => {
                                    const value = e.target.value.replace(/\D/g, '').slice(0, 4);
                                    setPin(value);
                                    setPinError(null);
                                }}
                                placeholder="Enter 4-digit PIN"
                                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg text-center text-2xl tracking-widest focus:outline-none focus:border-green-600 transition"
                                maxLength={4}
                                autoFocus
                            />
                            {pinError && (
                                <p className="text-red-500 text-sm mt-2">{pinError}</p>
                            )}
                        </div>

                        <div className="flex items-center justify-end gap-3">
                            <button
                                onClick={() => {
                                    setShowPinModal(false);
                                    setPin('');
                                    setPinError(null);
                                }}
                                className="px-4 py-2 bg-white hover:bg-gray-100 text-gray-700 rounded-lg border border-gray-300 transition font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={generateDocument}
                                disabled={pin.length !== 4 || saving}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition font-medium shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {saving ? 'Generating...' : 'Generate Document'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
