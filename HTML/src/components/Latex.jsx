import katex from 'katex';
import 'katex/dist/katex.min.css';

export function K({ m, d = false }) {
  const html = katex.renderToString(m, {
    displayMode: d,
    throwOnError: false,
  });
  return <span dangerouslySetInnerHTML={{ __html: html }} />;
}
