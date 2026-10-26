"""
station_export.py
Blender 4.4+. Запуск: blender --background --python station_export.py

ENABLE_PREVIEW = True — рендерит 4 кадра в scripts/station/preview/
                         (Workbench, быстро, без GPU).
"""
import bpy
import math
import os

BLEND_PATH = "//station_base.blend"
GLB_PATH = "//../../static/models/station.glb"
FPS = 30
T_OPEN, T_RAIL, T_EXT, T_GRIP, T_PULL = 3.5, 5.5, 7, 8, 12
T_REL, T_CLAW_RET, T_RAIL_RET, T_CLOSE = 14, 16, 18, 20.5
T_DOOR_CLOSE = T_CLOSE - 2.5

ENABLE_PREVIEW = False
PREVIEW_DIR = "//preview"

# ================= ЗАГРУЗКА =================
bpy.ops.wm.open_mainfile(filepath=bpy.path.abspath(BLEND_PATH))
scene = bpy.context.scene
scene.render.fps = FPS
scene.frame_start = 0
scene.frame_end = int(round(T_CLOSE * FPS))

def fr(seconds):
    return int(round(seconds * FPS))

door_l = bpy.data.objects["bay_01_hinge_left"]
door_r = bpy.data.objects["bay_01_hinge_right"]
dummy = bpy.data.objects["dummy_rocket"]

# ================= СТВОРКИ =================

def key_rotation_x(obj, seconds, angle):
    frame = fr(seconds)
    obj.rotation_euler.x = angle
    obj.keyframe_insert(data_path="rotation_euler", index=0, frame=frame)


def key_rotation_y(obj, seconds, angle):
    frame = fr(seconds)
    obj.rotation_euler.y = angle
    obj.keyframe_insert(data_path="rotation_euler", index=1, frame=frame)


def set_smooth_interpolation(obj):
    """Сглаживает движение без выбросов за заданные углы и позиции."""
    action = obj.animation_data.action
    for curve in action.fcurves:
        for point in curve.keyframe_points:
            point.interpolation = "BEZIER"
            point.handle_left_type = "AUTO_CLAMPED"
            point.handle_right_type = "AUTO_CLAMPED"


def animate_door(obj, angle):
    # Закрытие начинается после того, как клешни убраны.
    for seconds, value in (
        (0, 0),
        (T_OPEN, angle),
        (T_DOOR_CLOSE, angle),
        (T_CLOSE, 0),
    ):
        key_rotation_x(obj, seconds, value)
    set_smooth_interpolation(obj)


animate_door(door_r, math.radians(90))
animate_door(door_l, math.radians(-90))

# ================= КЛЕШНИ =================

def animate_claw(tag, sign_z, delay=0):
    j1 = bpy.data.objects[f"claw_{tag}_joint1"]
    j2 = bpy.data.objects[f"claw_{tag}_joint2"]
    j3 = bpy.data.objects[f"claw_{tag}_joint3"]
    stowed_angle = -sign_z * math.pi / 2
    elbow_angle = math.radians(34)
    wrist_angle = math.radians(26)

    for seconds, angle in (
        (0, stowed_angle),
        (T_OPEN + delay, stowed_angle),
        (T_RAIL + delay, stowed_angle),
        (T_EXT + delay, 0),
        (T_REL + delay, 0),
        (T_CLAW_RET + delay, stowed_angle),
        (T_RAIL_RET + delay, stowed_angle),
    ):
        key_rotation_x(j1, seconds, angle)

    for seconds, angle in (
        (0, 0),
        (T_EXT + delay, 0),
        (T_GRIP + delay, -sign_z * elbow_angle),
        (T_REL + delay, -sign_z * elbow_angle),
        (T_CLAW_RET + delay, 0),
        (T_RAIL_RET + delay, 0),
    ):
        key_rotation_x(j2, seconds, angle)

    for seconds, angle in (
        (0, 0),
        (T_GRIP + delay, -wrist_angle),
        (T_REL + delay, -wrist_angle),
        (T_CLAW_RET + delay, 0),
        (T_RAIL_RET + delay, 0),
    ):
        key_rotation_x(j3, seconds, angle)

    fingers = (
        (bpy.data.objects[f"claw_{tag}_finger_a"], 1),
        (bpy.data.objects[f"claw_{tag}_finger_b"], -1),
    )
    for finger, x_sign in fingers:
        for seconds, angle in (
            (0, -x_sign * sign_z * math.radians(8)),
            (T_EXT + delay, -x_sign * sign_z * math.radians(8)),
            (T_GRIP + delay, x_sign * sign_z * math.radians(24)),
            (T_PULL + delay, x_sign * sign_z * math.radians(24)),
            (T_REL + delay, -x_sign * sign_z * math.radians(8)),
            (T_CLAW_RET + delay, -x_sign * sign_z * math.radians(8)),
            (T_RAIL_RET + delay, -x_sign * sign_z * math.radians(8)),
        ):
            key_rotation_y(finger, seconds, angle)

    for obj in (j1, j2, j3, *(finger for finger, _ in fingers)):
        set_smooth_interpolation(obj)


