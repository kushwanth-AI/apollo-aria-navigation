function NavigationActionPanel({
  hasRoute,
  navigationRunning,
  arrivalComplete,
  onStart,
  onPause,
  onReset,
  onCalibrate,
  onClear
}) {
  const primaryDisabled = !hasRoute || arrivalComplete;
  const primaryLabel = !hasRoute
    ? "Select a destination to start"
    : arrivalComplete
    ? "Arrived"
    : navigationRunning
    ? "Navigation running"
    : "Start Navigation";

  return (
    <section className="hn-card navigation-action-panel" aria-label="Navigation actions">
      <button
        type="button"
        className="hn-primary-cta"
        onClick={onStart}
        disabled={primaryDisabled || navigationRunning}
      >
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 12h14" />
          <path d="M13 5l7 7-7 7" />
        </svg>
        <span>{primaryLabel}</span>
      </button>

      <div className="hn-action-row">
        <button
          type="button"
          className="hn-secondary-cta"
          onClick={onPause}
          disabled={!navigationRunning}
        >
          Pause
        </button>
        <button
          type="button"
          className="hn-secondary-cta"
          onClick={onCalibrate}
          disabled={!hasRoute}
        >
          Calibrate
        </button>
        <button
          type="button"
          className="hn-secondary-cta"
          onClick={onReset}
          disabled={!hasRoute}
        >
          Reset
        </button>
        <button
          type="button"
          className="hn-secondary-cta ghost"
          onClick={onClear}
        >
          New scan
        </button>
      </div>
    </section>
  );
}

export default NavigationActionPanel;
