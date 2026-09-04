import * as T from "three";
import { componentRotation } from "./component-pose";
import type { Aircraft } from "../core/schema";
import type { Vec3 } from "../core/math";

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
  set(part?: Part, cg: Vec3 = [0, 0, 0]) {
    this.group.visible = !!part;
    if (!part) return;
    this.group.position.set(
      part.positionM[0] - cg[0],
      -(part.positionM[2] - cg[2]),
      part.positionM[1] - cg[1],
    );
    const rotation = componentRotation(part);
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
