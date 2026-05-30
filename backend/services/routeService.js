import {
  getFloorById,
  getQrLocationById,
  getQrLocationsByFloor,
  getRoomById
} from "./dataService.js";

const getLiftLobby = (floor) => {
  const lift = getQrLocationsByFloor(floor).find((location) => location.type === "lift");
  if (!lift) {
    throw Object.assign(new Error(`Lift lobby not found on floor ${floor}`), { status: 404 });
  }
  return lift;
};

const corridorPointForRoom = (room) => ({
  floor: room.floor,
  x: room.door.x,
  y: 300
});

const toRoutePoint = (point) => ({
  floor: point.floor,
  x: point.x,
  y: point.y
});

const LIVE_FLOOR_ID = "ground-live";

const liveNodes = {
  main_entrance: { floor: LIVE_FLOOR_ID, x: 650, y: 540 },
  bottom_junction: { floor: LIVE_FLOOR_ID, x: 650, y: 520 },
  bottom_west: { floor: LIVE_FLOOR_ID, x: 130, y: 520 },
  left_mid: { floor: LIVE_FLOOR_ID, x: 130, y: 250 },
  left_top: { floor: LIVE_FLOOR_ID, x: 130, y: 90 },
  right_mid: { floor: LIVE_FLOOR_ID, x: 650, y: 250 },
  right_top: { floor: LIVE_FLOOR_ID, x: 650, y: 90 },
  rd_access: { floor: LIVE_FLOOR_ID, x: 650, y: 320 },
  it_access: { floor: LIVE_FLOOR_ID, x: 650, y: 400 },
  qa_access: { floor: LIVE_FLOOR_ID, x: 650, y: 480 },
  reception: { floor: LIVE_FLOOR_ID, x: 240, y: 520 },
  reception_room_1: { floor: LIVE_FLOOR_ID, x: 355, y: 520 },
  reception_room_2: { floor: LIVE_FLOOR_ID, x: 475, y: 520 },
  exit: { floor: LIVE_FLOOR_ID, x: 650, y: 520 },
  cafe_area: { floor: LIVE_FLOOR_ID, x: 650, y: 465 },
  food_court: { floor: LIVE_FLOOR_ID, x: 720, y: 115 },
  toilet_1: { floor: LIVE_FLOOR_ID, x: 100, y: 90 },
  toilet_2: { floor: LIVE_FLOOR_ID, x: 185, y: 90 },
  toilet_3: { floor: LIVE_FLOOR_ID, x: 270, y: 90 },
  toilet_4: { floor: LIVE_FLOOR_ID, x: 360, y: 90 },
  discussion_room_1: { floor: LIVE_FLOOR_ID, x: 205, y: 250 },
  discussion_room_2: { floor: LIVE_FLOOR_ID, x: 355, y: 250 },
  discussion_room_3: { floor: LIVE_FLOOR_ID, x: 510, y: 250 },
  discussion_room_4: { floor: LIVE_FLOOR_ID, x: 650, y: 205 },
  discussion_room_5: { floor: LIVE_FLOOR_ID, x: 650, y: 265 },
  discussion_room_6: { floor: LIVE_FLOOR_ID, x: 650, y: 330 },
  discussion_room_7: { floor: LIVE_FLOOR_ID, x: 650, y: 395 },
  discussion_room_8: { floor: LIVE_FLOOR_ID, x: 650, y: 520 },
  discussion_room_9: { floor: LIVE_FLOOR_ID, x: 650, y: 565 },
  apollo_rd_team: { floor: LIVE_FLOOR_ID, x: 600, y: 320 },
  ahll_it_department: { floor: LIVE_FLOOR_ID, x: 600, y: 400 },
  qa_team: { floor: LIVE_FLOOR_ID, x: 600, y: 480 }
};

const liveRouteSequences = {
  main_entrance: ["main_entrance"],
  ahll_it_department: ["main_entrance", "bottom_junction", "qa_access", "it_access", "ahll_it_department"],
  qa_team: ["main_entrance", "bottom_junction", "qa_access", "qa_team"],
  apollo_rd_team: ["main_entrance", "bottom_junction", "qa_access", "it_access", "rd_access", "apollo_rd_team"],
  discussion_room_1: ["main_entrance", "bottom_junction", "bottom_west", "left_mid", "discussion_room_1"],
  discussion_room_2: ["main_entrance", "bottom_junction", "right_mid", "discussion_room_2"],
  discussion_room_3: ["main_entrance", "bottom_junction", "right_mid", "discussion_room_3"],
  discussion_room_4: ["main_entrance", "bottom_junction", "right_mid", "discussion_room_4"],
  discussion_room_5: ["main_entrance", "bottom_junction", "right_mid", "discussion_room_5"],
  discussion_room_6: ["main_entrance", "bottom_junction", "rd_access", "discussion_room_6"],
  discussion_room_7: ["main_entrance", "bottom_junction", "it_access", "discussion_room_7"],
  discussion_room_8: ["main_entrance", "bottom_junction", "discussion_room_8"],
  discussion_room_9: ["main_entrance", "discussion_room_9"],
  cafe_area: ["main_entrance", "bottom_junction", "cafe_area"],
  food_court: ["main_entrance", "bottom_junction", "right_mid", "right_top", "food_court"],
  exit: ["main_entrance", "bottom_junction", "exit"],
  reception: ["main_entrance", "bottom_junction", "reception"]
};

