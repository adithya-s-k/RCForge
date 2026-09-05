const aircraftIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 14 10 21 15V17L14 15 13 20 16 22H8L11 20 10 15 3 17V15L10 10Z" fill="currentColor"/></svg>';
const personIcon =
  '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="5" r="3" fill="currentColor"/><path d="M7 12Q7 9 12 9T17 12V16H14V22H10V16H7Z" fill="currentColor"/></svg>';

export function positionPanelMarkup() {
  return `<aside id="position-panel" class="position-panel" aria-labelledby="position-title" data-input-scope="ui" hidden>
    <header class="position-header"><div><h2 id="position-title">Position & view</h2><span id="position-state">Aircraft & pilot · field layout</span></div><button id="close-position" class="icon-button" aria-label="Close position controls">×</button></header>
      <div class="position-targets" role="group" aria-label="Position target">
        <button data-position-target="aircraft" aria-pressed="true" class="active">${aircraftIcon}<span>Aircraft</span><i id="position-pending" hidden></i></button>
        <button data-position-target="pilot" aria-pressed="false">${personIcon}<span>You</span></button>
      </div>
    <div class="position-content">
      <div class="position-map-wrap">
        <svg id="position-map" viewBox="-90 -90 180 130" role="group" tabindex="0" aria-label="Field positioning map" aria-describedby="position-map-hint">
          <defs><pattern id="position-grid" width="20" height="20" patternUnits="userSpaceOnUse"><path d="M20 0H0V20" fill="none" stroke="#63776a" stroke-width=".3" opacity=".24"/></pattern></defs>
          <rect x="-7000" y="-7000" width="14000" height="14000" fill="#283a33"/>
          <rect x="-7000" y="-7000" width="14000" height="14000" fill="url(#position-grid)"/>
          <rect x="-11" y="-168" width="22" height="220" fill="#485844" opacity=".6"/>
          <rect id="position-map-runway" x="-3.5" y="-133" width="7" height="170" rx=".4" fill="#778187"/>
          <path d="M0-129V33" fill="none" stroke="#e0e2d8" stroke-width=".4" stroke-dasharray="4 6"/>
          <path d="M-7.5 22V-25" stroke="#d7a264" stroke-width=".6" stroke-dasharray="2 3"/>
          <path id="position-sightline" fill="none" stroke="#81b6d8" opacity=".5"/>
          <g id="position-aircraft-actual" aria-hidden="true" opacity=".35"><path d="M0-12 2-3 11 3V5L2 3 1 9 4 11H-4L-1 9-2 3-11 5V3L-2-3Z" fill="#d8e4ec"/></g>
          <g id="position-aircraft" role="button" tabindex="0" aria-label="Aircraft position" data-position-pin="aircraft"><circle r="19" fill="transparent"/><circle class="pin-halo" r="17" fill="#e9b567" fill-opacity=".12"/><path d="M0-12 2-3 11 3V5L2 3 1 9 4 11H-4L-1 9-2 3-11 5V3L-2-3Z" fill="#e9b567" stroke="#182129" stroke-width="1"/></g>
          <g id="position-pilot" role="button" tabindex="0" aria-label="Pilot position" data-position-pin="pilot"><circle r="19" fill="transparent"/><circle class="pin-halo" r="16" fill="#85c6f2" fill-opacity=".14"/><circle r="6" fill="#85c6f2" stroke="#142431" stroke-width="2"/><path d="M-5-10 0-16 5-10" fill="none" stroke="#85c6f2" stroke-width="2"/></g>
        </svg>
        <span class="position-north" aria-hidden="true">↑ N</span>
        <div class="position-map-actions"><button id="position-zoom-in" aria-label="Zoom map in">+</button><button id="position-zoom-out" aria-label="Zoom map out">−</button><button id="position-fit" aria-label="Fit aircraft and pilot on map">Fit</button></div>
        <span id="position-map-scale" class="position-map-scale">100 m</span>
      </div>
      <p id="position-map-hint" class="position-hint">Drag markers · click to place · arrows to nudge</p>
      <div id="position-aircraft-tools">
        <div class="position-presets"><button id="place-runway">Runway start</button><button id="place-near-me">In front of me</button></div>
        <div class="position-bearing"><label for="place-heading">Heading <output id="place-heading-value">000° N</output></label><input id="place-heading" type="range" min="0" max="359" step="1" value="0"/></div>
        <label class="position-height" id="position-height-control">Launch height <span><input id="place-height" aria-label="Launch height in metres" type="number" min=".3" max="1000" step=".1" value="1.7"/> m</span></label>
        <p id="position-ground-note" class="position-hint" hidden>On ground · wheel height set automatically</p>
      </div>
      <div id="position-pilot-tools" hidden>
        <div class="position-presets"><button id="stand-near">Beside aircraft</button><button id="pilot-home">Flight line</button></div>
        <p class="position-hint">Your view moves immediately. The aircraft stays put.</p>
      </div>
      <details class="position-coordinates"><summary>Exact position <span id="position-coordinate-summary"></span></summary><div class="two-col"><label>North · m<input id="place-north" type="number" min="-2000" max="2000" step="1"/></label><label>East · m<input id="place-east" type="number" min="-2000" max="2000" step="1"/></label></div><button id="default-placement" class="position-text-button">Restore aircraft start position</button></details>
      <div class="position-view-settings"><label class="position-track"><input id="track-plane" type="checkbox" checked/> Keep aircraft in view</label><label class="position-track"><input id="focus-plane" type="checkbox" checked/> Focus at distance</label><label class="position-walk"><input id="walk-mode" type="checkbox"/> Use WASD to walk <span>Arrows still fly</span></label><label class="fov-control"><span id="view-range-label">View angle</span><input id="pilot-fov" aria-label="View zoom" type="range" min="20" max="80" value="55"/><output id="fov-value">55°</output></label></div>
      <p class="position-help">In the field: <kbd>I J K L</kbd> walk · drag to look · scroll to zoom<br/>Double-click the field to position the selected marker.</p>
      <p id="position-error" class="position-error" role="alert"></p>
    </div>
    <footer class="position-footer"><span id="position-feedback" role="status">Choose a spot on the map</span><button id="apply-placement" class="primary">Place aircraft</button><button id="position-done" hidden>Done</button></footer>
  </aside>`;
}
