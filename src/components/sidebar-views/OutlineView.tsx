import React from 'react';
import { OutlinePanel } from '../Outline/OutlinePanel';

interface OutlineViewProps {
  editorContent: string;
  selectedFile: string | null;
}

export function OutlineView({ editorContent, selectedFile }: OutlineViewProps) {
  return <OutlinePanel articleId={selectedFile} editorContent={editorContent} />;
}
