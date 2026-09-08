"""Independent JSBSim 1.3.1 oracle. Reads definitions/conditions, never RCForge results.

Original MIT adapter; upstream JSBSim is installed separately under LGPL-2.1.
See docs/physics-reference.md for equations, matching assumptions and exclusions.
"""

import hashlib
import json
import math
import os
import sys
from pathlib import Path
from xml.sax.saxutils import escape

os.environ["JSBSIM_DEBUG"] = "0"
import jsbsim
import numpy as np

FT = 0.3048
LBF = 4.4482216152605
SLUG = LBF / FT
WEIGHT_PER_SLUG = 32.174049  # JSBSim 1.3.1 mass/weight convention.
RADIUS = 1e9  # Nonrotating large sphere approximates RCForge's local flat frame.
ALTITUDE = 1000
G = 9.80665


def value(x):
    if isinstance(x, str):
        return x
    return f"<value>{x:.17g}</value>"


def op(name, *args):
    if name in ["sum", "product"] and len(args) == 1:
        return value(args[0])
    return f"<{name}>" + "".join(value(x) for x in args) + f"</{name}>"


def prop(name):
    return f"<property>{escape(name)}</property>"


def xyz(v):
    return "".join(f"<{k}>{x:.17g}</{k}>" for k, x in zip("xyz", v))


def location(v, name=""):
    # Definition body coordinates -> JSBSim structural (aft, right, up).
    return (
        f'<location name="{name}" unit="IN">'
        + xyz([-v[0] / FT * 12, v[1] / FT * 12, -v[2] / FT * 12])
        + "</location>"
    )


def rotation(angles):
    x, y, z = np.radians(angles)
    cx, cy, cz = np.cos([x, y, z])
    sx, sy, sz = np.sin([x, y, z])
    return np.array(
        [
            [cz * cy, cz * sy * sx - sz * cx, cz * sy * cx + sz * sx],
            [sz * cy, sz * sy * sx + cz * cx, sz * sy * cx - cz * sx],
            [-sy, cy * sx, cy * cx],
        ]
    )


def mass_xml(aircraft):
    """Six quadrature masses per part reproduce its principal second moments.

    JSBSim, not this adapter, assembles CG, parallel-axis terms and full inertia.
    This takes a different route from RCForge's tensor accumulation.
    """
    points = []
    for part_index, part in enumerate(aircraft["parts"]):
        m = part["massKg"]
        if "inertiaDiagonalKgM2" in part:
            diagonal = np.array(part["inertiaDiagonalKgM2"])
            variance = (diagonal.sum() / 2 - diagonal) / m
            if variance.min() < -1e-12:
                raise ValueError("Nonphysical principal inertia: " + part["id"])
        else:
            variance = np.array(part["sizeM"]) ** 2 / 12
        axes = rotation(part.get("orientationDeg", [0, 0, 0]))
        for axis in range(3):
            for sign in [-1, 1]:
                pos = np.array(part["positionM"]) + (
                    sign * math.sqrt(max(0, 3 * variance[axis])) * axes[:, axis]
                )
                points.append(
                    f'<pointmass name="part-{part_index}-{axis}-{sign}">'
                    f'<weight unit="LBS">{m / 6 / SLUG * WEIGHT_PER_SLUG:.17g}</weight>'
                    + location(pos)
                    + "</pointmass>"
                )
    return (
        '<mass_balance><emptywt unit="LBS">0</emptywt>'
        + location([0, 0, 0], "CG")
        + "".join(points)
        + "</mass_balance>"
    )


