"use client";

import React, { useState, useRef } from "react";
import { Rnd } from 'react-rnd';
import {
    IconBold,
    IconItalic,
    IconUnderline,
    IconStrikethrough,
    IconAlignLeft,
    IconAlignCenter,
    IconAlignRight,
    IconAlignJustified,
    IconList,
    IconListNumbers,
    IconH1,
    IconH2,
    IconH3,
    IconPhoto,
    IconLink,
    IconTable,
    IconQuote,
    IconCode,
    IconSeparator,
    IconArrowBack,
    IconDeviceFloppy,
    IconFileTypePdf,
    IconTrash,
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

type ElementType = 'text' | 'image' | 'list' | 'quote' | 'code' | 'line';

interface CanvasElement {
    id: string;
    type: ElementType;
    content: string;
    x: number;
    y: number;
    width: number;
    height: number;
    fontSize?: number;
    fontWeight?: string;
    fontStyle?: string;
    textDecoration?: string;
    textAlign?: string;
    listType?: 'bullet' | 'numbered';
    link?: string;
}

export function CreateTemplateComponent() {
    const router = useRouter();
    const [templateName, setTemplateName] = useState("");
    const [templateDescription, setTemplateDescription] = useState("");
    const [isSaving, setIsSaving] = useState(false);
    const [elements, setElements] = useState<CanvasElement[]>([]);
    const [selectedElement, setSelectedElement] = useState<string | null>(null);
    const [isEditingText, setIsEditingText] = useState<string | null>(null);
    const canvasRef = useRef<HTMLDivElement>(null);

    // Link dialog states
    const [showLinkDialog, setShowLinkDialog] = useState(false);
    const [linkUrl, setLinkUrl] = useState('');

    // Text formatting states
    const [currentFontSize, setCurrentFontSize] = useState(16);
    const [currentFontWeight, setCurrentFontWeight] = useState('normal');
    const [currentFontStyle, setCurrentFontStyle] = useState('normal');
    const [currentTextDecoration, setCurrentTextDecoration] = useState('none');
    const [currentTextAlign, setCurrentTextAlign] = useState('left');

    const addText = () => {
        const newElement: CanvasElement = {
            id: `text-${Date.now()}`,
            type: 'text',
            content: 'Double click to edit text',
            x: 50,
            y: 50,
            width: 200,
            height: 50,
            fontSize: currentFontSize,
            fontWeight: currentFontWeight,
            fontStyle: currentFontStyle,
            textDecoration: currentTextDecoration,
            textAlign: currentTextAlign,
        };
        setElements([...elements, newElement]);
        toast("Text added! Drag to position, resize handles to adjust size");
    };

    const addImage = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                if (file.size > 5 * 1024 * 1024) {
                    toast("Image size should be less than 5MB");
                    return;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target?.result as string;
                    const newElement: CanvasElement = {
                        id: `image-${Date.now()}`,
                        type: 'image',
                        content: base64,
                        x: 100,
                        y: 100,
                        width: 300,
                        height: 200,
                    };
                    setElements([...elements, newElement]);
                    toast("Image added! Drag to position anywhere on canvas");
                };
                reader.onerror = () => {
                    toast("Failed to load image");
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const addBulletList = () => {
        const newElement: CanvasElement = {
            id: `list-${Date.now()}`,
            type: 'list',
            content: '• Item 1\n• Item 2\n• Item 3',
            x: 50,
            y: 150,
            width: 250,
            height: 100,
            fontSize: 16,
            listType: 'bullet',
        };
        setElements([...elements, newElement]);
        toast("Bullet list added! Double click to edit");
    };

    const addNumberedList = () => {
        const newElement: CanvasElement = {
            id: `list-${Date.now()}`,
            type: 'list',
            content: '1. Item 1\n2. Item 2\n3. Item 3',
            x: 50,
            y: 150,
            width: 250,
            height: 100,
            fontSize: 16,
            listType: 'numbered',
        };
        setElements([...elements, newElement]);
        toast("Numbered list added! Double click to edit");
    };

    const addQuote = () => {
        const newElement: CanvasElement = {
            id: `quote-${Date.now()}`,
            type: 'quote',
            content: 'Double click to edit quote',
            x: 50,
            y: 200,
            width: 300,
            height: 80,
            fontSize: 16,
            fontStyle: 'italic',
        };
        setElements([...elements, newElement]);
        toast("Quote block added!");
    };
    const addHorizontalLine = () => {
        const newElement: CanvasElement = {
            id: `line-${Date.now()}`,
            type: 'line',
            content: '',
            x: 50,
            y: 300,
            width: 400,
            height: 2,
        };
        setElements([...elements, newElement]);
        toast("Horizontal line added!");
    };

    const addLink = () => {
        if (selectedElement) {
            setShowLinkDialog(true);
        } else {
            toast("Please select a text element first");
        }
    };

    const handleLinkSubmit = () => {
        if (linkUrl && selectedElement) {
            updateElement(selectedElement, { link: linkUrl });
            toast("Link added to text!");
            setShowLinkDialog(false);
            setLinkUrl('');
        }
    };

    const handleLinkCancel = () => {
        setShowLinkDialog(false);
        setLinkUrl('');
    };

    const updateElement = (id: string, updates: Partial<CanvasElement>) => {
        setElements(elements.map(el => el.id === id ? { ...el, ...updates } : el));
    };

    const deleteSelectedElement = () => {
        if (selectedElement) {
            setElements(elements.filter(el => el.id !== selectedElement));
            setSelectedElement(null);
            toast("Element deleted");
        }
    };

    const applyFormatting = (property: keyof CanvasElement, value: any) => {
        if (selectedElement) {
            const element = elements.find(el => el.id === selectedElement);
            if (element && (element.type === 'text' || element.type === 'list' || element.type === 'quote' || element.type === 'code')) {
                updateElement(selectedElement, { [property]: value });
            }
        }
    };

    const handleSaveTemplate = async () => {
        if (!templateName) {
            toast("Please enter a template name");
            return;
        }

        setIsSaving(true);

        try {
            const templateData = {
                name: templateName,
                description: templateDescription,
                elements: elements,
            };

            // TODO: Send to backend API
            console.log("Saving template:", templateData);

            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1000));

            toast("Template saved successfully!");
            router.push("/dashboard");
        } catch (error) {
            console.error("Error saving template:", error);
            toast("Failed to save template");
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportPDF = () => {
        toast("PDF export feature coming soon!");
    };

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => router.back()}
                                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <IconArrowBack size={20} className="text-gray-600" />
                            </button>
                            <div>
                                <h1 className="text-xl font-semibold text-[rgb(48,48,48)]">
                                    Create Template
                                </h1>
                                <p className="text-sm text-gray-500">
                                    Design your PDF template
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={handleExportPDF}
                                className="flex items-center gap-2 px-4 py-2 bg-gray-200 hover:bg-gray-300 text-[rgb(48,48,48)] rounded-lg transition-colors"
                            >
                                <IconFileTypePdf size={18} />
                                <span>Export PDF</span>
                            </button>
                            <button
                                onClick={handleSaveTemplate}
                                disabled={isSaving}
                                className="flex items-center gap-2 px-4 py-2 bg-[rgb(132,42,59)] hover:bg-[rgb(152,52,69)] text-white rounded-lg transition-colors disabled:opacity-50"
                            >
                                <IconDeviceFloppy size={18} />
                                <span>{isSaving ? "Saving..." : "Save Template"}</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
                    {/* Sidebar - Template Info */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg border border-gray-200 p-6 sticky top-24">
                            <h2 className="text-lg font-semibold text-[rgb(48,48,48)] mb-4">
                                Template Details
                            </h2>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Template Name *
                                    </label>
                                    <input
                                        type="text"
                                        value={templateName}
                                        onChange={(e) => setTemplateName(e.target.value)}
                                        placeholder="e.g., Invoice Template"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent text-[rgb(48,48,48)]"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={templateDescription}
                                        onChange={(e) => setTemplateDescription(e.target.value)}
                                        placeholder="Describe your template..."
                                        rows={4}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent text-[rgb(48,48,48)] resize-none"
                                    />
                                </div>
                                <div className="pt-4 border-t border-gray-200">
                                    <h3 className="text-sm font-medium text-gray-700 mb-2">
                                        Tips
                                    </h3>
                                    <ul className="text-xs text-gray-600 space-y-2">
                                        <li>• Use headings to structure your document</li>
                                        <li>• Add tables for organized data</li>
                                        <li>• Insert images for branding</li>
                                        <li>• Use variables like {"{name}"} for dynamic content</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Main Editor Area */}
                    <div className="lg:col-span-3">
                        <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                            {/* Toolbar */}
                            <div className="border-b border-gray-200 p-4">
                                <div className="flex flex-wrap gap-2">
                                    {/* Add Elements */}
                                    <div className="flex gap-1 border-r border-gray-200 pr-2">
                                        <button
                                            onClick={addText}
                                            className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 transition-colors text-gray-600 border border-gray-300"
                                            title="Add Text"
                                        >
                                            <IconCode size={18} />
                                            <span className="text-sm">Add Text</span>
                                        </button>
                                        <button
                                            onClick={addImage}
                                            className="flex items-center gap-2 px-3 py-2 rounded hover:bg-gray-100 transition-colors text-gray-600 border border-gray-300"
                                            title="Add Image"
                                        >
                                            <IconPhoto size={18} />
                                            <span className="text-sm">Add Image</span>
                                        </button>
                                    </div>

                                    {/* Text Formatting - Only active when text selected */}
                                    {selectedElement && elements.find(el => el.id === selectedElement)?.type === 'text' && (
                                        <>
                                            {/* Basic Text Formatting */}
                                            <div className="flex gap-1 border-r border-gray-200 pr-2">
                                                <button
                                                    onClick={() => applyFormatting('fontWeight', currentFontWeight === 'bold' ? 'normal' : 'bold')}
                                                    className={`p-2 rounded hover:bg-gray-100 transition-colors ${currentFontWeight === 'bold' ? 'bg-[rgb(132,42,59)] text-white' : 'text-gray-600'}`}
                                                    title="Bold"
                                                >
                                                    <IconBold size={18} />
                                                </button>
                                                <button
                                                    onClick={() => applyFormatting('fontStyle', currentFontStyle === 'italic' ? 'normal' : 'italic')}
                                                    className={`p-2 rounded hover:bg-gray-100 transition-colors ${currentFontStyle === 'italic' ? 'bg-[rgb(132,42,59)] text-white' : 'text-gray-600'}`}
                                                    title="Italic"
                                                >
                                                    <IconItalic size={18} />
                                                </button>
                                                <button
                                                    onClick={() => applyFormatting('textDecoration', currentTextDecoration === 'underline' ? 'none' : 'underline')}
                                                    className={`p-2 rounded hover:bg-gray-100 transition-colors ${currentTextDecoration === 'underline' ? 'bg-[rgb(132,42,59)] text-white' : 'text-gray-600'}`}
                                                    title="Underline"
                                                >
                                                    <IconUnderline size={18} />
                                                </button>
                                                <button
                                                    onClick={() => {
                                                        const currentDecoration = currentTextDecoration;
                                                        applyFormatting('textDecoration', currentDecoration === 'line-through' ? 'none' : 'line-through');
                                                    }}
                                                    className={`p-2 rounded hover:bg-gray-100 transition-colors ${currentTextDecoration === 'line-through' ? 'bg-[rgb(132,42,59)] text-white' : 'text-gray-600'}`}
                                                    title="Strikethrough"
                                                >
                                                    <IconStrikethrough size={18} />
                                                </button>
                                            </div>

                                          {/* Heading Styles */}
                                            <div className="flex gap-1 border-r border-gray-200 pr-2">
                                                <button
                                                    onClick={() => applyFormatting('fontSize', 32)}
                                                    className={`p-2 rounded hover:bg-gray-100 transition-colors ${currentFontSize === 32 ? 'bg-[rgb(132,42,59)] text-white' : 'text-gray-600'}`}
                                                    title="Heading 1 (32px)"
                                                >
                                                    <IconH1 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => applyFormatting('fontSize', 24)}
                                                    className={`p-2 rounded hover:bg-gray-100 transition-colors ${currentFontSize === 24 ? 'bg-[rgb(132,42,59)] text-white' : 'text-gray-600'}`}
                                                    title="Heading 2 (24px)"
                                                >
                                                    <IconH2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => applyFormatting('fontSize', 20)}
                                                    className={`p-2 rounded hover:bg-gray-100 transition-colors ${currentFontSize === 20 ? 'bg-[rgb(132,42,59)] text-white' : 'text-gray-600'}`}
                                                    title="Heading 3 (20px)"
                                                >
                                                    <IconH3 size={18} />
                                                </button>
                                            </div>

                                            {/* Font Size Dropdown */}
                                            <div className="flex gap-1 border-r border-gray-200 pr-2">
                                                <select
                                                    value={currentFontSize}
                                                    onChange={(e) => applyFormatting('fontSize', Number(e.target.value))}
                                                    className="px-2 py-1 rounded border border-gray-300 text-sm"
                                                >
                                                    <option value={12}>12px</option>
                                                    <option value={14}>14px</option>
                                                    <option value={16}>16px</option>
                                                    <option value={18}>18px</option>
                                                    <option value={20}>20px</option>
                                                    <option value={24}>24px</option>
                                                    <option value={32}>32px</option>
                                                    <option value={48}>48px</option>
                                                    <option value={64}>64px</option>
                                                </select>
                                            </div>

                                            {/* Text Alignment */}
                                            <div className="flex gap-1 border-r border-gray-200 pr-2">
                                                <button
                                                    onClick={() => applyFormatting('textAlign', 'left')}
                                                    className={`p-2 rounded hover:bg-gray-100 transition-colors ${currentTextAlign === 'left' ? 'bg-[rgb(132,42,59)] text-white' : 'text-gray-600'}`}
                                                    title="Align Left"
                                                >
                                                    <IconAlignLeft size={18} />
                                                </button>
                                                <button
                                                    onClick={() => applyFormatting('textAlign', 'center')}
                                                    className={`p-2 rounded hover:bg-gray-100 transition-colors ${currentTextAlign === 'center' ? 'bg-[rgb(132,42,59)] text-white' : 'text-gray-600'}`}
                                                    title="Align Center"
                                                >
                                                    <IconAlignCenter size={18} />
                                                </button>
                                                <button
                                                    onClick={() => applyFormatting('textAlign', 'right')}
                                                    className={`p-2 rounded hover:bg-gray-100 transition-colors ${currentTextAlign === 'right' ? 'bg-[rgb(132,42,59)] text-white' : 'text-gray-600'}`}
                                                    title="Align Right"
                                                >
                                                    <IconAlignRight size={18} />
                                                </button>
                                                <button
                                                    onClick={() => applyFormatting('textAlign', 'justify')}
                                                    className={`p-2 rounded hover:bg-gray-100 transition-colors ${currentTextAlign === 'justify' ? 'bg-[rgb(132,42,59)] text-white' : 'text-gray-600'}`}
                                                    title="Justify"
                                                >
                                                    <IconAlignJustified size={18} />
                                                </button>
                                            </div>
                                        </>
                                    )}

                                    {/* Insert Elements - Lists, Links, etc */}
                                    <div className="flex gap-1 border-r border-gray-200 pr-2">
                                        <button
                                            onClick={addBulletList}
                                            className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600"
                                            title="Bullet List"
                                        >
                                            <IconList size={18} />
                                        </button>
                                        <button
                                            onClick={addNumberedList}
                                            className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600"
                                            title="Numbered List"
                                        >
                                            <IconListNumbers size={18} />
                                        </button>
                                        <button
                                            onClick={addLink}
                                            className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600"
                                            title="Add Link to Selected Text"
                                        >
                                            <IconLink size={18} />
                                        </button>
                                    </div>

                                    {/* Other Elements */}
                                    <div className="flex gap-1 border-r border-gray-200 pr-2">
                                        <button
                                            onClick={addQuote}
                                            className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600"
                                            title="Quote Block"
                                        >
                                            <IconQuote size={18} />
                                        </button>
                                        <button
                                            onClick={addHorizontalLine}
                                            className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600"
                                            title="Horizontal Line"
                                        >
                                            <IconSeparator size={18} />
                                        </button>
                                    </div>

                                    {/* Delete Element */}
                                    {selectedElement && (
                                        <button
                                            onClick={deleteSelectedElement}
                                            className="flex items-center gap-2 px-3 py-2 rounded hover:bg-red-100 transition-colors text-red-600 border border-red-300"
                                            title="Delete Selected Element"
                                        >
                                            <IconTrash size={18} />
                                            <span className="text-sm">Delete</span>
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Canvas Area */}
                            <div className="p-4">
                                <div 
                                    ref={canvasRef}
                                    className="bg-white border-2 border-gray-300 rounded-lg shadow-inner relative overflow-visible"
                                    style={{ minHeight: '800px', width: '100%' }}
                                    onClick={() => setSelectedElement(null)}
                                >
                                    {/* Elements */}
                                    {elements.map((element) => (
                                        <Rnd
                                            key={element.id}
                                            position={{ x: element.x, y: element.y }}
                                            size={{ width: element.width, height: element.height }}
                                            onDragStop={(e, d) => {
                                                updateElement(element.id, { x: d.x, y: d.y });
                                            }}
                                            onResizeStop={(e, direction, ref, delta, position) => {
                                                updateElement(element.id, {
                                                    width: parseInt(ref.style.width),
                                                    height: parseInt(ref.style.height),
                                                    x: position.x,
                                                    y: position.y,
                                                });
                                            }}
                                            onClick={(e: React.MouseEvent) => {
                                                e.stopPropagation();
                                                setSelectedElement(element.id);
                                                if (element.type === 'text' || element.type === 'list' || element.type === 'quote' || element.type === 'code') {
                                                    setCurrentFontSize(element.fontSize || 16);
                                                    setCurrentFontWeight(element.fontWeight || 'normal');
                                                    setCurrentFontStyle(element.fontStyle || 'normal');
                                                    setCurrentTextDecoration(element.textDecoration || 'none');
                                                    setCurrentTextAlign(element.textAlign || 'left');
                                                }
                                            }}
                                            bounds="parent"
                                            className={`absolute ${selectedElement === element.id ? 'ring-2 ring-[rgb(132,42,59)]' : ''}`}
                                        >
                                            {element.type === 'text' ? (
                                                <div
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => updateElement(element.id, { content: e.currentTarget.textContent || '' })}
                                                    onDoubleClick={() => setIsEditingText(element.id)}
                                                    className="w-full h-full p-2 outline-none cursor-move hover:bg-gray-50 transition-colors"
                                                    style={{
                                                        fontSize: `${element.fontSize}px`,
                                                        fontWeight: element.fontWeight,
                                                        fontStyle: element.fontStyle,
                                                        textDecoration: element.link ? 'underline' : element.textDecoration,
                                                        textAlign: element.textAlign as any,
                                                        wordWrap: 'break-word',
                                                        overflow: 'hidden',
                                                        color: element.link ? 'rgb(132,42,59)' : 'inherit',
                                                        cursor: element.link ? 'pointer' : 'move',
                                                    }}
                                                    onClick={(e) => {
                                                        if (element.link) {
                                                            e.stopPropagation();
                                                            window.open(element.link, '_blank');
                                                        }
                                                    }}
                                                >
                                                    {element.content}
                                                </div>
                                            ) : element.type === 'list' ? (
                                                <div
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => updateElement(element.id, { content: e.currentTarget.textContent || '' })}
                                                    className="w-full h-full p-2 outline-none cursor-move hover:bg-gray-50 transition-colors"
                                                    style={{
                                                        fontSize: `${element.fontSize}px`,
                                                        whiteSpace: 'pre-wrap',
                                                        wordWrap: 'break-word',
                                                        overflow: 'auto',
                                                    }}
                                                >
                                                    {element.content}
                                                </div>
                                            ) : element.type === 'quote' ? (
                                                <div
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => updateElement(element.id, { content: e.currentTarget.textContent || '' })}
                                                    className="w-full h-full p-4 outline-none cursor-move hover:bg-gray-50 transition-colors border-l-4 border-[rgb(132,42,59)] bg-gray-50"
                                                    style={{
                                                        fontSize: `${element.fontSize}px`,
                                                        fontStyle: element.fontStyle,
                                                        wordWrap: 'break-word',
                                                        overflow: 'auto',
                                                    }}
                                                >
                                                    {element.content}
                                                </div>
                                            ) : element.type === 'code' ? (
                                                <div
                                                    contentEditable
                                                    suppressContentEditableWarning
                                                    onBlur={(e) => updateElement(element.id, { content: e.currentTarget.textContent || '' })}
                                                    className="w-full h-full p-3 outline-none cursor-move hover:bg-gray-800 transition-colors bg-gray-900 text-green-400 rounded font-mono"
                                                    style={{
                                                        fontSize: `${element.fontSize}px`,
                                                        whiteSpace: 'pre',
                                                        overflow: 'auto',
                                                    }}
                                                >
                                                    {element.content}
                                                </div>
                                            ) : element.type === 'line' ? (
                                                <div
                                                    className="w-full h-full bg-gray-300"
                                                />
                                            ) : (
                                                <img
                                                    src={element.content}
                                                    alt="Canvas element"
                                                    className="w-full h-full object-contain pointer-events-none"
                                                    draggable={false}
                                                />
                                            )}
                                        </Rnd>
                                    ))}

                                    {/* Empty State */}
                                    {elements.length === 0 && (
                                        <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                                            <div className="text-center">
                                                <IconPhoto size={48} className="mx-auto mb-4 opacity-50" />
                                                <p className="text-lg font-medium">Your canvas is empty</p>
                                                <p className="text-sm mt-2">Click "Add Text" or "Add Image" to start creating</p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Link Dialog */}
            {showLinkDialog && (
                <div className="fixed inset-0 bg-transparent flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
                        <h3 className="text-lg font-semibold text-[rgb(48,48,48)] mb-4">
                            Add Link
                        </h3>
                        <div className="mb-6">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Enter URL:
                            </label>
                            <input
                                type="text"
                                value={linkUrl}
                                onChange={(e) => setLinkUrl(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleLinkSubmit();
                                    } else if (e.key === 'Escape') {
                                        handleLinkCancel();
                                    }
                                }}
                                placeholder="https://example.com"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[rgb(132,42,59)] focus:border-transparent text-[rgb(48,48,48)]"
                                autoFocus
                            />
                        </div>
                        <div className="flex gap-3 justify-end">
                            <button
                                onClick={handleLinkCancel}
                                className="px-4 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleLinkSubmit}
                                disabled={!linkUrl}
                                className="px-4 py-2 bg-[rgb(132,42,59)] hover:bg-[rgb(152,52,69)] text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                OK
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

