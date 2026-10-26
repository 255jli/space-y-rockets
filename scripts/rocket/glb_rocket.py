#!/usr/bin/env python3
"""Параметрический 3D-макет ракеты с экспортом GLB/GLTF.

Зависимости:
    pip install trimesh numpy pillow

Опциональная проверка пересечений:
    pip install python-fcl

Примеры:
    python glb_rocket.py --out rocket.glb
    python glb_rocket.py --out rocket.glb --sections 128
    python glb_rocket.py --out rocket.glb --check
"""

from __future__ import annotations

import argparse
import math
from pathlib import Path
from typing import Iterable

import numpy as np
import trimesh
from trimesh.transformations import rotation_matrix, translation_matrix

from PIL import Image  # pip install pillow

def curved_decal(path, radius, z0, z1, a0, a1, nu=64, nv=8):
    img = Image.open(path).convert("RGBA")
    mat = trimesh.visual.material.PBRMaterial(
        name="decal", baseColorTexture=img,
        metallicFactor=0.0, roughnessFactor=0.8,
        alphaMode="BLEND", doubleSided=True,
    )
    verts, uvs, faces = [], [], []
    for j in range(nv):
        v = j / (nv - 1)
        z = z0 + (z1 - z0) * v
        for i in range(nu):
            u = i / (nu - 1)
            a = a0 + (a1 - a0) * u
            verts.append([radius * math.cos(a), radius * math.sin(a), z])
            uvs.append([v, u])         # поворот 90°: длинная ось картинки вдоль Z
    for j in range(nv - 1):
        for i in range(nu - 1):
            a = j * nu + i
            faces += [[a, a + nu, a + nu + 1], [a, a + nu + 1, a + 1]]
    m = trimesh.Trimesh(vertices=np.array(verts), faces=np.array(faces), process=False)
    m.visual = trimesh.visual.TextureVisuals(uv=np.array(uvs), material=mat)
    return m


def add_logo(scene, path, radius, z_center, length=6.0, angle=0.0):
    p = Path(path)
    if not p.is_absolute():
        script_relative_path = Path(__file__).resolve().parent / p
        if script_relative_path.is_file():
            p = script_relative_path

    if not p.exists():
        print(f"Предупреждение: {path} не найден, декаль пропущена.")
        return
    with Image.open(p) as image:
        w, h = image.size
    width = length / (w / h)           # поперечный размер по аспекту картинки
    arc = min(math.radians(120), width / radius)
    decal = curved_decal(p, radius + 0.02,
                         z_center - length / 2, z_center + length / 2,
                         angle - arc / 2, angle + arc / 2, nu=12, nv=64)
    add_mesh(scene, decal, "stage1_logo")

# ---------------------------------------------------------------------------
# Параметры модели
# ---------------------------------------------------------------------------
# Значения взяты из первоначального макета и предназначены для визуализации.
# Для инженерной модели их нужно заменить проверенными чертежами и допусками.
SPEC = {
    "diameter": 3.7,
    "stage1_length": 41.0,
    "stage2_length": 13.5,
    "fairing_length": 14.0,
    "fairing_diameter": 5.2,
    "engine_count": 9,
    "engine_throat_radius": 0.12,
    "engine_exit_radius": 0.46,
    "engine_length": 2,
    "stage2_engine_throat_radius": 0.35,
    "stage2_engine_exit_radius": 1.00,
    "stage2_engine_length": 2.6,
}

# RGBA в диапазоне 0..1.
COLORS = {
    "white": [0.92, 0.92, 0.94, 1.0],
    "black": [0.05, 0.05, 0.06, 1.0],
    "steel": [0.55, 0.56, 0.58, 1.0],
    "dark": [0.16, 0.16, 0.18, 1.0],
    "tiles": [0.09, 0.09, 0.10, 1.0],
}

MATERIAL_PROPERTIES = {
    "white": {"metallicFactor": 0.08, "roughnessFactor": 0.48},
    "black": {"metallicFactor": 0.10, "roughnessFactor": 0.78},
    "steel": {"metallicFactor": 0.72, "roughnessFactor": 0.30},
    "dark": {"metallicFactor": 0.35, "roughnessFactor": 0.56},
    "tiles": {"metallicFactor": 0.02, "roughnessFactor": 0.84},
}


