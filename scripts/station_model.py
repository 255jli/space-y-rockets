#!/usr/bin/env python3
"""MCS — Modular Commercial Station.

ISS-inspired orbital station with:
  - Canadarm2-style 4-DOF robotic manipulator (base yaw + 3 pitch joints)
  - CBM berthing port (nadir) with 4 hinged petals
  - Reusable-rocket undocking sequence driven by the arm
  - Solar arrays, radiators, comm dish (ambient animation)

The rocket itself is NOT modeled. Attach your rocket geometry to the node
`rocket_mount` (its origin is the grapple fixture on the rocket's +X side).
The mount is animated to follow the manipulator's LEE during the undocking.

Dependencies:
    pip install trimesh numpy pillow

Example:
    python station_model.py --out station.glb --logo SpaceY-b.png

Clips (play in order for the full undocking sequence):
    port_open      - CBM petals open (release hard dock)
    arm_reach      - manipulator moves from stow to grapple pose
    arm_grapple    - LEE jaws clamp (rocket attached to arm from here)
    arm_extract    - arm pulls rocket 2 m straight down, clear of the port
    arm_release    - LEE jaws open (rocket is now free for descent)
    solar_track    - solar arrays rotate (ambient)
    dish_sweep     - comm antenna sweeps (ambient)
"""

from __future__ import annotations
import argparse
import json
import math
import struct
from pathlib import Path

import numpy as np
import trimesh
from trimesh.transformations import rotation_matrix, translation_matrix
from PIL import Image

# ============================================================================
# Materials
# ============================================================================
COLORS = {
    "white": [0.92, 0.92, 0.94, 1.0],
    "black": [0.05, 0.05, 0.06, 1.0],
    "steel": [0.55, 0.56, 0.58, 1.0],
    "dark":  [0.16, 0.16, 0.18, 1.0],
    "tiles": [0.09, 0.09, 0.10, 1.0],
    "gold":  [0.85, 0.65, 0.25, 1.0],
}
MAT = {
    k: trimesh.visual.material.PBRMaterial(
        name=k, baseColorFactor=v, metallicFactor=0.2, roughnessFactor=0.5,
        doubleSided=True)
    for k, v in COLORS.items()
}

# ============================================================================
# Geometry constants
# ============================================================================
BODY_R = 1.6
BODY_Z0 = -4.0
BODY_Z1 = 4.0

PORT_Z = BODY_Z0 - 0.2
PORT_R = 1.0

ARM_BASE = (2.5, 0.0, 3.0)
ARM_L1 = 6.5     # shoulder boom
ARM_L2 = 6.0     # elbow boom
ARM_L3 = 1.5     # wrist boom + LEE

# Grapple point on the rocket (world coords). Must match arm_fk() output for
# the 'grapple' and 'extract' poses — verified below.
ROCKET_GRAPPLE_DOCKED = (0.9, 0.0, -7.0)
ROCKET_GRAPPLE_EXTRACTED = (0.9, 0.0, -9.0)

# Joint poses (yaw, th1, th2, th3) in radians.
# Convention: trimesh rotation_matrix(angle, [0,1,0]) → positive = downward.
# Verified with arm_fk():
#   stow    → LEE at (2.94, 0, 2.67)   (folded up beside the station)
#   grapple → LEE at (0.90, 0, -7.00)  = ROCKET_GRAPPLE_DOCKED
#   extract → LEE at (0.90, 0, -9.00)  = ROCKET_GRAPPLE_EXTRACTED
POSES = {
    "stow":    (math.pi, math.radians( 90.0), math.radians(-170.0), math.radians(-90.0)),
    "grapple": (math.pi, math.radians(124.6), math.radians( -73.8), math.radians(-50.8)),
    "extract": (math.pi, math.radians(105.1), math.radians( -32.5), math.radians(-72.6)),
}
JOINT_NAMES = ["arm_yaw", "arm_shoulder", "arm_elbow", "arm_wrist"]
JOINT_AXES = [(0, 0, 1), (0, 1, 0), (0, 1, 0), (0, 1, 0)]