def model_xml(aircraft, density, mode="airframe"):
    functions, loads = [], []
    declarations = [
        "roll",
        "pitch",
        "yaw",
        "soc",
        "tilt-left",
        "tilt-right",
        "tilt-rear",
    ]
    declarations.extend(f"motor-{i}" for i in range(len(aircraft["motors"])))

    def variable(name, expression):
        name = "reference/" + name
        functions.append(f'<function name="{name}">{value(expression)}</function>')
        return prop(name)

    def load(name, expression, direction, position=None):
        tag = "moment" if position is None else "force"
        loads.append(
            f'<{tag} name="{name}" frame="BODY"><function>'
            + op("product", expression, 1 / (LBF * FT if tag == "moment" else LBF))
            + "</function><direction>"
            + xyz(direction)
            + "</direction>"
            + (location(position) if position is not None else "")
            + f"</{tag}>"
        )

    uvw = [op("product", FT, prop(f"velocities/{k}-aero-fps")) for k in "uvw"]
    pqr = [prop(f"velocities/{k}-rad_sec") for k in "pqr"]
    cg = [
        op("product", s * FT / 12, prop(f"inertia/cg-{k}-in"))
        for k, s in zip("xyz", [-1, 1, -1])
    ]
    speed = variable("speed", op("sqrt", op("sum", *(op("pow", u, 2) for u in uvw))))

    if mode == "airframe":
        for i, surface in enumerate(aircraft["surfaces"]):
            if surface.get("polar") or surface.get("reynoldsPolars"):
                raise ValueError(
                    "Tabulated polar adapter is not implemented; refusing to substitute analytical data"
                )
            r = [op("difference", x, g) for x, g in zip(surface["positionM"], cg)]
            local = [
                op(
                    "sum",
                    uvw[j],
                    op(
                        "difference",
                        op("product", pqr[(j + 1) % 3], r[(j + 2) % 3]),
                        op("product", pqr[(j + 2) % 3], r[(j + 1) % 3]),
                    ),
                )
                for j in range(3)
            ]
            sr, cr = (
                math.sin(math.radians(surface["rollDeg"])),
                math.cos(math.radians(surface["rollDeg"])),
            )
            u = variable(f"s{i}/u", local[0])
            w = variable(
                f"s{i}/w",
                op("sum", op("product", -sr, local[1]), op("product", cr, local[2])),
            )
            angle = variable(f"s{i}/angle", op("atan2", w, u))
            deflection = 0
            c = surface.get("control")
            if c:
                terms = [op("product", prop("reference/" + c["axis"]), c["gain"])]
                terms.extend(
                    op("product", prop("reference/" + axis), gain)
                    for axis, gain in c.get("mix", {}).items()
                )
                travel = c["maxDeg"]
                if c.get("linkage"):
                    link = c["linkage"]
                    travel = min(
                        travel,
                        link["servoTravelDeg"]
                        * link["servoArmM"]
                        / link["surfaceArmM"],
                    )
                deflection = op(
                    "product",
                    math.radians(travel) * c["effectiveness"],
                    op("min", 1, op("max", -1, op("sum", *terms))),
                )
            alpha = variable(
                f"s{i}/alpha",
                op(
                    "sum",
                    angle,
                    math.radians(surface["incidenceDeg"] - surface["zeroLiftDeg"]),
                    deflection,
                ),
            )
            blend = variable(
                f"s{i}/blend",
                op(
                    "min",
                    1,
                    op(
                        "max",
                        0,
                        op(
                            "quotient",
                            op(
                                "difference",
                                op("abs", alpha),
                                math.radians(surface["stallDeg"]),
                            ),
                            math.radians(12),
                        ),
                    ),
                ),
            )
            cl = variable(
                f"s{i}/cl",
                op(
                    "sum",
                    op(
                        "product",
                        op("difference", 1, blend),
                        surface["liftSlope"],
                        alpha,
                    ),
                    op("product", blend, 1.1, op("sin", op("product", 2, alpha))),
                ),
            )
            cd = variable(
                f"s{i}/cd",
                op(
                    "sum",
                    surface["cd0"],
                    op(
                        "quotient",
                        op("pow", cl, 2),
                        math.pi * surface["aspectRatio"] * surface["efficiency"],
                    ),
                    op("product", blend, 1.3, op("pow", op("sin", alpha), 2)),
                ),
            )
            qs = variable(
                f"s{i}/qs",
                op(
                    "product",
                    0.5 * density * surface["spanM"] * surface["chordM"],
                    op("sum", op("pow", u, 2), op("pow", w, 2)),
                ),
            )
            fx = op(
                "product",
                qs,
                op(
                    "difference",
                    op("product", cl, op("sin", angle)),
                    op("product", cd, op("cos", angle)),
                ),
            )
            fz = op(
                "product",
                -1,
                qs,
                op(
                    "sum",
                    op("product", cl, op("cos", angle)),
                    op("product", cd, op("sin", angle)),
                ),
            )
            load(f"surface-{i}-x", fx, [1, 0, 0], surface["positionM"])
            load(f"surface-{i}-normal", fz, [0, -sr, cr], surface["positionM"])
            load(
                f"surface-{i}-pitch",
                op("product", qs, surface["chordM"] * surface["cm"]),
                [0, cr, sr],
            )
        for j in range(3):
            body = aircraft.get("bodyDragAreaM2")
            area = body[j] if body else aircraft["fuselageDragAreaM2"]
            drag = op(
                "product",
                -0.5 * density * area,
                uvw[j],
                op("abs", uvw[j]) if body else speed,
            )
            axis = [int(j == k) for k in range(3)]
            # Body drag acts at CG, not the aircraft datum.
            # A native aerodynamic BODY force has no moment when AERORP is at CG.
            functions.append(
                f'<axis name="{"XYZ"[j]}"><function>{op("product", drag, 1 / LBF)}</function></axis>'
            )
            load(
                f"damping-{j}",
                op(
                    "product",
                    -aircraft["angularDamping"][j],
                    pqr[j],
                    op("sum", 1, op("product", speed, 0.1)),
                ),
                axis,
            )

    if mode == "native-wing":
        s = aircraft["surfaces"][0]
        alpha = prop("aero/alpha-rad")
        blend = variable(
            "native/blend",
            op(
                "min",
                1,
                op(
                    "max",
                    0,
                    op(
                        "quotient",
                        op("difference", op("abs", alpha), math.radians(s["stallDeg"])),
                        math.radians(12),
                    ),
                ),
            ),
        )
        cl = variable(
            "native/cl",
            op(
                "sum",
                op("product", op("difference", 1, blend), s["liftSlope"], alpha),
                op("product", 1.1, blend, op("sin", op("product", 2, alpha))),
            ),
        )
        cd = variable(
            "native/cd",
            op(
                "sum",
                s["cd0"],
                op(
                    "quotient",
                    op("pow", cl, 2),
                    math.pi * s["aspectRatio"] * s["efficiency"],
                ),
                op("product", 1.3, blend, op("pow", op("sin", alpha), 2)),
            ),
        )
        # JSBSim supplies alpha, true airspeed and the wind-to-body transform.
        qs = op(
            "product",
            0.5 * density * s["spanM"] * s["chordM"] * FT**2 / LBF,
            op("pow", prop("velocities/vt-fps"), 2),
        )
        for axis, coefficient in [("LIFT", cl), ("DRAG", cd)]:
            functions.append(
                f'<axis name="{axis}"><function>{op("product", qs, coefficient)}</function></axis>'
            )

    if mode == "propulsion":

        def table(independent, points):
            return (
                '<table><independentVar lookup="row">'
                + independent
                + "</independentVar><tableData>"
                + "\n".join(f"{x:.17g} {y:.17g}" for x, y in points)
                + "</tableData></table>"
            )

        motors = aircraft["motors"]
        battery = aircraft.get("battery")
        thrust, current = [], []
        for i, m in enumerate(motors):
            p = m.get("performance")
            for target, key in [(thrust, "thrustN"), (current, "currentA")]:
                target.append(
                    variable(
                        f"motor-{i}/{key}",
                        table(
                            f"reference/motor-{i}",
                            [(v["command"], v[key]) for v in p["points"]],
                        )
                        if p
                        else op(
                            "product",
                            prop(f"reference/motor-{i}"),
                            m["maxThrustN"] if key == "thrustN" else 0,
                        ),
                    )
                )
        if battery:
            conductance = op(
                "sum",
                *(
                    op("quotient", current[i], m["performance"]["referenceVoltage"])
                    for i, m in enumerate(motors)
                ),
            )
            ocv = op(
                "product",
                battery["cells"],
                table(
                    "reference/soc",
                    [(v["soc"], v["voltsPerCell"]) for v in battery["voltageCurve"]],
                ),
            )
            voltage = variable(
                "voltage",
                op(
                    "max",
                    0,
                    op(
                        "quotient",
                        op(
                            "difference",
                            ocv,
                            battery["resistanceOhm"] * battery["avionicsCurrentA"],
                        ),
                        op(
                            "sum",
                            1,
                            op("product", battery["resistanceOhm"], conductance),
                        ),
                    ),
                ),
            )
        vtol = aircraft.get("vtol")
        for i, m in enumerate(motors):
            ratio = (
                op(
                    "ifthen",
                    op("gt", prop("reference/soc"), 0),
                    op("quotient", voltage, m["performance"]["referenceVoltage"]),
                    0,
                )
                if battery
                else 1
            )
            t = variable(
                f"motor-{i}/thrust",
                op(
                    "product",
                    thrust[i],
                    op("pow", ratio, 2),
                    density
                    / m.get("performance", {}).get("referenceDensityKgM3", 1.225),
                ),
            )
            if vtol:
                if m["id"] == vtol["rearMotorId"]:
                    angle = op("product", prop("reference/tilt-rear"), math.pi / 180)
                    axis = [
                        value(0),
                        op("sin", angle),
                        op("product", -1, op("cos", angle)),
                    ]
                else:
                    key = (
                        "tilt-left"
                        if m["id"] == vtol["frontLeftMotorId"]
                        else "tilt-right"
                    )
                    angle = op("product", prop("reference/" + key), math.pi / 180)
                    axis = [
                        op("sin", angle),
                        value(0),
                        op("product", -1, op("cos", angle)),
                    ]
                axial = op("sum", *(op("product", u, d) for u, d in zip(uvw, axis)))
                reaction_sign = 1 if m["spin"] == "cw" else -1
            elif aircraft["vehicleType"] == "multirotor":
                axis, axial = [value(0), value(0), value(-1)], value(0)
                reaction_sign = 1 if m["spin"] == "cw" else -1
            else:
                axis, axial = [value(1), value(0), value(0)], uvw[0]
                reaction_sign = -1 if m.get("spin") == "cw" else 1
            factor = op(
                "max",
                0,
                op(
                    "difference",
                    1,
                    op("quotient", op("max", 0, axial), m["zeroThrustSpeedMps"]),
                ),
            )
            for j, direction in enumerate(axis):
                f = op("product", t, factor, direction)
                unit = [int(j == k) for k in range(3)]
                load(f"motor-{i}-{j}", f, unit, m["positionM"])
                if m.get("spin"):
                    load(
                        f"reaction-{i}-{j}",
                        op("product", f, m["torquePerThrustM"] * reaction_sign),
                        unit,
                    )

    return (
        '<?xml version="1.0"?>\n<fdm_config name="RCForge comparison" version="2.0">'
        '<metrics><wingarea unit="FT2">1</wingarea><wingspan unit="FT">1</wingspan>'
        '<chord unit="FT">1</chord>'
        + location([0, 0, 0], "AERORP")
        + "</metrics>"
        + mass_xml(aircraft)
        + "<ground_reactions/>"
        + "<external_reactions>"
        + "".join(f'<property value="0">reference/{a}</property>' for a in declarations)
        + "".join(loads)
        + "</external_reactions>"
        + "<aerodynamics>"
        + "".join(functions)
        + "</aerodynamics></fdm_config>"
    )


