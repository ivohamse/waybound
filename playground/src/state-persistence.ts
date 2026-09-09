type StoredPlaygroundOptions = {
  profile?: string;
  feature?: string;
  instructions?: string;
  language?: string;
  radius?: string;
  rangeType?: string;
  ranges?: string;
};

const STORAGE_KEY = "waybound-playground-options";

const profileSelect = document.querySelector<HTMLSelectElement>("#profile");
const featureSelect = document.querySelector<HTMLSelectElement>("#feature");

if (profileSelect && featureSelect) {
  const stored = readOptions();

  if (stored.profile && hasOption(profileSelect, stored.profile)) {
    profileSelect.value = stored.profile;
    profileSelect.dispatchEvent(new Event("change"));
  }

  if (stored.feature && hasOption(featureSelect, stored.feature)) {
    featureSelect.value = stored.feature;
    featureSelect.dispatchEvent(new Event("change"));
  }

  restoreFeatureOptions(stored);

  profileSelect.addEventListener("change", () => {
    updateOptions({ profile: profileSelect.value });
  });

  featureSelect.addEventListener("change", () => {
    const options = updateOptions({ feature: featureSelect.value });
    restoreFeatureOptions(options);
  });

  document.addEventListener("change", persistDynamicOption);
  document.addEventListener("input", persistDynamicOption);
}

function persistDynamicOption(event: Event): void {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLSelectElement)) return;

  const keys: Record<string, keyof StoredPlaygroundOptions> = {
    instructions: "instructions",
    language: "language",
    radius: "radius",
    "range-type": "rangeType",
    ranges: "ranges",
  };

  const key = keys[target.id];
  if (key) updateOptions({ [key]: target.value });
}

function restoreFeatureOptions(options: StoredPlaygroundOptions): void {
  setValue("#instructions", options.instructions);
  setValue("#language", options.language);
  setValue("#radius", options.radius);
  setValue("#range-type", options.rangeType);
  setValue("#ranges", options.ranges);
}

function setValue(selector: string, value?: string): void {
  if (value === undefined) return;
  const element = document.querySelector<HTMLInputElement | HTMLSelectElement>(selector);
  if (!element) return;
  if (element instanceof HTMLSelectElement && !hasOption(element, value)) return;
  element.value = value;
}

function hasOption(select: HTMLSelectElement, value: string): boolean {
  return Array.from(select.options).some((option) => option.value === value);
}

function readOptions(): StoredPlaygroundOptions {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value ? JSON.parse(value) as StoredPlaygroundOptions : {};
  } catch {
    return {};
  }
}

function updateOptions(patch: Partial<StoredPlaygroundOptions>): StoredPlaygroundOptions {
  const options = { ...readOptions(), ...patch };
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(options));
  } catch {
    // Storage can be unavailable in restrictive browser contexts.
  }
  return options;
}