const liveEdges = {
  main_entrance: ["bottom_junction", "discussion_room_9"],
  bottom_junction: ["main_entrance", "bottom_west", "right_mid", "qa_access", "cafe_area", "exit", "discussion_room_8"],
  bottom_west: ["bottom_junction", "left_mid", "reception", "reception_room_1", "reception_room_2"],
  left_mid: ["bottom_west", "left_top", "discussion_room_1", "discussion_room_2", "discussion_room_3", "right_mid"],
  left_top: ["left_mid", "right_top", "toilet_1", "toilet_2", "toilet_3", "toilet_4"],
  right_top: ["left_top", "right_mid", "food_court"],
  right_mid: ["right_top", "bottom_junction", "left_mid", "rd_access", "discussion_room_4", "discussion_room_5"],
  rd_access: ["right_mid", "it_access", "apollo_rd_team", "discussion_room_6"],
  it_access: ["rd_access", "qa_access", "ahll_it_department", "discussion_room_7"],
  qa_access: ["it_access", "bottom_junction", "qa_team"],
  reception: ["bottom_west"],
  reception_room_1: ["bottom_west"],
  reception_room_2: ["bottom_west"],
  exit: ["bottom_junction"],
  cafe_area: ["bottom_junction"],
  food_court: ["right_top"],
  toilet_1: ["left_top"],
  toilet_2: ["left_top"],
  toilet_3: ["left_top"],
  toilet_4: ["left_top"],
  discussion_room_1: ["left_mid"],
  discussion_room_2: ["left_mid"],
  discussion_room_3: ["left_mid"],
  discussion_room_4: ["right_mid"],
  discussion_room_5: ["right_mid"],
  discussion_room_6: ["rd_access"],
  discussion_room_7: ["it_access"],
  discussion_room_8: ["bottom_junction"],
  discussion_room_9: ["main_entrance"],
  apollo_rd_team: ["rd_access"],
  ahll_it_department: ["it_access"],
  qa_team: ["qa_access"]
};

const liveNodeLabels = {
  main_entrance: "Main Entrance",
  bottom_junction: "Entrance Corridor",
  bottom_west: "Reception Corridor",
  left_mid: "Left Apollo Corridor",
  left_top: "Toilet Corridor",
  right_mid: "Main Vertical Corridor",
  right_top: "Food Court Junction",
  rd_access: "R&D Access",
  it_access: "AHLL IT Access",
  qa_access: "QA Access",
  reception: "Reception Block",
  reception_room_1: "Reception Room 1",
  reception_room_2: "Reception Room 2",
  exit: "Main Exit",
  cafe_area: "Cafe Area",
  food_court: "Food Court",
  toilet_1: "Toilet 1",
  toilet_2: "Toilet 2",
  toilet_3: "Toilet 3",
  toilet_4: "Toilet 4",
  discussion_room_1: "Discussion Room 1",
  discussion_room_2: "Discussion Room 2",
  discussion_room_3: "Discussion Room 3",
  discussion_room_4: "Discussion Room 4",
  discussion_room_5: "Discussion Room 5",
  discussion_room_6: "Discussion Room 6",
  discussion_room_7: "Discussion Room 7",
  discussion_room_8: "Discussion Room 8",
  discussion_room_9: "Discussion Room 9",
  apollo_rd_team: "Apollo R&D Team",
  ahll_it_department: "AHLL IT Department",
  qa_team: "QA Team"
};

const titleForNode = (nodeId) =>
  liveNodeLabels[nodeId] ||
  nodeId
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");

const routeDistanceMeters = (route) =>
  Math.round(route.slice(1).reduce((total, point, index) => {
    const previous = route[index];
    const pixels = Math.hypot(point.x - previous.x, point.y - previous.y);
    return total + pixels * 0.18;
  }, 0));

const findLiveRouteSequence = (startNode, destinationNode) => {
  if (startNode === "main_entrance" && liveRouteSequences[destinationNode]) {
    return liveRouteSequences[destinationNode];
  }

  const queue = [[startNode]];
  const visited = new Set([startNode]);

  while (queue.length) {
    const path = queue.shift();
    const node = path[path.length - 1];

    if (node === destinationNode) {
      return path;
    }

    (liveEdges[node] || []).forEach((nextNode) => {
      if (!visited.has(nextNode)) {
        visited.add(nextNode);
        queue.push([...path, nextNode]);
      }
    });
  }

  return null;
};

