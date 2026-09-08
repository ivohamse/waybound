const providerSwitch = document.querySelector<HTMLButtonElement>("#provider-switch");

if (providerSwitch) {
  const wrapper = document.createElement("div");
  wrapper.className = "provider-switch-wrap";

  const label = document.createElement("span");
  label.textContent = "Provider";

  providerSwitch.parentElement?.insertBefore(wrapper, providerSwitch);
  wrapper.append(label, providerSwitch);

  const syncProviderName = (): void => {
    const text = providerSwitch.textContent ?? "";
    if (text.startsWith("ORS")) {
      providerSwitch.textContent = text.replace(/^ORS/, "OpenRouteService");
    }
  };

  new MutationObserver(syncProviderName).observe(providerSwitch, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  syncProviderName();
}
