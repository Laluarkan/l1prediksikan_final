'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null;

  // Membagi konten berdasarkan baris untuk parsing sederhana dan aman
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let currentList: string[] = [];
  let listKey = 0;

  const flushList = () => {
    if (currentList.length > 0) {
      elements.push(
        <ul key={`list-${listKey++}`} className="my-4 space-y-2 list-disc list-inside text-slate-700 leading-relaxed pl-2">
          {currentList.map((item, idx) => (
            <li key={idx} className="marker:text-blue-600">
              {renderInline(item)}
            </li>
          ))}
        </ul>
      );
      currentList = [];
    }
  };

  const renderInline = (text: string) => {
    // Parsing images (![alt](url)), bold (**text**), code (`text`), dan link ([text](url))
    const parts: React.ReactNode[] = [];
    let remaining = text;
    let keyIdx = 0;

    const regex = /(!\[([^\]]*)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`|\[([^\]]+)\]\(([^)]+)\))/;

    while (remaining) {
      const match = remaining.match(regex);
      if (!match || match.index === undefined) {
        parts.push(remaining);
        break;
      }

      if (match.index > 0) {
        parts.push(remaining.substring(0, match.index));
      }

      const fullMatch = match[0];
      if (fullMatch.startsWith('![')) {
        parts.push(
          <img
            key={keyIdx++}
            src={match[3]}
            alt={match[2] || ''}
            className="inline-block w-4 h-4 object-contain align-middle mx-1"
            onError={(e) => { (e.target as any).src = '/default-logo.svg'; }}
          />
        );
      } else if (fullMatch.startsWith('**')) {
        parts.push(<strong key={keyIdx++} className="font-semibold text-slate-900">{match[4]}</strong>);
      } else if (fullMatch.startsWith('`')) {
        parts.push(
          <code key={keyIdx++} className="px-1.5 py-0.5 bg-slate-100 text-blue-700 rounded font-mono text-xs border border-slate-200">
            {match[5]}
          </code>
        );
      } else if (fullMatch.startsWith('[')) {
        const linkUrl = (match[7] || '').trim();
        const linkText = match[6];
        // Validasi protokol URL: hanya izinkan https://, http://, atau internal route (/)
        // Cegah XSS via javascript:, data:, atau vbscript:
        const isSafeUrl = /^(https?:\/\/|\/|#)/i.test(linkUrl) && !linkUrl.toLowerCase().startsWith('javascript:');
        const isExternal = /^https?:\/\//i.test(linkUrl);

        if (isSafeUrl) {
          parts.push(
            <a
              key={keyIdx++}
              href={linkUrl}
              target={isExternal ? '_blank' : undefined}
              rel={isExternal ? 'noopener noreferrer' : undefined}
              className="text-blue-600 hover:text-blue-800 underline font-medium"
            >
              {linkText}
            </a>
          );
        } else {
          // Render teks murni tanpa hyperlink berbahaya jika URL tidak valid
          parts.push(<span key={keyIdx++} className="font-medium text-slate-800">{linkText}</span>);
        }
      }

      remaining = remaining.substring(match.index + fullMatch.length);
    }

    return parts;
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      currentList.push(trimmed.substring(2));
      return;
    }

    // Jika bukan baris list, flush list sebelumnya jika ada
    flushList();

    if (trimmed === '') {
      return;
    }

    if (trimmed.startsWith('### ')) {
      elements.push(
        <h3 key={index} className="text-xl font-bold text-slate-900 mt-8 mb-3 tracking-tight">
          {renderInline(trimmed.substring(4))}
        </h3>
      );
    } else if (trimmed.startsWith('## ')) {
      elements.push(
        <h2 key={index} className="text-2xl font-bold text-slate-900 mt-10 mb-4 pb-2 border-b border-slate-200 tracking-tight">
          {renderInline(trimmed.substring(3))}
        </h2>
      );
    } else if (trimmed.startsWith('# ')) {
      elements.push(
        <h1 key={index} className="text-3xl font-extrabold text-slate-900 mt-8 mb-4 tracking-tight">
          {renderInline(trimmed.substring(2))}
        </h1>
      );
    } else if (trimmed.startsWith('> ')) {
      elements.push(
        <blockquote key={index} className="my-5 p-4 border-l-4 border-blue-500 bg-blue-50/50 rounded-r-lg text-slate-700 italic">
          {renderInline(trimmed.substring(2))}
        </blockquote>
      );
    } else if (trimmed === '---') {
      elements.push(<hr key={index} className="my-8 border-slate-200" />);
    } else {
      elements.push(
        <p key={index} className="my-4 text-slate-700 leading-relaxed text-base md:text-lg">
          {renderInline(trimmed)}
        </p>
      );
    }
  });

  flushList();

  return <div className="editorial-prose text-slate-800 font-sans">{elements}</div>;
}

