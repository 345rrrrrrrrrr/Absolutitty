import { useNavigate } from 'react-router-dom';
import { TEMPLATES } from '../templates';
import type { TemplateCategory } from '../templates';

const CATEGORY_ORDER: TemplateCategory[] = [
  'Mining & Units', 'Safety & Power', 'Defense', 'Displays & Info', 'Logistics',
];

const DIFFICULTY = ['', 'simple', 'intermediate', 'advanced'];

export default function GalleryPage() {
  const navigate = useNavigate();
  return (
    <div>
      <h1 className="mt0">What should your processor do?</h1>
      <p className="muted" style={{ maxWidth: 720 }}>
        Pick a goal, tweak a few options, and copy ready-to-paste <span className="mono">mlog</span> code —
        no programming required. Every template can also be opened in the node editor to see how it works.
      </p>
      {CATEGORY_ORDER.map((category) => {
        const templates = TEMPLATES.filter((t) => t.category === category);
        if (templates.length === 0) return null;
        return (
          <section key={category}>
            <h2 style={{ marginTop: 28 }}>{category}</h2>
            <div className="grid">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="card clickable"
                  onClick={() => navigate(`/wizard/${t.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && navigate(`/wizard/${t.id}`)}
                >
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <h3 style={{ margin: 0 }}>{t.name}</h3>
                    <span className={`badge${t.difficulty === 1 ? ' ok' : t.difficulty === 3 ? ' danger' : ' accent'}`}>
                      {DIFFICULTY[t.difficulty]}
                    </span>
                  </div>
                  <p className="muted" style={{ marginBottom: 0 }}>{t.description}</p>
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
