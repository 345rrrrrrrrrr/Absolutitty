import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { validate } from '../mlog/validator';
import { tokenize, countInstructions } from '../mlog/tokenizer';
import { MAX_INSTRUCTIONS } from '../mlog/spec';
import LintList from '../components/LintList';

const SAMPLE = `# paste your mlog here — or try this broken example
sensor cryo reactor1 @cryofluid
jump 9 greaterThan cryo 10
control enable reactor1 0 0 0 0
print "low coolant!"
end`;

export default function ValidatorPage() {
  const [source, setSource] = useState(SAMPLE);
  const navigate = useNavigate();
  const lints = useMemo(() => validate(source), [source]);
  const instructions = useMemo(() => countInstructions(tokenize(source)), [source]);

  return (
    <div>
      <h1 className="mt0">Code Validator</h1>
      <p className="muted" style={{ maxWidth: 720 }}>
        Paste any mlog code to check it before importing in-game: unknown instructions, wrong argument
        counts, bad jump targets, missing flushes and more.
      </p>
      <div className="row" style={{ marginBottom: 8 }}>
        <span className={`badge${instructions > MAX_INSTRUCTIONS ? ' danger' : ''}`}>
          {instructions} / {MAX_INSTRUCTIONS} instructions
        </span>
        <button
          className="btn secondary small"
          onClick={() => {
            sessionStorage.setItem('displayCode', source);
            navigate('/display');
          }}
        >
          preview draw output →
        </button>
      </div>
      <textarea
        value={source}
        onChange={(e) => setSource(e.target.value)}
        rows={16}
        spellCheck={false}
        style={{ width: '100%' }}
      />
      <h3>Results</h3>
      <LintList lints={lints} />
    </div>
  );
}
