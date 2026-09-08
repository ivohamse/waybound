import "./provider-switch.css";

const providerSwitch = document.querySelector<HTMLButtonElement>("#provider-switch");
const toolbar = document.querySelector<HTMLElement>(".toolbar");
const toolbarControls = document.querySelector<HTMLElement>(".toolbar-controls");
const providerModal = document.querySelector<HTMLDivElement>("#provider-modal");
const dialogProvider = document.querySelector<HTMLSelectElement>("#dialog-provider");
const dialogApiKey = document.querySelector<HTMLInputElement>("#dialog-api-key");
const dialogConfirm = document.querySelector<HTMLButtonElement>("#dialog-confirm");
const providerBadge = document.querySelector<HTMLSpanElement>("#provider-badge");
const errorBox = document.querySelector<HTMLDivElement>("#error");

const providerName = (provider: string): string => {
  const normalized = provider.trim().toLowerCase();
  return normalized === "ors" || normalized === "openrouteservice"
    ? "OpenRouteService"
    : normalized === "graphhopper"
      ? "GraphHopper"
      : provider;
};

const readProvider = (): "ors" | "graphhopper" | null => {
  try {
    const provider = localStorage.getItem("waybound-playground-provider");
    return provider === "ors" || provider === "graphhopper" ? provider : null;
  } catch {
    return null;
  }
};

if (providerBadge) {
  const normalizeProviderBadge = (): void => {
    const current = providerBadge.textContent ?? "";
    const normalized = providerName(current);
    if (normalized !== current) providerBadge.textContent = normalized;
  };

  normalizeProviderBadge();
  new MutationObserver(normalizeProviderBadge).observe(providerBadge, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

if (errorBox) {
  const improveAuthenticationError = (): void => {
    if (errorBox.classList.contains("hidden")) return;

    const message = errorBox.textContent ?? "";
    if (!/HTTP:\s*(401|403)\b/.test(message) || message.includes("Check credentials:")) return;

    const providerMatch = message.match(/Provider:\s*([^\n]+)/);
    const provider = providerName(providerMatch?.[1] ?? (readProvider() === "ors" ? "OpenRouteService" : "GraphHopper"));
    const normalizedMessage = providerMatch
      ? message.replace(providerMatch[0], `Provider: ${provider}`)
      : message;

    errorBox.textContent = `${normalizedMessage}\n\nCheck credentials: make sure the API key belongs to ${provider} and is valid. A 403 can also mean the selected feature is not available for this account.`;
  };

  new MutationObserver(improveAuthenticationError).observe(errorBox, {
    attributes: true,
    attributeFilter: ["class"],
    childList: true,
    characterData: true,
    subtree: true,
  });
}

if (
  providerSwitch &&
  toolbar &&
  toolbarControls &&
  providerModal &&
  dialogProvider &&
  dialogApiKey &&
  dialogConfirm
) {
  const wrapper = document.createElement("label");
  wrapper.className = "provider-select-wrap";
  wrapper.innerHTML = `
    <span>Provider</span>
    <select id="provider-select" aria-label="Provider">
      <option value="ors">OpenRouteService</option>
      <option value="graphhopper">GraphHopper</option>
    </select>
  `;

  toolbar.insertBefore(wrapper, toolbarControls);
  providerSwitch.classList.add("hidden");

  const providerSelect = wrapper.querySelector<HTMLSelectElement>("#provider-select")!;
  providerSelect.value = readProvider() === "graphhopper" ? "graphhopper" : "ors";

  const syncFromActiveProvider = (): void => {
    const activeProvider = readProvider();
    if (activeProvider) providerSelect.value = activeProvider;
  };

  const prepareDialogProvider = (provider: "ors" | "graphhopper"): void => {
    dialogProvider.value = provider;
    dialogProvider.dispatchEvent(new Event("change", { bubbles: true }));
    dialogApiKey.placeholder = `${providerName(provider)} API key`;
  };

  providerSelect.addEventListener("change", () => {
    const selectedProvider = providerSelect.value as "ors" | "graphhopper";
    const previousProvider = readProvider();

    if (selectedProvider === previousProvider) return;

    prepareDialogProvider(selectedProvider);

    if (dialogApiKey.value.trim()) {
      dialogConfirm.click();
      syncFromActiveProvider();
      return;
    }

    providerSwitch.click();
    prepareDialogProvider(selectedProvider);
  });

  dialogProvider.addEventListener("change", () => {
    dialogApiKey.placeholder = `${providerName(dialogProvider.value)} API key`;
  });

  new MutationObserver(() => {
    if (providerModal.classList.contains("hidden")) {
      syncFromActiveProvider();
    }
  }).observe(providerModal, { attributes: true, attributeFilter: ["class"] });
}
