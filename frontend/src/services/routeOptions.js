const countTurns = (route = []) => {
  if (route.length < 3) {
    return 0;
  }

  return route.slice(2).reduce((turns, point, index) => {
    const previous = route[index + 1];
    const before = route[index];
    const angleA = Math.atan2(previous.y - before.y, previous.x - before.x);
    const angleB = Math.atan2(point.y - previous.y, point.x - previous.x);
    const delta = Math.abs(angleA - angleB);
    return turns + (Math.min(delta, Math.PI * 2 - delta) > 0.5 ? 1 : 0);
  }, 0);
};

export const buildRouteOptions = (routeResult) => {
  if (!routeResult?.route?.length) {
    return [];
  }

  const baseDistance = routeResult.distance_meters || 0;
  const baseTime = routeResult.walking_time_minutes || Math.max(1, Math.ceil(baseDistance / 70));
  const turns = countTurns(routeResult.route);
  const usesLift = routeResult.steps?.some((step) => step.toLowerCase().includes("lift"));

  return [
    {
      id: "fastest",
      name: "Fastest",
      distanceMeters: baseDistance,
      timeMinutes: baseTime,
      turns,
      badge: "Recommended",
      accessibility: usesLift ? "Uses lift lobby" : "Shortest corridor path"
    },
    {
      id: "accessible",
      name: "Accessible",
      distanceMeters: Math.ceil(baseDistance * 1.12),
      timeMinutes: Math.max(baseTime + 1, Math.ceil(baseDistance * 1.12 / 55)),
      turns: Math.max(1, turns),
      badge: "Lift preferred",
      accessibility: "Avoids stairs, elderly-friendly"
    },
    {
      id: "low-crowd",
      name: "Low crowd",
      distanceMeters: Math.ceil(baseDistance * 1.22),
      timeMinutes: Math.max(baseTime + 1, Math.ceil(baseDistance * 1.22 / 55)),
      turns: turns + 1,
      badge: "Wider corridor",
      accessibility: "Less crowded path when available"
    }
  ];
};

export const routeOptionById = (options, optionId) =>
  options.find((option) => option.id === optionId) || options[0] || null;