# ============================================================================
# Helpers
# ============================================================================
def paint(mesh, key):
    mesh.visual = trimesh.visual.TextureVisuals(material=MAT[key])
    return mesh


def _quat(axis, angle):
    x, y, z = axis
    s = math.sin(angle / 2)
    return [x * s, y * s, z * s, math.cos(angle / 2)]


def _qmul(a, b):
    ax, ay, az, aw = a
    bx, by, bz, bw = b
    return [
        aw*bx + ax*bw + ay*bz - az*by,
        aw*by - ax*bz + ay*bw + az*bx,
        aw*bz + ax*by - ay*bx + az*bw,
        aw*bw - ax*bx - ay*by - az*bz,
    ]


def lathe(profile, sections=64):
    profile = list(profile)
    angles = np.linspace(0, 2 * math.pi, sections, endpoint=False)
    verts = []
    for r, z in profile:
        for a in angles:
            verts.append([r * math.cos(a), r * math.sin(a), z])
    faces = []
    for ring in range(len(profile) - 1):
        c, n = ring * sections, (ring + 1) * sections
        for i in range(sections):
            j = (i + 1) % sections
            faces += [[c + i, c + j, n + j], [c + i, n + j, n + i]]
    m = trimesh.Trimesh(vertices=np.array(verts), faces=np.array(faces), process=True)
    m.fix_normals()
    return m


def box_centered(extents, center):
    m = trimesh.creation.box(extents=extents)
    m.apply_translation(center)
    return m


def arm_fk(yaw, th1, th2, th3, base=ARM_BASE):
    """World position of the LEE (grapple point at the end of link 3)."""
    u = (ARM_L1 * math.cos(th1)
         + ARM_L2 * math.cos(th1 + th2)
         + ARM_L3 * math.cos(th1 + th2 + th3))
    v = -(ARM_L1 * math.sin(th1)
          + ARM_L2 * math.sin(th1 + th2)
          + ARM_L3 * math.sin(th1 + th2 + th3))
    return (base[0] + math.cos(yaw) * u,
            base[1] + math.sin(yaw) * u,
            base[2] + v)


def curved_decal(path, radius, z0, z1, a0, a1, nu=12, nv=64):
    img = Image.open(path).convert("RGBA")
    mat = trimesh.visual.material.PBRMaterial(
        name="decal", baseColorTexture=img, alphaMode="BLEND", doubleSided=True)
    verts, uvs, faces = [], [], []
    for j in range(nv):
        v = j / (nv - 1)
        z = z0 + (z1 - z0) * v
        for i in range(nu):
            u = i / (nu - 1)
            a = a0 + (a1 - a0) * u
            verts.append([radius * math.cos(a), radius * math.sin(a), z])
            uvs.append([v, u])
    for j in range(nv - 1):
        for i in range(nu - 1):
            p = j * nu + i
            faces += [[p, p + nu, p + nu + 1], [p, p + nu + 1, p + 1]]
    m = trimesh.Trimesh(vertices=np.array(verts), faces=np.array(faces), process=False)
    m.visual = trimesh.visual.TextureVisuals(uv=np.array(uvs), material=mat)
    return m


