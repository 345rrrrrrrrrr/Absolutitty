import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { matchRequest } from '../nl/match';
import { EXAMPLES } from '../nl/corpus';
import { explainTemplate } from '../nl/explain';
import { getTemplate } from '../templates';
import { generate, defaultValues } from '../templates/generate';
import type { ParamValues } from '../templates/types';
import type { MatchOutcome } from '../nl/types';
import { generateWithGemini, getStoredApiKey, storeApiKey, type AIResult } from '../ai/gemini';
import { tokenize, countInstructions } from '../mlog/tokenizer';
import CodePane from '../components/CodePane';
import LintList from '../components/LintList';
import UnderstoodChips from '../components/describe/UnderstoodChips';

type Mode = 'instant' | 'ai';

export default function DescribePage() {
  const [mode, setMode] = useState<Mode>(() => (localStorage.getItem('describeMode') as Mode) ?? 'instant');
  const [text, setText] = useState('');

  // instant (offline parser) state
  const [outcome, setOutcome] = useState<MatchOutcome | null>(null);
  const [templateId, setTemplateId] = useState<string | null>(null);
  const [values, setValues] = useState<ParamValues>({});
  const [extracted, setExtracted] = useState<Set<string>>(new Set());

  // AI state
  const [apiKey, setApiKey] = useState(getStoredApiKey);
  const [showKey, setShowKey] = useState(false);
  const [aiResult, setAiResult] = useState<AIResult | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState('');

  const navigate = useNavigate();

  const switchMode = (next: Mode) => {
    setMode(next);
    localStorage.setItem('describeMode', next);
  };

  const runInstant = (request: string) => {
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

  const runAI = async (request: string) => {
    if (!apiKey) {
      setAiError('Add your Gemini API key first (tap "API key" below the generate button).');
      setShowKey(true);
      return;
    }
    setLoading(true);
    setAiError(null);
    setAiResult(null);
    setProgress('thinking about your request…');
    try {
      storeApiKey(apiKey);
      setAiResult(await generateWithGemini(request, apiKey, setProgress));
    } catch (error) {
      setAiError(error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const run = (request: string) => {
    setText(request);
    if (request.trim() === '') return;
    if (mode === 'ai') void runAI(request);
    else runInstant(request);
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
  const aiInstructionCount = useMemo(
    () => (aiResult ? countInstructions(tokenize(aiResult.code)) : 0),
    [aiResult],
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
        and walk you through the in-game setup.
      </p>

      <div className="row" style={{ marginBottom: 10 }}>
        <button className={`btn small${mode === 'instant' ? '' : ' secondary'}`} onClick={() => switchMode('instant')}>
          ⚡ instant (offline)
        </button>
        <button className={`btn small${mode === 'ai' ? '' : ' secondary'}`} onClick={() => switchMode('ai')}>
          ✦ AI (Gemini)
        </button>
        {mode === 'ai' && (
          <span className="muted" style={{ fontSize: 12.5 }}>
            handles any request — needs an API key, answers take a few seconds
          </span>
        )}
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); run(text); } }}
        rows={3}
        placeholder={mode === 'ai'
          ? 'anything you can imagine — e.g. "draw a smiley face on a display that winks every 2 seconds"'
          : 'e.g. "make my monos mine titanium"'}
        style={{ width: '100%', fontSize: 16, fontFamily: 'var(--sans)' }}
      />
      <div className="row" style={{ margin: '10px 0 6px' }}>
        <button className="btn" onClick={() => run(text)} disabled={text.trim() === '' || loading}>
          {loading ? '… thinking' : '⚒ generate'}
        </button>
        <span className="muted" style={{ fontSize: 13 }}>or try:</span>
        {EXAMPLES.slice(0, 3).map((example) => (
          <button key={example} className="chip assumed" onClick={() => run(example)}>{example}</button>
        ))}
        {mode === 'ai' && (
          <button className="chip assumed" onClick={() => setShowKey(!showKey)}>⚙ API key</button>
        )}
      </div>

      {mode === 'ai' && showKey && (
        <div className="card" style={{ maxWidth: 640, marginBottom: 12 }}>
          <label style={{ fontWeight: 600, fontSize: 13 }}>Gemini API key</label>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => { setApiKey(e.target.value); storeApiKey(e.target.value); }}
            placeholder="paste your key from aistudio.google.com"
            style={{ margin: '6px 0' }}
          />
          <div className="muted" style={{ fontSize: 12.5 }}>
            Stored only in this browser — it is never uploaded anywhere except directly to Google.
            Get a free key at <a href="https://aistudio.google.com/apikey" target="_blank" rel="noreferrer">aistudio.google.com/apikey</a>.
          </div>
        </div>
      )}

      {/* ───────── AI mode results ───────── */}
      {mode === 'ai' && aiError && (
        <div className="lint error" style={{ maxWidth: 760 }}>
          <span className="sev">error</span><span>{aiError}</span>
        </div>
      )}
      {mode === 'ai' && loading && (
        <div className="card" style={{ maxWidth: 760 }}>
          <span className="muted">✦ {progress}</span>
          <div className="muted" style={{ fontSize: 12.5, marginTop: 6 }}>
            Deep mode: the AI thinks first, the validator checks every draft, broken drafts get
            rewritten, and the final code gets a logic review. Worth the wait.
          </div>
        </div>
      )}
      {mode === 'ai' && aiResult && !loading && (
        <div className="wizard" style={{ marginTop: 14 }}>
          <div>
            {aiResult.setupSteps.length > 0 && (
              <div className="card">
                <h3 className="mt0">Step-by-step setup</h3>
                <ol className="steps">
                  {aiResult.setupSteps.map((step, i) => <li key={i}>{step}</li>)}
                </ol>
              </div>
            )}
            {aiResult.explanation.length > 0 && (
              <div className="card" style={{ marginTop: 14 }}>
                <h3 className="mt0">What each part does</h3>
                {aiResult.explanation.map((section, i) => (
                  <div key={i} style={{ marginBottom: 12 }}>
                    <div style={{ fontWeight: 650, color: 'var(--accent)', fontSize: 14 }}>{i + 1}. {section.title}</div>
                    <div className="muted" style={{ fontSize: 13.5 }}>{section.body}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <CodePane code={aiResult.code} instructions={aiInstructionCount} title="AI-generated mlog" />
            <div style={{ marginTop: 10 }}>
              <LintList lints={aiResult.lints} />
              <div className="row" style={{ marginTop: 4 }}>
                <span className="badge">{aiResult.rounds} draft{aiResult.rounds === 1 ? '' : 's'}</span>
                {aiResult.reviewed && <span className="badge ok">logic reviewed ✓</span>}
                {aiResult.lints.length > 0 && (
                  <span className="muted" style={{ fontSize: 12.5 }}>
                    still imperfect after {aiResult.rounds} tries — tap generate to try a fresh approach
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ───────── instant mode results ───────── */}
      {mode === 'instant' && outcome && !outcome.best && (
        <div className="card" style={{ marginTop: 16, maxWidth: 760 }}>
          <h3 className="mt0">Hmm, I didn't quite catch that.</h3>
          <p className="muted">
            Try mentioning <em>what should happen</em> and <em>when</em> — for example
            “turn off the drill when power is low”, or “warn me when enemies come”.
            For unusual requests, try the <strong>✦ AI</strong> mode above.
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

      {mode === 'instant' && template && result && (
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
