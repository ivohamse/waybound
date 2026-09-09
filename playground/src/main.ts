import * as maplibregl from "maplibre-gl";
import { type GeoJSONSource, type Map } from "maplibre-gl";
import DOMPurify from "dompurify";
import "maplibre-gl/dist/maplibre-gl.css";
import { Router, OpenRouteServiceProvider, GraphHopperProvider, WayboundError, type Coordinate, type ProfileType, type ProviderCapabilities } from "waybound";
import "./styles.css";

type ProviderKey = "ors" | "graphhopper";

type FeatureType = "route" | "nearest" | "matrix" | "isochrones";
type RangeType = "time" | "distance";
type CapabilityFeature = keyof ProviderCapabilities;

const isochroneColorExpression = [
  "match", ["get", "index"],
  0, "#eab308", 1, "#f97316", 2, "#ef4444", 3, "#db2777", 4, "#9333ea", "#2563eb",
] as const;

const capabilityFeature: Record<FeatureType, CapabilityFeature> = {
  route: "directions",
  nearest: "nearest",
  matrix: "matrix",
  isochrones: "isochrones",
};

interface PlaygroundState {
  provider: ProviderKey;
  profile: ProfileType;
  feature: FeatureType;
  coordinates: Coordinate[];
  apiKeys: Partial<Record<ProviderKey, string>>;
  map?: Map;
}

const storedProvider = readLocalStorage("waybound-playground-provider");
const initialProvider: ProviderKey = storedProvider === "graphhopper" ? "graphhopper" : "ors";

const state: PlaygroundState = {
  provider: initialProvider,
  profile: "hike",
  feature: "route",
  coordinates: [],
  apiKeys: {
    ors: import.meta.env.VITE_ORS_API_KEY ?? "",
    graphhopper: import.meta.env.VITE_GRAPHHOPPER_API_KEY ?? "",
  },
};

let providerDialogRequired = true;
let activeRouter: Router | undefined;

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
        <button id="provider-switch" class="provider-switch" type="button"></button>

        <label>
          <span>Profile</span>
          <select id="profile">
            <option value="hike">Hike</option>
            <option value="bike">Bike</option>
            <option value="car">Car</option>
          </select>
        </label>

        <label>
          <span>Feature</span>
          <select id="feature">
            <option value="route">Route</option>
            <option value="nearest">Nearest</option>
            <option value="matrix">Matrix</option>
            <option value="isochrones">Isochrones</option>
          </select>
        </label>

        <div id="feature-options" class="feature-options"></div>

        <button id="run" class="primary" type="button">Run route</button>
        <button id="clear" type="button">Clear</button>
      </div>
    </header>

    <main class="workspace">
      <section class="map-panel">
        <div id="map" aria-label="Interactive Waybound test map"></div>
        <div class="map-help" id="map-help">Click the map to choose a start point.</div>
      </section>

      <aside class="result-panel">
        <div class="status-row">
          <span id="result-title" class="eyebrow">Route result</span>
          <span id="provider-badge" class="badge"></span>
        </div>

        <div id="empty-state" class="empty-state">
          <strong>No result yet</strong>
          <p id="empty-copy">Choose two points on the map and run the route.</p>
        </div>

        <div id="result" class="result hidden"></div>
        <div id="error" class="error hidden" role="alert"></div>
      </aside>
    </main>
  </div>

  <div id="provider-modal" class="modal-backdrop hidden" role="presentation">
    <section class="provider-dialog" role="dialog" aria-modal="true" aria-labelledby="provider-dialog-title">
      <div class="dialog-heading">
        <span class="eyebrow">Routing backend</span>
        <h2 id="provider-dialog-title">Choose a provider</h2>
        <p>Select the provider and credentials you want to use in this playground session.</p>
      </div>

      <label class="dialog-field">
        <span>Provider</span>
        <select id="dialog-provider">
          <option value="ors">OpenRouteService</option>
          <option value="graphhopper">GraphHopper</option>
        </select>
      </label>

      <label class="dialog-field">
        <span>API key <small>optional where supported</small></span>
        <input id="dialog-api-key" type="password" autocomplete="off" spellcheck="false" />
      </label>

      <p class="dialog-note">The provider choice is remembered on this device. API keys are kept only in memory and are cleared when this page is closed or reloaded.</p>

      <div class="dialog-actions">
        <button id="dialog-cancel" type="button">Cancel</button>
        <button id="dialog-confirm" class="primary" type="button">Use provider</button>
      </div>
    </section>
  </div>
