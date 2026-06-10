import { useMemo, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getTemplate } from '../templates';
import { generate, defaultValues } from '../templates/generate';
import type { ParamValues } from '../templates';
import ParamForm from '../components/ParamForm';
import CodePane from '../components/CodePane';

export default function WizardPage() {
  const { templateId } = useParams();
  const navigate = useNavigate();
  const template = templateId ? getTemplate(templateId) : undefined;
  const [values, setValues] = useState<ParamValues>(() => (template ? defaultValues(template) : {}));

  const result = useMemo(
    () => (template ? generate(template, { ...defaultValues(template), ...values }) : undefined),
    [template, values],
  );

  if (!template || !result) {
    return <div><h1>Template not found</h1><Link to="/">← back to templates</Link></div>;
  }

  const openInEditor = () => {
    if (!result.graph) return;
    sessionStorage.setItem('pendingGraph', JSON.stringify(result.graph));
    navigate('/editor');
  };

  return (
    <div>
      <Link to="/" className="muted">← all templates</Link>
      <h1 style={{ marginTop: 8, marginBottom: 4 }}>{template.name}</h1>
      <p className="muted" style={{ maxWidth: 760 }}>{template.description}</p>

      <div className="wizard">
        <div>
          <div className="card">
            <h3 className="mt0">Options</h3>
            <ParamForm template={template} values={{ ...defaultValues(template), ...values }} onChange={setValues} />
          </div>
          <div className="card" style={{ marginTop: 16 }}>
            <h3 className="mt0">In-game setup</h3>
            <ol className="steps">
              {template.setupSteps.map((step, i) => <li key={i}>{step}</li>)}
            </ol>
          </div>
        </div>

        <div>
          {result.errors.length > 0 && (
            <div className="lint error" style={{ marginBottom: 10 }}>
              <span className="sev">error</span>
              <span>{result.errors.map((e) => e.message).join(' — ')}</span>
            </div>
          )}
          <CodePane
            code={result.code}
            codeWithoutComments={result.codeWithoutComments}
            instructions={result.instructions}
          />
          <div className="row" style={{ marginTop: 12 }}>
            {result.graph ? (
              <button className="btn secondary" onClick={openInEditor}>
                open in node editor → see how it works
              </button>
            ) : (
              <span className="badge" title="This template uses hand-tuned mlog beyond the node vocabulary.">
                hand-tuned code — node view not available
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