def make_fdm(aircraft, density, mode, root):
    model = root / "aircraft" / "comparison"
    model.mkdir(parents=True, exist_ok=True)
    (model / "comparison.xml").write_text(model_xml(aircraft, density, mode))
    planet = root / "planet.xml"
    planet.write_text(
        f'<planet name="nonrotating local comparison">'
        f'<semimajor_axis unit="FT">{RADIUS / FT}</semimajor_axis>'
        f'<semiminor_axis unit="FT">{RADIUS / FT}</semiminor_axis>'
        '<rotation_rate unit="RAD/SEC">0</rotation_rate><J2>0</J2>'
        f'<GM unit="FT3/SEC2">{G * (RADIUS + ALTITUDE) ** 2 / FT**3}</GM></planet>'
    )
    f = jsbsim.FGFDMExec(str(root))
    f.set_debug_level(0)
    f.disable_output()
    if not f.load_model("comparison") or not f.load_planet(str(planet), False):
        raise RuntimeError("JSBSim model/planet load failed")
    f["simulation/gravity-model"] = 0
    # High-order independent integrators. Rate/position integration is not copied
    # from RCForge's midpoint/quaternion implementation.
    for kind in ["rate/rotational", "rate/translational", "position/translational"]:
        f["simulation/integrator/" + kind] = 5  # Adams-Bashforth 4
    f["simulation/integrator/position/rotational"] = 7  # Buss 2
    return f