# ---------------------------------------------------------------------------
# Вспомогательные функции для цвета и размещения геометрии
# ---------------------------------------------------------------------------
def paint(mesh: trimesh.Trimesh, color_name: str) -> trimesh.Trimesh:
    """Назначает цвет и свойства PBR-материала для экспорта в GLB/GLTF."""
    if color_name not in COLORS:
        raise KeyError(f"Неизвестный материал: {color_name}")

    rgba = np.rint(
        np.asarray(COLORS[color_name], dtype=np.float64) * 255.0
    ).clip(0, 255).astype(np.uint8)

    mesh.visual = trimesh.visual.TextureVisuals(
        material=trimesh.visual.material.PBRMaterial(
            name=color_name,
            baseColorFactor=rgba.tolist(),
            **MATERIAL_PROPERTIES[color_name],
        )
    )
    return mesh


def add_mesh(
    scene: trimesh.Scene,
    mesh: trimesh.Trimesh,
    name: str,
    offset: Iterable[float] = (0.0, 0.0, 0.0),
) -> None:
    """Смещает меш и добавляет его в сцену с уникальным именем."""
    mesh.apply_translation(np.asarray(offset, dtype=float))
    scene.add_geometry(mesh, node_name=name, geom_name=name)


def move_scene_bottom_to_zero(scene: trimesh.Scene) -> None:
    """Перемещает геометрию так, чтобы нижняя точка оказалась на z=0."""
    if not scene.geometry:
        return

    z_min = float(scene.bounds[0][2])
    shift = np.array([0.0, 0.0, -z_min])

    for mesh in scene.geometry.values():
        mesh.apply_translation(shift)


# ---------------------------------------------------------------------------
# Процедурная геометрия
# ---------------------------------------------------------------------------
def lathe(
    profile: Iterable[tuple[float, float]],
    sections: int = 96,
) -> trimesh.Trimesh:
    """Создаёт тело вращения вокруг Z из профиля (радиус, высота)."""
    profile = list(profile)

    if len(profile) < 2:
        raise ValueError("Для тела вращения нужны минимум две точки профиля.")
    if sections < 12:
        raise ValueError("sections должно быть не меньше 12.")
    if any(radius < 0 for radius, _ in profile):
        raise ValueError("Радиус профиля не может быть отрицательным.")

    angles = np.linspace(0.0, 2.0 * math.pi, sections, endpoint=False)
    vertices = []

    for radius, z in profile:
        for angle in angles:
            vertices.append([
                radius * math.cos(angle),
                radius * math.sin(angle),
                z,
            ])

    faces = []
    ring_count = len(profile)

    for ring in range(ring_count - 1):
        current = ring * sections
        next_ring = (ring + 1) * sections

        for i in range(sections):
            j = (i + 1) % sections
            faces.append([current + i, current + j, next_ring + j])
            faces.append([current + i, next_ring + j, next_ring + i])

    mesh = trimesh.Trimesh(
        vertices=np.asarray(vertices, dtype=float),
        faces=np.asarray(faces, dtype=np.int64),
        process=True,
    )
    mesh.fix_normals()
    return mesh


def ogive_profile(
    radius: float,
    height: float,
    points: int = 24,
) -> list[tuple[float, float]]:
    """Возвращает профиль округлого носового обтекателя."""
    profile = []

    for t in np.linspace(0.0, 1.0, points + 1):
        local_radius = radius * max(0.0, 1.0 - t * t) ** 0.62
        profile.append((local_radius, height * t))

    profile[0] = (radius, 0.0)
    profile[-1] = (0.001, height)
    return profile


def ring_mesh(
    radius: float,
    z: float,
    width: float,
    thickness: float,
    sections: int,
) -> trimesh.Trimesh:
    """Создаёт кольцевую накладку вокруг корпуса."""
    half_width = width / 2.0
    outer = radius + thickness

    profile = [
        (radius, z - half_width),
        (outer, z - half_width),
        (outer, z + half_width),
        (radius, z + half_width),
        (radius, z - half_width),
    ]
    return lathe(profile, sections)


