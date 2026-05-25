import { useEffect, useMemo, useState } from "react";
import { Arrow, Circle, Group, Layer, Line, Rect, Stage, Text } from "react-konva";

const roomFill = {
  doctor: "#e5f4ff",
  consultation: "#f5f7fb",
  lab: "#fff4d6",
  pharmacy: "#e5f8ee",
  procedure: "#f4eaff",
  admin: "#edf0f5",
  waiting: "#f7efe5",
  reception: "#e0f2fe",
  discussion: "#eef2ff",
  cafe: "#fff7ed",
  exit: "#fee2e2",
  lift: "#dbeafe",
  stairs: "#f3e8ff",
  entrance: "#dcfce7"
};

const qrColor = {
  reception: "#0f766e",
  lift: "#2563eb",
  stairs: "#6d28d9",
  corridor: "#64748b",
  entrance: "#16a34a"
};

const routePointsForFloor = (route, selectedFloor) =>
  route
    .filter((point) => String(point.floor) === String(selectedFloor))
    .flatMap((point) => [point.x, point.y]);

function NavigationMap({ floorMap, selectedFloor, route, currentLocation, destination, compact = false }) {
  const [arrowPhase, setArrowPhase] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setArrowPhase((phase) => (phase + 0.035) % 1);
    }, 90);

    return () => window.clearInterval(timer);
  }, []);

  const animatedArrows = useMemo(() => {
    const points = route.filter((point) => String(point.floor) === String(selectedFloor));

    if (points.length < 2) {
      return [];
    }

    const segments = points.slice(1).map((point, index) => {
      const previous = points[index];
      const length = Math.hypot(point.x - previous.x, point.y - previous.y);
      return { from: previous, to: point, length };
    });
    const totalLength = segments.reduce((total, segment) => total + segment.length, 0);

    return [0.18, 0.46, 0.74].map((base, index) => {
      let distance = ((base + arrowPhase) % 1) * totalLength;
      const segment = segments.find((item) => {
        if (distance <= item.length) {
          return true;
        }
        distance -= item.length;
        return false;
      }) || segments[segments.length - 1];
      const ratio = segment.length ? distance / segment.length : 0;
      const x = segment.from.x + (segment.to.x - segment.from.x) * ratio;
      const y = segment.from.y + (segment.to.y - segment.from.y) * ratio;
      const angle = Math.atan2(segment.to.y - segment.from.y, segment.to.x - segment.from.x);
      const size = 22;

      return {
        id: `${index}-${Math.round(x)}-${Math.round(y)}`,
        points: [
          x - Math.cos(angle) * size,
          y - Math.sin(angle) * size,
          x,
          y
        ]
      };
    });
  }, [route, selectedFloor, arrowPhase]);

  if (!floorMap) {
    return <div className="map-loading">Loading floor map...</div>;
  }

  const routePoints = routePointsForFloor(route, selectedFloor);
  const floorQrLocations = floorMap.qr_locations || [];
  const activeCurrentLocation = currentLocation?.x
    ? currentLocation
    : floorQrLocations.find((location) => location.location_id === currentLocation?.location_id);
  const isCurrentFloor = String(activeCurrentLocation?.floor) === String(selectedFloor);
  const isDestinationFloor = String(destination?.floor) === String(selectedFloor);
  const isLiveFloor = String(selectedFloor) === "ground-live";
  const currentLocationLabel = activeCurrentLocation?.label || activeCurrentLocation?.name || "Current Location";

  return (
    <div className={`${isLiveFloor ? "konva-shell live-map-shell" : "konva-shell"}${compact ? " compact-map-shell" : ""}`}>
      <Stage width={900} height={600} className="konva-stage">
        <Layer>
          <Rect x={0} y={0} width={900} height={600} fill={isLiveFloor ? "#f7fbff" : "#f8fbff"} />
          <Rect
            x={floorMap.outline.x}
            y={floorMap.outline.y}
            width={floorMap.outline.width}
            height={floorMap.outline.height}
            fill="#ffffff"
            stroke={isLiveFloor ? "#64748b" : "#94a3b8"}
            strokeWidth={3}
            cornerRadius={8}
          />

          {floorMap.corridors.map((corridor) => (
            <Line
              key={corridor.id}
              points={corridor.points.flatMap((point) => [point.x, point.y])}
              stroke={isLiveFloor ? "#d8e6ef" : "#cbd5e1"}
              strokeWidth={isLiveFloor ? 44 : 34}
              lineCap="round"
              lineJoin="round"
            />
          ))}

          {floorMap.corridors.map((corridor) => (
            <Line
              key={`${corridor.id}-center`}
              points={corridor.points.flatMap((point) => [point.x, point.y])}
              stroke={isLiveFloor ? "#94a3b8" : "#ffffff"}
              strokeWidth={4}
              dash={[10, 10]}
              lineCap="round"
            />
          ))}

          {floorMap.rooms.map((room) => {
            const isDestination = destination?.room_id === room.room_id;
            return (
              <Group key={room.room_id}>
                <Rect
                  x={room.x}
                  y={room.y}
                  width={room.width}
                  height={room.height}
                  fill={isDestination ? "#dcfce7" : roomFill[room.type] || "#f8fafc"}
                  stroke={isDestination ? "#16a34a" : "#cbd5e1"}
                  strokeWidth={isDestination ? 4 : 2}
                  cornerRadius={isLiveFloor ? 2 : 6}
                />
                <Text x={room.x + 10} y={room.y + 12} text={room.room_number} fontSize={16} fontStyle="bold" fill="#0f172a" />
                <Text x={room.x + 10} y={room.y + 38} width={room.width - 20} text={room.name} fontSize={11} fill="#475569" />
                <Circle x={room.door.x} y={room.door.y} radius={5} fill="#334155" />
              </Group>
            );
          })}

          {floorMap.qr_locations.map((location) => (
            <Group key={location.location_id}>
              <Circle x={location.x} y={location.y} radius={16} fill={qrColor[location.type] || "#64748b"} opacity={0.92} />
              <Text
                x={location.x - 46}
                y={location.y + 22}
                width={92}
                align="center"
                text={location.type === "lift" ? "Lift" : location.type === "stairs" ? "Stairs" : location.name}
                fontSize={12}
                fontStyle="bold"
                fill="#0f172a"
              />
            </Group>
          ))}

          {routePoints.length >= 4 && (
            <>
              <Line points={routePoints} stroke="#38bdf8" strokeWidth={15} opacity={0.28} lineCap="round" lineJoin="round" shadowBlur={24} shadowColor="#38bdf8" />
              <Line points={routePoints} stroke="#0284c7" strokeWidth={7} lineCap="round" lineJoin="round" shadowBlur={12} shadowColor="#0ea5e9" />
              {animatedArrows.map((arrow) => (
                <Arrow
                  key={arrow.id}
                  points={arrow.points}
                  pointerLength={15}
                  pointerWidth={15}
                  fill="#e0f2fe"
                  stroke="#e0f2fe"
                  strokeWidth={5}
                  lineCap="round"
                  shadowBlur={12}
                  shadowColor="#0284c7"
                />
              ))}
            </>
          )}

          {route
            .filter((point) => String(point.floor) === String(selectedFloor))
            .map((point, index) => (
              <Circle key={`${point.floor}-${point.x}-${point.y}-${index}`} x={point.x} y={point.y} radius={7} fill="#ffffff" stroke="#0284c7" strokeWidth={4} />
            ))}

          {isCurrentFloor && (
            <Group>
              <Circle x={activeCurrentLocation.x} y={activeCurrentLocation.y} radius={24} fill="#14b8a6" opacity={0.2} />
              <Circle x={activeCurrentLocation.x} y={activeCurrentLocation.y} radius={11} fill="#0f766e" />
              <Text x={activeCurrentLocation.x - 72} y={activeCurrentLocation.y - 44} width={144} align="center" text={`You are here: ${currentLocationLabel}`} fontSize={13} fontStyle="bold" fill="#0f766e" />
            </Group>
          )}

          {isDestinationFloor && (
            <Group>
              <Circle x={destination.door.x} y={destination.door.y} radius={23} fill="#84cc16" opacity={0.24} />
              <Circle x={destination.door.x} y={destination.door.y} radius={12} fill="#65a30d" />
              <Text x={destination.door.x - 70} y={destination.door.y - 44} width={140} align="center" text={destination.name} fontSize={13} fontStyle="bold" fill="#3f6212" />
            </Group>
          )}
        </Layer>
      </Stage>
    </div>
  );
}

export default NavigationMap;
