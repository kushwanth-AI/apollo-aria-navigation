import { useEffect, useMemo, useRef, useState } from "react";
import { Arrow, Circle, Group, Image as KonvaImage, Layer, Line, Rect, Stage, Text } from "react-konva";

const GROUND_MAP_IMAGE = "/maps/ground-floor-map.svg";
const GROUND_MAP_WIDTH = 900;
const GROUND_MAP_HEIGHT = 640;
const GROUND_MAP_CONTENT_OFFSET_Y = 50;
const USE_STATIC_GROUND_MAP = false;

const roomFill = {
  doctor: "#f8fbff",
  consultation: "#f8fbff",
  lab: "#fffaf0",
  pharmacy: "#f0fdfa",
  procedure: "#f8f5ff",
  admin: "#f7f9fc",
  waiting: "#f8fafc",
  reception: "#ecfeff",
  discussion: "#f8fbff",
  cafe: "#fffaf0",
  food: "#fff7ed",
  toilet: "#f8f5ff",
  team: "#eef7ff",
  exit: "#fff1f2",
  lift: "#eff6ff",
  stairs: "#f8f5ff",
  entrance: "#f0fdf4"
};

const qrColor = {
  reception: "#007c89",
  lift: "#0b77e3",
  stairs: "#5365d8",
  corridor: "#64748b",
  entrance: "#16a34a"
};

const roomAccent = {
  doctor: "#0b77e3",
  consultation: "#0b77e3",
  lab: "#d97706",
  pharmacy: "#007c89",
  procedure: "#6d5bd0",
  admin: "#375a7f",
  waiting: "#64748b",
  reception: "#007c89",
  discussion: "#0b77e3",
  cafe: "#d97706",
  food: "#ea580c",
  toilet: "#7c3aed",
  team: "#0b77e3",
  exit: "#dc2626",
  lift: "#0b77e3",
  stairs: "#6d5bd0",
  entrance: "#008f5a"
};

const routePointsForFloor = (route, selectedFloor) =>
  route
    .filter((point) => String(point.floor) === String(selectedFloor))
    .flatMap((point) => [point.x, point.y]);

const groundCheckpoints = {
  reception_qr: { x: 330, y: 270, label: "Reception QR" },
  lift_main: { x: 450, y: 230, label: "Lift" },
  stairs_main: { x: 450, y: 310, label: "Stairs" },
  lab_entry: { x: 600, y: 350, label: "Lab Entry" },
  opd2_entry: { x: 600, y: 235, label: "OPD-2 Entry" },
  pharmacy_entry: { x: 330, y: 410, label: "Pharmacy Entry" }
};

const sampleGroundRoutes = {
  discussion_room_2: ["reception_qr", "lift_main", "opd2_entry"],
  discussion_room_3: ["reception_qr", "lift_main", "lab_entry"],
  pharmacy: ["reception_qr", "pharmacy_entry"]
};

const routeToPoints = (route, selectedFloor, destination) => {
  const routeForFloor = route.filter((point) => String(point.floor) === String(selectedFloor));

  if (routeForFloor.length >= 2) {
    return routeForFloor.flatMap((point) => [point.x, point.y]);
  }

  const sample = sampleGroundRoutes[destination?.room_id];

  if (!sample) {
    return [];
  }

  return sample.flatMap((checkpointId) => {
    const checkpoint = groundCheckpoints[checkpointId];
    return [checkpoint.x, checkpoint.y];
  });
};

const useStaticMapImage = (src) => {
  const [image, setImage] = useState(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const nextImage = new window.Image();
    nextImage.onload = () => {
      setImage(nextImage);
      setFailed(false);
      console.log("indoor_map_loaded", { src });
    };
    nextImage.onerror = () => {
      setImage(null);
      setFailed(true);
    };
    nextImage.src = src;

    return () => {
      nextImage.onload = null;
      nextImage.onerror = null;
    };
  }, [src]);

  return { image, failed };
};

