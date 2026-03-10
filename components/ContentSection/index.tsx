import React from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { dracula } from "react-syntax-highlighter/dist/cjs/styles/prism";

const markdownComponents: Components = {
  code({ inline, className, children, ...props }) {
    const match = /language-(\w+)/.exec(className ?? "");

    return !inline && match ? (
      <SyntaxHighlighter
        style={dracula}
        language={match[1]}
        PreTag="div"
        {...props}
      >
        {String(children).replace(/\n$/, "")}
      </SyntaxHighlighter>
    ) : (
      <code className={className} {...props}>
        {children}
      </code>
    );
  },
};

export interface ContentSectionProps {
  content: string;
}

const ContentSection = ({ content }: ContentSectionProps) => {
  return (
    <ReactMarkdown components={markdownComponents} className="markdown-class">
      {content}
    </ReactMarkdown>
  );
};

export default ContentSection;

