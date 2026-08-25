import { useState } from 'react';
import Terminal from './Terminal';
import './ContentBlocks.css';

// concepts(문자열)/example/explain 은 문자열(하위호환) 또는 블록 배열일 수 있다.
// 블록: {type:'text', html}, {type:'terminal', lines:[{prompt,cmd},{out}]}, {type:'image', src, alt, caption},
//      {type:'table', headers:[...], rows:[[...], ...]} (각 셀은 HTML 문자열 가능),
//      {type:'accordion', items:[{title, body}]} (body는 문자열 또는 블록 배열 — ContentBlocks로 재귀 렌더링, 항목별로 접고 펼침)
function normalize(content) {
  if (content === null || content === undefined) return [];
  if (typeof content === 'string') return [{ type: 'text', html: content }];
  return content;
}

function linesToTermHtml(lines) {
  return lines
    .map((line) => {
      if (line.prompt !== undefined || line.cmd !== undefined) {
        return `<span class="prompt">${line.prompt ?? ''}</span> <span class="cmd">${line.cmd ?? ''}</span>`;
      }
      if (line.out !== undefined) return `<span class="out">${line.out}</span>`;
      if (line.cmt !== undefined) return `<span class="cmt">${line.cmt}</span>`;
      return '';
    })
    .join('\n');
}

function AccordionItem({ title, body }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="accordion-item">
      <button className="accordion-toggle" onClick={() => setOpen((o) => !o)}>
        <span className="accordion-caret">{open ? '▾' : '▸'}</span>
        <span dangerouslySetInnerHTML={{ __html: title }} />
      </button>
      {open && (
        <div className="accordion-body">
          <ContentBlocks content={body} />
        </div>
      )}
    </div>
  );
}

export default function ContentBlocks({ content }) {
  const blocks = normalize(content);
  if (blocks.length === 0) return null;

  return (
    <div className="content-blocks">
      {blocks.map((block, i) => {
        if (block.type === 'terminal') {
          const html = block.lines ? linesToTermHtml(block.lines) : block.html;
          return <Terminal key={i} html={html} />;
        }
        if (block.type === 'table') {
          return (
            <div className="content-table-wrap" key={i}>
              <table className="content-table">
                {block.headers && (
                  <thead>
                    <tr>
                      {block.headers.map((h, hi) => (
                        <th key={hi} dangerouslySetInnerHTML={{ __html: h }} />
                      ))}
                    </tr>
                  </thead>
                )}
                <tbody>
                  {block.rows.map((row, ri) => (
                    <tr key={ri}>
                      {row.map((cell, ci) => (
                        <td key={ci} dangerouslySetInnerHTML={{ __html: cell }} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        }
        if (block.type === 'accordion') {
          return (
            <div className="accordion" key={i}>
              {block.items.map((item, ii) => (
                <AccordionItem key={ii} title={item.title} body={item.body} />
              ))}
            </div>
          );
        }
        if (block.type === 'image') {
          return (
            <figure className="content-image" key={i}>
              <img src={block.src} alt={block.alt || ''} />
              {block.caption && <figcaption>{block.caption}</figcaption>}
            </figure>
          );
        }
        // text (기본)
        return <p key={i} dangerouslySetInnerHTML={{ __html: block.html }} />;
      })}
    </div>
  );
}
