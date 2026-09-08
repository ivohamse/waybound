import maplibregl, { type GeoJSONSource, type Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Router, WayboundError, type Coordinate, type ProfileType, type ProviderType } from "waybound";
import "./styles.css";

type PointRole = "start" | "end";

interface PlaygroundState {
  provider: ProviderType;
  profile: ProfileType;
  coordinates: Coordinate[];
  apiKeys: Partial<Record<ProviderType, string>>;
  map?: Map;
}

const state: PlaygroundState = {
  provider: "ors",
  profile: "hike",
  coordinates: [],
  apiKeys: {
    ors: import.meta.env.VITE_ORS_API_KEY ?? "",
    graphhopper: import.meta.env.VITE_GRAPHHOPPER_API_KEY ?? "",
  },
};

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) throw new Error("Missing #app element");

app.innerHTML = `
  <div class="shell">
    <header class="toolbar">
      <div class="brand">
        <div class="brand-mark">W</div>
        <div>
          <strong>Waybound Playground</strong>
          <span>visual provider testing</span>
        </div>
      </div>

      <div class="toolbar-controls">
        <label>
          <span>Provider</span>
          <select id="provider">
            <option value="ors">OpenRouteService</option>
            <option value="graphhopper">GraphHopper</option>
          </select>
        </label>

        <label>
          <span>Profile</span>
          <select id="profile">
            <option value="hike">Hike</option>
            <option value="bike">Bike</option>
            <option value="car">Car</option>
          </select>
        </label>

        <label class="api-key-field">
          <span>API key</span>
          <input id="api-key" type="password" autocomplete="off" spellcheck="false" placeholder="ORS API key" />
        </label>

        <button id="run" class="primary" type="button">Run route</button>
        <button id="clear" type="button">Clear</button>
      </div>
    </header>

    <main class="workspace">
      <section class="map-panel">
        <div id="map" aria-label="Interactive routing map"></div>
        <div class="map-help" id="map-help">Click the map to choose a start point.</div>
      </section>

      <aside class="result-panel">
        <div class="status-row">
          <span class="eyebrow">Route result</span>
          <span id="provider-badge" class="badge">ORS</span>
        </div>

        <div id="empty-state" class="empty-state">
          <strong>No route yet</strong>
          <p>Choose two points on the map, enter the active provider key and run the route.</p>
        </div>

        <div id="result" class="result hidden">
          <div class="metric-grid">
            <div class="metric"><span>Distance</span><strong id="distance">—</strong></div>
            <div class="metric"><span>Duration</span><strong id="duration">—</strong></div>
          </div>

          <div class="coords-card">
            <div><span>Start</span><code id="start-coordinate">—</code></div>
            <div><span>End</span><code id="end-coordinate">—</code></div>
          </div>

          <div class="maneuver-section">
            <div class="section-heading">
              <strong>Maneuvers</strong>
              <span id="maneuver-count">0</span>
            </div>
            <ol id="maneuvers"></ol>
          </div>
        </div>

        <div id="error" class="error hidden" role="alert"></div>
      </aside>
    </main>
  </div>
`;

const providerSelect = document.querySelector<HTMLSelectElement>("#provider")!;
const profileSelect = document.querySelector<HTMLSelectElement>("#profile")!;
const apiKeyInput = document.querySelector<HTMLInputElement>("#api-key")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const clearButton = document.querySelector<HTMLButtonElement>("#clear")!;
const help = document.querySelector<HTMLDivElement>("#map-help")!;
const providerBadge = document.querySelector<HTMLSpanElement>("#provider-badge")!;
const emptyState = document.querySelector<HTMLDivElement>("#empty-state")!;
const result = document.querySelector<HTMLDivElement>("#result")!;
const errorBox = document.querySelector<HTMLDivElement>("#error")!;

apiKeyInput.value = state.apiKeys.ors ?? "";

const map = new maplibregl.Map({
  container: "map",
  center: [6.75, 52.35],
  zoom: 7.4,
  style: {
    version: 8,
    sources: {
      osm: {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "© OpenStreetMap contributors",
      },
    },
    layers: [{ id: "osm", type: "raster", source: "osm" }],
  },
});
state.map = map;

map.addControl(new maplibregl.NavigationControl(), "bottom-right");

map.on("load", () => {
  map.addSource("route", {
    type: "geojson",
    data: { type: "FeatureCollection", features: [] },
  });

  map.addLayer({
    id: "route-casing",
    type: "line",
    source: "route",
    paint: {
      "line-color": "#ffffff",
      "line-width": 8,
      "line-opacity": 0.9,
    },
  });

  map.addLayer({
    id: "route-line",
    type: "line",
    source: "route",
    paint: {
      "line-color": "#2563eb",
      "line-width": 5,
      "line-opacity": 0.95,
    },
  });
});

const markers: Partial<Record<PointRole, maplibregl.Marker>> = {};

map.on("click", (event) => {
  if (state.coordinates.length >= 2) {
    clearRoute();
  }

  state.coordinates.push([event.lngLat.lng, event.lngLat.lat]);
  syncMarkers();
  clearResult();
  updateHelp();
});

providerSelect.addEventListener("change", () => {
  state.apiKeys[state.provider] = apiKeyInput.value.trim();
  state.provider = providerSelect.value as ProviderType;
  apiKeyInput.value = state.apiKeys[state.provider] ?? "";
  apiKeyInput.placeholder = state.provider === "ors" ? "ORS API key" : "GraphHopper API key";
  providerBadge.textContent = state.provider === "ors" ? "ORS" : "GraphHopper";
  clearResult();
});