`;

const profileSelect = document.querySelector<HTMLSelectElement>("#profile")!;
const featureSelect = document.querySelector<HTMLSelectElement>("#feature")!;
const featureOptions = document.querySelector<HTMLDivElement>("#feature-options")!;
const providerSwitch = document.querySelector<HTMLButtonElement>("#provider-switch")!;
const runButton = document.querySelector<HTMLButtonElement>("#run")!;
const clearButton = document.querySelector<HTMLButtonElement>("#clear")!;
const help = document.querySelector<HTMLDivElement>("#map-help")!;
const providerBadge = document.querySelector<HTMLSpanElement>("#provider-badge")!;
const resultTitle = document.querySelector<HTMLSpanElement>("#result-title")!;
const emptyState = document.querySelector<HTMLDivElement>("#empty-state")!;
const emptyCopy = document.querySelector<HTMLParagraphElement>("#empty-copy")!;
const result = document.querySelector<HTMLDivElement>("#result")!;
const errorBox = document.querySelector<HTMLDivElement>("#error")!;
const providerModal = document.querySelector<HTMLDivElement>("#provider-modal")!;
const dialogProvider = document.querySelector<HTMLSelectElement>("#dialog-provider")!;
const dialogApiKey = document.querySelector<HTMLInputElement>("#dialog-api-key")!;
const dialogCancel = document.querySelector<HTMLButtonElement>("#dialog-cancel")!;
const dialogConfirm = document.querySelector<HTMLButtonElement>("#dialog-confirm")!;

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
      route: { type: "geojson", data: emptyFeatureCollection() },
      "nearest-lines": { type: "geojson", data: emptyFeatureCollection() },
      "nearest-points": { type: "geojson", data: emptyFeatureCollection() },
      isochrones: { type: "geojson", data: emptyFeatureCollection() },
    },
    layers: [
      { id: "osm", type: "raster", source: "osm" },
      { id: "isochrones-fill", type: "fill", source: "isochrones", paint: { "fill-color": isochroneColorExpression, "fill-opacity": 0.24 }, layout: { "fill-sort-key": ["-", ["get", "index"]] } },
      { id: "isochrones-outline", type: "line", source: "isochrones", paint: { "line-color": isochroneColorExpression, "line-width": 2.25, "line-opacity": 0.9 }, layout: { "line-sort-key": ["-", ["get", "index"]] } },
      { id: "nearest-lines-layer", type: "line", source: "nearest-lines", paint: { "line-color": "#7c3aed", "line-width": 2, "line-dasharray": [2, 2] } },
      { id: "route-casing", type: "line", source: "route", paint: { "line-color": "#ffffff", "line-width": 8, "line-opacity": 0.9 } },
      { id: "route-line", type: "line", source: "route", paint: { "line-color": "#2563eb", "line-width": 5, "line-opacity": 0.95 } },
      { id: "nearest-points-layer", type: "circle", source: "nearest-points", paint: { "circle-radius": 7, "circle-color": "#7c3aed", "circle-stroke-color": "#ffffff", "circle-stroke-width": 2 } },
    ],
  },
});
state.map = map;
// Playground-only diagnostic handle; not part of the published Waybound API.
(window as Window & { __wayboundMap?: maplibregl.Map }).__wayboundMap = map;
map.addControl(new maplibregl.NavigationControl(), "bottom-right");

const markers: maplibregl.Marker[] = [];

map.on("click", (event) => {
  const coordinate: Coordinate = [event.lngLat.lng, event.lngLat.lat];
  const max = maxPointsForFeature();

  if (state.feature === "route" && state.coordinates.length >= 2) state.coordinates = [];
  if (state.feature === "isochrones") state.coordinates = [];
  if (state.coordinates.length >= max) return;

  state.coordinates.push(coordinate);
  syncMarkers();
  clearResult(false);
  updateHelp();
});

profileSelect.addEventListener("change", () => {
  state.profile = profileSelect.value as ProfileType;
  clearResult(false);
});

featureSelect.addEventListener("change", () => {
  state.feature = featureSelect.value as FeatureType;
  state.coordinates = [];
  syncMarkers();
  clearVisuals();
  renderFeatureOptions();
  updateFeatureUi();
  clearResult(false);
  updateHelp();
});

providerSwitch.addEventListener("click", () => openProviderDialog(false));
dialogProvider.addEventListener("change", syncDialogApiKey);
dialogConfirm.addEventListener("click", confirmProviderDialog);
dialogCancel.addEventListener("click", closeProviderDialog);
providerModal.addEventListener("click", (event) => {
  if (event.target === providerModal && !providerDialogRequired) closeProviderDialog();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !providerModal.classList.contains("hidden") && !providerDialogRequired) closeProviderDialog();
});

clearButton.addEventListener("click", clearAll);
runButton.addEventListener("click", runFeature);

renderFeatureOptions();
updateFeatureUi();
updateProviderUi();
openProviderDialog(selectedFeatureRequiresCredential());

function openProviderDialog(required: boolean): void {
  providerDialogRequired = required;
  dialogProvider.value = state.provider;
  syncDialogApiKey();
  dialogCancel.classList.toggle("hidden", required);
  providerModal.classList.remove("hidden");
  window.setTimeout(() => dialogProvider.focus(), 0);
}

function closeProviderDialog(): void {
  if (providerDialogRequired) return;
  providerModal.classList.add("hidden");
}

function createProvider(providerKey: ProviderKey, apiKey: string) {
  const http = { timeoutMs: 10_000, maxRetries: 0 };
  const authentication = apiKey ? { type: "api-key" as const, value: apiKey } : undefined;
  return providerKey === "ors"
    ? new OpenRouteServiceProvider({ authentication, http })
    : new GraphHopperProvider({ authentication, http });
}

function selectedFeatureRequiresCredential(providerKey = state.provider): boolean {
  const provider = createProvider(providerKey, "");
  return provider.capabilities[capabilityFeature[state.feature]].authentication.required;
}

function syncDialogApiKey(): void {
  const provider = dialogProvider.value as ProviderKey;
  dialogApiKey.value = state.apiKeys[provider] ?? "";
  dialogApiKey.placeholder = provider === "ors" ? "ORS API key" : "GraphHopper API key";
}

function confirmProviderDialog(): void {
  const provider = dialogProvider.value as ProviderKey;
  const apiKey = dialogApiKey.value.trim();

  state.provider = provider;
  state.apiKeys[provider] = apiKey;
  activeRouter = undefined;
  writeLocalStorage("waybound-playground-provider", provider);

  providerDialogRequired = false;
  providerModal.classList.add("hidden");
  updateProviderUi();
  clearResult(false);
}

function updateProviderUi(): void {
  const label = providerLabel();
  providerSwitch.textContent = `${label} ▾`;
  providerBadge.textContent = label;
}

function maxPointsForFeature(): number {
  if (state.feature === "route") return 2;
  if (state.feature === "isochrones") return 1;
  return 8;
}

function minPointsForFeature(): number {
  if (state.feature === "route") return 2;
  return 1;
}

function renderFeatureOptions(): void {
  if (state.feature === "route") {
    const browserLanguage = getBrowserLanguage();
    featureOptions.innerHTML = `
      <label><span>Instructions</span><select id="instructions"><option value="yes">On</option><option value="no">Off</option></select></label>
      <label><span>Language</span><select id="language">
        <option value="${browserLanguage}">Browser (${browserLanguage})</option>
        <option value="nl">nl</option>
        <option value="en">en</option>
        <option value="de">de</option>
        <option value="fr">fr</option>
      </select></label>
    `;
  } else if (state.feature === "nearest") {
    featureOptions.innerHTML = `<label><span>Radius (m)</span><input id="radius" type="number" min="1" step="1" placeholder="default" /></label>`;
  } else if (state.feature === "isochrones") {
    featureOptions.innerHTML = `
      <label><span>Range type</span><select id="range-type"><option value="time">Time</option><option value="distance">Distance</option></select></label>
      <label class="ranges-field"><span>Ranges</span><input id="ranges" value="300,600,900" aria-label="Isochrone ranges" /></label>
    `;
  } else {
    featureOptions.innerHTML = "";
  }
}

function updateFeatureUi(): void {
  const labels: Record<FeatureType, string> = {
    route: "Route",
    nearest: "Nearest",
    matrix: "Matrix",
    isochrones: "Isochrones",
  };
  runButton.textContent = `Run ${labels[state.feature].toLowerCase()}`;
  resultTitle.textContent = `${labels[state.feature]} result`;
  emptyCopy.textContent = featureEmptyCopy();
}

function featureEmptyCopy(): string {
  if (state.feature === "route") return "Choose two points on the map and run the route.";
  if (state.feature === "nearest") return "Choose one or more points and inspect their nearest mapped points.";
  if (state.feature === "matrix") return "Choose multiple points and compare distance and duration between them.";
  return "Choose one origin and visualize time- or distance-based isochrones.";
}

function syncMarkers(): void {
  markers.forEach((marker) => marker.remove());
  markers.length = 0;

  state.coordinates.forEach((coordinate, index) => {
    const element = document.createElement("div");
    element.className = "route-marker";
    element.textContent = String.fromCharCode(65 + index);
    markers.push(new maplibregl.Marker({ element }).setLngLat(coordinate).addTo(map));
  });
}

function updateHelp(): void {
  const count = state.coordinates.length;
  if (state.feature === "route") {
    help.textContent = count === 0 ? "Click the map to choose a start point." : count === 1 ? "Now choose the destination." : "Ready. Run the route or click elsewhere to start over.";
  } else if (state.feature === "nearest") {
    help.textContent = count === 0 ? "Click one or more locations to test nearest-point lookup." : `${count} point${count === 1 ? "" : "s"} selected. Add more or run nearest.`;
  } else if (state.feature === "matrix") {
    help.textContent = count === 0 ? "Click locations to build a matrix." : `${count} point${count === 1 ? "" : "s"} selected. Add up to 8 or run matrix.`;
  } else {
    help.textContent = count === 0 ? "Click the map to choose the isochrone origin." : "Origin selected. Configure ranges and run isochrones.";
  }
}

function clearAll(): void {
  state.coordinates = [];
  syncMarkers();
  clearVisuals();
  clearResult(true);
  updateHelp();
}

function clearResult(resetVisuals = true): void {
  result.classList.add("hidden");
  result.innerHTML = "";
  emptyState.classList.remove("hidden");
  errorBox.classList.add("hidden");
  errorBox.textContent = "";
  if (resetVisuals) clearVisuals();
}

function clearVisuals(): void {
  setSourceData("route", emptyFeatureCollection());
  setSourceData("nearest-lines", emptyFeatureCollection());
  setSourceData("nearest-points", emptyFeatureCollection());
  setSourceData("isochrones", emptyFeatureCollection());
}

async function runFeature(): Promise<void> {
  errorBox.classList.add("hidden");
  if (state.coordinates.length < minPointsForFeature()) {
    showError(`Select at least ${minPointsForFeature()} point${minPointsForFeature() === 1 ? "" : "s"} first.`);
    return;
  }

  const apiKey = state.apiKeys[state.provider] ?? "";
  if (selectedFeatureRequiresCredential() && !apiKey) {
    openProviderDialog(true);
    return;
  }
  runButton.disabled = true;
  const idleLabel = runButton.textContent ?? "Run";
  runButton.textContent = "Running…";

  try {
    const router = activeRouter ??= new Router({ provider: createProvider(state.provider, apiKey) });
    const availability = router.getObservedAvailability(capabilityFeature[state.feature], state.profile);
    if (availability?.availability === "unavailable") {
      showError(`This ${state.feature} feature is not available for the configured provider/account (${availability.reason ?? "restricted"}).`);
      return;
    }
    if (state.feature === "route") await runRoute(router);
    if (state.feature === "nearest") await runNearest(router);
    if (state.feature === "matrix") await runMatrix(router);
    if (state.feature === "isochrones") await runIsochrones(router);
  } catch (error) {
    if (error instanceof WayboundError) {
      const details = [
        error.code,
        `Provider: ${error.provider ?? providerLabel()}`,
        `HTTP: ${error.status ?? "—"}`,
        "",
        error.message,
      ];
      const observation = activeRouter?.getObservedAvailability(capabilityFeature[state.feature], state.profile);
      if (observation?.availability === "unavailable") {
        details.push("", `Availability: unavailable (${observation.reason ?? "restricted"}).`);
      }
      showError(details.join("\n"));
    } else {
      showError(error instanceof Error ? error.message : String(error));
    }
  } finally {
    runButton.disabled = false;
    runButton.textContent = idleLabel;
  }
}

async function runRoute(router: Router): Promise<void> {
  if (state.coordinates.length !== 2) throw new Error("Route requires exactly two selected points in the playground.");
  const instructions = document.querySelector<HTMLSelectElement>("#instructions")?.value !== "no";
  const language = document.querySelector<HTMLSelectElement>("#language")?.value ?? getBrowserLanguage();
  const response = await router.getRoute({ coordinates: state.coordinates, profile: state.profile, options: { instructions, language } });
  const route = response.routes[0];
  if (!route) throw new Error("Provider returned no route.");

  const routeData = {
    type: "FeatureCollection",
    features: [{ type: "Feature", properties: {}, geometry: route.geometry }],
  };
  console.debug("[Waybound playground] route received", {
    geometryType: route.geometry.type,
    coordinateCount: flattenGeometryCoordinates(route.geometry.coordinates).length,
    routeData,
  });
  (window as Window & { __wayboundRouteData?: object }).__wayboundRouteData = routeData;
  setSourceData("route", routeData);
  fitCoordinates(route.geometry.coordinates as Coordinate[]);
  renderResult(response.provider, `
    <div class="metric-grid">
      <div class="metric"><span>Distance</span><strong>${formatDistance(route.distance)}</strong></div>
      <div class="metric"><span>Duration</span><strong>${formatDuration(route.duration)}</strong></div>
    </div>
    ${renderCoordinatesCard(state.coordinates)}
    <div class="section-block">
      <div class="section-heading"><strong>Maneuvers</strong><span>${route.maneuvers?.length ?? 0}</span></div>
      <ol class="maneuvers">${renderManeuvers(route.maneuvers ?? [])}</ol>
    </div>
  `);
}

async function runNearest(router: Router): Promise<void> {
  const radiusRaw = document.querySelector<HTMLInputElement>("#radius")?.value.trim();
  const radius = radiusRaw ? Number(radiusRaw) : undefined;
  if (radius !== undefined && (!Number.isFinite(radius) || radius <= 0)) throw new Error("Radius must be greater than 0.");

  const response = await router.getNearest({ coordinates: state.coordinates, profile: state.profile, options: radius ? { radius } : undefined });
  const pointFeatures: object[] = [];
  const lineFeatures: object[] = [];

  response.points.forEach((item) => {
    if (!item.nearestPoint) return;
    pointFeatures.push({ type: "Feature", properties: { sourceIndex: item.sourceIndex }, geometry: item.nearestPoint });
    lineFeatures.push({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: [item.inputCoordinate, item.nearestPoint.coordinates] } });
  });

  setSourceData("nearest-points", { type: "FeatureCollection", features: pointFeatures });
  setSourceData("nearest-lines", { type: "FeatureCollection", features: lineFeatures });
  fitCoordinates([...state.coordinates, ...response.points.flatMap((p) => p.nearestPoint ? [p.nearestPoint.coordinates as Coordinate] : [])]);

  renderResult(response.provider, `
    <div class="section-block first">
      <div class="section-heading"><strong>Nearest points</strong><span>${response.points.length}</span></div>
      <div class="result-list">
        ${response.points.map((item) => `
          <div class="result-row">
            <div><strong>${markerLabel(item.sourceIndex)}</strong><span>${item.streetName ? escapeHtml(item.streetName) : "No street name"}</span></div>
            <div class="align-right"><strong>${item.distance == null ? "—" : formatDistance(item.distance)}</strong><code>${item.nearestPoint ? formatCoordinate(item.nearestPoint.coordinates as Coordinate) : "No point"}</code></div>
          </div>`).join("")}
      </div>
    </div>
  `);
}

async function runMatrix(router: Router): Promise<void> {
  const response = await router.getMatrix({ coordinates: state.coordinates, profile: state.profile });
  fitCoordinates(state.coordinates);
  renderResult(response.provider, `
    <div class="section-block first">
      <div class="section-heading"><strong>Durations</strong><span>seconds → formatted</span></div>
      ${renderMatrix(response.durations, formatDuration)}
    </div>
    <div class="section-block">
      <div class="section-heading"><strong>Distances</strong><span>meters → formatted</span></div>
      ${renderMatrix(response.distances, formatDistance)}
    </div>
  `);
}

async function runIsochrones(router: Router): Promise<void> {
  const rangeType = (document.querySelector<HTMLSelectElement>("#range-type")?.value ?? "time") as RangeType;
  const ranges = parseRanges(document.querySelector<HTMLInputElement>("#ranges")?.value ?? "");
  const response = await router.getIsochrones({ coordinate: state.coordinates[0], profile: state.profile, options: { rangeType, ranges } });

  setSourceData("isochrones", {
    type: "FeatureCollection",
    features: response.isochrones.map((item, index) => ({ type: "Feature", properties: { index }, geometry: item.geometry })),
  });

  const boundsCoordinates = response.isochrones.flatMap((item) => flattenGeometryCoordinates(item.geometry.coordinates));
  fitCoordinates(boundsCoordinates.length ? boundsCoordinates : state.coordinates);

  renderResult(response.provider, `
    <div class="section-block first">
      <div class="section-heading"><strong>Isochrones</strong><span>${response.isochrones.length}</span></div>
      <div class="result-list">
        ${response.isochrones.map((item, index) => {
          const value = "duration" in item ? formatDuration(item.duration) : formatDistance(item.distance);
          return `<div class="result-row"><div><strong>Range ${index + 1}</strong><span>${rangeType}</span></div><div class="align-right"><strong>${value}</strong><code>${item.geometry.type}</code></div></div>`;
        }).join("")}
      </div>
    </div>
  `);
}

function renderResult(provider: string, html: string): void {
  providerBadge.textContent = provider;
  result.innerHTML = DOMPurify.sanitize(html, { USE_PROFILES: { html: true } });
  emptyState.classList.add("hidden");
  errorBox.classList.add("hidden");
  result.classList.remove("hidden");
}

function renderCoordinatesCard(coordinates: Coordinate[]): string {
  return `<div class="coords-card">${coordinates.map((coordinate, index) => `<div><span>${markerLabel(index)}</span><code>${formatCoordinate(coordinate)}</code></div>`).join("")}</div>`;
}

function renderManeuvers(maneuvers: Array<{ instruction: string; distance: number; duration: number }>): string {
  if (maneuvers.length === 0) return `<li class="muted">No turn-by-turn maneuvers returned.</li>`;
  return maneuvers.slice(0, 40).map((maneuver) => `<li><span>${escapeHtml(maneuver.instruction)}</span><small>${formatDistance(maneuver.distance)} · ${formatDuration(maneuver.duration)}</small></li>`).join("");
}

function renderMatrix(values: (number | null)[][], formatter: (value: number) => string): string {
  const headers = state.coordinates.map((_, index) => markerLabel(index));
  return `<div class="matrix-wrap"><table class="matrix-table"><thead><tr><th></th>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${values.map((row, rowIndex) => `<tr><th>${headers[rowIndex] ?? rowIndex + 1}</th>${row.map((value) => `<td>${value == null ? "—" : formatter(value)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
}

function parseRanges(value: string): number[] {
  const ranges = value.split(",").map((part) => Number(part.trim())).filter((n) => Number.isFinite(n));
  if (ranges.length === 0 || ranges.some((n) => n <= 0)) throw new Error("Ranges must be comma-separated positive numbers, e.g. 300,600,900.");
  return ranges;
}

function flattenGeometryCoordinates(value: unknown): Coordinate[] {
  if (!Array.isArray(value)) return [];
  if (value.length >= 2 && typeof value[0] === "number" && typeof value[1] === "number") return [[value[0], value[1]] as Coordinate];
  return value.flatMap(flattenGeometryCoordinates);
}

function setSourceData(id: string, data: object): void {
  const source = map.getSource(id) as GeoJSONSource | undefined;
  console.debug("[Waybound playground] setting source data", { id, hasSource: Boolean(source), data });
  if (!source) return;

  source.setData(data as never);
  console.debug("[Waybound playground] source data after setData", {
    id,
    data: source.serialize().data,
  });
}

function emptyFeatureCollection(): { type: "FeatureCollection"; features: never[] } {
  return { type: "FeatureCollection", features: [] };
}

function fitCoordinates(coordinates: Coordinate[]): void {
  if (coordinates.length === 0) return;
  const bounds = coordinates.reduce((acc, coordinate) => acc.extend(coordinate), new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));
  map.fitBounds(bounds, { padding: 80, duration: 600, maxZoom: 14 });
}

function showError(message: string): void {
  emptyState.classList.add("hidden");
  result.classList.add("hidden");
  errorBox.textContent = message;
  errorBox.classList.remove("hidden");
}

function getBrowserLanguage(): string {
  const language = navigator.language?.trim().toLowerCase();
  return language ? language.split("-")[0] : "en";
}

function providerLabel(): string {
  return state.provider === "ors" ? "ORS" : "GraphHopper";
}

function markerLabel(index: number): string {
  return String.fromCharCode(65 + index);
}

function formatDistance(meters: number): string {
  return meters >= 1000 ? `${(meters / 1000).toFixed(2)} km` : `${Math.round(meters)} m`;
}

function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`;
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
  return value.replace(/[&<>'\"]/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '\"': "&quot;" })[char] ?? char);
}

function readLocalStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocalStorage(key: string, value: string): void {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in restrictive browser contexts.
  }
}