def initialize(f, condition):
    for k, v in {
        "ic/lat-geod-deg": 0,
        "ic/long-gc-deg": 0,
        "ic/h-sl-ft": ALTITUDE / FT,
        "ic/phi-rad": condition["attitude"][0],
        "ic/theta-rad": condition["attitude"][1],
        "ic/psi-true-rad": condition["attitude"][2],
    }.items():
        f[k] = v
    for k, v in zip("uvw", condition["bodyVelocity"]):
        f[f"ic/{k}-fps"] = v / FT
    for k, v in zip("pqr", condition["omega"]):
        f[f"ic/{k}-rad_sec"] = v
    for k in ["roll", "pitch", "yaw"]:
        f["reference/" + k] = condition["controls"][k]
    f["reference/soc"] = condition.get("soc", 1)
    for i, v in enumerate(condition.get("motorCommands", [])):
        f[f"reference/motor-{i}"] = v
    f["reference/tilt-left"], f["reference/tilt-right"] = condition.get(
        "tiltDeg", [0, 0]
    )
    f["reference/tilt-rear"] = condition.get("rearTiltDeg", 0)
    if not f.run_ic():
        raise RuntimeError("JSBSim initialization failed")
    # RunIC restores the IC wind. Apply the physical NED wind after that reset,
    # then recompute loads at zero elapsed time with the ground velocity intact.
    for k, v in zip(["north", "east", "down"], condition.get("wind", [0, 0, 0])):
        f[f"atmosphere/wind-{k}-fps"] = v / FT
    # AERORP must coincide with computed CG so native body drag adds no moment.
    for axis in "xyz":
        f[f"metrics/aero-rp-{axis}-in"] = f[f"inertia/cg-{axis}-in"]
    f.suspend_integration()
    f.run()
    f.resume_integration()