profileSelect.addEventListener("change", () => {
  state.profile = profileSelect.value as ProfileType;
  clearResult();
});

apiKeyInput.addEventListener("input", () => {
  state.apiKeys[state.provider] = apiKeyInput.value.trim();
});

clearButton.addEventListener("click", clearRoute);
runButton.addEventListener("click", runRoute);

function syncMarkers(): void {
  const roles: PointRole[] = ["start", "end"];

  roles.forEach((role, index) => {
    markers[role]?.remove();
    delete markers[role];

    const coordinate = state.coordinates[index];
    if (!coordinate) return;

    const element = document.createElement("div");
    element.className = `route-marker ${role}`;
    element.textContent = role === "start" ? "A" : "B";

    markers[role] = new maplibregl.Marker({ element })
      .setLngLat(coordinate)
      .addTo(map);
  });
}

function updateHelp(): void {
  if (state.coordinates.length === 0) help.textContent = "Click the map to choose a start point.";
  if (state.coordinates.length === 1) help.textContent = "Now choose the destination.";
  if (state.coordinates.length === 2) help.textContent = "Ready. Run the route or click elsewhere to start over.";
}

function clearRoute(): void {
  state.coordinates = [];
  syncMarkers();
  setRouteGeometry(undefined);
  clearResult();
  updateHelp();
}

function clearResult(): void {
  result.classList.add("hidden");
  emptyState.classList.remove("hidden");
  errorBox.classList.add("hidden");
  errorBox.textContent = "";
  setRouteGeometry(undefined);
}

async function runRoute(): Promise<void> {
  errorBox.classList.add("hidden");

  if (state.coordinates.length !== 2) {
    showError("Choose exactly two points on the map first.");
    return;
  }

  const apiKey = apiKeyInput.value.trim();
  if (!apiKey) {
    showError(`Enter an API key for ${state.provider === "ors" ? "OpenRouteService" : "GraphHopper"}.`);
    return;
  }

  runButton.disabled = true;
  runButton.textContent = "Routing…";

  try {
    const router = new Router({
      provider: state.provider,
      apiKey,
      http: { timeoutMs: 10_000, maxRetries: 0 },
    });

    const response = await router.getRoute({
      coordinates: state.coordinates,
      profile: state.profile,
      options: { instructions: true },
    });

    const route = response.routes[0];
    if (!route) throw new Error("Provider returned no route.");

    setRouteGeometry(route.geometry);
    renderResult(response.provider, route.distance, route.duration, route.maneuvers ?? []);
    fitToRoute(route.geometry.coordinates as Coordinate[]);
  } catch (error) {
    const message = error instanceof WayboundError
      ? `${error.code}: ${error.message}`
      : error instanceof Error
        ? error.message
        : String(error);
    showError(message);
  } finally {
    runButton.disabled = false;
    runButton.textContent = "Run route";
  }
}

function setRouteGeometry(geometry?: { type: "LineString"; coordinates: number[][] }): void {
  const source = map.getSource("route") as GeoJSONSource | undefined;
  if (!source) return;

  source.setData(geometry
    ? { type: "Feature", properties: {}, geometry }
    : { type: "FeatureCollection", features: [] });
}

function renderResult(
  provider: string,
  distance: number,
  duration: number,
  maneuvers: Array<{ instruction: string; distance: number; duration: number }>,
): void {
  providerBadge.textContent = provider;
  document.querySelector("#distance")!.textContent = formatDistance(distance);
  document.querySelector("#duration")!.textContent = formatDuration(duration);
  document.querySelector("#start-coordinate")!.textContent = formatCoordinate(state.coordinates[0]);
  document.querySelector("#end-coordinate")!.textContent = formatCoordinate(state.coordinates[1]);
  document.querySelector("#maneuver-count")!.textContent = String(maneuvers.length);

  const list = document.querySelector<HTMLOListElement>("#maneuvers")!;
  list.innerHTML = "";

  maneuvers.slice(0, 40).forEach((maneuver) => {
    const item = document.createElement("li");
    item.innerHTML = `<span>${escapeHtml(maneuver.instruction)}</span><small>${formatDistance(maneuver.distance)} · ${formatDuration(maneuver.duration)}</small>`;
    list.appendChild(item);
  });

  if (maneuvers.length === 0) {
    const item = document.createElement("li");
    item.className = "muted";
    item.textContent = "No turn-by-turn maneuvers returned.";
    list.appendChild(item);
  }

  emptyState.classList.add("hidden");
  errorBox.classList.add("hidden");
  result.classList.remove("hidden");
}

function fitToRoute(coordinates: Coordinate[]): void {
  if (coordinates.length === 0) return;
  const bounds = coordinates.reduce(
    (acc, coordinate) => acc.extend(coordinate),
    new maplibregl.LngLatBounds(coordinates[0], coordinates[0]),
  );
  map.fitBounds(bounds, { padding: 80, duration: 600, maxZoom: 14 });
}

function showError(message: string): void {
  emptyState.classList.add("hidden");
  result.classList.add("hidden");
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours} h ${remainder} min`;
}

function formatCoordinate(coordinate?: Coordinate): string {
  return coordinate ? `${coordinate[0].toFixed(5)}, ${coordinate[1].toFixed(5)}` : "—";
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>'"]/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  })[char] ?? char);
}
