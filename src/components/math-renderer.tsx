
"use client";

import React from 'react';
import Latex from 'react-latex-next';

interface MathRendererProps {
  content: string;
  className?: string;
}

const MathRenderer: React.FC<MathRendererProps> = ({ content, className }) => {
  if (!content) {
    return null;
  }

  // Check if the content likely contains LaTeX (simplistic check for $ or \)
  // react-latex-next handles non-LaTeX content gracefully by rendering it as is.
  return (
    <div className={className}>
      <Latex>{content}</Latex>
    </div>
  );
};

export default MathRenderer;
