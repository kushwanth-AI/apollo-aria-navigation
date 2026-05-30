import { useMemo } from "react";

const CATEGORY_LABELS = {
  department: "Departments",
  discussion: "Discussion Rooms",
  amenity: "Amenities",
  toilet: "Restrooms",
  facility: "Facilities & Exits"
};

const CATEGORY_ORDER = ["department", "discussion", "amenity", "toilet", "facility"];

const categorize = (room) => {
  const id = room.room_id || "";
  if (id.startsWith("discussion_")) return "discussion";
  if (id.startsWith("toilet_")) return "toilet";
  if (id === "cafe_area" || id === "food_court") return "amenity";
  if (id === "reception" || id === "exit" || id === "main_entrance") return "facility";
  return "department";
};

function DestinationSelector({
  destinations,
  selectedDestination,
  onSelect,
  disabled = false
}) {
  const grouped = useMemo(() => {
    const groups = {};
    destinations.forEach((destination) => {
      const key = categorize(destination);
      if (!groups[key]) groups[key] = [];
      groups[key].push(destination);
    });
    return groups;
  }, [destinations]);

  return (
    <section className="hn-card destination-selector-card" aria-label="Destination selection">
      <div className="hn-card-head">
        <div className="hn-icon-circle accent" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M8 12l3 3 5-6" />
          </svg>
        </div>
        <div className="hn-card-head-text">
          <span className="hn-eyebrow">Step 2</span>
          <strong className="hn-card-title">Select Destination</strong>
        </div>
      </div>

      <label className="hn-field-label" htmlFor="destination-select">
        Where would you like to go?
      </label>
      <div className="hn-select-wrapper">
        <select
          id="destination-select"
          className="hn-select"
          value={selectedDestination || ""}
          onChange={(event) => {
            const value = event.target.value;
            if (value) onSelect(value);
          }}
          disabled={disabled}
        >
          <option value="" disabled>
            Choose department / room / facility
          </option>
          {CATEGORY_ORDER.filter((key) => grouped[key]?.length).map((key) => (
            <optgroup key={key} label={CATEGORY_LABELS[key]}>
              {grouped[key].map((destination) => (
                <option key={destination.room_id} value={destination.room_id}>
                  {destination.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <svg className="hn-select-caret" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M6 9l6 6 6-6" />
        </svg>
      </div>
      <p className="hn-helper">
        {destinations.length} destinations available across the active floor
      </p>
    </section>
  );
}

export default DestinationSelector;
