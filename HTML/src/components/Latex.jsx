import katex from 'katex';
import 'katex/dist/katex.min.css';

export function K({ m, d = false }) {
  if (typeof m !== 'string' || !m) return <span style={{color:'red'}}>⚠ пустая формула</span>;
  try {
    const html = katex.renderToString(m, {
      displayMode: d,
      throwOnError: false,
    });
    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  } catch {
    return <span style={{color:'red'}}>⚠ ошибка KaTeX</span>;
  }
}
