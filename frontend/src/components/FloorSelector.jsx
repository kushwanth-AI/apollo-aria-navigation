function FloorSelector({ floors, selectedFloor, onChange, currentFloor, destinationFloor }) {
  return (
    <section className="floor-selector">
      <div>
        <p className="eyebrow">Floor View</p>
        <h2>{String(currentFloor) === "ground-live" ? "Ground Floor Live Map" : `Current Floor ${currentFloor} to Destination Floor ${destinationFloor}`}</h2>
      </div>
      <div className="floor-buttons" role="tablist" aria-label="Hospital floors">
        {floors.map((floor) => {
          const isLive = String(floor.floor_id) === "ground-live";
          const isSelected = String(selectedFloor) === String(floor.floor_id);
          const isRouteFloor = String(floor.floor_id) === String(currentFloor) || String(floor.floor_id) === String(destinationFloor);
          return (
            <button
              key={floor.floor_id}
              type="button"
              className={isSelected ? "floor-button selected" : isRouteFloor ? "floor-button route-floor" : "floor-button"}
              onClick={() => onChange(floor.floor_id)}
            >
              {isLive ? "Live" : `F${floor.floor_id}`}
            </button>
          );
        })}
      </div>
    </section>
  );
}

export default FloorSelector;
