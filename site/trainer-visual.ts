/** Original socket drawing with builder-reported FS-i6 contact reference.
 * Source: rootik/RCTransmitter-USBGamepad images/fs-i6.png (rear socket photo).
 * Confirm actual hardware/cable; this is not a manufacturer pinout.
 * Resistor placement agrees with hardware/ppm_monitor and rcforge_bridge.
 */
export function trainerNanoDiagram(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="970" viewBox="0 0 1200 970" role="img" aria-labelledby="title desc">
<title id="title">FS-i6 trainer socket to Arduino Nano</title>
<desc id="desc">An outside rear view locates the trainer socket below the antenna. A builder reference identifies upper-left PPM OUT and the metal shell as ground, with the key opening at the top. Confirm actual hardware before wiring. Use a documented breakout: PPM OUT through 1 kiloohm to D2, 47 kiloohms from D2 to ground, and shared ground. Transmitter and Nano have separate power. Read diagnostics before using the bridge.</desc>
<style>text{font-family:Arial,Helvetica,sans-serif;fill:#f1f2f5}.small{font-size:16px;fill:#a1a5b0}.label{font-size:13px;letter-spacing:2px;fill:#a1a5b0}.heading{font-size:22px;font-weight:700}.mono{font-family:monospace;font-size:18px}.signal{stroke:#eac275;fill:none;stroke-width:4;stroke-linejoin:round}.ground{stroke:#b2bccb;fill:none;stroke-width:4}.panel{fill:#191c22;stroke:#3b404b}.outline{stroke:#737c89;stroke-width:2;fill:none}</style>
<rect width="1200" height="970" rx="20" fill="#111419"/>
<text x="40" y="40" class="label">RCFORGE / BENCH CONNECTION GUIDE</text>
<text x="40" y="86" font-size="34" font-weight="700">Your transmitter. Two signal connections.</text>
<text x="40" y="118" class="small">FS-i6 → verified trainer breakout → classic Nano → USB</text>

<rect x="32" y="152" width="390" height="586" rx="14" class="panel"/>
<text x="56" y="187" class="label">01 / FIND THE SOCKET</text>
<text x="56" y="220" class="heading">Looking at the back</text>
<!-- Original simplified rear case with antenna and battery hatch. -->
<path d="M98 281 Q227 243 356 281 L375 565 Q227 600 79 565Z" fill="#242a32" stroke="#737c89" stroke-width="2"/>
<path d="M207 265V244Q227 232 247 244V265" class="outline"/>
<path d="M215 322V272H239V322" fill="#191c22" stroke="#737c89" stroke-width="2"/>
<rect x="190" y="337" width="74" height="76" rx="8" fill="#111419" stroke="#737c89"/>
<circle cx="227" cy="369" r="23" class="outline"/>
<text x="227" y="402" font-size="9" text-anchor="middle">TRAINER</text>
<rect x="120" y="458" width="214" height="92" rx="12" fill="#191c22" stroke="#737c89"/>
<text x="227" y="500" class="small" text-anchor="middle">Battery compartment</text>
<path d="M203 522h48" class="outline"/>
<!-- Builder-reported contact reference, outside rear view, key opening up. -->
<path d="M252 369H365V586H227V600" fill="none" stroke="#737c89" stroke-dasharray="4 5"/>
<circle cx="227" cy="639" r="45" fill="#242a32" stroke="#b2bccb" stroke-width="3"/>
<circle cx="227" cy="639" r="35" fill="#191c22" stroke="#737c89"/>
<rect x="218" y="610" width="18" height="10" rx="2" fill="#111419"/>
<rect x="206" y="626" width="8" height="9" fill="#eac275" stroke="#eac275"/>
<rect x="239" y="626" width="8" height="9" fill="#111419" stroke="#737c89"/>
<rect x="209" y="645" width="8" height="9" fill="#111419" stroke="#737c89"/>
<rect x="237" y="645" width="8" height="9" fill="#111419" stroke="#737c89"/>
<path d="M147 619H171L204 630" stroke="#eac275" fill="none" stroke-width="2"/>
<text x="59" y="615" font-size="16" style="fill:#eac275">PPM OUT</text>
<text x="59" y="638" font-size="13" class="small">Upper left</text>
<path d="M268 654H287" stroke="#b2bccb" fill="none" stroke-width="2"/>
<text x="294" y="651" font-size="16">GND</text>
<text x="294" y="672" font-size="13">Metal ring</text>
<text x="227" y="708" font-size="14" text-anchor="middle">Key at top · other three contacts unused</text>
<text x="227" y="728" font-size="12" text-anchor="middle" style="fill:#a1a5b0">Builder reference; verify your radio / cable</text>

<rect x="438" y="152" width="730" height="586" rx="14" class="panel"/>
<text x="462" y="187" class="label">02 / WIRE VERIFIED SIGNALS</text>
<text x="462" y="220" class="heading">Use a documented PPM OUT breakout</text>
<text x="462" y="250" class="small">Outside rear view · plug solder-side wiring may be mirrored.</text>
<rect x="462" y="286" width="180" height="243" rx="10" fill="#111419" stroke="#3b404b"/>
<text x="480" y="319" font-size="18" font-weight="700">TRAINER CABLE</text>
<text x="480" y="344" class="small">Verified terminals</text>
<text x="480" y="398" class="mono" style="fill:#eac275">PPM OUT</text>
<text x="480" y="474" class="mono">GND</text>
<circle cx="636" cy="392" r="6" fill="#eac275"/>
<circle cx="636" cy="468" r="6" fill="#b2bccb"/>

<!-- Resistor and branch after the series resistor; no crossing wires. -->
<path d="M642 392H698 M758 392H982" class="signal"/>
<rect x="698" y="382" width="60" height="20" fill="#332c21" stroke="#eac275" stroke-width="3"/>
<text x="728" y="367" text-anchor="middle" class="mono" style="fill:#eac275">1 kΩ</text>
<path d="M822 392V418 M822 446V468" class="ground"/>
<rect x="812" y="418" width="20" height="28" fill="#242a32" stroke="#b2bccb" stroke-width="2"/>
<text x="846" y="438" class="mono">47 kΩ</text>
<path d="M642 468H982" class="ground"/>
<circle cx="822" cy="392" r="6" fill="#eac275"/>
<circle cx="822" cy="468" r="6" fill="#b2bccb"/>
<text x="706" y="506" class="small">Common ground</text>

<rect x="982" y="286" width="162" height="243" rx="10" fill="#111419" stroke="#87c8d5"/>
<text x="1063" y="319" text-anchor="middle" font-size="20" font-weight="700">NANO</text>
<text x="1063" y="344" text-anchor="middle" class="small">ATmega328P</text>
<circle cx="984" cy="392" r="6" fill="#eac275"/>
<text x="1003" y="399" class="mono" style="fill:#eac275">D2</text>
<circle cx="984" cy="468" r="6" fill="#b2bccb"/>
<text x="1003" y="475" class="mono">GND</text>
<path d="M1063 529V553" stroke="#87c8d5" stroke-width="6"/>
<rect x="962" y="553" width="190" height="39" rx="7" fill="#111419" stroke="#87c8d5"/>
<text x="1057" y="578" text-anchor="middle" font-size="16" style="fill:#87c8d5">USB → computer</text>
<text x="462" y="565" class="small">Nano pins shown by name,</text>
<text x="462" y="588" class="small">not physical header position.</text>
<path d="M462 614H1144" stroke="#3b404b"/>
<text x="462" y="647" font-size="18" font-weight="700" style="fill:#ed938b">No transmitter VCC / 5 V wire to the Nano</text>
<text x="462" y="676" class="small">Radio: its own batteries. Nano: USB power. Receiver: disconnected.</text>
<text x="462" y="708" class="small">PPM must be 0–3.3/5 V logic. Resistors are not voltage converters.</text>

<text x="40" y="782" class="label">03 / VERIFY, THEN FLY</text>
<rect x="32" y="804" width="360" height="110" rx="10" class="panel"/>
<text x="54" y="836" class="heading">1. Confirm the cable</text>
<text x="54" y="865" class="small">Identify PPM OUT + GND and levels.</text>
<text x="54" y="890" class="small">Unplug power before wiring.</text>
<rect x="408" y="804" width="368" height="110" rx="10" class="panel"/>
<text x="430" y="836" class="heading">2. Read the channels</text>
<text x="430" y="865" class="small">Upload ppm_monitor.ino.</text>
<text x="430" y="890" class="small">Serial Monitor → 115200 baud.</text>
<rect x="792" y="804" width="376" height="110" rx="10" class="panel"/>
<text x="814" y="836" class="heading">3. Connect RCForge</text>
<text x="814" y="865" class="small">Upload rcforge_bridge.ino instead.</text>
<text x="814" y="890" class="small">Six channels + CH6 RUN → calibrate.</text>
<text x="40" y="947" font-size="13" fill="#737c89">Contact reference: rootik/RCTransmitter-USBGamepad / verify your hardware / receiver route still unverified</text>
</svg>\n`;
}
