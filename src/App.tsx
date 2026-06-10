import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom';
import GalleryPage from './pages/GalleryPage';
import WizardPage from './pages/WizardPage';
import EditorPage from './pages/EditorPage';
import ReferencePage from './pages/ReferencePage';
import ValidatorPage from './pages/ValidatorPage';
import DisplayPage from './pages/DisplayPage';

const icon = {
  gallery: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>,
  editor: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="6" cy="6" r="3"/><circle cx="18" cy="18" r="3"/><path d="M9 6h6a3 3 0 0 1 3 3v6"/></svg>,
  reference: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>,
  validator: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>,
  display: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>,
};

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const flush = location.pathname.startsWith('/editor');
  return (
    <div className="shell">
      <nav className="sidebar">
        <div className="brand">
          ⚙ mlog Forge
          <small>Mindustry logic generator</small>
        </div>
        <NavLink to="/" end className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}>{icon.gallery} Templates</NavLink>
        <NavLink to="/editor" className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}>{icon.editor} Node Editor</NavLink>
        <NavLink to="/validator" className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}>{icon.validator} Validator</NavLink>
        <NavLink to="/display" className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}>{icon.display} Display Preview</NavLink>
        <NavLink to="/reference" className={({ isActive }) => `navlink${isActive ? ' active' : ''}`}>{icon.reference} Reference</NavLink>
        <div className="foot">
          free &amp; open source<br />
          paste code in-game via<br />
          <span className="mono">Edit → Import from clipboard</span>
        </div>
      </nav>
      <main className={`main${flush ? ' flush' : ''}`}>{children}</main>
    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Shell>
        <Routes>
          <Route path="/" element={<GalleryPage />} />
          <Route path="/wizard/:templateId" element={<WizardPage />} />
          <Route path="/editor" element={<EditorPage />} />
          <Route path="/reference" element={<ReferencePage />} />
          <Route path="/validator" element={<ValidatorPage />} />
          <Route path="/display" element={<DisplayPage />} />
        </Routes>
      </Shell>
    </HashRouter>
  );
}
