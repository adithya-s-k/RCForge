import * as T from "three";
/** Visual props also export their solid geometry bounds for collision snapshots. */
export function addFieldDetails(field: T.Group) {
  const wood = new T.MeshStandardMaterial({
      color: "#81745b",
      roughness: 0.95,
    }),
    steel = new T.MeshStandardMaterial({
      color: "#627273",
      roughness: 0.6,
      metalness: 0.25,
    }),
    wall = new T.MeshStandardMaterial({ color: "#b3b3a2", roughness: 0.95 }),
    roof = new T.MeshStandardMaterial({ color: "#46535a", roughness: 0.8 });
  const box = (size: number[], pos: number[], mat: T.Material) => {
    const o = new T.Mesh(
      new T.BoxGeometry(...(size as [number, number, number])),
      mat,
    );
    o.position.set(...(pos as [number, number, number]));
    o.castShadow = true;
    o.receiveShadow = true;
    o.userData.collision = "solid";
    field.add(o);
    return o;
  };
  // Club shelter and equipment bays remain behind the flight line.
  box([11, 3.6, 5], [-35, 1.8, -29], wall);
  box([11.6, 0.18, 5.7], [-35, 3.72, -29], roof);
  for (let x = -39; x <= -31; x += 4) {
    box([2.9, 2.7, 0.04], [x, 1.35, -26.47], steel);
    for (let h = 0.35; h < 2.7; h += 0.3)
      box([2.85, 0.016, 0.06], [x, h, -26.43], roof);
  }
  box([5.5, 0.12, 4], [-22, 2.5, -27], roof);
  for (const x of [-24.5, -19.5])
    for (const z of [-28.7, -25.3]) box([0.08, 2.5, 0.08], [x, 1.25, z], steel);
  for (const x of [-22, -16, -10]) {
    box([1.6, 0.07, 0.62], [x, 0.83, -22], wood);
    for (const dx of [-0.65, 0.65])
      for (const dz of [-0.24, 0.24])
        box([0.06, 0.8, 0.06], [x + dx, 0.4, -22 + dz], steel);
  }
  const orange = new T.MeshStandardMaterial({
    color: "#c86e39",
    roughness: 0.85,
  });
  for (let i = 0; i < 10; i++) {
    const cone = new T.Mesh(new T.ConeGeometry(0.12, 0.38, 12), orange);
    cone.position.set(-20 + i * 5, 0.19, -7.5);
    cone.userData.collision = "solid";
    field.add(cone);
    box([0.26, 0.035, 0.26], [-20 + i * 5, 0.018, -7.5], steel);
  }
}
