import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

// Fetch manifest (list of .md files) from /roadmaps/manifest.json
export function useRoadmapList() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${import.meta.env.BASE_URL}roadmaps/manifest.json`)
      .then((r) => r.json())
      .then((list) => {
        setFiles(
          list.map((filename) => ({
            filename,
            slug: filename.replace(/\.md$/, ''),
            title: formatTitle(filename),
          }))
        );
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return { files, loading };
}

// "vorontsov_ml_foundations_roadmap.md" → "Vorontsov — ML Foundations Roadmap"
function formatTitle(filename) {
  const name = filename.replace(/\.md$/, '');
  const parts = name.split('_');
  return parts
    .map((p, i) => (i === 0 ? p.charAt(0).toUpperCase() + p.slice(1) : p))
    .join(' ')
    .replace(/ roadmap/gi, '')
    .replace(/ comparison/gi, ' — сравнение')
    .trim();
}

export function RoadmapViewer() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { files, loading: listLoading } = useRoadmapList();
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!slug && files.length > 0) {
      navigate(files[0].slug, { replace: true });
      return;
    }
    if (!slug) return;

    setLoading(true);
    fetch(`${import.meta.env.BASE_URL}roadmaps/${slug}.md`)
      .then((r) => {
        if (!r.ok) throw new Error('Not found');
        return r.text();
      })
      .then((text) => {
        setContent(text);
        setLoading(false);
      })
      .catch(() => {
        setContent('# Файл не найден\n\nRoadmap не найден на сервере.');
        setLoading(false);
      });
  }, [slug, files, navigate]);

  if (listLoading) {
    return <div className="text-text-dim text-center py-16">Загрузка списка...</div>;
  }

  return (
    <div className="px-2 md:px-0">
      {/* Markdown content */}
      {loading ? (
        <div className="text-text-dim text-center py-16">Загрузка...</div>
      ) : (
        <article className="bg-card rounded-2xl p-3 md:p-6 border border-border prose prose-sm max-w-none
          prose-headings:text-text prose-headings:font-semibold
          prose-h1:text-2xl prose-h1:text-accent prose-h1:border-b prose-h1:border-border prose-h1:pb-3
          prose-h2:text-xl prose-h2:mt-8
          prose-h3:text-lg
          prose-p:text-text-dim prose-p:leading-relaxed
          prose-strong:text-text
          prose-a:text-accent prose-a:no-underline hover:prose-a:underline
          prose-code:text-coral prose-code:bg-accent-light/20 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-xs
          prose-pre:bg-card prose-pre:border prose-pre:border-border prose-pre:rounded-xl
          prose-table:text-sm
          prose-th:text-text prose-th:bg-card prose-th:px-3 prose-th:py-2 prose-th:border prose-th:border-border
          prose-td:text-text-dim prose-td:px-3 prose-td:py-2 prose-td:border prose-td:border-border
          prose-li:text-text-dim
          prose-blockquote:border-accent prose-blockquote:text-text-dim
          prose-hr:border-border
          prose-em:text-text-dim
        ">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>{content}</ReactMarkdown>
        </article>
      )}
    </div>
  );
}
