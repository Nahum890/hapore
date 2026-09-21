import MobileMenu from './MobileMenu.jsx';
import PdfButton from './PdfButton.jsx';

export default function Header({ activeTab, onChange }) {
  return (
    <header className="app-header">
      <div className="header-row">
        <MobileMenu activeTab={activeTab} onChange={onChange} />
        <div className="header-title">
          <h1>GuaranIA</h1>
          <span className="offline-badge" role="status">100% OFFLINE</span>
        </div>
        <PdfButton />
      </div>
    </header>
  );
}
