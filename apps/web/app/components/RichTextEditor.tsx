"use client";

import Link from '@tiptap/extension-link';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import { Bold, Italic, Link as LinkIcon, List, ListOrdered, Youtube as YoutubeIcon } from 'lucide-react';
import React, { useEffect } from 'react';

import { Button } from './ui/button';


interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
}

export function RichTextEditor({ content, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-500 hover:underline',
        },
      }),
      // エディタでは通常のリンクとして表示し、プレビュー時のみYouTube埋め込みに変換
      Link.extend({
        name: 'youtubeLink',
        priority: 1000, // 通常のLinkよりも優先度を高く
        onCreate() {
          // YouTubeリンクを検出するための正規表現
          this.options.pattern = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
        },
        parseHTML() {
          return [
            {
              tag: 'a[href]',
              getAttrs: (node) => {
                const href = node.getAttribute('href');
                if (href && this.options.pattern.test(href)) {
                  return { href };
                }
                return false;
              }
            }
          ];
        },
        renderHTML({ HTMLAttributes }) {
          return ['a', { ...HTMLAttributes, class: 'youtube-link text-blue-500 hover:underline bg-gray-100 px-2 py-1 rounded' }, 0];
        }
      }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // contentプロパティが変更されたときにエディタの内容を更新
  useEffect(() => {
    if (editor && editor.getHTML() !== content) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  if (!editor) {
    return null;
  }

  // YouTubeリンクを挿入する関数（エディタではリンクとして表示）
  const addYoutubeVideo = () => {
    const url = prompt('YouTubeのURLを入力してください');
    if (url) {
      // 通常のリンクとして挿入
      editor.chain().focus().setLink({ href: url }).run();
      
      // リンクにYouTubeクラスを追加
      const linkElement = editor.view.dom.querySelector('a[href="' + url + '"]');
      if (linkElement) {
        linkElement.classList.add('youtube-link');
        linkElement.textContent = '🎬 ' + url;
      }
    }
  };

  const setLink = () => {
    const url = prompt('URLを入力してください');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="flex items-center gap-1 p-2 border-b bg-gray-50">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={editor.isActive('bold') ? 'bg-gray-200' : ''}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={editor.isActive('italic') ? 'bg-gray-200' : ''}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={editor.isActive('bulletList') ? 'bg-gray-200' : ''}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={editor.isActive('orderedList') ? 'bg-gray-200' : ''}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={setLink}
          className={editor.isActive('link') ? 'bg-gray-200' : ''}
        >
          <LinkIcon className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={addYoutubeVideo}
        >
          <YoutubeIcon className="h-4 w-4" />
        </Button>
      </div>
      <EditorContent editor={editor} className="p-4 min-h-[100px] prose max-w-none" />
    </div>
  );
}