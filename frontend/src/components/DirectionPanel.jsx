function DirectionPanel({ steps, route, selectedFloor, currentFloor, destinationFloor, distanceMeters, walkingTimeMinutes }) {
  const visiblePoints = route.filter((point) => String(point.floor) === String(selectedFloor));
  const isTransitionFloor = String(selectedFloor) === String(currentFloor) || String(selectedFloor) === String(destinationFloor);

  return (
    <aside className="directions-card">
      <div>
        <p className="eyebrow">Directions</p>
        <h2>Step-by-step</h2>
      </div>

      {distanceMeters && (
        <div className="floor-route-note">
          <strong>{distanceMeters}m estimated</strong>
          <span>{walkingTimeMinutes} min walking time</span>
        </div>
      )}

      <ol className="steps-list">
        {steps.map((step, index) => (
          <li key={step} className={step.toLowerCase().includes("lift") ? "lift-step" : ""}>
            <span>{index + 1}</span>
            <p>{step}</p>
          </li>
        ))}
      </ol>

      <div className="floor-route-note">
        <strong>Floor {selectedFloor} route points</strong>
        <span>{visiblePoints.length} point{visiblePoints.length === 1 ? "" : "s"} shown on this map</span>
      </div>

      {String(currentFloor) !== String(destinationFloor) && isTransitionFloor && (
        <div className="lift-transition">
          <strong>Lift transition</strong>
          <p>Use the lift lobby to move from Floor {currentFloor} to Floor {destinationFloor}.</p>
        </div>
      )}
    </aside>
  );
}

export default DirectionPanel;