const liveQrLabelPosition = (location) => {
  const positions = {
    QR_RECEPTION_GROUND: { x: -64, y: -34, width: 128, align: "center" },
    QR_RECEPTION_BLOCK: { x: -60, y: 18, width: 120, align: "center" },
    QR_AHLL_IT: { x: 14, y: -8, width: 78, align: "left", hidden: true },
    QR_FOOD_COURT: { x: -58, y: 18, width: 116, align: "center" },
    QR_CAFE_AREA: { x: 12, y: -8, width: 70, align: "left", hidden: true }
  };

  return positions[location.location_id] || { x: -46, y: 22, width: 92, align: "center" };
};

const roomTextLayout = (room, isLiveFloor) => {
  if (!isLiveFloor) {
    return {
      titleSize: 16,
      subtitleSize: 11,
      titleY: room.y + 12,
      subtitleY: room.y + 38,
      align: "left",
      padding: 10
    };
  }

  const isCompactService = ["lift", "stairs", "entrance"].includes(room.type);
  const titleSize = room.height <= 52 ? 13 : room.width <= 120 ? 14 : 15;
  const subtitleSize = room.height <= 52 ? 9 : 10.5;
  const contentHeight = titleSize + 7 + subtitleSize;
  const startY = room.y + Math.max(7, (room.height - contentHeight) / 2);
  const align = isCompactService ? "center" : "left";
  const padding = isCompactService ? 10 : 14;

  return {
    titleSize,
    subtitleSize,
    titleY: startY,
    subtitleY: startY + titleSize + 7,
    align,
    padding
  };
};

const roomIconLabel = (room) => {
  const labels = {
    reception: "i",
    pharmacy: "+",
    exit: ">",
    lift: "^",
    stairs: "//",
    north_entrance: "N",
    south_entrance: "S",
    discussion_room_1: "OP",
    discussion_room_2: "OP",
    discussion_room_3: "LB",
    discussion_room_4: "$",
    discussion_room_5: "XR",
    cafe_area: "W",
    food_court: "FC",
    toilet_1: "WC",
    toilet_2: "WC",
    toilet_3: "WC",
    toilet_4: "WC",
    apollo_rd_team: "RD",
    ahll_it_department: "IT",
    qa_team: "QA",
    main_entrance: "IN",
    reception_room_1: "R1",
    reception_room_2: "R2",
    employee_room_1: "SH",
    employee_room_2: "i",
    employee_room_3: "NS",
    employee_room_4: "WC"
  };

  return labels[room.room_id] || room.room_number.slice(0, 2);
};

