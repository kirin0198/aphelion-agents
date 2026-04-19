// remark plugin: ```mermaid``` コードブロックを <pre class="mermaid"> 要素に変換し、
// クライアントサイドの mermaid.js が描画できるようにする。
// Starlight の既定 syntax highlighter (expressive-code) は mermaid を
// 単なる code block として扱うため、本プラグインで node 型を html に差し替える。
import { visit } from 'unist-util-visit';

export default function remarkMermaid() {
  return (tree) => {
    visit(tree, 'code', (node) => {
      if (node.lang !== 'mermaid') return;
      const escaped = node.value
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
      node.type = 'html';
      node.value = `<pre class="mermaid">${escaped}</pre>`;
      delete node.lang;
      delete node.meta;
    });
  };
}
