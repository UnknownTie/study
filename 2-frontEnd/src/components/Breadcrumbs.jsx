import { Link } from 'react-router-dom';
import './Breadcrumbs.css';

// crumbs: [{label, to}] — 마지막 항목은 현재 페이지라 링크 없이 표시된다.
export default function Breadcrumbs({ crumbs }) {
  return (
    <nav className="breadcrumbs">
      <Link to="/" className="btn-ghost">
        전체
      </Link>
      {crumbs.map((c, i) => (
        <span key={i}>
          <span className="crumb-sep">›</span>
          {c.to ? (
            <Link to={c.to} className="btn-ghost">
              {c.label}
            </Link>
          ) : (
            <span className="crumb-current">{c.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