def engine_mesh(throat_radius, exit_radius, length, sections, wall=0.025):
    """Полый раструб с толщиной стенки, горловиной и камерой."""
    rc = throat_radius * 1.6

    def bell(t, dr=0.0):
        r = throat_radius + (exit_radius - throat_radius) * t ** 0.8
        return (r - dr, -length * t)

    ts = np.linspace(0.15, 1.0, 12)
    profile = [
        (rc, 0.60), (rc, 0.12),
        (throat_radius * 1.25, 0.02), (throat_radius, -0.12),
    ]
    profile += [bell(t) for t in ts]                      # внешняя образующая
    profile.append((exit_radius - wall, -length - 0.03))  # кромка среза
    profile += [bell(t, wall) for t in ts[::-1]]          # внутренняя образующая
    profile += [
        (throat_radius - wall, -0.10),
        (rc - wall, 0.14), (rc - wall, 0.60), (rc, 0.60),
    ]

    mesh = lathe(profile, sections)
    if mesh.volume < 0:          # гарантируем внешние нормали
        mesh.invert()
    return paint(mesh, "steel")


# ---------------------------------------------------------------------------
# Двигатели и наружные элементы
# ---------------------------------------------------------------------------
def engine_positions(count: int) -> list[tuple[float, float]]:
    """Позиции девяти двигателей первой ступени."""
    if count != 9:
        raise ValueError("В этой конфигурации поддерживается 9 двигателей.")

    positions = [(0.0, 0.0)]
    positions.extend(
        (1.25 * math.cos(angle), 1.25 * math.sin(angle))
        for angle in np.linspace(0.0, 2.0 * math.pi, 8, endpoint=False)
    )
    return positions


def grid_fin(
    width: float,
    height: float,
    bars: int = 5,
) -> trimesh.Trimesh:
    """Создаёт упрощённую решётчатую панель из прямоугольных брусков."""
    thickness = 0.06
    depth = 0.12
    parts = []

    for z in (height / 2 - thickness / 2, -height / 2 + thickness / 2):
        bar = trimesh.creation.box(
            extents=[width, depth, thickness]
        )
        bar.apply_translation([width / 2, 0.0, z])
        parts.append(bar)

    for x in (thickness / 2, width - thickness / 2):
        bar = trimesh.creation.box(
            extents=[thickness, depth, height]
        )
        bar.apply_translation([x, 0.0, 0.0])
        parts.append(bar)

    for index in range(1, bars):
        x_bar = trimesh.creation.box(
            extents=[thickness, depth * 0.8, height - 2 * thickness]
        )
        x_bar.apply_translation([width * index / bars, 0.0, 0.0])
        parts.append(x_bar)

        z_bar = trimesh.creation.box(
            extents=[width - 2 * thickness, depth * 0.8, thickness]
        )
        z_bar.apply_translation([
            width / 2,
            0.0,
            -height / 2 + height * index / bars,
        ])
        parts.append(z_bar)

    return paint(trimesh.util.concatenate(parts), "dark")


def add_stage1(
    scene: trimesh.Scene,
    sections: int,
    details: bool = True,
) -> None:
    """Добавляет корпус, двигатели и простые наружные детали первой ступени."""
    radius = SPEC["diameter"] / 2.0
    length = SPEC["stage1_length"]

    body = trimesh.creation.cylinder(radius=radius, height=length - 1.6, sections=sections)
    body.apply_translation([0, 0, 1.6 + (length - 1.6) / 2])
    add_mesh(scene, paint(body, "white"), "stage1_body")

    thrust_section = ring_mesh(radius=radius * 0.92, z=1.25,
                                width=0.90, thickness=radius * 0.08 + 0.03,
                                sections=sections)
    add_mesh(
        scene,
        paint(thrust_section, "dark"),
        "stage1_thrust_section",
    )

    positions = engine_positions(SPEC["engine_count"])

    for index, (x, y) in enumerate(positions):
        engine = engine_mesh(
            SPEC["engine_throat_radius"],
            SPEC["engine_exit_radius"],
            SPEC["engine_length"],
            sections,
        )
        add_mesh(
            scene,
            engine,
            f"stage1_engine_{index:02d}",
            (x, y, 2.2),
        )

    if not details:
        return

    # Наружные кольцевые пояса. В этой версии они сделаны как накладки.
    for index, z in enumerate((1.0, length * 0.33, length * 0.66, length - 0.5)):
        band = ring_mesh(
            radius=radius,
            z=z,
            width=0.08,
            thickness=0.035,
            sections=sections,
        )
        add_mesh(
            scene,
            paint(band, "dark"),
            f"stage1_band_{index:02d}",
        )

    # Панели располагаются по окружности на поверхности корпуса.
    for index, angle in enumerate(
        np.linspace(0.0, 2.0 * math.pi, 4, endpoint=False)
    ):
        panel = trimesh.creation.box(extents=[0.045, 0.65, 0.9])
        transform = (
            translation_matrix([0.0, 0.0, length * 0.55])
            @ rotation_matrix(angle, [0.0, 0.0, 1.0])
            @ translation_matrix([radius + 0.018, 0.0, 0.0])
        )
        panel.apply_transform(transform)
        add_mesh(
            scene,
            paint(panel, "dark"),
            f"stage1_service_panel_{index:02d}",
        )

    add_logo(scene, "SpaceY-b.png", radius, length * 0.62 + 9.0, length=6.0)

