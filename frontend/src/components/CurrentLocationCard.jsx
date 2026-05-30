function CurrentLocationCard({ scanPayload, currentLocationLabel, floorLabel }) {
  const qrStatus = scanPayload ? "QR scan verified" : "Awaiting QR scan";
  const qrId = scanPayload?.location_id || "Not scanned";

  return (
    <section className="hn-card current-location-card" aria-label="Current location">
      <div className="hn-card-head">
        <div className="hn-icon-circle" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s-7-7.58-7-12a7 7 0 0 1 14 0c0 4.42-7 12-7 12z" />
            <circle cx="12" cy="10" r="2.5" />
          </svg>
        </div>
        <div className="hn-card-head-text">
          <span className="hn-eyebrow">Current Location</span>
          <strong className="hn-card-title">{currentLocationLabel}</strong>
        </div>
        <span className={`hn-status-chip ${scanPayload ? "ok" : "pending"}`}>{qrStatus}</span>
      </div>

      <div className="hn-meta-grid">
        <div className="hn-meta">
          <span>Floor</span>
          <strong>{floorLabel}</strong>
        </div>
        <div className="hn-meta">
          <span>QR Checkpoint</span>
          <strong className="hn-mono">{qrId}</strong>
        </div>
      </div>
    </section>
  );
}

export default CurrentLocationCard;
