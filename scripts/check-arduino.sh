#!/usr/bin/env bash
# Requires arduino-cli and its arduino:avr core. Compiles; never uploads.
set -euo pipefail
cd "$(dirname "$0")/.."
RCF_CLI="${ARDUINO_CLI:-arduino-cli}"
RCF_ARGS=()
if [[ -n "${ARDUINO_CONFIG_FILE:-}" ]]; then
  RCF_ARGS+=(--config-file "$ARDUINO_CONFIG_FILE")
fi
for board in arduino:avr:uno arduino:avr:nano:cpu=atmega328 arduino:avr:nano:cpu=atmega328old; do
  for mode in 1 2; do
    "$RCF_CLI" compile "${RCF_ARGS[@]}" --fqbn "$board" \
      --build-property "compiler.cpp.extra_flags=-DRCF_INPUT_MODE=$mode" \
      hardware/rcforge_bridge
  done
done