# ============================================================================
# Station assembly
# ============================================================================
def make_station(sections=64, logo=None):
    sc = trimesh.Scene()

    def add(m, name, offset=(0, 0, 0), parent=None, transform=None):
        if transform is None:
            transform = translation_matrix(offset)
        sc.add_geometry(m, node_name=name, geom_name=name,
                        parent_node_name=parent, transform=transform)
        return name

    # ------------------------------------------------------------------
    # Pressurised body
    # ------------------------------------------------------------------
    body = lathe([(0, BODY_Z0), (BODY_R, BODY_Z0),
                  (BODY_R, BODY_Z1), (0, BODY_Z1)], sections)
    add(paint(body, "white"), "station_body")

    # ------------------------------------------------------------------
    # Radiators (starboard / port)
    # ------------------------------------------------------------------
    for side in (1, -1):
        rad = box_centered([0.8, 0.06, 2.5], (0, side * 0.9, 2.5))
        add(paint(rad, "white"), f"radiator_{'R' if side > 0 else 'L'}")

    # ------------------------------------------------------------------
    # Solar wings
    # ------------------------------------------------------------------
    for side, name in ((1, "solar_wing_R"), (-1, "solar_wing_L")):
        yoke = box_centered([1.4, 0.15, 0.15], (0.7, 0, 0))
        panels = [box_centered([3.0, 0.06, 2.0], (px, 0, 0))
                  for px in (2.9, 6.2, 9.5)]
        wing = paint(trimesh.util.concatenate([yoke] + panels), "tiles")
        if side < 0:
            wing.apply_transform(rotation_matrix(math.pi, [0, 0, 1]))
        add(wing, name, (side * BODY_R, 0, 0))

    # ------------------------------------------------------------------
    # Comm antenna
    # ------------------------------------------------------------------
    mast = trimesh.creation.cylinder(radius=0.08, height=1.6, sections=16)
    mast.apply_translation([0, 0, 0.8])
    add(paint(mast, "steel"), "comm_mast", (0, 0, BODY_Z1))

    dish_profile = [(0.0, 0.0), (0.5, 0.1), (0.85, 0.45),
                    (0.75, 0.55), (0.45, 0.3), (0.0, 0.2)]
    dish = lathe(dish_profile, sections)
    boom = box_centered([0.7, 0.1, 0.1], (0.55, 0, 0.1))
    add(paint(trimesh.util.concatenate([dish, boom]), "white"),
        "comm_dish", (0, 0, BODY_Z1 + 1.6))

    # ------------------------------------------------------------------
    # Nadir CBM port + 4 petals
    # ------------------------------------------------------------------
    port_frame = lathe([
        (PORT_R, PORT_Z + 0.2), (PORT_R + 0.1, PORT_Z + 0.2),
        (PORT_R + 0.1, PORT_Z), (PORT_R, PORT_Z), (PORT_R, PORT_Z + 0.2),
    ], sections)
    add(paint(port_frame, "steel"), "cbm_port")

    for k in range(4):
        az = k * math.pi / 2
        inward_az = az + math.pi          # petal points inward
        hinge_pos = ((PORT_R + 0.05) * math.cos(az),
                     (PORT_R + 0.05) * math.sin(az),
                     PORT_Z + 0.2)
        petal_mesh = box_centered([0.5, 0.3, 0.05], (0.25, 0, 0))
        petal_mesh = paint(petal_mesh, "gold")
        # Static transform: translate to hinge, rotate so local +X points inward
        R = rotation_matrix(inward_az, [0, 0, 1])
        T = translation_matrix(hinge_pos)
        sc.add_geometry(petal_mesh, node_name=f"cbm_petal_{k}",
                        geom_name=f"cbm_petal_{k}", transform=T @ R)

    # ------------------------------------------------------------------
    # Canadarm2-style manipulator
    #   arm_base_marker ─ arm_yaw ─ arm_shoulder ─ arm_elbow ─ arm_wrist
    #                                 ├─link1        ├─link2       ├─link3
    #                                 └─...           └─...        └─3 jaws
    # ------------------------------------------------------------------
    stow = POSES["stow"]

    add(paint(trimesh.creation.icosphere(subdivisions=1, radius=0.2), "dark"),
        "arm_base_marker", transform=translation_matrix(ARM_BASE))

    add(paint(trimesh.creation.icosphere(subdivisions=1, radius=0.12), "steel"),
        "arm_yaw", parent="arm_base_marker",
        transform=rotation_matrix(stow[0], [0, 0, 1]))

    add(paint(trimesh.creation.icosphere(subdivisions=1, radius=0.13), "steel"),
        "arm_shoulder", parent="arm_yaw",
        transform=rotation_matrix(stow[1], [0, 1, 0]))

    add(paint(box_centered([ARM_L1, 0.30, 0.30], (ARM_L1 / 2, 0, 0)), "steel"),
        "arm_link1", parent="arm_shoulder")

    add(paint(trimesh.creation.icosphere(subdivisions=1, radius=0.14), "steel"),
        "arm_elbow", parent="arm_shoulder",
        transform=translation_matrix((ARM_L1, 0, 0))
                  @ rotation_matrix(stow[2], [0, 1, 0]))

    add(paint(box_centered([ARM_L2, 0.28, 0.28], (ARM_L2 / 2, 0, 0)), "steel"),
        "arm_link2", parent="arm_elbow")

    add(paint(trimesh.creation.icosphere(subdivisions=1, radius=0.13), "gold"),
        "arm_wrist", parent="arm_elbow",
        transform=translation_matrix((ARM_L2, 0, 0))
                  @ rotation_matrix(stow[3], [0, 1, 0]))

    add(paint(box_centered([ARM_L3, 0.22, 0.22], (ARM_L3 / 2, 0, 0)), "gold"),
        "arm_link3", parent="arm_wrist")

    # LEE: 3 jaws arranged around the tip, pointing inward
    for j in range(3):
        jaz = j * 2 * math.pi / 3
        jaw = box_centered([0.10, 0.05, 0.05], (0, 0.12, 0))
        jaw.apply_transform(rotation_matrix(jaz, [1, 0, 0]))
        add(paint(jaw, "gold"), f"arm_lee_jaw_{j}", parent="arm_wrist",
            transform=translation_matrix((ARM_L3, 0, 0)))

    # ------------------------------------------------------------------
    # Rocket mount (user's rocket attaches here)
    # ------------------------------------------------------------------
    add(paint(box_centered([0.2, 0.2, 0.2], (0, 0, 0)), "gold"),
        "rocket_mount", transform=translation_matrix(ROCKET_GRAPPLE_DOCKED))

    # ------------------------------------------------------------------
    # Logo
    # ------------------------------------------------------------------
    if logo and Path(logo).exists():
        w, h = Image.open(logo).size
        length = 4.0
        arc = min(math.radians(120), length / (w / h) / 1.6)
        add(curved_decal(logo, BODY_R + 0.01,
                         0.5 - length / 2, 0.5 + length / 2,
                         -arc / 2, arc / 2), "station_logo")
    elif logo:
        print(f"Warning: {logo} not found, decal skipped.")

    return sc


