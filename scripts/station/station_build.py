"""
station_build.py
Blender 4.4+. Запуск: blender --background --python station_build.py

Ключевое отличие от предыдущей версии:
  parent_keep_world(child, parent) сохраняет мировую позицию при привязке.
  Это устраняет "двойные смещения", когда дочерний объект улетает
  на (position_parent + position_child).
"""
import bpy
import bmesh
import math
from mathutils import Vector, Matrix

# ================= ПАРАМЕТРЫ =================
HULL_LEN  = 150.0
HULL_R    = 7.0
BAY_LEN   = 10.0
BAY_DEP   = 4.0
BAY_H     = 4.0
HINGE_Y   = math.sqrt(HULL_R**2 - (BAY_H/2)**2)
BAY_N     = 10
BAY_X0    = -54.0
BAY_DX    = 12.0
PAYLOAD_LENGTH = 8.0
PAYLOAD_RADIUS = 1.2
CLAW_TRAVEL = 7.0
CLAW_APPROACH = 1.5
CLAW_PAIR_OFFSET = BAY_LEN * 0.28
CLAW_TRACK_SPACING = 0.72
CLAW_TRACK_MARGIN = 0.45
CLAW_TRACK_RADIUS = 0.07
DOOR_OPEN_SECONDS = 3.5
DOOR_CLOSE_SECONDS = 20.5
ACTUATOR_END_INSET = 0.7
ACTUATOR_BODY_RATIO = 0.48
ACTUATOR_ROD_OVERLAP = 0.08
SOLAR_MAST_LENGTH = 10.8
SOLAR_PANEL_STANDOFF = 0.25
SOLAR_SURFACE_LIFT = 0.053
OUT_BLEND = "//station_base.blend"

# ================= ОЧИСТКА =================
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for coll in (bpy.data.meshes, bpy.data.materials, bpy.data.actions,
             bpy.data.armatures, bpy.data.images, bpy.data.curves):
    for block in list(coll):
        coll.remove(block)

# ================= МАТЕРИАЛЫ =================
def make_mat(name, color, metallic, roughness):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes.get("Principled BSDF")
    b.inputs["Base Color"].default_value = (*color, 1.0)
    b.inputs["Metallic"].default_value = metallic
    b.inputs["Roughness"].default_value = roughness
    return m

M_HULL     = make_mat("hull",       (0.78, 0.78, 0.80), 0.5, 0.60)
M_DARK     = make_mat("dark_metal", (0.18, 0.18, 0.20), 0.6, 0.55)
M_RUBBER   = make_mat("rubber",     (0.05, 0.05, 0.05), 0.0, 0.90)
M_SOLAR    = make_mat("solar",      (0.03, 0.06, 0.20), 0.4, 0.35)
M_SOLAR_FR = make_mat("solar_frame",(0.60, 0.60, 0.62), 0.7, 0.40)
M_SOLAR_GRID = make_mat("solar_grid", (0.24, 0.34, 0.52), 0.65, 0.32)
M_RAD      = make_mat("radiator",   (0.90, 0.90, 0.92), 0.1, 0.70)
M_RIVET    = make_mat("rivet",      (0.65, 0.65, 0.68), 0.5, 0.55)
M_TRUSS    = make_mat("truss",      (0.70, 0.70, 0.72), 0.6, 0.50)
M_CLAW     = make_mat("claw_steel", (0.58, 0.62, 0.68), 0.9, 0.24)
M_INTERIOR = make_mat("interior",   (0.10, 0.10, 0.12), 0.4, 0.70)
M_LABEL    = make_mat("label",      (0.02, 0.02, 0.02), 0.0, 0.80)

# ================= ХЕЛПЕРЫ =================
def link(obj):
    bpy.context.collection.objects.link(obj)

def empty(name, world_loc=(0,0,0), parent=None):
    """Создаёт empty в мировой точке; при parent — сохраняет мировую позицию."""
    e = bpy.data.objects.new(name, None); link(e)
    e.empty_display_size = 0.3
    e.matrix_world = Matrix.Translation(Vector(world_loc))
    if parent:
        parent_keep_world(e, parent)
    return e

def parent_keep_world(child, parent):
    """Привязывает child к parent, сохраняя мировую трансформацию child."""
    bpy.context.view_layer.update()
    mw = child.matrix_world.copy()
    child.parent = parent
    child.matrix_parent_inverse = parent.matrix_world.inverted()
    child.matrix_world = mw
    bpy.context.view_layer.update()

