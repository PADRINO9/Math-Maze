from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


FRAME_COUNT = 12
FRAME_SIZE = 512
ORTHO_SCALE = 3.55


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def make_material(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float = 0.36,
    metallic: float = 0.0,
    alpha: float | None = None,
) -> bpy.types.Material:
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    bsdf = mat.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = color
        bsdf.inputs["Roughness"].default_value = roughness
        bsdf.inputs["Metallic"].default_value = metallic
        if alpha is not None and "Alpha" in bsdf.inputs:
            bsdf.inputs["Alpha"].default_value = alpha
    if alpha is not None and alpha < 1:
        mat.blend_method = "BLEND"
        mat.show_transparent_back = True
    return mat


def add_uv_sphere(
    name: str,
    loc: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    rotation: tuple[float, float, float] = (0, 0, 0),
    segments: int = 64,
    rings: int = 32,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments, ring_count=rings, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


def add_rounded_box(
    name: str,
    loc: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    rotation: tuple[float, float, float] = (0, 0, 0),
    bevel: float = 0.34,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_cube_add(size=2, location=loc, rotation=rotation)
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    bevel_mod = obj.modifiers.new("soft_jelly_bevel", "BEVEL")
    bevel_mod.width = bevel
    bevel_mod.segments = 24
    bevel_mod.affect = "EDGES"
    normal_mod = obj.modifiers.new("soft_weighted_normals", "WEIGHTED_NORMAL")
    normal_mod.keep_sharp = True
    return obj


def add_curve(
    name: str,
    points: list[tuple[float, float, float]],
    mat: bpy.types.Material,
    bevel_depth: float = 0.025,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = 18
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = 4
    spline = curve.splines.new("POLY")
    spline.points.add(len(points) - 1)
    for point, coords in zip(spline.points, points):
        point.co = (coords[0], coords[1], coords[2], 1)
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def add_light_rig() -> None:
    bpy.ops.object.light_add(type="AREA", location=(0, -5.5, 5.6))
    key = bpy.context.object
    key.name = "softbox_key"
    key.data.energy = 620
    key.data.size = 5.0
    look_at(key, Vector((0, 0, 0.4)))

    bpy.ops.object.light_add(type="POINT", location=(-3.3, -3.8, 2.4))
    rim = bpy.context.object
    rim.name = "cool_rim"
    rim.data.energy = 115
    rim.data.color = (0.3, 0.92, 1.0)

    bpy.ops.object.light_add(type="POINT", location=(3.2, -3.2, 2.0))
    warm = bpy.context.object
    warm.name = "warm_edge"
    warm.data.energy = 60
    warm.data.color = (1.0, 0.86, 0.28)


def add_camera() -> None:
    bpy.ops.object.camera_add(location=(0, -8.4, 1.7))
    camera = bpy.context.object
    camera.name = "character_camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = ORTHO_SCALE
    look_at(camera, Vector((0, 0, 0.62)))
    bpy.context.scene.camera = camera


def setup_render(output_path: Path) -> None:
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 48
    scene.render.resolution_x = FRAME_SIZE
    scene.render.resolution_y = FRAME_SIZE
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Filmic"
    scene.view_settings.look = "Medium High Contrast"
    scene.view_settings.exposure = 0
    scene.view_settings.gamma = 1
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.filepath = str(output_path)


def pose(index: int) -> dict[str, float | bool]:
    progress = index / FRAME_COUNT
    wave = math.sin(progress * math.tau)
    lift = math.sin((progress + 0.08) * math.tau)
    return {
        "bounce": 0.09 * max(0, lift),
        "squash_x": 1 + 0.032 * max(0, -wave),
        "squash_z": 1 + 0.04 * max(0, wave),
        "tilt": math.radians(3.4 * math.sin((progress + 0.18) * math.tau)),
        "blink": index in {4, 5},
    }


def add_bifly_frame(index: int, mats: dict[str, bpy.types.Material]) -> None:
    p = pose(index)
    z = 0.58 + float(p["bounce"])
    add_rounded_box(
        f"bifly_body_{index}",
        (0, 0, z),
        (0.82 * float(p["squash_x"]), 0.48, 0.58 * float(p["squash_z"])),
        mats["body"],
        (0, float(p["tilt"]), 0),
        0.34,
    )
    add_uv_sphere(f"bifly_highlight_{index}", (-0.26, -0.46, z + 0.28), (0.22, 0.028, 0.12), mats["shine"], (0, 0, math.radians(-18)), 32, 16)
    add_uv_sphere(f"bifly_bubble_l_{index}", (-0.52, -0.5, z - 0.11), (0.052, 0.014, 0.07), mats["bubble"], segments=24, rings=12)
    add_uv_sphere(f"bifly_bubble_r_{index}", (0.52, -0.5, z - 0.09), (0.045, 0.012, 0.062), mats["bubble"], segments=24, rings=12)
    eye_h = 0.02 if p["blink"] else 0.155
    add_uv_sphere(f"bifly_eye_l_{index}", (-0.3, -0.53, z + 0.14), (0.105, 0.02, eye_h), mats["ink"], segments=32, rings=16)
    add_uv_sphere(f"bifly_eye_r_{index}", (0.3, -0.53, z + 0.14), (0.105, 0.02, eye_h), mats["ink"], segments=32, rings=16)
    brow_z = z + 0.39
    add_curve(f"bifly_brow_l_{index}", [(-0.48, -0.56, brow_z), (-0.34, -0.58, brow_z + 0.05), (-0.18, -0.56, brow_z + 0.03)], mats["ink"], 0.029)
    add_curve(f"bifly_brow_r_{index}", [(0.18, -0.56, brow_z + 0.03), (0.34, -0.58, brow_z + 0.05), (0.48, -0.56, brow_z)], mats["ink"], 0.029)
    add_curve(f"bifly_smile_{index}", [(-0.28, -0.58, z - 0.16), (-0.1, -0.6, z - 0.24), (0.1, -0.6, z - 0.24), (0.28, -0.58, z - 0.16)], mats["ink"], 0.022)


def add_nabatick_frame(index: int, mats: dict[str, bpy.types.Material]) -> None:
    p = pose(index)
    z = 0.56 + float(p["bounce"])
    add_uv_sphere(
        f"nabatick_body_{index}",
        (0, 0, z),
        (0.86 * float(p["squash_x"]), 0.58, 0.82 * float(p["squash_z"])),
        mats["body"],
        (0, float(p["tilt"]), 0),
    )
    add_uv_sphere(f"nabatick_muzzle_{index}", (0, -0.53, z - 0.2), (0.48, 0.044, 0.2), mats["muzzle"], segments=48, rings=16)
    eye_h = 0.024 if p["blink"] else 0.165
    add_uv_sphere(f"nabatick_eye_l_{index}", (-0.26, -0.58, z + 0.13), (0.125, 0.023, eye_h), mats["eye"], segments=32, rings=16)
    add_uv_sphere(f"nabatick_eye_r_{index}", (0.26, -0.58, z + 0.13), (0.125, 0.023, eye_h), mats["eye"], segments=32, rings=16)
    add_uv_sphere(f"nabatick_pupil_l_{index}", (-0.26, -0.605, z + 0.11), (0.05, 0.011, eye_h * 0.52), mats["ink"], segments=24, rings=12)
    add_uv_sphere(f"nabatick_pupil_r_{index}", (0.26, -0.605, z + 0.11), (0.05, 0.011, eye_h * 0.52), mats["ink"], segments=24, rings=12)
    add_curve(f"nabatick_brow_l_{index}", [(-0.44, -0.6, z + 0.44), (-0.28, -0.62, z + 0.51), (-0.12, -0.6, z + 0.48)], mats["ink"], 0.03)
    add_curve(f"nabatick_brow_r_{index}", [(0.12, -0.6, z + 0.48), (0.28, -0.62, z + 0.51), (0.44, -0.6, z + 0.44)], mats["ink"], 0.03)
    add_curve(f"nabatick_smile_{index}", [(-0.2, -0.61, z - 0.18), (0, -0.63, z - 0.24), (0.2, -0.61, z - 0.18)], mats["ink"], 0.02)
    add_uv_sphere(f"nabatick_leaf_a_{index}", (0.16, -0.06, z + 0.82), (0.18, 0.05, 0.34), mats["leaf"], (math.radians(18), math.radians(-35), math.radians(-28)), 32, 16)
    add_uv_sphere(f"nabatick_leaf_b_{index}", (-0.11, -0.06, z + 0.76), (0.15, 0.044, 0.28), mats["leaf_dark"], (math.radians(18), math.radians(35), math.radians(28)), 32, 16)
    for spot, dx, dz, size in [("a", -0.58, 0.03, 0.06), ("b", 0.58, 0.01, 0.06), ("c", 0.62, -0.14, 0.052)]:
        add_uv_sphere(f"nabatick_spot_{spot}_{index}", (dx, -0.56, z + dz), (size, 0.011, size * 1.1), mats["spot"], segments=20, rings=10)


def character_materials(character: str) -> dict[str, bpy.types.Material]:
    if character == "bifly":
        return {
            "body": make_material("bifly_gel_body", (0.05, 0.82, 1.0, 1), 0.18),
            "shine": make_material("bifly_soft_highlight", (0.95, 1.0, 1.0, 0.48), 0.1, alpha=0.48),
            "bubble": make_material("bifly_bubble", (0.74, 1.0, 1.0, 0.35), 0.12, alpha=0.35),
            "ink": make_material("bifly_ink", (0.012, 0.028, 0.18, 1), 0.42),
        }
    return {
        "body": make_material("nabatick_body", (0.7, 1.0, 0.08, 1), 0.26),
        "muzzle": make_material("nabatick_muzzle", (1.0, 0.86, 0.44, 1), 0.34),
        "eye": make_material("nabatick_eye", (0.98, 0.94, 0.76, 1), 0.22),
        "ink": make_material("nabatick_ink", (0.02, 0.028, 0.1, 1), 0.42),
        "leaf": make_material("nabatick_leaf", (0.36, 0.95, 0.12, 1), 0.28),
        "leaf_dark": make_material("nabatick_leaf_dark", (0.15, 0.58, 0.09, 1), 0.36),
        "spot": make_material("nabatick_spot", (0.4, 0.7, 0.02, 0.82), 0.38, alpha=0.82),
    }


def add_character_frame(character: str, index: int, mats: dict[str, bpy.types.Material]) -> None:
    if character == "bifly":
        add_bifly_frame(index, mats)
    else:
        add_nabatick_frame(index, mats)


def render_frame(character: str, index: int, output_path: Path) -> None:
    clear_scene()
    add_light_rig()
    add_camera()
    mats = character_materials(character)
    add_character_frame(character, index, mats)
    setup_render(output_path)
    bpy.ops.render.render(write_still=True)


def save_rig_scene(character: str, blend_path: Path) -> None:
    clear_scene()
    add_light_rig()
    add_camera()
    mats = character_materials(character)
    add_character_frame(character, 0, mats)
    bpy.ops.wm.save_as_mainfile(filepath=str(blend_path))


def main() -> None:
    root = Path.cwd()
    out_dir = root / "assets" / "generated" / "blender"
    scene_dir = root / "assets" / "blender"
    out_dir.mkdir(parents=True, exist_ok=True)
    scene_dir.mkdir(parents=True, exist_ok=True)
    for character in ("bifly", "nabatick"):
        for index in range(FRAME_COUNT):
            render_frame(character, index, out_dir / f"{character}-idle-{index:02d}.png")
        save_rig_scene(character, scene_dir / f"{character}-idle-rig.blend")


if __name__ == "__main__":
    main()
