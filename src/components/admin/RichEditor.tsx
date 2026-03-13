import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import { Bold, Italic, List, ListOrdered, Heading2, Heading3, Quote, Code, Link as LinkIcon, Image as ImageIcon, Undo, Redo } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useCallback } from 'react';

interface RichEditorProps {
  content: string;
  onChange: (html: string) => void;
}

const ToolbarButton = ({ active, onClick, children, title }: { active?: boolean; onClick: () => void; children: React.ReactNode; title: string }) => (
  <button
    type="button"
    onClick={onClick}
    title={title}
    className={`rounded p-1.5 transition-colors ${active ? 'bg-primary/20 text-primary' : 'text-muted-foreground hover:bg-muted hover:text-foreground'}`}
  >
    {children}
  </button>
);

const RichEditor = ({ content, onChange }: RichEditorProps) => {
  const { toast } = useToast();

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false, allowBase64: false }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Start writing...' }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('URL:');
    if (url) {
      editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    }
  }, [editor]);

  const uploadImage = useCallback(async () => {
    if (!editor) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (!file) return;

      const ext = file.name.split('.').pop();
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

      const { error } = await supabase.storage.from('blog-images').upload(path, file);
      if (error) {
        toast({ title: 'Upload failed', description: error.message, variant: 'destructive' });
        return;
      }

      const { data: urlData } = supabase.storage.from('blog-images').getPublicUrl(path);
      editor.chain().focus().setImage({ src: urlData.publicUrl }).run();
    };
    input.click();
  }, [editor, toast]);

  if (!editor) return null;

  return (
    <div className="rounded-lg border border-border bg-background/50 overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border/50 px-2 py-1.5">
        <ToolbarButton active={editor.isActive('bold')} onClick={() => editor.chain().focus().toggleBold().run()} title="Bold">
          <Bold className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('italic')} onClick={() => editor.chain().focus().toggleItalic().run()} title="Italic">
          <Italic className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton active={editor.isActive('heading', { level: 2 })} onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} title="Heading 2">
          <Heading2 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('heading', { level: 3 })} onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()} title="Heading 3">
          <Heading3 className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton active={editor.isActive('bulletList')} onClick={() => editor.chain().focus().toggleBulletList().run()} title="Bullet List">
          <List className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('orderedList')} onClick={() => editor.chain().focus().toggleOrderedList().run()} title="Ordered List">
          <ListOrdered className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('blockquote')} onClick={() => editor.chain().focus().toggleBlockquote().run()} title="Quote">
          <Quote className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton active={editor.isActive('codeBlock')} onClick={() => editor.chain().focus().toggleCodeBlock().run()} title="Code Block">
          <Code className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton active={editor.isActive('link')} onClick={addLink} title="Add Link">
          <LinkIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={uploadImage} title="Upload Image">
          <ImageIcon className="h-3.5 w-3.5" />
        </ToolbarButton>
        <div className="mx-1 h-4 w-px bg-border" />
        <ToolbarButton onClick={() => editor.chain().focus().undo().run()} title="Undo">
          <Undo className="h-3.5 w-3.5" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().redo().run()} title="Redo">
          <Redo className="h-3.5 w-3.5" />
        </ToolbarButton>
      </div>

      {/* Editor */}
      <EditorContent
        editor={editor}
        className="prose prose-invert max-w-none px-4 py-3 min-h-[250px] text-sm focus-within:outline-none
          [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[230px]
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0
          [&_.ProseMirror_h2]:font-mono [&_.ProseMirror_h2]:text-lg [&_.ProseMirror_h2]:font-bold [&_.ProseMirror_h2]:mt-6 [&_.ProseMirror_h2]:mb-3
          [&_.ProseMirror_h3]:font-mono [&_.ProseMirror_h3]:text-base [&_.ProseMirror_h3]:font-semibold [&_.ProseMirror_h3]:mt-4 [&_.ProseMirror_h3]:mb-2
          [&_.ProseMirror_p]:mb-3 [&_.ProseMirror_p]:leading-relaxed
          [&_.ProseMirror_ul]:list-disc [&_.ProseMirror_ul]:pl-6 [&_.ProseMirror_ul]:mb-3
          [&_.ProseMirror_ol]:list-decimal [&_.ProseMirror_ol]:pl-6 [&_.ProseMirror_ol]:mb-3
          [&_.ProseMirror_blockquote]:border-l-2 [&_.ProseMirror_blockquote]:border-primary/50 [&_.ProseMirror_blockquote]:pl-4 [&_.ProseMirror_blockquote]:italic [&_.ProseMirror_blockquote]:text-muted-foreground
          [&_.ProseMirror_pre]:rounded-lg [&_.ProseMirror_pre]:bg-muted [&_.ProseMirror_pre]:p-4 [&_.ProseMirror_pre]:font-mono [&_.ProseMirror_pre]:text-xs
          [&_.ProseMirror_a]:text-primary [&_.ProseMirror_a]:underline
          [&_.ProseMirror_img]:rounded-lg [&_.ProseMirror_img]:max-w-full [&_.ProseMirror_img]:my-4"
      />
    </div>
  );
};

export default RichEditor;