def cube(name, size, world_loc=(0,0,0), parent=None):
    """Куб с размером size, центрированный в world_loc. Опционально привязать."""
    bpy.ops.mesh.primitive_cube_add(size=1, location=(0,0,0))
    o = bpy.context.object; o.name = name
    o.scale = size; bpy.ops.object.transform_apply(scale=True)
    o.matrix_world = Matrix.Translation(Vector(world_loc))
    if parent:
        parent_keep_world(o, parent)
    return o

def cyl(name, r, depth, world_loc=(0,0,0), axis='X', parent=None, verts=24):
    rot = {'X': (0, math.pi/2, 0), 'Y': (math.pi/2, 0, 0), 'Z': (0,0,0)}[axis]
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=depth,
                                        location=(0,0,0), rotation=rot, vertices=verts)
    o = bpy.context.object; o.name = name
    o.matrix_world = Matrix.Translation(Vector(world_loc)) @ o.matrix_world
    if parent:
        parent_keep_world(o, parent)
    return o

def make_active(obj):
    bpy.ops.object.select_all(action='DESELECT')
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

def set_origin_to_world(obj, world_loc):
    """Перемещает origin объекта в мировую точку без сдвига геометрии."""
    bpy.context.scene.cursor.location = Vector(world_loc)
    make_active(obj)
    bpy.ops.object.origin_set(type='ORIGIN_CURSOR')

# ================= КОРПУС =================
hull_main = cyl("hull_main", HULL_R, HULL_LEN, axis='X')
hull_main.data.materials.append(M_HULL)

# Шпангоуты
rings = []
for i in range(int(HULL_LEN / 5) + 1):
    x = -HULL_LEN/2 + i * 5
    bpy.ops.mesh.primitive_torus_add(
        location=(x, 0, 0), rotation=(0, math.pi/2, 0),
        major_radius=HULL_R + 0.05, minor_radius=0.09,
        major_segments=24, minor_segments=6)
    rings.append(bpy.context.object)
make_active(rings[0])
for r in rings: r.select_set(True)
bpy.ops.object.join()
hull_rings = bpy.context.object; hull_rings.name = "hull_rings"
parent_keep_world(hull_rings, hull_main)
hull_rings.data.materials.append(M_HULL)

# Клёпки — один bmesh-меш в мировых координатах
bm = bmesh.new()
for i in range(int(HULL_LEN / 5) + 1):
    x = -HULL_LEN/2 + i * 5
    for ang in (0, 45, 135, 180, 225, 270, 315):
        a = math.radians(ang)
        y = (HULL_R + 0.05) * math.cos(a)
        z = (HULL_R + 0.05) * math.sin(a)
        bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.09,
                                   matrix=Matrix.Translation((x, y, z)))
mesh_riv = bpy.data.meshes.new("hull_rivets_mesh"); bm.to_mesh(mesh_riv); bm.free()
hull_rivets = bpy.data.objects.new("hull_rivets", mesh_riv); link(hull_rivets)
parent_keep_world(hull_rivets, hull_main)
hull_rivets.data.materials.append(M_RIVET)

# Стрингеры
for ang in (45, 135, 225, 315):
    a = math.radians(ang)
    st = cube(f"stringer_{ang}", (HULL_LEN, 0.12, 0.12),
              world_loc=(0, HULL_R * math.cos(a), HULL_R * math.sin(a)),
              parent=hull_main)
    st.rotation_euler = (a, 0, 0)
    st.data.materials.append(M_DARK)

# Торцевые полусферы
for sign in (-1, 1):
    bpy.ops.mesh.primitive_uv_sphere_add(
        radius=HULL_R, location=(sign * HULL_LEN/2, 0, 0), segments=24, ring_count=12)
    cap = bpy.context.object
    cap.name = f"hull_cap_{'A' if sign<0 else 'B'}"
    cap.scale = (0.4, 1, 1); bpy.ops.object.transform_apply(scale=True)
    parent_keep_world(cap, hull_main); cap.data.materials.append(M_HULL)

# Радиаторы
for i, x in enumerate((-20, 0, 20)):
    rad = cube(f"radiator_{i:02d}", (10, 0.15, 6),
               world_loc=(x, -HULL_R - 0.2, 0), parent=hull_main)
    rad.data.materials.append(M_RAD)

