import PdfButton from './PdfButton.jsx';

export default function Header() {
  return (
    <header className="app-header">
      <div className="header-row">
        <div className="header-title">
          <h1>GuaranIA</h1>
          <span className="offline-badge" role="status">100% OFFLINE</span>
        </div>
        <PdfButton />
      </div>
    </header>
  );
}