const buildLiveReceptionSteps = (destination) => {
  const upperDestinations = [
    "toilet_1",
    "toilet_2",
    "toilet_3",
    "toilet_4",
    "food_court",
    "discussion_room_1",
    "discussion_room_2",
    "discussion_room_3",
    "discussion_room_4",
    "discussion_room_5"
  ];
  const centerDestinations = ["apollo_rd_team", "ahll_it_department", "qa_team", "discussion_room_6", "discussion_room_7"];

  if (destination.room_id === "cafe_area" || destination.room_id === "exit") {
    return ["Start from Main Entrance", "Move straight along the entrance corridor", `Proceed to ${destination.name}`, "You have arrived"];
  }

  if (upperDestinations.includes(destination.room_id)) {
    return ["Start from Main Entrance", "Follow the main vertical corridor", "Continue toward the upper corridor", `Proceed to ${destination.name}`, "You have arrived"];
  }

  if (centerDestinations.includes(destination.room_id)) {
    return ["Start from Main Entrance", "Move along the main vertical corridor", "Turn left at the team access point", `Proceed to ${destination.name}`, "You have arrived"];
  }

  if (destination.room_id === "reception" || destination.room_id.startsWith("reception_room")) {
    return ["Start from Main Entrance", "Walk left through the bottom corridor", `Proceed to ${destination.name}`, "You have arrived"];
  }

  return ["Start from Main Entrance", `Proceed to ${destination.name}`, "You have arrived"];
};

const buildLiveRoute = ({ currentLocation, destination, currentFloorMeta }) => {
  const currentNode = currentLocation.node_id || "main_entrance";
  const destinationNode = destination.room_id;
  const nodeSequence = findLiveRouteSequence(currentNode, destinationNode);

  if (!nodeSequence || !nodeSequence.every((nodeId) => liveNodes[nodeId])) {
    throw Object.assign(new Error("Live ground floor route is not available for this destination"), { status: 404 });
  }

  const route = nodeSequence.map((nodeId) => ({
    ...liveNodes[nodeId],
    node_id: nodeId,
    label: titleForNode(nodeId)
  }));
  const distance_meters = routeDistanceMeters(route);

  return {
    current_location: currentLocation,
    destination,
    current_floor: currentFloorMeta,
    destination_floor: currentFloorMeta,
    steps: currentNode === "main_entrance" ? buildLiveReceptionSteps(destination) : [
      `Start from ${currentLocation.name}`,
      "Move to main corridor",
      `Proceed to ${destination.name}`,
      "You have arrived"
    ],
    route,
    distance_meters,
    walking_time_minutes: Math.max(1, Math.ceil(distance_meters / 70)),
    route_graph_nodes: Object.keys(liveNodes)
  };
};

export const buildRoute = ({ current_location_id, destination_room_id }) => {
  const currentLocation = getQrLocationById(current_location_id);
  const destination = getRoomById(destination_room_id);

  if (!currentLocation) {
    throw Object.assign(new Error("Current QR location not found"), { status: 404 });
  }

  if (!destination) {
    throw Object.assign(new Error("Destination room not found"), { status: 404 });
  }

  const currentFloor = currentLocation.floor;
  const destinationFloor = destination.floor;
  const currentFloorMeta = getFloorById(currentFloor);
  const destinationFloorMeta = getFloorById(destinationFloor);

  if (String(currentFloor) === LIVE_FLOOR_ID || String(destinationFloor) === LIVE_FLOOR_ID) {
    return buildLiveRoute({ currentLocation, destination, currentFloorMeta });
  }

  const currentFloorNumber = Number(currentFloor);
  const destinationFloorNumber = Number(destinationFloor);
  const destinationCorridor = corridorPointForRoom(destination);

  let steps = [];
  let route = [];

  if (currentFloorNumber === destinationFloorNumber) {
    steps = [
      `Start at ${currentLocation.name}`,
      "Enter the main corridor",
      `Proceed to Room ${destination.room_number}`
    ];
    route = [
      toRoutePoint(currentLocation),
      { floor: currentFloorNumber, x: currentLocation.x, y: 300 },
      destinationCorridor,
      { floor: destination.floor, x: destination.door.x, y: destination.door.y }
    ];
  } else {
    const currentLift = getLiftLobby(currentFloorNumber);
    const destinationLift = getLiftLobby(destinationFloorNumber);

    steps = [
      `Start at ${currentLocation.name}`,
      "Go to Lift Lobby",
      `Take lift to Floor ${destinationFloorNumber}`,
      "Exit lift and turn right",
      `Proceed to Room ${destination.room_number}`
    ];

    route = [
      toRoutePoint(currentLocation),
      toRoutePoint(currentLift),
      toRoutePoint(destinationLift),
      destinationCorridor,
      { floor: destination.floor, x: destination.door.x, y: destination.door.y }
    ];
  }

  return {
    current_location: currentLocation,
    destination,
    current_floor: currentFloorMeta,
    destination_floor: destinationFloorMeta,
    steps,
    route
  };
};
