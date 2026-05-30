function DestinationDetailsCard({ routeResult, destinationLabel, selectedRouteOption }) {
  if (!routeResult) {
    return (
      <section className="hn-card destination-details-card empty" aria-label="Destination details">
        <div className="hn-card-head">
          <div className="hn-icon-circle muted" aria-hidden="true">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
              <circle cx="12" cy="10" r="3" />
            </svg>
          </div>
          <div className="hn-card-head-text">
            <span className="hn-eyebrow">Destination Details</span>
            <strong className="hn-card-title">No destination selected</strong>
          </div>
        </div>
        <p className="hn-helper">
          Pick a destination from the dropdown to view floor, distance and the suggested route preview.
        </p>
      </section>
    );
  }

  const destination = routeResult.destination || {};
  const distanceMeters = routeResult.distance_meters;
  const walkingTime = routeResult.walking_time_minutes;
  const floorLabel = String(destination.floor) === "ground-live" ? "Ground Floor" : `Floor ${destination.floor}`;
  const previewSteps = (routeResult.steps || []).slice(0, 3);

  return (
    <section className="hn-card destination-details-card" aria-label="Destination details">
      <div className="hn-card-head">
        <div className="hn-icon-circle accent" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
        </div>
        <div className="hn-card-head-text">
          <span className="hn-eyebrow">Destination</span>
          <strong className="hn-card-title">{destinationLabel || destination.name}</strong>
          {destination.room_number && <span className="hn-room-tag">Room {destination.room_number}</span>}
        </div>
      </div>

      <div className="hn-meta-grid three">
        <div className="hn-meta">
          <span>Floor</span>
          <strong>{floorLabel}</strong>
        </div>
        <div className="hn-meta">
          <span>Distance</span>
          <strong>{distanceMeters}m</strong>
        </div>
        <div className="hn-meta">
          <span>Walking Time</span>
          <strong>{walkingTime} min</strong>
        </div>
      </div>

      {selectedRouteOption && (
        <div className="hn-route-pill-row">
          <span className="hn-route-pill">{selectedRouteOption.badge || selectedRouteOption.name}</span>
          <span className="hn-route-pill-meta">
            {selectedRouteOption.distanceMeters}m · {selectedRouteOption.timeMinutes} min · {selectedRouteOption.turns} turns
          </span>
        </div>
      )}

      {previewSteps.length > 0 && (
        <div className="hn-route-preview">
          <span className="hn-eyebrow">Route Preview</span>
          <ol className="hn-preview-steps">
            {previewSteps.map((step, index) => (
              <li key={`${index}-${step}`}>
                <span className="hn-step-bullet">{index + 1}</span>
                <p>{step}</p>
              </li>
            ))}
            {(routeResult.steps || []).length > previewSteps.length && (
              <li className="more">
                <span className="hn-step-bullet more">+</span>
                <p>{(routeResult.steps || []).length - previewSteps.length} more step(s) on the map</p>
              </li>
            )}
          </ol>
        </div>
      )}
    </section>
  );
}

export default DestinationDetailsCard;