def mass(f):
    return {
        "mass": f["inertia/mass-slugs"] * SLUG,
        "cg": (
            np.array(f.get_mass_balance().get_xyz_cg()).reshape(3)
            * [-1, 1, -1]
            * FT
            / 12
        ).tolist(),
        "inertia": (np.array(f.get_mass_balance().get_J()) * SLUG * FT**2).tolist(),
    }


def loads(f):
    # FGAircraft sum includes native aerodynamic + external loads, excludes gravity.
    return {
        "force": [f[f"forces/fb{k}-total-lbs"] * LBF for k in "xyz"],
        "torque": [f[f"moments/{k}-total-lbsft"] * LBF * FT for k in "lmn"],
    }


def state(f, origin):
    # At latitude/longitude zero ECEF (Z,Y,-X) maps to the initial NED frame.
    pos = np.array([f[f"position/ecef-{k}-ft"] for k in "xyz"]) * FT
    vel = np.array([f[f"velocities/ecef-{k}-fps"] for k in "xyz"]) * FT
    return {
        "time": f.get_sim_time(),
        "position": [pos[2] - origin[2], pos[1] - origin[1], -(pos[0] - origin[0])],
        "velocity": [vel[2], vel[1], -vel[0]],
        "omega": [f[f"velocities/{k}-rad_sec"] for k in "pqr"],
        "attitude": [f[f"attitude/{k}-rad"] for k in ["phi", "theta", "psi"]],
    }


def run(request, root):
    result = {
        "engine": "JSBSim",
        "version": jsbsim.__version__,
        "upstreamCommit": "3b25f25e49b42d0489c04ac805674fc1450ca579",
        "cases": [],
    }
    if jsbsim.__version__ != "1.3.1":
        raise RuntimeError("Reference requires pinned JSBSim 1.3.1")
    for case in request["cases"]:
        f = make_fdm(case["aircraft"], case["density"], case["mode"], root)
        f.set_dt(case["referenceDt"])
        initialize(f, case["conditions"][0])
        entry = {"id": case["id"], "mass": mass(f), "loads": [], "trajectory": []}
        for condition in case["conditions"]:
            initialize(f, condition)
            entry["loads"].append(loads(f))
        if case["duration"]:
            initialize(f, case["conditions"][0])
            origin = np.array([f[f"position/ecef-{k}-ft"] for k in "xyz"]) * FT
            entry["trajectory"].append(state(f, origin))
            steps = round(case["duration"] / case["referenceDt"])
            stride = round(case["samplePeriod"] / case["referenceDt"])
            for step in range(1, steps + 1):
                if not f.run():
                    raise RuntimeError("JSBSim stopped before case completion")
                if step % stride == 0:
                    entry["trajectory"].append(state(f, origin))
        result["cases"].append(entry)
    return result


if __name__ == "__main__":
    request_path, output_path = map(Path, sys.argv[1:3])
    result = run(
        json.loads(request_path.read_text()), output_path.parent / "generated-model"
    )
    result["requestSHA256"] = hashlib.sha256(request_path.read_bytes()).hexdigest()
    output_path.write_text(json.dumps(result, indent=2, allow_nan=False) + "\n")
