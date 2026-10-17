import { CircleCheck, Info, Lightbulb, TriangleAlert } from 'lucide-preact';
import { Rich } from '../ui/RichText';
import { Diagram } from './diagrams';
import type { Block } from './types';

const CALLOUT_ICON = { info: Info, tip: Lightbulb, warn: TriangleAlert, ok: CircleCheck };

export function Blocks({ blocks }: { blocks: Block[] }) {
  return (
    <div class="prose">
      {blocks.map((block, index) => {
        switch (block.t) {
          case 'p':
            return (
              <p key={index}>
                <Rich text={block.text} />
              </p>
            );
          case 'h':
            return <h4 key={index}>{block.text}</h4>;
          case 'list': {
            const items = block.items.map((item, i) => (
              <li key={i}>
                <Rich text={item} />
              </li>
            ));
            return block.ordered ? <ol key={index}>{items}</ol> : <ul key={index}>{items}</ul>;
          }
          case 'callout': {
            const Icon = CALLOUT_ICON[block.kind];
            return (
              <div key={index} class={`callout callout-${block.kind}`}>
                <Icon aria-hidden="true" />
                <div>
                  {block.title && <strong class="callout-title">{block.title}</strong>}
                  <p>
                    <Rich text={block.text} />
                  </p>
                </div>
              </div>
            );
          }
          case 'code':
            return (
              <figure key={index} class="code-block">
                <pre class="mono">{block.lines.join('\n')}</pre>
                {block.caption && <figcaption>{block.caption}</figcaption>}
              </figure>
            );
          case 'table':
            return (
              <div key={index} class="table-wrap">
                <table class="table">
                  <thead>
                    <tr>
                      {block.head.map((h) => (
                        <th key={h}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {block.rows.map((row, r) => (
                      <tr key={r}>
                        {row.map((cell, c) => (
                          <td key={c}>
                            <Rich text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          case 'figure':
            return (
              <figure key={index} class="diagram">
                <Diagram id={block.id} />
                <figcaption>{block.caption}</figcaption>
              </figure>
            );
          case 'terms':
            return (
              <dl key={index} class="terms">
                {block.items.map(([term, def]) => (
                  <div key={term}>
                    <dt>{term}</dt>
                    <dd>
                      <Rich text={def} />
                    </dd>
                  </div>
                ))}
              </dl>
            );
        }
      })}
    </div>
  );
}
