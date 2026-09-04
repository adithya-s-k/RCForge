/* RCForge USB serial input bridge — classic ATmega328P Uno / Nano.
 * Read docs/flysky-fs-i6.md before wiring. No receiver, servo or motor outputs.
 * Mode 1: trainer PPM OUT or receiver PPM -> D2.
 * Mode 2: receiver PWM CH1..CH6 -> D2..D7.
 * Reserve CH6 as RUN (>1700 us); configure its receiver failsafe LOW.
 * USB: 115200 baud, 50 packets/second, CRC-16/CCITT-FALSE.
 */
#include <Arduino.h>
#include <util/atomic.h>

#if !defined(__AVR_ATmega328P__)
#error "Select a classic ATmega328P Arduino Uno or Nano. Not Uno R4/Nano Every."
#endif
#ifndef RCF_INPUT_MODE
#define RCF_INPUT_MODE 1  // 1 = PPM (trainer or receiver); 2 = six PWM wires
#endif
#ifndef RCF_GUARD_CHANNEL
#define RCF_GUARD_CHANNEL 6 // 1-based; 0 disables the guard (see guide)
#endif
#if RCF_INPUT_MODE != 1 && RCF_INPUT_MODE != 2
#error "RCF_INPUT_MODE must be 1 or 2"
#endif
#if RCF_GUARD_CHANNEL < 0 || RCF_GUARD_CHANNEL > 6
#error "Guard channel must be 0..6"
#endif

const uint8_t CHANNELS = 6;
const uint32_t SIGNAL_TIMEOUT_US = 100000UL;
volatile uint16_t pulseUs[CHANNELS] = {1500, 1500, 1000, 1500, 1500, 1000};
volatile uint32_t updatedUs[CHANNELS] = {};
volatile bool channelOK[CHANNELS] = {};

#if RCF_INPUT_MODE == 1
volatile uint32_t previousEdge = 0;
volatile uint8_t channelCount = 0;
volatile bool synchronized = false;
volatile bool frameOK = false;
volatile uint16_t pendingUs[CHANNELS];

void ppmEdge() {
  const uint32_t now = micros();
  const uint32_t interval = now - previousEdge; // unsigned subtraction survives micros() wrap
  previousEdge = now;
  if (interval > 3000UL) {
    const bool complete = synchronized && frameOK && channelCount == CHANNELS;
    for (uint8_t i = 0; i < CHANNELS; ++i) {
      channelOK[i] = complete;
      if (complete) { pulseUs[i] = pendingUs[i]; updatedUs[i] = now; }
    }
    synchronized = true; frameOK = true; channelCount = 0;
  } else if (synchronized) {
    if (interval < 800 || interval > 2200 || channelCount >= CHANNELS) frameOK = false;
    else pendingUs[channelCount] = (uint16_t)interval;
    if (channelCount < 255) ++channelCount;
  }
}
#else
volatile uint8_t previousPins = 0;
volatile uint8_t risingSeen = 0;
volatile uint32_t risingUs[CHANNELS];

ISR(PCINT2_vect) {
  const uint8_t pins = PIND;
  const uint8_t changed = (pins ^ previousPins) & 0xfc; // D2..D7 only
  previousPins = pins;
  const uint32_t now = micros();
  for (uint8_t i = 0; i < CHANNELS; ++i) {
    const uint8_t mask = _BV(i + 2);
    if (!(changed & mask)) continue;
    if (pins & mask) { risingUs[i] = now; risingSeen |= mask; }
    else if (risingSeen & mask) {
      risingSeen &= ~mask;
      const uint32_t width = now - risingUs[i];
      channelOK[i] = width >= 800 && width <= 2200;
      if (channelOK[i]) { pulseUs[i] = (uint16_t)width; updatedUs[i] = now; }
    }
  }
}
#endif

uint16_t checksum(const char *text) {
  uint16_t crc = 0xffff;
  while (*text) {
    crc ^= (uint16_t)(uint8_t)*text++ << 8;
    for (uint8_t bit = 0; bit < 8; ++bit) crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
  }
  return crc;
}

void setup() {
  pinMode(LED_BUILTIN, OUTPUT);
#if RCF_INPUT_MODE == 1
  pinMode(2, INPUT); // External 47k pulldown; do not feed voltage above 5V.
  attachInterrupt(digitalPinToInterrupt(2), ppmEdge, RISING);
#else
  for (uint8_t pin = 2; pin <= 7; ++pin) pinMode(pin, INPUT);
  previousPins = PIND;
  PCIFR = _BV(PCIF2);
  PCMSK2 = 0xfc;
  PCICR |= _BV(PCIE2);
#endif
  Serial.begin(115200);
}

void loop() {
  static uint32_t lastSent = 0;
  static uint16_t sequence = 0;
  const uint32_t ms = millis();
  if ((uint32_t)(ms - lastSent) < 20) return;
  lastSent = ms;
  uint16_t snapshot[CHANNELS];
  bool valid = true;
  ATOMIC_BLOCK(ATOMIC_RESTORESTATE) {
    // Read time inside the snapshot to avoid unsigned underflow if an ISR just ran.
    const uint32_t now = micros();
    for (uint8_t i = 0; i < CHANNELS; ++i) {
      snapshot[i] = pulseUs[i];
      if (!channelOK[i] || (uint32_t)(now - updatedUs[i]) > SIGNAL_TIMEOUT_US) valid = false;
    }
  }
#if RCF_GUARD_CHANNEL > 0
  if (snapshot[RCF_GUARD_CHANNEL - 1] <= 1700) valid = false;
#endif
  digitalWrite(LED_BUILTIN, valid ? HIGH : LOW);
  // Invalid frames never carry active commands, even to an older receiver program.
  if (!valid) for (uint8_t i = 0; i < CHANNELS; ++i) snapshot[i] = (i == 2 || i == 5) ? 1000 : 1500;
  char body[100];
  const char *mode = RCF_INPUT_MODE == 1 ? "PPM" : "PWM";
  snprintf(body, sizeof(body), "RCF1,%u,%u,%s,6,%u,%u,%u,%u,%u,%u",
    sequence++, valid ? 1 : 0, mode, snapshot[0], snapshot[1], snapshot[2], snapshot[3], snapshot[4], snapshot[5]);
  char crcText[6];
  snprintf(crcText, sizeof(crcText), "%04X", checksum(body));
  Serial.print(body); Serial.print('*'); Serial.println(crcText);
}