# Антенна
bpy.ops.mesh.primitive_uv_sphere_add(
    radius=1.2, location=(10, 0, HULL_R + 1.0), segments=16, ring_count=8)
ant = bpy.context.object; ant.name = "antenna_dish"
ant.scale = (1, 1, 0.3); bpy.ops.object.transform_apply(scale=True)
parent_keep_world(ant, hull_main); ant.data.materials.append(M_HULL)
cyl("antenna_stem", 0.08, 1.5, world_loc=(10, 0, HULL_R + 0.4),
    axis='Z', parent=hull_main).data.materials.append(M_HULL)

# ================= СОЛНЕЧНЫЕ ПАНЕЛИ (СТАТИКА) =================
solar_root = empty("solar_arrays")
truss_root = empty("trusses", parent=solar_root)

def build_wing(idx, x_center, angle_deg):
    a = math.radians(angle_deg)
    mast_len = SOLAR_MAST_LENGTH
    base = Vector((x_center,
                   HULL_R * math.cos(a),
                   HULL_R * math.sin(a)))
    radial = Vector((0, math.cos(a), math.sin(a)))
    tangent = Vector((0, math.sin(a), -math.cos(a)))
    for side, x_offset in enumerate((-10.0, 10.0)):
        mast = cube(
            f"array_{idx:02d}_mast_{side}",
            (0.14, mast_len, 0.14),
            world_loc=base + Vector((x_offset, 0, 0)) + radial * (mast_len / 2),
        )
        mast.rotation_euler = (a, 0, 0)
        parent_keep_world(mast, truss_root)
        mast.data.materials.append(M_TRUSS)

    crossbar = cube(
        f"array_{idx:02d}_crossbar",
        (20.2, 0.12, 0.12),
        world_loc=base + radial * mast_len,
    )
    crossbar.rotation_euler.x = a - math.pi/2
    parent_keep_world(crossbar, truss_root)
    crossbar.data.materials.append(M_TRUSS)

    for k in range(3):
        px = x_center - 7 + k * 7
        panel_center = base + radial * (mast_len + SOLAR_PANEL_STANDOFF)
        py, pz = panel_center.y, panel_center.z
        panel = cube(f"array_{idx:02d}_panel_{k}", (6.4, 12, 0.08),
                     world_loc=(px, py, pz))
        panel.rotation_euler = (a - math.pi/2, 0, 0)
        parent_keep_world(panel, solar_root); panel.data.materials.append(M_SOLAR)
        for sx in (-3.3, 3.3):
            fr = cube(f"array_{idx:02d}_fx_{k}_{sx}", (0.07, 12.1, 0.09),
                      world_loc=Vector((px + sx, py, pz)) + radial * 0.005)
            fr.rotation_euler = (a - math.pi/2, 0, 0)
            parent_keep_world(fr, solar_root); fr.data.materials.append(M_SOLAR_FR)
        for sy in (-6.1, 6.1):
            fr = cube(f"array_{idx:02d}_fy_{k}_{sy}", (6.4, 0.07, 0.09),
                      world_loc=panel_center + tangent * sy + radial * 0.005)
            fr.rotation_euler = (a - math.pi/2, 0, 0)
            parent_keep_world(fr, solar_root); fr.data.materials.append(M_SOLAR_FR)
        for grid_x_index in range(1, 6):
            grid_x = -3.2 + grid_x_index * (6.4 / 6)
            rail = cube(
                f"array_{idx:02d}_grid_x_{k}_{grid_x_index}",
                (0.025, 11.9, 0.025),
                world_loc=panel_center + Vector((grid_x, 0, 0)) + radial * SOLAR_SURFACE_LIFT,
            )
            rail.rotation_euler = (a - math.pi/2, 0, 0)
            parent_keep_world(rail, solar_root)
            rail.data.materials.append(M_SOLAR_GRID)
        for grid_y_index in range(1, 6):
            grid_y = -6 + grid_y_index * 2
            rail = cube(
                f"array_{idx:02d}_grid_y_{k}_{grid_y_index}",
                (6.3, 0.025, 0.025),
                world_loc=panel_center + tangent * grid_y + radial * SOLAR_SURFACE_LIFT,
            )
            rail.rotation_euler = (a - math.pi/2, 0, 0)
            parent_keep_world(rail, solar_root)
            rail.data.materials.append(M_SOLAR_GRID)