# ============================================================================
# Animation tracks
# ============================================================================
def _arm_tracks(pose_a, pose_b, times):
    """Joint rotation tracks interpolating from pose_a to pose_b.

    ``times`` is the 2-tuple returned by ``_normalized_keys``:
    ``(keyframe_times, normalized_fractions)``.
    """
    ts, fracs = times
    pa, pb = POSES[pose_a], POSES[pose_b]
    tracks = []
    for idx, (name, axis) in enumerate(zip(JOINT_NAMES, JOINT_AXES)):
        if abs(pa[idx] - pb[idx]) < 1e-6:
            continue
        keys = []
        for t_frac in fracs:
            angle = pa[idx] + t_frac * (pb[idx] - pa[idx])
            keys.extend(_quat(axis, angle))
        tracks.append((name, "rotation", ts, keys, "VEC4"))
    return tracks


def _normalized_keys(t0, t1, n):
    """Return (keyframe_times, [0..1] fractions)."""
    ts = [t0 + (t1 - t0) * i / (n - 1) for i in range(n)]
    return ts, [i / (n - 1) for i in range(n)]


def build_clips():
    ident = [0.0, 0.0, 0.0, 1.0]
    clips = []

    # ------------------------------------------------------------------
    # 1. port_open — CBM petals unfold (4 nodes, each rotates around local Y)
    # ------------------------------------------------------------------
    petals = []
    for k in range(4):
        az = k * math.pi / 2
        q_closed = _quat((0, 0, 1), az + math.pi)
        q_open = _qmul(q_closed, _quat((0, 1, 0), -math.pi / 2))
        petals.append((f"cbm_petal_{k}", "rotation",
                       [0.0, 0.25, 1.25, 1.5],
                       q_closed + q_closed + q_open + q_open, "VEC4"))
    clips.append(("port_open", petals))

    # ------------------------------------------------------------------
    # 2. arm_reach — stow → grapple (rocket still docked)
    # ------------------------------------------------------------------
    t_reach = _normalized_keys(0.0, 3.0, 9)
    clips.append(("arm_reach", _arm_tracks("stow", "grapple", t_reach)))

    # ------------------------------------------------------------------
    # 3. arm_grapple — LEE jaws clamp (visual only, no arm motion)
    #    The rocket becomes attached from t=0.5 onward.
    # ------------------------------------------------------------------
    jaws = []
    for j in range(3):
        jaz = j * 2 * math.pi / 3
        # Rotate each jaw inward by ~20° around its local tangential axis
        q_close = _quat((math.cos(jaz), math.sin(jaz), 0), math.radians(20))
        jaws.append((f"arm_lee_jaw_{j}", "rotation",
                     [0.0, 0.25, 0.5],
                     ident + ident + q_close, "VEC4"))
    clips.append(("arm_grapple", jaws))

    # ------------------------------------------------------------------
    # 4. arm_extract — grapple → extract; rocket_mount follows the LEE
    #    (baked FK, 9 keyframes for smooth path)
    # ------------------------------------------------------------------
    t_ext, fracs = _normalized_keys(0.0, 3.0, 9)
    pa, pb = POSES["grapple"], POSES["extract"]
    extract = []
    for idx, (name, axis) in enumerate(zip(JOINT_NAMES, JOINT_AXES)):
        if abs(pa[idx] - pb[idx]) < 1e-6:
            continue
        keys = []
        for f in fracs:
            keys.extend(_quat(axis, pa[idx] + f * (pb[idx] - pa[idx])))
        extract.append((name, "rotation", t_ext, keys, "VEC4"))

    # Bake rocket_mount position from arm FK
    pos_keys = []
    for f in fracs:
        yaw = pa[0] + f * (pb[0] - pa[0])
        th1 = pa[1] + f * (pb[1] - pa[1])
        th2 = pa[2] + f * (pb[2] - pa[2])
        th3 = pa[3] + f * (pb[3] - pa[3])
        pos_keys.extend(arm_fk(yaw, th1, th2, th3))
    extract.append(("rocket_mount", "translation", t_ext, pos_keys, "VEC3"))
    clips.append(("arm_extract", extract))

    # ------------------------------------------------------------------
    # 5. arm_release — LEE jaws open; rocket_mount holds its position
    # ------------------------------------------------------------------
    jaws = []
    for j in range(3):
        jaz = j * 2 * math.pi / 3
        q_close = _quat((math.cos(jaz), math.sin(jaz), 0), math.radians(20))
        jaws.append((f"arm_lee_jaw_{j}", "rotation",
                     [0.0, 0.5], q_close + ident, "VEC4"))
    clips.append(("arm_release", jaws))

    # ------------------------------------------------------------------
    # Ambient: solar tracking
    # ------------------------------------------------------------------
    q_sun = _quat((0, 0, 1), math.radians(30))
    clips.append(("solar_track", [
        (name, "rotation", [0.0, 5.0, 10.0, 15.0],
         ident + q_sun + q_sun + ident, "VEC4")
        for name in ("solar_wing_L", "solar_wing_R")
    ]))

    # ------------------------------------------------------------------
    # Ambient: dish sweep
    # ------------------------------------------------------------------
    q90 = _quat((0, 0, 1), math.radians(90))
    clips.append(("dish_sweep", [(
        "comm_dish", "rotation", [0.0, 6.0, 10.0, 16.0],
        ident + q90 + q90 + ident, "VEC4")]))

    return clips