def add_stage2_and_fairing(
    scene: trimesh.Scene,
    sections: int,
    details: bool = True,
) -> None:
    """Добавляет вторую ступень и обтекатель."""
    radius = SPEC["diameter"] / 2.0
    stage1_length = SPEC["stage1_length"]
    stage2_length = SPEC["stage2_length"]

    # Корпус второй ступени
    stage2 = trimesh.creation.cylinder(
        radius=radius,
        height=stage2_length,
        sections=sections,
    )
    stage2.apply_translation([
        0.0,
        0.0,
        stage1_length + stage2_length / 2.0,
    ])
    add_mesh(scene, paint(stage2, "white"), "stage2_body")

    # Упрощённый двигатель второй ступени
    upper_engine = engine_mesh(
        SPEC["stage2_engine_throat_radius"],
        SPEC["stage2_engine_exit_radius"],
        SPEC["stage2_engine_length"],
        sections,
    )
    add_mesh(
        scene,
        upper_engine,
        "stage2_engine",
        (0.0, 0.0, stage1_length + 1.5),
    )

    fairing_radius = SPEC["fairing_diameter"] / 2.0
    fairing_length = SPEC["fairing_length"]
    fairing_z = stage1_length + stage2_length
    base_height = min(2.0, fairing_length * 0.25)

    # Цилиндрическое основание обтекателя
    fairing_base = trimesh.creation.cylinder(
        radius=fairing_radius,
        height=base_height,
        sections=sections,
    )
    fairing_base.apply_translation([
        0.0,
        0.0,
        fairing_z + base_height / 2.0,
    ])
    add_mesh(scene, paint(fairing_base, "white"), "fairing_base")

    # Носовая часть обтекателя
    nose_height = fairing_length - base_height
    nose = lathe(
        ogive_profile(fairing_radius, nose_height, points=32),
        sections,
    )
    add_mesh(
        scene,
        paint(nose, "white"),
        "fairing_nose",
        (0.0, 0.0, fairing_z + base_height),
    )

    if details:
        # Условные кольцевые стыки второй ступени
        for index, z in enumerate((
            stage1_length + 0.35,
            stage1_length + stage2_length * 0.5,
            stage1_length + stage2_length - 0.35,
        )):
            band = ring_mesh(
                radius=radius,
                z=z,
                width=0.07,
                thickness=0.03,
                sections=sections,
            )
            add_mesh(
                scene,
                paint(band, "dark"),
                f"stage2_band_{index:02d}",
            )

        # Условные сервисные панели второй ступени
        for index, angle in enumerate(
            np.linspace(0.0, 2.0 * math.pi, 4, endpoint=False)
        ):
            panel = trimesh.creation.box(extents=[0.04, 0.48, 0.7])
            transform = (
                translation_matrix([
                    0.0,
                    0.0,
                    stage1_length + stage2_length * 0.55,
                ])
                @ rotation_matrix(angle, [0.0, 0.0, 1.0])
                @ translation_matrix([radius + 0.015, 0.0, 0.0])
            )
            panel.apply_transform(transform)
            add_mesh(
                scene,
                paint(panel, "dark"),
                f"stage2_service_panel_{index:02d}",
            )