for i, (x, ang) in enumerate([(-60, 90), (-60, 210), (-60, 330),
                               ( 60, 90), ( 60, 210), ( 60, 330)], 1):
    build_wing(i, x, ang)

# ================= ОТСЕКИ =================
bays_root = empty("bays")
bay_centers = [BAY_X0 + i * BAY_DX for i in range(BAY_N)]

# Boolean-вырез только для bay_01
cutter = cube("cutter_bay01", (BAY_LEN + 0.2, BAY_DEP + 0.2, BAY_H + 0.2),
              world_loc=(bay_centers[0], HULL_R - BAY_DEP/2, 0))
make_active(hull_main)
mod = hull_main.modifiers.new("cut_bay01", 'BOOLEAN')
mod.operation = 'DIFFERENCE'; mod.object = cutter; mod.solver = 'EXACT'
bpy.ops.object.modifier_apply(modifier=mod.name)
bm2 = bmesh.new(); bm2.from_mesh(hull_main.data)
bmesh.ops.remove_doubles(bm2, verts=bm2.verts, dist=0.0005)
bm2.to_mesh(hull_main.data); bm2.free()
bpy.data.objects.remove(cutter, do_unlink=True)

def make_arc_door(name, bay_x, side_sign, length, n_seg=8):
    """Create the door mesh in hinge-local coordinates for a fixed rotation axis."""
    a_hinge = math.atan2(side_sign * BAY_H/2, HULL_R)
    a_center = 0.0
    verts = []; faces = []
    for i in range(n_seg + 1):
        t = i / n_seg
        ang = a_hinge + t * (a_center - a_hinge)
        y = HULL_R * math.cos(ang)
        z = HULL_R * math.sin(ang)
        for dx in (-length/2, length/2):
            verts.append((dx, y - HINGE_Y, z - side_sign * BAY_H / 2))
    for i in range(n_seg):
        faces.append((i*2, i*2+1, (i+1)*2+1, (i+1)*2))
    mesh = bpy.data.meshes.new(name)
    mesh.from_pydata(verts, [], faces); mesh.update()
    ob = bpy.data.objects.new(name, mesh); link(ob)
    ob.data.materials.append(M_HULL)
    return ob

def make_hydraulic_actuator(tag, door, bay, hinge_world, side_sign, x_offset):
    hinge = Vector(hinge_world)
    fixed = hinge + Vector((x_offset, -1.05, -side_sign * 0.55))
    hinge_angle = math.atan2(side_sign * BAY_H/2, HULL_R)
    mount_angle = hinge_angle * (1 - 0.68)
    door_mount_local = Vector((
        x_offset,
        HULL_R * math.cos(mount_angle) - HINGE_Y,
        HULL_R * math.sin(mount_angle) - side_sign * BAY_H/2,
    ))
    door_mount_world = hinge + door_mount_local

    for name, point, parent in (
        (f"{tag}_fixed_bracket", fixed, bay),
        (f"{tag}_door_bracket", door_mount_world, door),
    ):
        bracket = cube(name, (0.42, 0.18, 0.20), world_loc=point, parent=parent)
        bracket.data.materials.append(M_DARK)
        pin = cyl(f"{name}_pin", 0.09, 0.48, world_loc=point,
                  axis="X", parent=parent, verts=16)
        pin.data.materials.append(M_CLAW)

    def segment(name, radius):
        obj = cyl(name, radius, 1.0, world_loc=fixed, axis="Z", parent=bay, verts=16)
        obj.matrix_parent_inverse = Matrix.Identity(4)
        obj.data.materials.append(M_CLAW if "rod" in name else M_DARK)
        return obj

    body = segment(f"{tag}_hydraulic_body", 0.14)
    rod = segment(f"{tag}_hydraulic_rod", 0.065)

    def set_segment_pose(obj, start, end):
        direction = end - start
        length = direction.length
        world_matrix = (
            Matrix.Translation((start + end) / 2)
            @ direction.to_track_quat("Z", "Y").to_matrix().to_4x4()
            @ Matrix.Diagonal((1.0, 1.0, length, 1.0))
        )
        local_matrix = bay.matrix_world.inverted() @ world_matrix
        location, rotation, scale = local_matrix.decompose()
        obj.location = location
        obj.rotation_euler = rotation.to_euler()
        obj.scale = scale

    def key_pose(obj, seconds, start, end):
        set_segment_pose(obj, start, end)
        frame = int(round(seconds * 30))
        for channel in ("location", "rotation_euler", "scale"):
            obj.keyframe_insert(data_path=channel, frame=frame)

    door_angles = (
        (0, 0),
        (DOOR_OPEN_SECONDS, side_sign * math.pi / 2),
        (DOOR_CLOSE_SECONDS - 2.5, side_sign * math.pi / 2),
        (DOOR_CLOSE_SECONDS, 0),
    )
    linkage_lengths = []
    for _, angle in (door_angles[0], door_angles[1]):
        rotated_mount = hinge + Matrix.Rotation(angle, 4, "X") @ door_mount_local
        linkage_lengths.append((rotated_mount - fixed).length)
    body_length = min(linkage_lengths) * ACTUATOR_BODY_RATIO

    for seconds, angle in door_angles:
        rotated_mount = hinge + Matrix.Rotation(angle, 4, "X") @ door_mount_local
        direction = (rotated_mount - fixed).normalized()
        body_end = fixed + direction * body_length
        rod_start = fixed + direction * (body_length - ACTUATOR_ROD_OVERLAP)
        key_pose(body, seconds, fixed, body_end)
        key_pose(rod, seconds, rod_start, rotated_mount)

    for obj in (body, rod):
        for curve in obj.animation_data.action.fcurves:
            for point in curve.keyframe_points:
                point.interpolation = "BEZIER"
                point.handle_left_type = "AUTO_CLAMPED"
                point.handle_right_type = "AUTO_CLAMPED"

