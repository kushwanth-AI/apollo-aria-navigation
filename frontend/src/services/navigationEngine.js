const PIXELS_PER_METER = 1 / 0.18;
const WRONG_DIRECTION_ANGLE = 90;
const OFF_ROUTE_THRESHOLD_METERS = 4;

const normalizeDegrees = (degrees) => ((degrees % 360) + 360) % 360;

const angleDifference = (from, to) => {
  const difference = Math.abs(normalizeDegrees(from) - normalizeDegrees(to));
  return Math.min(difference, 360 - difference);
};

const segmentHeading = (from, to) =>
  normalizeDegrees((Math.atan2(to.y - from.y, to.x - from.x) * 180) / Math.PI);

const distanceBetween = (from, to) => Math.hypot(to.x - from.x, to.y - from.y);

const routeSegments = (route = []) => route.slice(1).map((point, index) => {
  const from = route[index];
  const lengthPixels = distanceBetween(from, point);

  return {
    index,
    from,
    to: point,
    lengthPixels,
    lengthMeters: lengthPixels / PIXELS_PER_METER,
    headingDegrees: segmentHeading(from, point)
  };
});

const routeLengthMeters = (segments) =>
  segments.reduce((total, segment) => total + segment.lengthMeters, 0);

const pointAtDistance = (route = [], distanceMeters = 0) => {
  if (!route.length) {
    return null;
  }

  const segments = routeSegments(route);
  if (!segments.length) {
    return {
      ...route[0],
      activeRouteSegmentIndex: 0,
      expectedHeadingDegrees: 0,
      routeProgressMeters: 0,
      distanceToNextTurn: 0
    };
  }

  let remaining = Math.max(0, distanceMeters);
  let coveredBeforeSegment = 0;
  let activeSegment = segments[segments.length - 1];

  for (const segment of segments) {
    activeSegment = segment;
    if (remaining <= segment.lengthMeters) {
      break;
    }
    remaining -= segment.lengthMeters;
    coveredBeforeSegment += segment.lengthMeters;
  }

  const ratio = activeSegment.lengthMeters ? Math.min(1, remaining / activeSegment.lengthMeters) : 0;
  const x = activeSegment.from.x + (activeSegment.to.x - activeSegment.from.x) * ratio;
  const y = activeSegment.from.y + (activeSegment.to.y - activeSegment.from.y) * ratio;

  return {
    floor: activeSegment.to.floor,
    x,
    y,
    node_id: ratio > 0.82 ? activeSegment.to.node_id : activeSegment.from.node_id,
    label: ratio > 0.82 ? activeSegment.to.label : activeSegment.from.label,
    activeRouteSegmentIndex: activeSegment.index,
    expectedHeadingDegrees: activeSegment.headingDegrees,
    routeProgressMeters: coveredBeforeSegment + remaining,
    distanceToNextTurn: Math.max(0, activeSegment.lengthMeters - remaining)
  };
};

const projectPointToSegment = (point, segment, coveredBeforeSegment) => {
  const dx = segment.to.x - segment.from.x;
  const dy = segment.to.y - segment.from.y;
  const lengthSquared = dx * dx + dy * dy;
  const ratio = lengthSquared
    ? Math.min(1, Math.max(0, ((point.x - segment.from.x) * dx + (point.y - segment.from.y) * dy) / lengthSquared))
    : 0;
  const snapped = {
    floor: segment.to.floor,
    x: segment.from.x + dx * ratio,
    y: segment.from.y + dy * ratio
  };
  const distancePixels = distanceBetween(point, snapped);

  return {
    snapped,
    distanceMeters: distancePixels / PIXELS_PER_METER,
    progressMeters: coveredBeforeSegment + segment.lengthMeters * ratio,
    segment,
    distanceToNextTurn: Math.max(0, segment.lengthMeters * (1 - ratio))
  };
};

export const projectPointToRoute = (route = [], point) => {
  const segments = routeSegments(route);
  let covered = 0;
  let bestProjection = null;

  for (const segment of segments) {
    const projection = projectPointToSegment(point, segment, covered);
    if (!bestProjection || projection.distanceMeters < bestProjection.distanceMeters) {
      bestProjection = projection;
    }
    covered += segment.lengthMeters;
  }

  return bestProjection;
};

const nextInstructionFor = ({ route, destination, state }) => {
  if (state.remainingMeters <= 0.5) {
    return "You have arrived";
  }

  if (state.wrongDirection) {
    return "Wrong direction, turn back";
  }

  if (state.offRoute) {
    return "Off route, return to highlighted path";
  }

  const distanceToTurn = Math.ceil(state.distanceToNextTurn);
  const segments = routeSegments(route);
  const current = segments[state.activeRouteSegmentIndex];
  const next = segments[state.activeRouteSegmentIndex + 1];

  if (!next) {
    return state.remainingMeters <= 6
      ? `Destination is on your right`
      : `Continue straight for ${Math.ceil(state.remainingMeters)} meters`;
  }

  const turnDelta = normalizeDegrees(next.headingDegrees - current.headingDegrees);
  const turnLabel = turnDelta > 180 ? "left" : "right";

  if (distanceToTurn <= 5) {
    return `Turn ${turnLabel} after ${Math.max(1, distanceToTurn)} meters`;
  }

  const nextLabel = next.to?.label || destination?.name || "next point";
  return `Go straight for ${distanceToTurn} meters, then turn ${turnLabel} near ${nextLabel}`;
};

