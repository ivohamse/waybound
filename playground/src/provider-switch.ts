const providerSwitch = document.querySelector<HTMLButtonElement>("#provider-switch");

if (providerSwitch) {
  const syncProviderName = (): void => {
    const label = providerSwitch.textContent ?? "";
    if (label.startsWith("ORS")) {
      providerSwitch.textContent = label.replace(/^ORS/, "OpenRouteService");
    }
  };

  new MutationObserver(syncProviderName).observe(providerSwitch, {
    childList: true,
    characterData: true,
    subtree: true,
  });

  syncProviderName();
}