# ============================================================================
# GLB animation injection
# ============================================================================
def inject_clips(glb_path, clips):
    data = Path(glb_path).read_bytes()
    pos, chunks = 12, []
    while pos < len(data):
        clen, ctype = struct.unpack("<II", data[pos:pos + 8])
        chunks.append([ctype, data[pos + 8:pos + 8 + clen]])
        pos += 8 + clen
    js = json.loads(chunks[0][1].decode("utf-8").rstrip())
    binb = bytearray(chunks[1][1]) if len(chunks) > 1 else bytearray()
    names = {n.get("name"): i for i, n in enumerate(js["nodes"])}
    time_cache = {}

    def accessor(flat, atype, minmax=None):
        while len(binb) % 4:
            binb.append(0)
        off = len(binb)
        arr = np.asarray(flat, dtype=np.float64)
        if arr.ndim != 1:
            raise ValueError(f"keys must be flat list of numbers: {flat}")
        raw = arr.astype(np.float32).tobytes()
        binb.extend(raw)
        js["bufferViews"].append(
            {"buffer": 0, "byteOffset": off, "byteLength": len(raw)})
        n = {"SCALAR": 1, "VEC3": 3, "VEC4": 4}[atype]
        acc = {"bufferView": len(js["bufferViews"]) - 1, "componentType": 5126,
               "count": len(flat) // n, "type": atype}
        if minmax:
            acc["min"], acc["max"] = minmax
        js["accessors"].append(acc)
        return len(js["accessors"]) - 1

    def time_accessor(times):
        key = tuple(times)
        if key not in time_cache:
            time_cache[key] = accessor(
                times, "SCALAR",
                ([float(min(times))], [float(max(times))]))
        return time_cache[key]

    animations = []
    for clip_name, tracks in clips:
        if not tracks:
            continue
        samplers, channels = [], []
        for node, path, times, keys, atype in tracks:
            if node not in names:
                raise KeyError(f"Node '{node}' not found in GLB")
            samplers.append({"input": time_accessor(times),
                             "output": accessor(keys, atype),
                             "interpolation": "LINEAR"})
            channels.append({"sampler": len(samplers) - 1,
                             "target": {"node": names[node], "path": path}})
        animations.append({"name": clip_name, "samplers": samplers,
                           "channels": channels})

    js["animations"] = js.get("animations", []) + animations
    js["buffers"][0]["byteLength"] = len(binb)

    jb = json.dumps(js, separators=(",", ":")).encode("utf-8")
    jb += b" " * ((4 - len(jb) % 4) % 4)
    bb = bytes(binb) + b"\0" * ((4 - len(binb) % 4) % 4)
    out = struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(jb) + 8 + len(bb))
    out += struct.pack("<II", len(jb), 0x4E4F534A) + jb
    out += struct.pack("<II", len(bb), 0x004E4942) + bb
    Path(glb_path).write_bytes(out)