function NavigationMap({ floorMap, selectedFloor, route, currentLocation, destination, navigationState, compact = false }) {
  const [arrowPhase, setArrowPhase] = useState(0);
  const shellRef = useRef(null);
  const [shellWidth, setShellWidth] = useState(900);
  const { image: groundMapImage, failed: groundMapFailed } = useStaticMapImage(GROUND_MAP_IMAGE);
  const overlayLogRef = useRef("");
  const animationLogRef = useRef("");

  useEffect(() => {
    const timer = window.setInterval(() => {
      setArrowPhase((phase) => (phase + 0.035) % 1);
    }, 90);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const node = shellRef.current;

    if (!node || compact) {
      return undefined;
    }

    const updateWidth = () => {
      setShellWidth(node.clientWidth || 900);
    };
    const observer = new ResizeObserver(updateWidth);
    observer.observe(node);
    updateWidth();

    return () => observer.disconnect();
  }, [compact]);

  const animatedArrows = useMemo(() => {
    const routePoints = route.filter((point) => String(point.floor) === String(selectedFloor));
    const points = routePoints.length >= 2
      ? routePoints
      : (sampleGroundRoutes[destination?.room_id] || []).map((checkpointId) => ({
          floor: selectedFloor,
          ...groundCheckpoints[checkpointId]
        }));

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
  }, [route, selectedFloor, destination?.room_id, arrowPhase]);

  const routePoints = routePointsForFloor(route, selectedFloor);
  const routeAlert = navigationState?.wrongDirection || navigationState?.offRoute;
  const routeStroke = navigationState?.wrongDirection ? "#dc2626" : navigationState?.offRoute ? "#f97316" : "#0878d8";
  const routeGlow = navigationState?.wrongDirection ? "#ef4444" : navigationState?.offRoute ? "#fb923c" : "#0ea5e9";
  const routeHalo = navigationState?.wrongDirection ? "#fecaca" : navigationState?.offRoute ? "#fed7aa" : "#38bdf8";
  const floorQrLocations = floorMap?.qr_locations || [];
  const displayedCurrentLocation = navigationState?.currentPosition || currentLocation;
  const snappedRouteLocation = navigationState?.snappedPosition;
  const activeCurrentLocation = displayedCurrentLocation?.x
    ? displayedCurrentLocation
    : floorQrLocations.find((location) => location.location_id === displayedCurrentLocation?.location_id);
  const activeSnappedLocation = snappedRouteLocation?.x
    ? snappedRouteLocation
    : null;
  const showSnappedRecommendation = routeAlert && activeSnappedLocation && activeCurrentLocation;
  const isSnappedCurrentFloor = String(activeSnappedLocation?.floor) === String(selectedFloor);
  const activeCurrentLocationFromQr = currentLocation?.x
    ? currentLocation
    : floorQrLocations.find((location) => location.location_id === currentLocation?.location_id);
  const isCurrentFloor = String(activeCurrentLocation?.floor) === String(selectedFloor);
  const isDestinationFloor = String(destination?.floor) === String(selectedFloor);
  const isLiveFloor = String(selectedFloor) === "ground-live";
  const currentLocationLabel = activeCurrentLocation?.label || activeCurrentLocation?.name || activeCurrentLocationFromQr?.name || "AHLL IT Department";
  const liveMapChrome = isLiveFloor && !compact;
  const mapOffsetY = liveMapChrome ? 50 : 0;
  const logicalWidth = 900;
  const logicalHeight = liveMapChrome ? GROUND_MAP_HEIGHT : 600;
  const stageScale = compact ? 1 : Math.min(1, shellWidth / 900);
  const stageWidth = logicalWidth * stageScale;
  const stageHeight = logicalHeight * stageScale;
  const overlayRoutePoints = routeToPoints(route, selectedFloor, destination);
  const hasOverlayRoute = overlayRoutePoints.length >= 4;

  useEffect(() => {
    if (!isLiveFloor) {
      return;
    }

    const logKey = `${selectedFloor}-${destination?.room_id || "map-only"}-${hasOverlayRoute}`;
    if (overlayLogRef.current !== logKey) {
      overlayLogRef.current = logKey;
      console.log("navigation_overlay_rendered", {
        floor: selectedFloor,
        destination: destination?.room_id || null,
        routeAvailable: hasOverlayRoute
      });
    }
  }, [destination?.room_id, hasOverlayRoute, isLiveFloor, selectedFloor]);

  useEffect(() => {
    if (!isLiveFloor || !hasOverlayRoute) {
      return;
    }

    const logKey = `${selectedFloor}-${destination?.room_id || "sample"}-${overlayRoutePoints.join(",")}`;
    if (animationLogRef.current !== logKey) {
      animationLogRef.current = logKey;
      console.log("route_animation_started", {
        floor: selectedFloor,
        destination: destination?.room_id || null
      });
    }
  }, [destination?.room_id, hasOverlayRoute, isLiveFloor, overlayRoutePoints, selectedFloor]);

  if (!floorMap) {
    return <div className="map-loading">Loading floor map...</div>;
  }

  if (USE_STATIC_GROUND_MAP && isLiveFloor && !compact && groundMapImage && !groundMapFailed) {
    const activeDestinationRoom = floorMap.rooms?.find((room) => room.room_id === destination?.room_id);
    const currentPulse = 17 + Math.sin(arrowPhase * Math.PI * 2) * 2;

    return (
      <div ref={shellRef} className="konva-shell live-map-shell image-map-shell">
        <Stage width={stageWidth} height={stageHeight} scaleX={stageScale} scaleY={stageScale} className="konva-stage">
          <Layer listening={false}>
            <KonvaImage image={groundMapImage} x={0} y={0} width={GROUND_MAP_WIDTH} height={GROUND_MAP_HEIGHT} />
          </Layer>
          <Layer>
            <Group y={GROUND_MAP_CONTENT_OFFSET_Y}>
              {activeDestinationRoom && (
                <Rect
                  x={activeDestinationRoom.x - 4}
                  y={activeDestinationRoom.y - 4}
                  width={activeDestinationRoom.width + 8}
                  height={activeDestinationRoom.height + 8}
                  fill="#dcfce7"
                  opacity={0.18}
                  stroke="#16a34a"
                  strokeWidth={3}
                  cornerRadius={8}
                  shadowBlur={12}
                  shadowColor="#22c55e"
                />
              )}

              {hasOverlayRoute && Object.entries(groundCheckpoints).map(([checkpointId, checkpoint]) => (
                <Circle key={checkpointId} x={checkpoint.x} y={checkpoint.y} radius={3.5} fill="#ffffff" stroke="#0b77e3" strokeWidth={1.5} opacity={0.78} />
              ))}

              {hasOverlayRoute ? (
                <>
                  <Line points={overlayRoutePoints} stroke={routeHalo} strokeWidth={20} opacity={0.28} lineCap="round" lineJoin="round" shadowBlur={28} shadowColor={routeGlow} />
                  <Line points={overlayRoutePoints} stroke={routeStroke} strokeWidth={8} lineCap="round" lineJoin="round" shadowBlur={14} shadowColor={routeGlow} />
                  <Line points={overlayRoutePoints} stroke="#ffffff" strokeWidth={2} opacity={0.42} lineCap="round" lineJoin="round" dash={[9, 15]} />
                  {animatedArrows.map((arrow) => (
                    <Arrow
                      key={arrow.id}
                      points={arrow.points}
                      pointerLength={13}
                      pointerWidth={13}
                      fill={routeAlert ? routeStroke : "#e0faff"}
                      stroke={routeAlert ? routeStroke : "#e0faff"}
                      strokeWidth={4}
                      lineCap="round"
                      shadowBlur={10}
                      shadowColor={routeGlow}
                    />
                  ))}
                </>
              ) : null}

              {isCurrentFloor && (
                <Group>
                  <Circle x={activeCurrentLocation.x} y={activeCurrentLocation.y} radius={currentPulse} fill={routeAlert ? routeStroke : "#0b77e3"} opacity={0.18} />
                  <Circle x={activeCurrentLocation.x} y={activeCurrentLocation.y} radius={10} fill="#ffffff" stroke={routeAlert ? routeStroke : "#0b77e3"} strokeWidth={5} shadowBlur={16} shadowColor={routeAlert ? routeGlow : "#38bdf8"} />
                  <Rect x={activeCurrentLocation.x - 62} y={activeCurrentLocation.y - 49} width={124} height={35} fill="#ffffff" stroke={routeAlert ? routeStroke : "#c7e8ff"} strokeWidth={1} cornerRadius={8} shadowBlur={12} shadowColor="rgba(15, 23, 42, 0.18)" />
                  <Text x={activeCurrentLocation.x - 58} y={activeCurrentLocation.y - 44} width={116} align="center" text="You are here" fontSize={9} fontStyle="bold" fill={routeAlert ? routeStroke : "#0b77e3"} />
                  <Text x={activeCurrentLocation.x - 58} y={activeCurrentLocation.y - 30} width={116} align="center" text={currentLocationLabel} fontSize={9} fontStyle="bold" fill="#0f172a" />
                </Group>
              )}

              {showSnappedRecommendation && isSnappedCurrentFloor && (
                <Group>
                  <Circle x={activeSnappedLocation.x} y={activeSnappedLocation.y} radius={12} fill="#ffffff" stroke="#2563eb" strokeWidth={2} dash={[4, 4]} />
                  <Text x={activeSnappedLocation.x - 62} y={activeSnappedLocation.y + 16} width={124} align="center" text="Return to route" fontSize={8.5} fontStyle="bold" fill="#2563eb" />
                </Group>
              )}

              {isDestinationFloor && destination?.door && (
                <Group>
                  <Circle x={destination.door.x} y={destination.door.y} radius={18} fill="#84cc16" opacity={0.24} />
                  <Circle x={destination.door.x} y={destination.door.y} radius={8} fill="#65a30d" />
                  <Text x={destination.door.x - 58} y={destination.door.y - 30} width={116} align="center" text={destination.name} fontSize={9} fontStyle="bold" fill="#3f6212" />
                </Group>
              )}
            </Group>
          </Layer>
        </Stage>
      </div>
    );
  }

  return (
    <div ref={shellRef} className={`${isLiveFloor ? "konva-shell live-map-shell" : "konva-shell"}${compact ? " compact-map-shell" : ""}`}>
      <Stage width={stageWidth} height={stageHeight} scaleX={stageScale} scaleY={stageScale} className="konva-stage">
        <Layer>
          <Rect x={0} y={0} width={logicalWidth} height={logicalHeight} fill={isLiveFloor ? "#f7fbff" : "#f8fbff"} />
          {liveMapChrome && (
            <>
              <Text x={18} y={18} text="Ground Floor - Live Navigation" fontSize={18} fontStyle="bold" fill="#0f172a" />
              <Circle x={22} y={48} radius={4} fill="#0b77e3" />
              <Text x={32} y={41} text={`You are here: ${currentLocationLabel}`} fontSize={11.5} fontStyle="bold" fill="#0b63ce" />
            </>
          )}

          <Group y={mapOffsetY}>
          <Rect
            x={floorMap.outline.x}
            y={floorMap.outline.y}
            width={floorMap.outline.width}
            height={floorMap.outline.height}
              fill="#fbfdff"
              stroke={isLiveFloor ? "#c7d5e2" : "#d6e0ea"}
              strokeWidth={2}
              cornerRadius={10}
              shadowColor={isLiveFloor ? "rgba(15, 23, 42, 0.1)" : "transparent"}
              shadowBlur={isLiveFloor ? 14 : 0}
              shadowOffsetY={isLiveFloor ? 4 : 0}
            />

          {floorMap.corridors.map((corridor) => (
            <Line
              key={corridor.id}
              points={corridor.points.flatMap((point) => [point.x, point.y])}
              stroke={isLiveFloor ? "#eef5f9" : "#e8eef5"}
              strokeWidth={isLiveFloor ? 44 : 34}
              lineCap="round"
              lineJoin="round"
            />
          ))}

          {floorMap.corridors.map((corridor) => (
            <Line
              key={`${corridor.id}-center`}
              points={corridor.points.flatMap((point) => [point.x, point.y])}
              stroke={isLiveFloor ? "#c7d5e2" : "#ffffff"}
              strokeWidth={2}
              dash={[8, 12]}
              lineCap="round"
            />
          ))}

          {floorMap.rooms.map((room) => {
            const isDestination = destination?.room_id === room.room_id;
            const textLayout = roomTextLayout(room, isLiveFloor);
            const accent = roomAccent[room.type] || "#2563eb";
            const hasIcon = isLiveFloor;
            const textX = hasIcon ? room.x + 54 : room.x + textLayout.padding;
            const textWidth = hasIcon ? room.width - 68 : room.width - textLayout.padding * 2;

            return (
              <Group key={room.room_id}>
                <Rect
                  x={room.x}
                  y={room.y}
                  width={room.width}
                  height={room.height}
                  fill={isDestination ? "#ecfdf5" : roomFill[room.type] || "#f8fafc"}
                  stroke={isDestination ? "#16a34a" : "#d7e2eb"}
                  strokeWidth={isDestination ? 3 : 1.5}
                  cornerRadius={isLiveFloor ? 7 : 6}
                  shadowColor={isLiveFloor ? "rgba(15, 23, 42, 0.11)" : "transparent"}
                  shadowBlur={isLiveFloor ? 10 : 0}
                  shadowOffsetY={isLiveFloor ? 3 : 0}
                />
                {isLiveFloor && (
                  <Rect
                    x={room.x}
                    y={room.y}
                    width={5}
                    height={room.height}
                    fill={accent}
                    opacity={isDestination ? 0.95 : 0.72}
                    cornerRadius={6}
                  />
                )}
                {hasIcon && (
                  <>
                    <Circle x={room.x + 25} y={room.y + room.height / 2} radius={12} fill={accent} opacity={0.12} />
                    <Circle x={room.x + 25} y={room.y + room.height / 2} radius={9} fill="#ffffff" stroke={accent} strokeWidth={1.4} opacity={0.95} />
                    <Text
                      x={room.x + 15}
                      y={room.y + room.height / 2 - 6}
                      width={20}
                      align="center"
                      text={roomIconLabel(room)}
                      fontSize={9.5}
                      fontStyle="bold"
                      fill={accent}
                    />
                  </>
                )}
                <Text
                  x={textX}
                  y={textLayout.titleY}
                  width={textWidth}
                  align={textLayout.align}
                  text={room.room_number}
                  fontSize={textLayout.titleSize}
                  fontStyle="bold"
                  fill="#0f172a"
                />
                <Text
                  x={textX}
                  y={textLayout.subtitleY}
                  width={textWidth}
                  align={textLayout.align}
                  text={room.name}
                  fontSize={textLayout.subtitleSize}
                  fill="#60758a"
                  ellipsis
                />
                <Circle x={room.door.x} y={room.door.y} radius={4.3} fill="#ffffff" stroke={accent} strokeWidth={2} />
              </Group>
            );
          })}

          {floorMap.qr_locations.map((location) => {
            const labelPosition = isLiveFloor ? liveQrLabelPosition(location) : { x: -46, y: 22, width: 92, align: "center" };
            const labelText = labelPosition.hidden ? "" : location.name;

            return (
            <Group key={location.location_id}>
              <Circle x={location.x} y={location.y} radius={isLiveFloor ? 8 : 16} fill="#ffffff" stroke={qrColor[location.type] || "#64748b"} strokeWidth={isLiveFloor ? 3 : 0} opacity={0.96} />
              {labelText && (
                <>
                  <Rect x={location.x + labelPosition.x - 3} y={location.y + labelPosition.y - 3} width={labelPosition.width + 6} height={18} fill="#ffffff" opacity={0.88} cornerRadius={6} />
                  <Text
                    x={location.x + labelPosition.x}
                    y={location.y + labelPosition.y}
                    width={labelPosition.width}
                    align={labelPosition.align}
                    text={labelText}
                    fontSize={isLiveFloor ? 9.5 : 12}
                    fontStyle="bold"
                    fill="#17324d"
                  />
                </>
              )}
            </Group>
            );
          })}

          {routePoints.length >= 4 && (
            <>
              <Line points={routePoints} stroke={routeHalo} strokeWidth={18} opacity={0.28} lineCap="round" lineJoin="round" shadowBlur={28} shadowColor={routeGlow} />
              <Line points={routePoints} stroke={routeStroke} strokeWidth={8} lineCap="round" lineJoin="round" shadowBlur={14} shadowColor={routeGlow} />
              <Line points={routePoints} stroke="#ffffff" strokeWidth={2} opacity={0.4} lineCap="round" lineJoin="round" dash={[9, 15]} />
              {animatedArrows.map((arrow) => (
                <Arrow
                  key={arrow.id}
                  points={arrow.points}
                  pointerLength={14}
                  pointerWidth={14}
                  fill={routeAlert ? routeStroke : "#e0f2fe"}
                  stroke={routeAlert ? routeStroke : "#e0f2fe"}
                  strokeWidth={4}
                  lineCap="round"
                  shadowBlur={12}
                  shadowColor={routeGlow}
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
              <Circle x={activeCurrentLocation.x} y={activeCurrentLocation.y} radius={20} fill={routeAlert ? routeStroke : "#0b77e3"} opacity={0.18} />
              <Circle x={activeCurrentLocation.x} y={activeCurrentLocation.y} radius={10} fill={routeAlert ? routeStroke : "#0b77e3"} stroke="#ffffff" strokeWidth={4} shadowBlur={16} shadowColor={routeAlert ? routeGlow : "#38bdf8"} />
              <Rect x={activeCurrentLocation.x - 62} y={activeCurrentLocation.y - 53} width={124} height={36} fill="#ffffff" stroke={routeAlert ? routeStroke : "#c7e8ff"} strokeWidth={1} cornerRadius={8} shadowBlur={12} shadowColor="rgba(15, 23, 42, 0.18)" />
              <Text x={activeCurrentLocation.x - 54} y={activeCurrentLocation.y - 48} width={108} align="center" text="You are here" fontSize={9.5} fontStyle="bold" fill={routeAlert ? routeStroke : "#0b77e3"} />
              <Text x={activeCurrentLocation.x - 54} y={activeCurrentLocation.y - 34} width={108} align="center" text={currentLocationLabel} fontSize={9} fontStyle="bold" fill="#0f172a" />
            </Group>
          )}

          {showSnappedRecommendation && isSnappedCurrentFloor && (
            <Group>
              <Circle x={activeSnappedLocation.x} y={activeSnappedLocation.y} radius={12} fill="#ffffff" stroke="#2563eb" strokeWidth={2} dash={[4, 4]} />
              <Text x={activeSnappedLocation.x - 62} y={activeSnappedLocation.y + 16} width={124} align="center" text="Return to route" fontSize={8.5} fontStyle="bold" fill="#2563eb" />
            </Group>
          )}

          {isDestinationFloor && (
            <Group>
              <Circle x={destination.door.x} y={destination.door.y} radius={18} fill="#84cc16" opacity={0.22} />
              <Circle x={destination.door.x} y={destination.door.y} radius={8} fill="#65a30d" />
              <Text x={destination.door.x - 58} y={destination.door.y - 34} width={116} align="center" text={destination.name} fontSize={9.5} fontStyle="bold" fill="#3f6212" />
            </Group>
          )}
          </Group>

          {liveMapChrome && (
            <Group x={305} y={638}>
              <Rect x={0} y={0} width={290} height={32} fill="#ffffff" stroke="#d5e1ea" strokeWidth={1} cornerRadius={8} shadowColor="rgba(15, 23, 42, 0.12)" shadowBlur={10} shadowOffsetY={2} />
              <Circle x={24} y={16} radius={6} fill="#ffffff" stroke="#0b77e3" strokeWidth={3} />
              <Text x={40} y={10} text="You are here" fontSize={10} fill="#17324d" />
              <Arrow x={132} y={16} points={[0, 0, 24, 0]} pointerLength={7} pointerWidth={7} fill="#0b77e3" stroke="#0b77e3" strokeWidth={3} />
              <Text x={166} y={10} text="Route Path" fontSize={10} fill="#17324d" />
              <Circle x={240} y={16} radius={4} fill="#334155" />
              <Text x={254} y={10} text="Point" fontSize={10} fill="#17324d" />
            </Group>
          )}
        </Layer>
      </Stage>
    </div>
  );
}

export default NavigationMap;
