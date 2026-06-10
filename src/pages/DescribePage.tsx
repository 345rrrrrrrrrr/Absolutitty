import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { matchRequest } from '../nl/match';
import { EXAMPLES } from '../nl/corpus';
import { explainTemplate } from '../nl/explain';
import { getTemplate } from '../templates';
import { generate, defaultValues } from '../templates/generate';
import type { ParamValues } from '../templates/types';
import type { MatchOutcome } from '../nl/types';
import CodePane from '../components/CodePane';
import UnderstoodChips from '../components/describe/UnderstoodChips';

export default function DescribePage() {
  const [text, setText] = useState('');
  const [outcome, setOutcome] = useState<MatchOutcome | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [values, setValues] = useState<ParamValues>({});
  const [extracted, setExtracted] = useState<Set<string>>(new Set());
  const navigate = useNavigate();

  const run = (request: string) => {
    setText(request);
    const result = matchRequest(request);
    setOutcome(result);
    if (result.best) {
      setTemplateId(result.best.templateId);
      setValues(result.best.values);
      setExtracted(result.best.extracted);
    } else {
      setTemplateId(null);
    }
  };

  const switchTemplate = (id: string) => {
    const template = getTemplate(id);
    if (!template) return;
    setTemplateId(id);
    setValues(defaultValues(template));
    setExtracted(new Set());
  };

  const template = templateId ? getTemplate(templateId) : undefined;
  const result = useMemo(
    () => (template ? generate(template, values) : undefined),
    [template, values],
  );
  const sections = useMemo(
    () => (template ? explainTemplate(template, values) : []),
    [template, values],
  );

  const openInEditor = () => {
    if (!result?.graph) return;
    sessionStorage.setItem('pendingGraph', JSON.stringify(result.graph));
    navigate('/editor');
  };

  return (
    <div>
      <h1 className="mt0">Describe what you want</h1>
      <p className="muted" style={{ maxWidth: 720 }}>
        Tell me in plain words what your processor should do — I'll write the code, explain every part,
        and walk you through the in-game setup. Tap any amber chip to correct me.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(text); } }}
        rows={3}
        placeholder='e.g. "make my monos mine titanium"'
        style={{ width: '100%', fontSize: 16, fontFamily: 'var(--sans)' }}
      />
      <div className="row" style={{ margin: '10px 0 6px' }}>
        <button className="btn" onClick={() => run(text)} disabled={text.trim() === ''}>⚒ generate</button>
        <span className="muted" style={{ fontSize: 13 }}>or try:</span>
        {EXAMPLES.slice(0, 3).map((example) => (
          <button key={example} className="chip assumed" onClick={() => run(example)}>{example}</button>
        ))}
      </div>

      {outcome && !outcome.best && (
        <div className="card" style={{ marginTop: 16, maxWidth: 760 }}>
          <h3 className="mt0">Hmm, I didn't quite catch that.</h3>
          <p className="muted">
            Try mentioning <em>what should happen</em> and <em>when</em> — for example
            “turn off the drill when power is low”, or “warn me when enemies come”.
          </p>
          {outcome.alternatives.length > 0 && (
            <>
              <p style={{ marginBottom: 8 }}>Closest matches:</p>
              <div className="row">
                {outcome.alternatives.map((alt) => {
                  const t = getTemplate(alt.templateId)!;
                  return <Link key={alt.templateId} className="chip goal" to={`/wizard/${alt.templateId}`}>{t.name} →</Link>;
                })}
              </div>
            </>
          )}
          <p className="muted" style={{ marginBottom: 0, fontSize: 13 }}>
            …or browse all <Link to="/">templates</Link>.
          </p>
        </div>
      )}

      {template && result && (
        <div style={{ marginTop: 14 }}>
          <UnderstoodChips
            template={template}
            values={values}
            extracted={extracted}
            onChange={setValues}
            onSwitchTemplate={switchTemplate}
          />

          {outcome?.best?.also && outcome.best.templateId === template.id && (() => {
            const alsoTemplate = getTemplate(outcome.best!.also!.templateId);
            return alsoTemplate ? (
              <div className="lint hint" style={{ marginTop: 10, maxWidth: 760 }}>
                <span className="sev">also</span>
                <span>
                  I also spotted <strong>{alsoTemplate.name}</strong> in there. Each processor runs one
                  program — <Link to={`/wizard/${alsoTemplate.id}`}>set that up for a second processor →</Link>
                </span>
              </div>
            ) : null;
          })()}

          <div className="wizard" style={{ marginTop: 16 }}>
            <div>
              <div className="card">
                <h3 className="mt0">Step-by-step setup</h3>
                <ol className="steps">
                  {template.setupSteps.map((step, i) => <li key={i}>{step}</li>)}
                </ol>
              </div>
              <div className="card" style={{ marginTop: 14 }}>
                <h3 className="mt0">What each part does</h3>
                {sections.map((section, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 650, color: 'var(--accent)', fontSize: 14 }}>{i + 1}. {section.title}</div>
                    <div className="muted" style={{ fontSize: 13.5 }}>{section.body}</div>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <CodePane
                code={result.code}
                codeWithoutComments={result.codeWithoutComments}
                instructions={result.instructions}
              />
              <div className="row" style={{ marginTop: 12 }}>
                <Link className="btn secondary" to={`/wizard/${template.id}`}>open full wizard</Link>
                {result.graph && (
                  <button className="btn secondary" onClick={openInEditor}>see it as nodes →</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
