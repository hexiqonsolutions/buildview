"use client";

import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Link from "@tiptap/extension-link";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Link2,
  Undo2,
  Redo2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { AiEmailToolbar } from "@/components/email/ai-email-toolbar";
import { cn } from "@/lib/utils";

type RichTextEditorProps = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  enableAi?: boolean;
  subject?: string;
  onSubjectChange?: (subject: string) => void;
  contextHtml?: string;
  lead?: {
    contactName?: string;
    company?: string;
    projectType?: string;
  };
};

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write your email…",
  className,
  enableAi = false,
  subject = "",
  onSubjectChange,
  contextHtml,
  lead,
}: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false }),
    ],
    content: value || "<p></p>",
    immediatelyRender: false,
    onUpdate: ({ editor: current }) => {
      onChange(current.getHTML());
    },
    editorProps: {
      attributes: {
        class:
          "prose prose-invert max-w-none min-h-[180px] px-3 py-2 text-sm text-zinc-100 focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [editor, value]);

  if (!editor) return null;

  function insertVariable(token: string) {
    editor?.chain().focus().insertContent(token).run();
  }

  return (
    <div className={cn("space-y-2", className)}>
      {enableAi ? (
        <AiEmailToolbar
          subject={subject}
          bodyHtml={value}
          contextHtml={contextHtml}
          lead={lead}
          onApply={(result) => {
            if (result.subject && onSubjectChange) {
              onSubjectChange(result.subject);
            }
            editor.commands.setContent(result.bodyHtml);
            onChange(result.bodyHtml);
          }}
        />
      ) : null}

      <div className="rounded-xl border border-zinc-800 bg-zinc-950/70">
        <div className="flex flex-wrap items-center gap-1 border-b border-zinc-800 px-2 py-1.5">
          <Tool
            active={editor.isActive("bold")}
            onClick={() => editor.chain().focus().toggleBold().run()}
            label="Bold"
          >
            <Bold className="size-3.5" />
          </Tool>
          <Tool
            active={editor.isActive("italic")}
            onClick={() => editor.chain().focus().toggleItalic().run()}
            label="Italic"
          >
            <Italic className="size-3.5" />
          </Tool>
          <Tool
            active={editor.isActive("bulletList")}
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            label="Bullet list"
          >
            <List className="size-3.5" />
          </Tool>
          <Tool
            active={editor.isActive("orderedList")}
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            label="Ordered list"
          >
            <ListOrdered className="size-3.5" />
          </Tool>
          <Tool
            onClick={() => {
              const url = window.prompt("Link URL");
              if (!url) return;
              editor.chain().focus().setLink({ href: url }).run();
            }}
            label="Link"
          >
            <Link2 className="size-3.5" />
          </Tool>
          <Tool onClick={() => editor.chain().focus().undo().run()} label="Undo">
            <Undo2 className="size-3.5" />
          </Tool>
          <Tool onClick={() => editor.chain().focus().redo().run()} label="Redo">
            <Redo2 className="size-3.5" />
          </Tool>
          <div className="mx-1 h-4 w-px bg-zinc-800" />
          {["{{Name}}", "{{Company}}", "{{Project}}"].map((token) => (
            <Button
              key={token}
              type="button"
              size="sm"
              variant="ghost"
              className="h-8 cursor-pointer px-2 text-[11px] text-orange-300"
              onClick={() => insertVariable(token)}
            >
              {token}
            </Button>
          ))}
        </div>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function Tool({
  children,
  onClick,
  active,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  active?: boolean;
  label: string;
}) {
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      aria-label={label}
      className={cn(
        "size-8 cursor-pointer",
        active && "bg-orange-500/15 text-orange-300"
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}
