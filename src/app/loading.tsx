export default function Loading() {
  return <div className="loading-shell"><aside><div className="skeleton skeleton-logo" />{Array.from({ length: 6 }, (_, i) => <div key={i} className="skeleton skeleton-nav" />)}</aside><main><div className="skeleton skeleton-heading" /><div className="skeleton skeleton-subheading" /><div className="loading-stat-grid">{Array.from({ length: 4 }, (_, i) => <div className="skeleton" key={i} />)}</div><div className="loading-content-grid"><div className="skeleton" /><div className="skeleton" /></div><div className="skeleton loading-bottom" /></main></div>;
}
