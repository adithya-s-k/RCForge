import { setupTabs } from "./tabs";
import { $ } from "./dom";

/** Keep installation editing beside the aircraft without duplicating the draft. */
export function setupEditorWorkspace(selected: (components: boolean) => void) {
  return setupTabs($("editor-sections"), (id) => {
    const components = id === "components";
    $("page-aircraft").dataset.workspace = id;
    $("component-workshop").hidden = !components;
    $("editor-airframe-settings").hidden = components;
    selected(components);
  });
}