export const createInitialNavigationState = ({ route = [], startLocation, destination }) => {
  const totalMeters = routeLengthMeters(routeSegments(route));
  const startPoint = route[0] || startLocation || null;
  const snapped = pointAtDistance(route, 0) || startPoint;
  const startLabel = startPoint?.label || startPoint?.name || startLocation?.label || startLocation?.name || "current location";

  return {
    currentNode: startPoint?.node_id || startLocation?.node_id || "current_location",
    currentPosition: startPoint,
    snappedPosition: snapped,
    activeRouteSegmentIndex: 0,
    routeProgressMeters: 0,
    remainingMeters: Math.ceil(totalMeters),
    totalMeters,
    headingDegrees: 0,
    expectedHeadingDegrees: snapped?.expectedHeadingDegrees || 0,
    wrongDirection: false,
    offRoute: false,
    routeConfidence: 1,
    nextInstruction: destination ? `Go straight from ${startLabel}` : `Scan ${startLabel} QR`,
    distanceToNextTurn: snapped?.distanceToNextTurn || 0
  };
};

export const updateNavigationState = ({
  previousState,
  route = [],
  destination,
  deltaMeters = 0,
  headingDegrees = 0,
  calibratedHeading = 0,
  forceCorrect = false
}) => {
  const totalMeters = previousState?.totalMeters || routeLengthMeters(routeSegments(route));
  const currentSnapped = pointAtDistance(route, previousState?.routeProgressMeters || 0);
  const firstHeading = routeSegments(route)[0]?.headingDegrees || 0;
  const expectedHeadingDegrees = currentSnapped?.expectedHeadingDegrees || firstHeading;
  const headingAvailable = Number.isFinite(headingDegrees) && headingDegrees > 0;
  const mappedHeading = headingAvailable
    ? normalizeDegrees(firstHeading + normalizeDegrees(headingDegrees - calibratedHeading))
    : expectedHeadingDegrees;
  const headingDelta = angleDifference(mappedHeading, expectedHeadingDegrees);
  const wrongDirection = !forceCorrect && deltaMeters > 0.05 && headingAvailable && headingDelta > WRONG_DIRECTION_ANGLE;
  const simulatedPosition = currentSnapped
    ? {
        ...currentSnapped,
        x: currentSnapped.x + Math.cos((mappedHeading * Math.PI) / 180) * deltaMeters * PIXELS_PER_METER,
        y: currentSnapped.y + Math.sin((mappedHeading * Math.PI) / 180) * deltaMeters * PIXELS_PER_METER
      }
    : null;
  const projection = simulatedPosition ? projectPointToRoute(route, simulatedPosition) : null;
  const offRoute = Boolean(projection && projection.distanceMeters > OFF_ROUTE_THRESHOLD_METERS && !wrongDirection);
  const canProgress = deltaMeters > 0 && !wrongDirection && !offRoute;
  const nextProgress = canProgress
    ? Math.min(totalMeters, (previousState?.routeProgressMeters || 0) + deltaMeters)
    : (previousState?.routeProgressMeters || 0);
  const nextSnapped = pointAtDistance(route, nextProgress) || currentSnapped;
  const remainingMeters = Math.max(0, totalMeters - nextProgress);
  const routeConfidence = wrongDirection || offRoute
    ? Math.max(0.25, (previousState?.routeConfidence || 1) - 0.2)
    : Math.min(1, (previousState?.routeConfidence || 1) + 0.08);
  const state = {
    currentNode: nextSnapped?.node_id || previousState?.currentNode,
    currentPosition: wrongDirection || offRoute ? simulatedPosition : nextSnapped,
    snappedPosition: nextSnapped,
    activeRouteSegmentIndex: nextSnapped?.activeRouteSegmentIndex || 0,
    routeProgressMeters: nextProgress,
    remainingMeters: Math.ceil(remainingMeters),
    totalMeters,
    headingDegrees: mappedHeading,
    expectedHeadingDegrees: nextSnapped?.expectedHeadingDegrees || expectedHeadingDegrees,
    wrongDirection,
    offRoute,
    routeConfidence,
    nextInstruction: "",
    distanceToNextTurn: nextSnapped?.distanceToNextTurn || 0
  };

  return {
    ...state,
    nextInstruction: nextInstructionFor({ route, destination, state })
  };
};

export const progressPercentFromState = (state) =>
  state?.totalMeters ? Math.min(100, (state.routeProgressMeters / state.totalMeters) * 100) : 0;
