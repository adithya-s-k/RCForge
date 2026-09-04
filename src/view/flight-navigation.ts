import { degrees, euler, rotate, type Quat, type Vec3 } from "../core/math";
import { $ } from "../app/dom";

export function attitude(q: Quat) {
  const [roll, pitch] = euler(q),
    forward = rotate(q, [1, 0, 0]);
  return {
    roll: degrees(roll),
    pitch: degrees(pitch),
    heading: (degrees(Math.atan2(forward[1], forward[0])) + 360) % 360,
  };
}
export function mapRadius(position: Vec3, pilot: { x: number; z: number }) {
  const extent = Math.max(
    85,
    Math.abs(position[1] - pilot.z),
    Math.abs(position[0] - pilot.x) / 0.68,
    Math.abs(133 - pilot.x) / 0.68,
    Math.abs(-37 - pilot.x) / 0.68,
    Math.abs(pilot.z),
  );
  const target = extent * 1.2,
    power = 10 ** Math.floor(Math.log10(target));
  return [1, 2, 2.5, 5, 10].map((n) => n * power).find((n) => n >= target)!;
}
export function flightNavigationMarkup() {
  return `<aside class="flight-navigation" aria-label="Flight orientation and minimap" data-input-scope="ui">
    <header><span>FLIGHT REFERENCE</span><button id="toggle-navigation" aria-expanded="true" aria-controls="navigation-content" aria-label="Collapse flight reference">−</button></header>
    <div id="navigation-content">
      <div class="attitude-instrument"><span class="nav-caption">ATTITUDE</span>
        <svg viewBox="0 0 128 112" role="img" id="attitude-indicator" aria-label="Aircraft attitude">
          <defs><clipPath id="attitude-clip"><circle cx="64" cy="54" r="43"/></clipPath></defs>
          <g clip-path="url(#attitude-clip)"><g id="attitude-horizon">
            <rect x="-160" y="-240" width="320" height="240" fill="#375e78"/><rect x="-160" y="0" width="320" height="240" fill="#685e48"/>
            <path d="M-160 0H160" stroke="#d8e3e7" stroke-width="1.5"/><path d="M-18-22H18 M-10-11H10 M-10 11H10 M-18 22H18" stroke="#d1dce1" stroke-width=".8"/>
          </g></g><circle cx="64" cy="54" r="43" fill="none" stroke="#667685"/>
          <path d="M64 8 60 14H68Z" fill="#d6e1e7"/><path d="M31 54H51L57 59H71L77 54H97 M64 48V57" fill="none" stroke="#efbc72" stroke-width="2.4" stroke-linejoin="round"/>
          <circle cx="64" cy="54" r="2" fill="#efbc72"/>
        </svg><div class="nav-attitude-values"><span id="nav-roll" title="Roll / bank angle">R 0°</span><span id="nav-pitch" title="Pitch angle">P 0°</span></div>
      </div>
      <button class="nav-map" id="nav-open-position" aria-label="Open position controls from minimap" title="Open Position & view">
        <span class="nav-map-heading"><span>↑ N</span><span id="nav-heading">000°</span></span>
        <svg id="flight-minimap" viewBox="-200 -136 400 272" role="img" aria-label="North-up map: amber aircraft, blue pilot, runway">
          <path d="M0 37V-133" stroke="#a8b3b2" stroke-width="7"/>
          <path id="nav-trail" fill="none" stroke="#cfa975" stroke-width="1" opacity=".55" vector-effect="non-scaling-stroke"/>
          <path id="nav-sightline" fill="none" stroke="#84bddf" stroke-dasharray="3 4" stroke-width=".75" vector-effect="non-scaling-stroke"/>
          <g id="nav-pilot"><circle r="3.5" fill="#89cbf5" stroke="#172630" stroke-width="1"/></g>
          <g id="nav-plane"><path d="M0-9 2-2 8 3V5L2 3 1 7 3 9H-3L-1 7-2 3-8 5V3L-2-2Z" fill="#edb96f" stroke="#16212a" stroke-width=".7"/></g>
        </svg><span class="nav-map-footer"><span><i></i>You <i></i>Aircraft</span><span id="nav-map-range">400 m</span></span>
      </button>
    </div>
  </aside>`;
}
export function createFlightNavigation(openPosition: () => void) {
  let lastTime = -1;
  const trail: Vec3[] = [];
  $("nav-open-position").onclick = openPosition;
  $("toggle-navigation").onclick = () => {
    const collapsed = !$("navigation-content").hidden;
    $("navigation-content").hidden = collapsed;
    $("toggle-navigation").textContent = collapsed ? "+" : "−";
    $("toggle-navigation").setAttribute("aria-expanded", String(!collapsed));
    $("toggle-navigation").setAttribute(
      "aria-label",
      `${collapsed ? "Expand" : "Collapse"} flight reference`,
    );
  };
  return (
    state: { position: Vec3; orientation: Quat; time: number },
    pilot: { x: number; z: number },
  ) => {
    if (state.time < lastTime || state.time === 0) trail.length = 0;
    lastTime = state.time;
    const { roll, pitch, heading } = attitude(state.orientation);
    const format = (n: number) =>
      `${Math.round(n) > 0 ? "+" : ""}${Math.round(n)}°`;
    $("attitude-horizon").setAttribute(
      "transform",
      `translate(64 54) rotate(${-roll}) translate(0 ${pitch * 1.1})`,
    );
    $("attitude-indicator").setAttribute(
      "aria-label",
      `Roll ${Math.round(roll)} degrees, pitch ${Math.round(pitch)} degrees`,
    );
    $("nav-roll").textContent = `R ${format(roll)}`;
    $("nav-pitch").textContent = `P ${format(pitch)}`;
    $("nav-heading").textContent =
      `${String(Math.round(heading) % 360).padStart(3, "0")}°`;
    const r = mapRadius(state.position, pilot),
      p = state.position,
      scale = r / 80;
    $("flight-minimap").setAttribute(
      "viewBox",
      `${pilot.z - r} ${-pilot.x - r * 0.68} ${2 * r} ${r * 1.36}`,
    );
    $("nav-plane").setAttribute(
      "transform",
      `translate(${p[1]} ${-p[0]}) rotate(${heading}) scale(${scale})`,
    );
    $("nav-pilot").setAttribute(
      "transform",
      `translate(${pilot.z} ${-pilot.x}) scale(${scale})`,
    );
    $("nav-sightline").setAttribute(
      "d",
      `M${pilot.z} ${-pilot.x}L${p[1]} ${-p[0]}`,
    );
    if (
      !trail.length ||
      Math.hypot(p[0] - trail.at(-1)![0], p[1] - trail.at(-1)![1]) > 3
    ) {
      trail.push([...p]);
      if (trail.length > 100) trail.shift();
    }
    $("nav-trail").setAttribute(
      "d",
      trail.map((v, i) => `${i ? "L" : "M"}${v[1]} ${-v[0]}`).join(" "),
    );
    $("nav-map-range").textContent =
      r >= 1000 ? `${(2 * r) / 1000} km` : `${2 * r} m`;
  };
}
