"use client";

import React, { useState } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import TableRow from "@tiptap/extension-table-row";
import TableCell from "@tiptap/extension-table-cell";
import TableHeader from "@tiptap/extension-table-header";
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
} from "@tabler/icons-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

export function CreateTemplateComponent() {
    const router = useRouter();
    const [templateName, setTemplateName] = useState("");
    const [templateDescription, setTemplateDescription] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Underline,
            TextAlign.configure({
                types: ["heading", "paragraph"],
            }),
            Image.configure({
                inline: false,
                allowBase64: true,
            }),
            Link.configure({
                openOnClick: false,
                HTMLAttributes: {
                    class: "text-[rgb(132,42,59)] underline",
                },
            }),
            Table.configure({
                resizable: true,
            }),
            TableRow,
            TableHeader,
            TableCell,
        ],
        content: `
      <h1>Template Title</h1>
      <p>Start creating your PDF template here...</p>
      <p>You can format text, add images, tables, and more.</p>
    `,
        editorProps: {
            attributes: {
                class:
                    "prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none min-h-[600px] p-8 bg-white",
            },
        },
        immediatelyRender: false,
    });

    if (!editor) {
        return null;
    }

    const addImage = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = "image/*";
        input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                // Check file size (max 5MB)
                if (file.size > 5 * 1024 * 1024) {
                    toast("Image size should be less than 5MB");
                    return;
                }

                // Convert to base64
                const reader = new FileReader();
                reader.onload = (event) => {
                    const base64 = event.target?.result as string;
                    editor.chain().focus().setImage({ src: base64 }).run();
                    toast("Image added successfully");
                };
                reader.onerror = () => {
                    toast("Failed to load image");
                };
                reader.readAsDataURL(file);
            }
        };
        input.click();
    };

    const addLink = () => {
        const url = window.prompt("Enter URL:");
        if (url) {
            editor.chain().focus().setLink({ href: url }).run();
        }
    };

    const addTable = () => {
        editor
            .chain()
            .focus()
            .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
            .run();
    };

    const handleSaveTemplate = async () => {
        if (!templateName) {
            toast("Please enter a template name");
            return;
        }

        setIsSaving(true);

        try {
            const htmlContent = editor.getHTML();

            // TODO: Send to backend API
            console.log("Saving template:", {
                name: templateName,
                description: templateDescription,
                content: htmlContent,
            });

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
        // TODO: Implement PDF export functionality
        alert("PDF export feature coming soon!");
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
                                    {/* Text Formatting */}
                                    <div className="flex gap-1 border-r border-gray-200 pr-2">
                                        <button
                                            onClick={() => editor.chain().focus().toggleBold().run()}
                                            className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive("bold")
                                                    ? "bg-[rgb(132,42,59)] text-white"
                                                    : "text-gray-600"
                                                }`}
                                            title="Bold"
                                        >
                                            <IconBold size={18} />
                                        </button>
                                        <button
                                            onClick={() => editor.chain().focus().toggleItalic().run()}
                                            className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive("italic")
                                                    ? "bg-[rgb(132,42,59)] text-white"
                                                    : "text-gray-600"
                                                }`}
                                            title="Italic"
                                        >
                                            <IconItalic size={18} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                editor.chain().focus().toggleUnderline().run()
                                            }
                                            className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive("underline")
                                                    ? "bg-[rgb(132,42,59)] text-white"
                                                    : "text-gray-600"
                                                }`}
                                            title="Underline"
                                        >
                                            <IconUnderline size={18} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                editor.chain().focus().toggleStrike().run()
                                            }
                                            className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive("strike")
                                                    ? "bg-[rgb(132,42,59)] text-white"
                                                    : "text-gray-600"
                                                }`}
                                            title="Strikethrough"
                                        >
                                            <IconStrikethrough size={18} />
                                        </button>
                                    </div>

                                    {/* Headings */}
                                    <div className="flex gap-1 border-r border-gray-200 pr-2">
                                        <button
                                            onClick={() =>
                                                editor.chain().focus().toggleHeading({ level: 1 }).run()
                                            }
                                            className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive("heading", { level: 1 })
                                                    ? "bg-[rgb(132,42,59)] text-white"
                                                    : "text-gray-600"
                                                }`}
                                            title="Heading 1"
                                        >
                                            <IconH1 size={18} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                editor.chain().focus().toggleHeading({ level: 2 }).run()
                                            }
                                            className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive("heading", { level: 2 })
                                                    ? "bg-[rgb(132,42,59)] text-white"
                                                    : "text-gray-600"
                                                }`}
                                            title="Heading 2"
                                        >
                                            <IconH2 size={18} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                editor.chain().focus().toggleHeading({ level: 3 }).run()
                                            }
                                            className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive("heading", { level: 3 })
                                                    ? "bg-[rgb(132,42,59)] text-white"
                                                    : "text-gray-600"
                                                }`}
                                            title="Heading 3"
                                        >
                                            <IconH3 size={18} />
                                        </button>
                                    </div>

                                    {/* Alignment */}
                                    <div className="flex gap-1 border-r border-gray-200 pr-2">
                                        <button
                                            onClick={() =>
                                                editor.chain().focus().setTextAlign("left").run()
                                            }
                                            className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive({ textAlign: "left" })
                                                    ? "bg-[rgb(132,42,59)] text-white"
                                                    : "text-gray-600"
                                                }`}
                                            title="Align Left"
                                        >
                                            <IconAlignLeft size={18} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                editor.chain().focus().setTextAlign("center").run()
                                            }
                                            className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive({ textAlign: "center" })
                                                    ? "bg-[rgb(132,42,59)] text-white"
                                                    : "text-gray-600"
                                                }`}
                                            title="Align Center"
                                        >
                                            <IconAlignCenter size={18} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                editor.chain().focus().setTextAlign("right").run()
                                            }
                                            className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive({ textAlign: "right" })
                                                    ? "bg-[rgb(132,42,59)] text-white"
                                                    : "text-gray-600"
                                                }`}
                                            title="Align Right"
                                        >
                                            <IconAlignRight size={18} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                editor.chain().focus().setTextAlign("justify").run()
                                            }
                                            className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive({ textAlign: "justify" })
                                                    ? "bg-[rgb(132,42,59)] text-white"
                                                    : "text-gray-600"
                                                }`}
                                            title="Justify"
                                        >
                                            <IconAlignJustified size={18} />
                                        </button>
                                    </div>

                                    {/* Lists */}
                                    <div className="flex gap-1 border-r border-gray-200 pr-2">
                                        <button
                                            onClick={() =>
                                                editor.chain().focus().toggleBulletList().run()
                                            }
                                            className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive("bulletList")
                                                    ? "bg-[rgb(132,42,59)] text-white"
                                                    : "text-gray-600"
                                                }`}
                                            title="Bullet List"
                                        >
                                            <IconList size={18} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                editor.chain().focus().toggleOrderedList().run()
                                            }
                                            className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive("orderedList")
                                                    ? "bg-[rgb(132,42,59)] text-white"
                                                    : "text-gray-600"
                                                }`}
                                            title="Numbered List"
                                        >
                                            <IconListNumbers size={18} />
                                        </button>
                                    </div>

                                    {/* Insert Elements */}
                                    <div className="flex gap-1 border-r border-gray-200 pr-2">
                                        <button
                                            onClick={addImage}
                                            className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600"
                                            title="Upload Image from PC"
                                        >
                                            <IconPhoto size={18} />
                                        </button>
                                        <button
                                            onClick={addLink}
                                            className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive("link")
                                                    ? "bg-[rgb(132,42,59)] text-white"
                                                    : "text-gray-600"
                                                }`}
                                            title="Insert Link"
                                        >
                                            <IconLink size={18} />
                                        </button>
                                        <button
                                            onClick={addTable}
                                            className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600"
                                            title="Insert Table"
                                        >
                                            <IconTable size={18} />
                                        </button>
                                    </div>

                                    {/* Other */}
                                    <div className="flex gap-1">
                                        <button
                                            onClick={() =>
                                                editor.chain().focus().toggleBlockquote().run()
                                            }
                                            className={`p-2 rounded hover:bg-gray-100 transition-colors ${editor.isActive("blockquote")
                                                    ? "bg-[rgb(132,42,59)] text-white"
                                                    : "text-gray-600"
                                                }`}
                                            title="Quote"
                                        >
                                            <IconQuote size={18} />
                                        </button>
                                        <button
                                            onClick={() =>
                                                editor.chain().focus().setHorizontalRule().run()
                                            }
                                            className="p-2 rounded hover:bg-gray-100 transition-colors text-gray-600"
                                            title="Horizontal Line"
                                        >
                                            <IconSeparator size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Editor Content */}
                            <div className="p-4">
                                <div className="bg-white border border-gray-300 rounded-lg shadow-inner">
                                    <EditorContent editor={editor} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

