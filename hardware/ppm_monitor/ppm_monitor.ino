/* RCForge trainer PPM diagnostic — classic ATmega328P Nano / Uno.
 * Verified PPM OUT -> 1k resistor -> D2; 47k D2 -> GND; common GND.
 * USB powers Nano; transmitter uses its batteries. NO transmitter VCC wire.
 * See docs/trainer-nano.md before connecting. Never probe unknown pins with D2.
 * Serial Monitor: 115200 baud. Diagnostic text only, NOT the RCForge protocol.
 */
#include <Arduino.h>
#include <util/atomic.h>

#if !defined(__AVR_ATmega328P__)
#error "Select classic ATmega328P Uno or Nano (not R4 / Every)."
#endif

const uint8_t MAX_CHANNELS = 12;
volatile uint32_t lastEdgeUs = 0;
volatile uint32_t edges = 0;
volatile uint32_t frameUs = 0;
volatile bool synced = false;
volatile bool collectingOK = false;
volatile bool frameOK = false;
volatile uint8_t collectingCount = 0;
volatile uint8_t frameCount = 0;
volatile uint16_t collecting[MAX_CHANNELS] = {};
volatile uint16_t channels[MAX_CHANNELS] = {};

void onPpmEdge() {
  const uint32_t now = micros();
  const uint32_t interval = now - lastEdgeUs;
  lastEdgeUs = now;
  ++edges;
  if (interval > 3000UL) {
    if (synced) {
      frameCount = collectingCount;
      frameOK = collectingOK && collectingCount >= 4 && collectingCount <= MAX_CHANNELS;
      frameUs = now;
      if (frameOK) {
        for (uint8_t i = 0; i < collectingCount; ++i) channels[i] = collecting[i];
      }
    }
    synced = true;
    collectingCount = 0;
    collectingOK = true;
    return;
  }
  if (!synced) return;
  if (interval < 800 || interval > 2200 || collectingCount >= MAX_CHANNELS) {
    collectingOK = false;
  } else {
    collecting[collectingCount] = (uint16_t)interval;
  }
  if (collectingCount < 255) ++collectingCount;
}

void setup() {
  pinMode(2, INPUT); // External 47k pulldown. Nonnegative 3.3–5V logic only.
  pinMode(LED_BUILTIN, OUTPUT);
  Serial.begin(115200);
  attachInterrupt(digitalPinToInterrupt(2), onPpmEdge, RISING);
  Serial.println(F("RCForge PPM monitor | D2 | 115200 baud | diagnostic only"));
}

void loop() {
  static uint32_t lastPrint = 0;
  if ((uint32_t)(millis() - lastPrint) < 250UL) return;
  lastPrint = millis();
  uint32_t totalEdges, edgeAge, frameAge;
  uint8_t count;
  bool good;
  uint16_t values[MAX_CHANNELS];
  ATOMIC_BLOCK(ATOMIC_RESTORESTATE) {
    const uint32_t now = micros();
    totalEdges = edges;
    edgeAge = now - lastEdgeUs;
    frameAge = now - frameUs;
    count = frameCount;
    good = frameOK;
    for (uint8_t i = 0; i < MAX_CHANNELS; ++i) values[i] = channels[i];
  }
  const bool fresh = totalEdges != 0 && edgeAge <= 100000UL && frameAge <= 100000UL && good;
  digitalWrite(LED_BUILTIN, fresh ? HIGH : LOW);
  if (!totalEdges || edgeAge > 100000UL) {
    Serial.println(F("NO SIGNAL | no recent rising edges on D2"));
    return;
  }
  if (!fresh) {
    Serial.print(F("EDGES, NOT VALID PPM | last frame intervals="));
    Serial.println(count);
    return;
  }
  Serial.print(F("PPM | channels=")); Serial.print(count);
  for (uint8_t i = 0; i < count; ++i) {
    Serial.print(F(" | CH")); Serial.print(i + 1);
    Serial.print('='); Serial.print(values[i]);
  }
  if (count == 6) {
    Serial.print(values[5] > 1700 ? F(" | bridge guard: RUN") : F(" | bridge guard: STOP"));
  } else {
    Serial.print(F(" | bridge requires exactly 6 channels"));
  }
  Serial.println();
}
