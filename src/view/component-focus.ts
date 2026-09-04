import * as T from "three";
import type { Aircraft } from "../core/schema";

type Part = Aircraft["parts"][number];
/** One reusable installation envelope; authored mass extents, not a collision mesh. */
export class ComponentFocus {
  readonly group = new T.Group();
  private box: T.LineSegments<T.EdgesGeometry, T.LineBasicMaterial>;
  constructor() {
    const unit = new T.BoxGeometry(1, 1, 1);
    this.box = new T.LineSegments(
      new T.EdgesGeometry(unit),
      new T.LineBasicMaterial({
        color: "#d5ab68",
        transparent: true,
        opacity: 0.8,
        depthTest: false,
        depthWrite: false,
      }),
    );
    unit.dispose();
    this.box.renderOrder = 10;
    this.group.add(this.box);
    this.group.visible = false;
  }
  set(part?: Part) {
    this.group.visible = !!part;
    if (!part) return;
    this.group.position.set(
      part.positionM[0],
      -part.positionM[2],
      part.positionM[1],
    );
    const angles = part.orientationDeg ?? [0, 0, 0];
    const rotation = new T.Quaternion().setFromEuler(
      new T.Euler(
        ...(angles.map(T.MathUtils.degToRad) as [number, number, number]),
        "ZYX",
      ),
    );
    this.group.quaternion
      .setFromAxisAngle(new T.Vector3(1, 0, 0), Math.PI / 2)
      .multiply(rotation);
    this.box.scale.set(
      ...(part.sizeM.map((v) => Math.max(v, 0.003)) as [
        number,
        number,
        number,
      ]),
    );
  }
  dispose() {
    this.box.geometry.dispose();
    this.box.material.dispose();
  }
}
