/** Short setup panels keep the primary flight action within reach. */
export function flightSetupMarkup() {
  return `<aside class="flight-setup" aria-label="Flight setup">
    <div class="setup-heading"><strong>Flight setup</strong><button id="close-flight-setup" aria-label="Close flight setup">×</button></div>
    <div id="flight-setup-tabs" class="setup-tabs" role="tablist" aria-label="Flight setup sections">
      <button id="setup-tab-aircraft" role="tab" data-setup-tab="aircraft" aria-controls="setup-aircraft">Aircraft</button>
      <button id="setup-tab-field" role="tab" data-setup-tab="field" aria-controls="setup-field">Field</button>
      <button id="setup-tab-input" role="tab" data-setup-tab="input" aria-controls="setup-input">Input</button>
    </div>
    <section id="setup-aircraft" role="tabpanel" aria-labelledby="setup-tab-aircraft" data-setup-panel="aircraft">
      <label for="flight-aircraft">Aircraft</label><select id="flight-aircraft"></select>
      <button data-open-catalog="flight" class="wide browse-aircraft">Browse aircraft <span>↗</span></button>
      <p class="muted small" id="flight-model-info"></p>
      <label>Launch from</label><div class="segmented launch-options" role="group" aria-label="Launch mode"><button data-launch="ground">Ground</button><button data-launch="hand" class="active">Hand throw</button><button data-launch="airborne">In flight</button></div>
      <p class="small muted" id="launch-description"></p>
      <div class="setup-divider"></div><div class="setup-line"><span>All-up weight</span><strong id="flight-mass"></strong></div><div class="setup-line"><span>Landing gear</span><strong id="flight-gear"></strong></div>
      <div id="battery-telemetry" class="battery-telemetry" hidden></div><p id="flight-control-note" class="small muted"></p>
      <a class="setup-text-link" href="#/aircraft">Edit this aircraft ↗</a>
    </section>
    <section id="setup-field" role="tabpanel" aria-labelledby="setup-tab-field" data-setup-panel="field" hidden>
      <label for="scenery-select">Flying site</label><select id="scenery-select"><option value="club">Northfield club · asphalt</option><option value="valley">Alpine meadow · grass</option><option value="mesa">Desert mesa · dirt</option></select><p id="scenery-conditions" class="small muted"></p>
      <div class="two-col"><div><label for="wind-speed">Wind · m/s</label><input id="wind-speed" type="number" min="0" max="12" step="0.5" value="0"/></div><div><label for="wind-direction">Direction</label><select id="wind-direction"><option value="0">Headwind</option><option value="90" selected>Crosswind</option><option value="180">Tailwind</option></select></div></div>
      <label class="check-label"><input type="checkbox" id="gusts"/> Variable gusts</label>
      <p class="setup-change-note">Changing the aircraft, launch mode or field resets this flight.</p>
    </section>
    <section id="setup-input" role="tabpanel" aria-labelledby="setup-tab-input" data-setup-panel="input" hidden>
      <label for="flight-input-type">Input device</label><select id="flight-input-type"><option value="keyboard">Keyboard</option><option value="gamepad">Gamepad</option><option value="joystick">Flight stick</option><option value="transmitter">RC transmitter</option></select>
      <p id="flight-input-status" class="small muted" role="status"></p>
      <div id="flight-controller-diagram" class="controller-diagram compact"></div><div id="flight-shortcut-legend" class="shortcut-legend"></div>
      <div class="setup-line"><span>Mapping & calibration</span><a href="#/controllers" id="source-summary">Keyboard ↗</a></div>
    </section>
    <div class="setup-footer"><button id="launch" class="primary wide">Start flight</button></div>
  </aside>`;
}