# ============================================================================
# Entry point
# ============================================================================
def main():
    ap = argparse.ArgumentParser(description="MCS station: model + animations")
    ap.add_argument("--out", default="station.glb")
    ap.add_argument("--sections", type=int, default=64)
    ap.add_argument("--logo", default="SpaceY-b.png")
    a = ap.parse_args()

    # Sanity check: FK poses must hit the declared grapple points
    for name, expect in (("grapple", ROCKET_GRAPPLE_DOCKED),
                         ("extract", ROCKET_GRAPPLE_EXTRACTED)):
        got = arm_fk(*POSES[name])
        err = math.sqrt(sum((g - e) ** 2 for g, e in zip(got, expect)))
        if err > 0.02:
            print(f"[warn] pose '{name}': FK={got}, expected={expect} "
                  f"(err={err:.3f} m)")
        else:
            print(f"[ok]   pose '{name}': FK={tuple(round(x,3) for x in got)}")

    scene = make_station(sections=a.sections, logo=a.logo)
    scene.export(a.out)
    clips = build_clips()
    inject_clips(a.out, clips)

    tris = sum(len(g.faces) for g in scene.geometry.values())
    print(f"\nSaved: {a.out} | nodes: {len(scene.geometry)} | "
          f"triangles: {tris}")
    print("Clips:", ", ".join(name for name, _ in clips))


if __name__ == "__main__":
    main()