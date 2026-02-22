import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { Placeholder } from '@tiptap/extension-placeholder';
import { forwardRef, useImperativeHandle, useEffect } from 'react';
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, Heading3,
  AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Table as TableIcon,
  Undo, Redo, Minus,
} from 'lucide-react';

export interface TipTapEditorRef {
  insertContent: (content: string) => void;
  getHTML: () => string;
}

interface TipTapEditorProps {
  content: string;
  onChange?: (html: string) => void;
  editable?: boolean;
  placeholder?: string;
  minHeight?: string;
}

function ToolbarButton({ onClick, isActive, icon: Icon, title }: {
  onClick: () => void;
  isActive?: boolean;
  icon: React.ElementType;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className={`p-1.5 rounded transition-colors ${
        isActive ? 'bg-primary-100 text-primary-700' : 'text-slate-500 hover:bg-slate-100 hover:text-slate-700'
      }`}
    >
      <Icon className="w-4 h-4" />
    </button>
  );
}

function ToolbarDivider() {
  return <div className="w-px h-5 bg-slate-200 mx-1" />;
}

const TipTapEditor = forwardRef<TipTapEditorRef, TipTapEditorProps>(
  ({ content, onChange, editable = true, placeholder, minHeight = '400px' }, ref) => {
    const editor = useEditor({
      extensions: [
        StarterKit.configure({
          heading: { levels: [1, 2, 3] },
        }),
        Underline,
        TextAlign.configure({
          types: ['heading', 'paragraph'],
        }),
        Table.configure({ resizable: true }),
        TableRow,
        TableCell,
        TableHeader,
        Placeholder.configure({
          placeholder: placeholder || '내용을 입력하세요...',
        }),
      ],
      content,
      editable,
      onUpdate: ({ editor }) => {
        onChange?.(editor.getHTML());
      },
    });

    useImperativeHandle(ref, () => ({
      insertContent: (text: string) => {
        editor?.chain().focus().insertContent(text).run();
      },
      getHTML: () => editor?.getHTML() || '',
    }));

    // Sync editable prop
    useEffect(() => {
      if (editor && editor.isEditable !== editable) {
        editor.setEditable(editable);
      }
    }, [editor, editable]);

    if (!editor) return null;

    return (
      <div className="tiptap-editor border border-slate-300 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-primary-500 focus-within:border-primary-500 transition-all">
        {/* Toolbar */}
        {editable && (
          <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5 bg-slate-50 border-b border-slate-200">
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBold().run()}
              isActive={editor.isActive('bold')}
              icon={Bold} title="굵게"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleItalic().run()}
              isActive={editor.isActive('italic')}
              icon={Italic} title="기울임"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleUnderline().run()}
              isActive={editor.isActive('underline')}
              icon={UnderlineIcon} title="밑줄"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleStrike().run()}
              isActive={editor.isActive('strike')}
              icon={Strikethrough} title="취소선"
            />

            <ToolbarDivider />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              isActive={editor.isActive('heading', { level: 1 })}
              icon={Heading1} title="제목 1"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              isActive={editor.isActive('heading', { level: 2 })}
              icon={Heading2} title="제목 2"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              isActive={editor.isActive('heading', { level: 3 })}
              icon={Heading3} title="제목 3"
            />

            <ToolbarDivider />

            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              isActive={editor.isActive({ textAlign: 'left' })}
              icon={AlignLeft} title="왼쪽 정렬"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              isActive={editor.isActive({ textAlign: 'center' })}
              icon={AlignCenter} title="가운데 정렬"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              isActive={editor.isActive({ textAlign: 'right' })}
              icon={AlignRight} title="오른쪽 정렬"
            />

            <ToolbarDivider />

            <ToolbarButton
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              isActive={editor.isActive('bulletList')}
              icon={List} title="글머리 기호"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              isActive={editor.isActive('orderedList')}
              icon={ListOrdered} title="번호 목록"
            />

            <ToolbarDivider />

            <ToolbarButton
              onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
              icon={TableIcon} title="표 삽입"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().setHorizontalRule().run()}
              icon={Minus} title="구분선"
            />

            <ToolbarDivider />

            <ToolbarButton
              onClick={() => editor.chain().focus().undo().run()}
              icon={Undo} title="실행 취소"
            />
            <ToolbarButton
              onClick={() => editor.chain().focus().redo().run()}
              icon={Redo} title="다시 실행"
            />
          </div>
        )}

        {/* Editor Content */}
        <EditorContent
          editor={editor}
          className="bg-white"
          style={{ '--editor-min-height': minHeight } as React.CSSProperties}
        />
      </div>
    );
  }
);

TipTapEditor.displayName = 'TipTapEditor';

export default TipTapEditor;
