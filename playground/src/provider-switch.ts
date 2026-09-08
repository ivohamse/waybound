import "./provider-switch.css";

const providerSwitch = document.querySelector<HTMLButtonElement>("#provider-switch");
const toolbar = document.querySelector<HTMLElement>(".toolbar");
const toolbarControls = document.querySelector<HTMLElement>(".toolbar-controls");
const providerModal = document.querySelector<HTMLDivElement>("#provider-modal");
const dialogProvider = document.querySelector<HTMLSelectElement>("#dialog-provider");
const dialogApiKey = document.querySelector<HTMLInputElement>("#dialog-api-key");
const dialogConfirm = document.querySelector<HTMLButtonElement>("#dialog-confirm");

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
  const storedProvider = localStorage.getItem("waybound-playground-provider");
  providerSelect.value = storedProvider === "graphhopper" ? "graphhopper" : "ors";

  const syncFromActiveProvider = (): void => {
    const activeProvider = localStorage.getItem("waybound-playground-provider");
    if (activeProvider === "ors" || activeProvider === "graphhopper") {
      providerSelect.value = activeProvider;
    }
  };

  const prepareDialogProvider = (provider: "ors" | "graphhopper"): void => {
    dialogProvider.value = provider;
    dialogProvider.dispatchEvent(new Event("change", { bubbles: true }));
  };

  providerSelect.addEventListener("change", () => {
    const selectedProvider = providerSelect.value as "ors" | "graphhopper";
    const previousProvider = localStorage.getItem("waybound-playground-provider");

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

  new MutationObserver(() => {
    if (providerModal.classList.contains("hidden")) {
      syncFromActiveProvider();
    }
  }).observe(providerModal, { attributes: true, attributeFilter: ["class"] });
}