def add_grid_fins(
    scene: trimesh.Scene,
    sections: int,
) -> None:
    """Добавляет четыре упрощённые решётчатые панели."""
    radius = SPEC["diameter"] / 2.0
    z = SPEC["stage1_length"] - 1.8

    for index in range(4):
        angle = math.radians(45.0 + 90.0 * index)
        fin = grid_fin(width=2.2, height=1.4)

        transform = (
            translation_matrix([0.0, 0.0, z])
            @ rotation_matrix(angle, [0.0, 0.0, 1.0])
            @ translation_matrix([radius - 0.15, 0.0, 0.0])
        )
        fin.apply_transform(transform)

        add_mesh(
            scene,
            fin,
            f"grid_fin_{index:02d}",
        )


def make_rocket(
    sections: int = 96,
    details: bool = True,
    grid_fins: bool = False,
) -> trimesh.Scene:
    """Собирает визуальный макет ракеты; решётчатые стабилизаторы отключены."""
    if sections < 12:
        raise ValueError("sections должно быть не меньше 12.")

    scene = trimesh.Scene()

    add_stage1(
        scene=scene,
        sections=sections,
        details=details,
    )

    add_stage2_and_fairing(
        scene=scene,
        sections=sections,
        details=details,
    )

    if grid_fins:
        add_grid_fins(scene, sections)

    move_scene_bottom_to_zero(scene)
    return scene


def check_intersections(scene: trimesh.Scene) -> list[tuple[str, str]]:
    """Возвращает пары пересекающихся мешей; требует python-fcl."""
    try:
        manager = trimesh.collision.CollisionManager()
    except (ImportError, ModuleNotFoundError) as exc:
        raise RuntimeError(
            "Для --check установи python-fcl: pip install python-fcl"
        ) from exc

    for name, mesh in scene.geometry.items():
        manager.add_object(name, mesh)

    has_collision, pairs = manager.in_collision_internal(
        return_names=True
    )

    if not has_collision:
        print("Проверка: пересечений не обнаружено.")
        return []

    result = sorted(tuple(sorted(pair)) for pair in pairs)
    print(f"Проверка: обнаружено пересечений — {len(result)}.")

    for first, second in result:
        print(f"  {first} <-> {second}")

    print(
        "Некоторые пары могут быть намеренными стыками или накладками. "
        "Список требует проверки по исходным чертежам."
    )
    return result


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Параметрический визуальный макет Falcon 9"
    )
    parser.add_argument(
        "--out",
        default="rocket.glb",
        help="путь выходного файла .glb или .gltf",
    )
    parser.add_argument(
        "--sections",
        type=int,
        default=96,
        help="число сегментов вращательной геометрии",
    )
    parser.add_argument(
        "--details",
        choices=("on", "off"),
        default="on",
        help="включить или отключить условные панели и кольца",
    )
    parser.add_argument(
        "--grid-fins",
        choices=("on", "off"),
        default="off",
        help="решётчатые стабилизаторы (по умолчанию отключены)",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="проверить пересечения; требуется python-fcl",
    )
    args = parser.parse_args()

    if args.sections < 12:
        parser.error("--sections должно быть не меньше 12.")

    output = Path(args.out)
    extension = output.suffix.lower()

    if extension not in (".glb", ".gltf"):
        parser.error("Файл должен иметь расширение .glb или .gltf.")

    scene = make_rocket(
        sections=args.sections,
        details=(args.details == "on"),
        grid_fins=(args.grid_fins == "on"),
    )

    # Сначала экспортируем модель: отсутствие python-fcl не мешает
    # получить GLB/GLTF-файл.
    output.parent.mkdir(parents=True, exist_ok=True)
    scene.export(str(output))

    print(f"Сохранено: {output}")
    print(f"Узлов геометрии: {len(scene.geometry)}")
    print(f"Треугольников: {sum(len(mesh.faces) for mesh in scene.geometry.values())}")
    print(f"Высота модели: {scene.bounds[1][2] - scene.bounds[0][2]:.2f} м")

    if args.check:
        try:
            check_intersections(scene)
        except RuntimeError as exc:
            print(f"Проверка столкновений пропущена: {exc}")


if __name__ == "__main__":
    main()