for pair, delay in (("front", 0), ("rear", 0.35)):
    animate_claw(f"{pair}_top", +1, delay)
    animate_claw(f"{pair}_bottom", -1, delay)

# ================= DUMMY ROCKET =================
start_y = dummy.location.y
carriage = bpy.data.objects["claw_carriage"]
carriage_y = carriage.location.y
pull_distance = float(carriage.get("travel_distance", 7.0))
approach_distance = float(carriage.get("approach_distance", 1.5))

for seconds, y in (
    (0, carriage_y),
    (T_OPEN, carriage_y),
    (T_RAIL, carriage_y + approach_distance),
    (T_GRIP, carriage_y + approach_distance),
    (T_PULL, carriage_y + approach_distance + pull_distance),
    (T_REL, carriage_y + approach_distance + pull_distance),
    (T_CLAW_RET, carriage_y + approach_distance + pull_distance),
    (T_RAIL_RET, carriage_y),
):
    carriage.location.y = y
    carriage.keyframe_insert(data_path="location", index=1, frame=fr(seconds))
set_smooth_interpolation(carriage)

for seconds, y in (
    (0, start_y),
    (T_GRIP, start_y),
    (T_PULL, start_y + pull_distance),
    (T_REL, start_y + pull_distance),
    (T_CLOSE, start_y + pull_distance),
):
    dummy.location.y = y
    dummy.keyframe_insert(data_path="location", index=1, frame=fr(seconds))
set_smooth_interpolation(dummy)
scene.frame_set(scene.frame_start)

# ================= ЭКСПОРТ =================
os.makedirs(os.path.dirname(bpy.path.abspath(GLB_PATH)), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=bpy.path.abspath(GLB_PATH),
    export_format='GLB',
    export_animations=True,
    export_animation_mode='ACTIVE_ACTIONS',
    export_nla_strips_merged_animation_name='deploy_rocket',
    export_force_sampling=True,
    export_frame_range=True,
    export_apply=False,
    export_yup=True,
)
print(f"[OK] Экспорт: {bpy.path.abspath(GLB_PATH)}")

# ================= ПРЕВЬЮ (опционально) =================
if ENABLE_PREVIEW:
    os.makedirs(bpy.path.abspath(PREVIEW_DIR), exist_ok=True)
    cam_data = bpy.data.cameras.new("preview_cam")
    cam = bpy.data.objects.new("preview_cam", cam_data)
    scene.collection.objects.link(cam)
    cam.location = (-75, 35, 20); cam.rotation_euler = (math.radians(70), 0, math.radians(-55))
    scene.camera = cam
    light_data = bpy.data.lights.new("sun", 'SUN')
    light_data.energy = 3.0
    light = bpy.data.objects.new("sun", light_data)
    scene.collection.objects.link(light)
    light.rotation_euler = (math.radians(45), math.radians(30), 0)
    scene.render.engine = 'BLENDER_WORKBENCH'
    scene.render.resolution_x = 1280
    scene.render.resolution_y = 720
    for t in (0, 6, 11, 16):
        scene.frame_set(fr(t))
        scene.render.filepath = bpy.path.abspath(f"{PREVIEW_DIR}/frame_{t:02d}.png")
        bpy.ops.render.render(write_still=True)
        print(f"[preview] frame_{t:02d}.png")