def add_label(text, world_loc, parent, size=0.35):
    """Текст → меш с нормалью +Y (наружу от корпуса)."""
    bpy.ops.object.text_add(location=world_loc)
    txt = bpy.context.object
    txt.data.body = text; txt.data.size = size; txt.data.extrude = 0.01
    txt.data.align_x = 'CENTER'; txt.data.align_y = 'CENTER'
    txt.rotation_euler = (-math.pi/2, 0, 0)   # нормаль +Y
    deps = bpy.context.evaluated_depsgraph_get()
    eval_txt = txt.evaluated_get(deps)
    me = bpy.data.meshes.new_from_object(eval_txt)
    ob = bpy.data.objects.new(f"label_{text}", me); link(ob)
    ob.matrix_world = txt.matrix_world.copy()
    parent_keep_world(ob, parent)
    ob.data.materials.append(M_LABEL)
    bpy.data.objects.remove(txt, do_unlink=True)
    return ob

def build_bay(i, active=False):
    bx = bay_centers[i]
    bay = empty(f"bay_{i+1:02d}", world_loc=(bx, 0, 0), parent=bays_root)

    if active:
        inner = cube(f"bay_{i+1:02d}_interior",
                     (BAY_LEN - 0.2, 0.12, BAY_H - 0.2),
                     world_loc=(bx, HULL_R - BAY_DEP + 0.1, 0), parent=bay)
        inner.data.materials.append(M_INTERIOR)
        for k, yoff in enumerate((-1.2, 1.2)):
            rail = cube(f"bay_{i+1:02d}_rail_{k}", (BAY_LEN - 0.4, 0.15, 0.10),
                        world_loc=(bx, HULL_R - BAY_DEP/2 + yoff, -BAY_H/2 + 0.15),
                        parent=bay)
            rail.data.materials.append(M_DARK)
    # Створки через пустышку-петлю
    for side, sign in (("left", -1), ("right", +1)):
        hinge_world = Vector((bx, HINGE_Y, sign * BAY_H/2))
        hinge = empty(f"bay_{i+1:02d}_hinge_{side}", world_loc=hinge_world, parent=bay)
        door = make_arc_door(f"bay_{i+1:02d}_door_{side}", bx, sign, BAY_LEN)
        door.parent = hinge
        door.matrix_parent_inverse = Matrix.Identity(4)
        door.location = (0, 0, 0)
        door.rotation_euler = (0, 0, 0)
        door.scale = (1, 1, 1)
        if active:
            for x_offset in (-BAY_LEN / 2 + ACTUATOR_END_INSET,
                             BAY_LEN / 2 - ACTUATOR_END_INSET):
                support = cube(
                    f"bay_{i+1:02d}_{side}_hinge_support_{'a' if x_offset < 0 else 'b'}",
                    (0.56, 0.72, 0.28),
                    world_loc=hinge_world + Vector((x_offset, -0.36, -sign * 0.12)),
                    parent=bay,
                )
                support.data.materials.append(M_DARK)
                barrel = cyl(
                    f"bay_{i+1:02d}_{side}_hinge_barrel_{'a' if x_offset < 0 else 'b'}",
                    0.19, 0.68,
                    world_loc=hinge_world + Vector((x_offset, 0, 0)),
                    axis="X", parent=bay, verts=20,
                )
                barrel.data.materials.append(M_CLAW)
            actuator_offset = BAY_LEN / 2 - ACTUATOR_END_INSET
            for x_offset in (-actuator_offset, actuator_offset):
                make_hydraulic_actuator(
                    f"bay_{i+1:02d}_{side}_actuator_{'a' if x_offset < 0 else 'b'}",
                    door, bay, hinge_world, sign, x_offset,
                )

    seal = cube(f"bay_{i+1:02d}_seal", (BAY_LEN - 0.2, 0.05, 0.05),
                world_loc=(bx, HULL_R - 0.2, 0), parent=bay)
    seal.data.materials.append(M_RUBBER)
    for hz in (-BAY_H/2, BAY_H/2):
        p = cyl(f"bay_{i+1:02d}_pin_{'top' if hz>0 else 'bot'}", 0.08,
                BAY_LEN - 0.3, world_loc=(bx, HULL_R - 0.10, hz),
                axis='X', parent=bay)
        p.data.materials.append(M_DARK)

    add_label(f"BAY {i+1:02d}",
              world_loc=(bx, HULL_R + 0.05, BAY_H/2 + 0.6), parent=bay)

