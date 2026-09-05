import type { Aircraft } from "../core/schema";
import { uiIcon } from "./icons";

/** One visual vocabulary for installed parts, catalog choices and documentation. */
export function componentIcon(type: string) {
  return uiIcon(
    type === "battery"
      ? "battery"
      : type === "motor"
        ? "motor"
        : type === "propeller"
          ? "propeller"
          : type === "servo"
            ? "servo"
            : type === "camera"
              ? "camera"
              : type === "equipment"
                ? "electronics"
                : "structure",
  );
}
export function installedPartIcon(
  a: Aircraft,
  part: Aircraft["parts"][number],
) {
  return componentIcon(
    a.fpv?.partId === part.id
      ? "camera"
      : a.motors.some((m) => m.propPartId === part.id)
        ? "propeller"
        : part.servo
          ? "servo"
          : part.kind,
  );
}
