function DoctorDestinationCard({ doctor, destination, scanPayload, currentLiveLocation, routeResult }) {
  if (scanPayload?.floor === "ground-live") {
    const currentLocationLabel = currentLiveLocation?.label || currentLiveLocation?.name || "AHLL IT Department";

    return (
      <aside className="doctor-card">
        <div>
          <p className="eyebrow">Patient Journey</p>
          <h2>OPD Floor Navigation</h2>
          <span className="specialty">AHLL IT QR Active</span>
        </div>

        <div className="destination-room">
          <span>Current Location</span>
          <strong>You are here: {currentLocationLabel}</strong>
          <p>{scanPayload.location_id}</p>
        </div>

        <div className="destination-room">
          <span>Destination</span>
          <strong>{destination?.name || "Not selected"}</strong>
          <p>{destination?.room_number || "Choose a room below"}</p>
        </div>

        {routeResult && (
          <div className="info-grid">
            <div>
              <span>Distance</span>
              <strong>{routeResult.distance_meters}m</strong>
            </div>
            <div>
              <span>Time</span>
              <strong>{routeResult.walking_time_minutes} min</strong>
            </div>
          </div>
        )}
      </aside>
    );
  }

  return (
    <aside className="doctor-card">
      <div>
        <p className="eyebrow">Assigned Doctor</p>
        <h2>{doctor.name}</h2>
        <span className="specialty">{doctor.specialty}</span>
      </div>

      <div className="info-grid">
        <div>
          <span>Floor</span>
          <strong>{doctor.floor}</strong>
        </div>
        <div>
          <span>Room</span>
          <strong>{destination.room_number}</strong>
        </div>
      </div>

      <div className="destination-room">
        <span>Destination</span>
        <strong>{destination.name}</strong>
        <p>{destination.room_id}</p>
      </div>

      <div className="scan-source">
        <span>Scanned Location</span>
        <strong>Floor {scanPayload?.floor}</strong>
        <p>{scanPayload?.location_id}</p>
      </div>
    </aside>
  );
}

export default DoctorDestinationCard;