for i in range(BAY_N):
    build_bay(i, active=(i == 0))

# ================= КЛЕШНИ =================
bay01 = bpy.data.objects["bay_01"]
bay01_world_x = bay_centers[0]
# Общая каретка синхронно перемещает обе клешни при переносе груза.
claw_carriage = empty("claw_carriage", parent=bay01)
claw_carriage["travel_distance"] = CLAW_TRAVEL
claw_carriage["approach_distance"] = CLAW_APPROACH

def build_claw(pair, side, x_offset, side_z):
    """Build one of four independently articulated claws around the payload."""
    tag = f"{pair}_{side}"
    inward = Vector((0, 0, -side_z))
    base_w = Vector((
        bay01_world_x + x_offset,
        HULL_R - BAY_DEP/2 - CLAW_APPROACH,
        side_z * 1.85,
    ))
    track_y_start = base_w.y - CLAW_TRACK_MARGIN
    track_length = CLAW_APPROACH + CLAW_TRAVEL + 2 * CLAW_TRACK_MARGIN
    track_y_center = track_y_start + track_length / 2
    track_z = side_z * 2.22

    base = empty(f"claw_{tag}_base", world_loc=base_w, parent=claw_carriage)
    for rail_side in (-1, 1):
        rail_x = bay01_world_x + x_offset + rail_side * CLAW_TRACK_SPACING / 2
        rail = cyl(
            f"claw_{tag}_guide_rail_{'a' if rail_side < 0 else 'b'}",
            CLAW_TRACK_RADIUS, track_length,
            world_loc=(rail_x, track_y_center, track_z),
            axis="Y", parent=bay01, verts=16,
        )
        rail.data.materials.append(M_SOLAR_FR)
        slider = cube(
            f"claw_{tag}_rail_slider_{'a' if rail_side < 0 else 'b'}",
            (0.26, 0.64, 0.30),
            world_loc=(rail_x, base_w.y, track_z),
            parent=claw_carriage,
        )
        slider.data.materials.append(M_DARK)
        for end_name, end_y in (("inner", track_y_start), ("outer", track_y_start + track_length)):
            collar = cyl(
                f"claw_{tag}_rail_mount_{'a' if rail_side < 0 else 'b'}_{end_name}",
                0.14, 0.20, world_loc=(rail_x, end_y, track_z),
                axis="Y", parent=bay01, verts=16,
            )
            collar.data.materials.append(M_DARK)
        for roller_offset in (-0.20, 0.20):
            roller = cyl(
                f"claw_{tag}_rail_roller_{'a' if rail_side < 0 else 'b'}_{'front' if roller_offset < 0 else 'rear'}",
                0.12, 0.12,
                world_loc=(rail_x, base_w.y + roller_offset, track_z),
                axis="X", parent=claw_carriage, verts=12,
            )
            roller.data.materials.append(M_CLAW)
    bridge = cube(
        f"claw_{tag}_carriage_bridge",
        (CLAW_TRACK_SPACING + 0.34, 0.38, 0.22),
        world_loc=(base_w.x, base_w.y, side_z * 2.11),
        parent=claw_carriage,
    )
    bridge.data.materials.append(M_DARK)
    j1 = empty(f"claw_{tag}_joint1", world_loc=base_w, parent=base)
    arm1_end = base_w + inward * 0.4
    arm1 = cube(
        f"claw_{tag}_arm_1", (0.30, 0.30, 0.4),
        world_loc=(base_w + arm1_end) / 2, parent=j1,
    )
    arm1.data.materials.append(M_CLAW)
    cyl(f"claw_{tag}_joint1_housing", 0.24, 0.42,
        world_loc=base_w, axis='X', parent=j1, verts=20).data.materials.append(M_CLAW)

    j2 = empty(f"claw_{tag}_joint2", world_loc=arm1_end, parent=j1)
    arm2_end = arm1_end + inward * 0.25
    arm2 = cube(
        f"claw_{tag}_arm_2", (0.25, 0.25, 0.25),
        world_loc=(arm1_end + arm2_end) / 2, parent=j2,
    )
    arm2.data.materials.append(M_CLAW)
    cyl(f"claw_{tag}_joint2_housing", 0.19, 0.34,
        world_loc=arm1_end, axis='X', parent=j2, verts=20).data.materials.append(M_CLAW)

    j3 = empty(f"claw_{tag}_joint3", world_loc=arm2_end, parent=j2)
    wrist = arm2_end + inward * 0.1
    wrist_housing = cyl(
        f"claw_{tag}_joint3_housing", 0.15, 0.30,
        world_loc=arm2_end, axis='X', parent=j3, verts=16,
    )
    wrist_housing.data.materials.append(M_CLAW)
    grip = empty(f"claw_{tag}_gripper", world_loc=wrist, parent=j3)
    pad_size = (0.30, 0.42, 0.22)
    pad_contact_z = math.sqrt(PAYLOAD_RADIUS**2 - (pad_size[1] / 2)**2) + pad_size[2] / 2

    for finger_name, x_sign in (("a", -1), ("b", 1)):
        finger_position = wrist + Vector((x_sign * 0.2, 0, 0))
        finger = empty(
            f"claw_{tag}_finger_{finger_name}",
            world_loc=finger_position,
            parent=grip,
        )
        finger_arm = cube(
            f"claw_{tag}_finger_{finger_name}_arm",
            (0.14, 0.14, 0.32),
            world_loc=finger_position + Vector((0, 0, side_z * 0.16)),
            parent=finger,
        )
        finger_arm.data.materials.append(M_CLAW)
        pad = cube(
            f"claw_{tag}_finger_{finger_name}_pad",
            pad_size,
            world_loc=finger_position + Vector((
                0, 0, side_z * (pad_contact_z - wrist.z * side_z)
            )),
            parent=finger,
        )
        pad.data.materials.append(M_CLAW)

    for bolt_index in range(2):
        bolt = cyl(
            f"claw_{tag}_bolt_{bolt_index}", 0.045, 0.08,
            world_loc=base_w + Vector((0.16, 0, side_z * (0.2 + bolt_index * 0.35))),
            axis='Y', parent=j1, verts=8,
        )
        bolt.data.materials.append(M_CLAW)


for pair, x_offset in (("front", -CLAW_PAIR_OFFSET), ("rear", CLAW_PAIR_OFFSET)):
    build_claw(pair, "top", x_offset, +1)
    build_claw(pair, "bottom", x_offset, -1)

# ================= МАРКЕР ПОЗИЦИИ ГРУЗА =================
# Empty is exported as an animation target; rocket.glb replaces it in the web scene.
payload_marker = empty(
    "dummy_rocket",
    world_loc=(bay01_world_x, HULL_R - BAY_DEP/2, 0),
    parent=bay01,
)
payload_marker["payload_length"] = PAYLOAD_LENGTH

# ================= СОХРАНЕНИЕ =================
bpy.ops.wm.save_as_mainfile(filepath=bpy.path.abspath(OUT_BLEND))
print(f"[OK] Сохранено: {bpy.path.abspath(OUT_BLEND)}")