/** Labels describe what activation will do, including terminal/replay states. */
export function flightAction(state: {
  running: boolean;
  started: boolean;
  status: string;
  replay: boolean;
  replayComplete: boolean;
}) {
  if (state.running) return "Pause flight";
  if (state.replay)
    return state.replayComplete || ["crashed", "landed"].includes(state.status)
      ? "Replay again"
      : state.started
        ? "Resume replay"
        : "Play replay";
  if (["crashed", "landed"].includes(state.status)) return "Restart flight";
  return state.started ? "Resume flight" : "Start flight";
}
