from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path.cwd()
OUT_DIR = ROOT / "assets" / "generated" / "blender-preview"
SCENE_DIR = ROOT / "assets" / "blender"
FRAME_SIZE = 1024


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete()


def look_at(obj: bpy.types.Object, target: Vector) -> None:
    direction = target - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def material(
    name: str,
    color: tuple[float, float, float, float],
    roughness: float = 0.28,
    metallic: float = 0.0,
    alpha: float | None = None,
    emission: tuple[float, float, float, float] | None = None,
    emission_strength: float = 0.0,
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
        if emission and "Emission Color" in bsdf.inputs:
            bsdf.inputs["Emission Color"].default_value = emission
            bsdf.inputs["Emission Strength"].default_value = emission_strength
    if alpha is not None and alpha < 1:
        mat.blend_method = "BLEND"
        mat.use_screen_refraction = True
        mat.show_transparent_back = True
    return mat


def add_uv_sphere(
    name: str,
    loc: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    rotation: tuple[float, float, float] = (0.0, 0.0, 0.0),
    segments: int = 64,
    rings: int = 32,
) -> bpy.types.Object:
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=segments,
        ring_count=rings,
        location=loc,
        rotation=rotation,
    )
    obj = bpy.context.object
    obj.name = name
    obj.scale = scale
    obj.data.materials.append(mat)
    bpy.ops.object.shade_smooth()
    return obj


def add_curve(
    name: str,
    points: list[tuple[float, float, float]],
    mat: bpy.types.Material,
    bevel_depth: float,
    resolution: int = 20,
) -> bpy.types.Object:
    curve = bpy.data.curves.new(name, "CURVE")
    curve.dimensions = "3D"
    curve.resolution_u = resolution
    curve.bevel_depth = bevel_depth
    curve.bevel_resolution = 5
    spline = curve.splines.new("BEZIER")
    spline.bezier_points.add(len(points) - 1)
    for point, coords in zip(spline.bezier_points, points):
        point.co = coords
        point.handle_left_type = "AUTO"
        point.handle_right_type = "AUTO"
    obj = bpy.data.objects.new(name, curve)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    return obj


def superellipsoid_mesh(
    name: str,
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    exponent_lat: float = 0.46,
    exponent_lon: float = 0.46,
    rings: int = 36,
    segments: int = 72,
    deform=None,
) -> bpy.types.Object:
    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    sx, sy, sz = scale

    def signed_power(value: float, power: float) -> float:
        return math.copysign(abs(value) ** power, value)

    for ring in range(rings + 1):
      v = -math.pi / 2 + math.pi * ring / rings
      cv = math.cos(v)
      sv = math.sin(v)
      for segment in range(segments):
        u = -math.pi + math.tau * segment / segments
        cu = math.cos(u)
        su = math.sin(u)
        x = sx * signed_power(cv, exponent_lat) * signed_power(cu, exponent_lon)
        y = sy * signed_power(cv, exponent_lat) * signed_power(su, exponent_lon)
        z = sz * signed_power(sv, exponent_lat)
        if deform:
            x, y, z = deform(x, y, z, sx, sy, sz)
        vertices.append((x, y, z))

    for ring in range(rings):
        for segment in range(segments):
            a = ring * segments + segment
            b = ring * segments + (segment + 1) % segments
            c = (ring + 1) * segments + (segment + 1) % segments
            d = (ring + 1) * segments + segment
            faces.append((a, b, c, d))

    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth()
    obj.select_set(False)
    subdivision = obj.modifiers.new("soft_organic_subdivision", "SUBSURF")
    subdivision.levels = 1
    subdivision.render_levels = 1
    normal = obj.modifiers.new("soft_weighted_normals", "WEIGHTED_NORMAL")
    normal.keep_sharp = True
    return obj


def pear_body_mesh(
    name: str,
    mat: bpy.types.Material,
    rings: int = 34,
    segments: int = 80,
) -> bpy.types.Object:
    profile = [
        (-0.58, 0.74, 0.48),
        (-0.50, 0.84, 0.55),
        (-0.34, 0.91, 0.59),
        (-0.10, 0.88, 0.57),
        (0.16, 0.78, 0.52),
        (0.42, 0.62, 0.43),
        (0.66, 0.40, 0.30),
        (0.78, 0.14, 0.12),
    ]

    def sample_profile(t: float) -> tuple[float, float, float]:
        scaled = t * (len(profile) - 1)
        index = min(int(scaled), len(profile) - 2)
        local = scaled - index
        a = profile[index]
        b = profile[index + 1]
        smooth = local * local * (3 - 2 * local)
        return tuple(a[i] + (b[i] - a[i]) * smooth for i in range(3))

    vertices: list[tuple[float, float, float]] = []
    faces: list[tuple[int, int, int, int]] = []
    for ring in range(rings + 1):
        t = ring / rings
        z, rx, ry = sample_profile(t)
        for segment in range(segments):
            u = math.tau * segment / segments
            front_bias = max(0.0, -math.sin(u))
            side_bias = abs(math.cos(u))
            x = rx * math.cos(u) * (1.0 - 0.035 * max(0.0, z))
            y = ry * math.sin(u)
            # The front is slightly fuller around the cheeks, like the sheet.
            if front_bias:
                y *= 1.0 + 0.1 * (1.0 - abs(z))
                x *= 1.0 + 0.035 * front_bias * side_bias
            if z < -0.53:
                z = -0.53 + (z + 0.53) * 0.22
            vertices.append((x, y, z + 0.7))

    for ring in range(rings):
        for segment in range(segments):
            a = ring * segments + segment
            b = ring * segments + (segment + 1) % segments
            c = (ring + 1) * segments + (segment + 1) % segments
            d = (ring + 1) * segments + segment
            faces.append((a, b, c, d))

    mesh = bpy.data.meshes.new(f"{name}_mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(mat)
    bpy.context.view_layer.objects.active = obj
    obj.select_set(True)
    bpy.ops.object.shade_smooth()
    obj.select_set(False)
    subdivision = obj.modifiers.new("soft_pear_subdivision", "SUBSURF")
    subdivision.levels = 1
    subdivision.render_levels = 1
    normal = obj.modifiers.new("soft_weighted_normals", "WEIGHTED_NORMAL")
    normal.keep_sharp = True
    return obj


def add_leaf(
    name: str,
    loc: tuple[float, float, float],
    scale: tuple[float, float, float],
    mat: bpy.types.Material,
    rotation: tuple[float, float, float],
    vein_mat: bpy.types.Material,
) -> bpy.types.Object:
    leaf = add_uv_sphere(name, loc, scale, mat, rotation, 48, 24)
    add_curve(
        f"{name}_vein",
        [
            (loc[0] - scale[0] * 0.55, loc[1] - 0.018, loc[2] - scale[2] * 0.3),
            (loc[0], loc[1] - 0.025, loc[2]),
            (loc[0] + scale[0] * 0.62, loc[1] - 0.02, loc[2] + scale[2] * 0.34),
        ],
        vein_mat,
        0.011,
    )
    return leaf


def add_soft_lights() -> None:
    bpy.ops.object.light_add(type="AREA", location=(-2.8, -5.8, 5.5))
    key = bpy.context.object
    key.name = "large_softbox_left"
    key.data.energy = 680
    key.data.size = 5.3
    look_at(key, Vector((0.0, 0.0, 0.55)))

    bpy.ops.object.light_add(type="AREA", location=(3.6, -4.8, 3.0))
    rim = bpy.context.object
    rim.name = "warm_character_rim"
    rim.data.energy = 170
    rim.data.size = 3.2
    rim.data.color = (1.0, 0.86, 0.34)
    look_at(rim, Vector((0.0, 0.0, 0.45)))

    bpy.ops.object.light_add(type="POINT", location=(0.0, -2.2, 2.4))
    front = bpy.context.object
    front.name = "tiny_eye_catchlight"
    front.data.energy = 70
    front.data.color = (0.72, 0.97, 1.0)


def set_camera(target: tuple[float, float, float], loc: tuple[float, float, float], scale: float) -> None:
    bpy.ops.object.camera_add(location=loc)
    camera = bpy.context.object
    camera.name = "preview_camera"
    camera.data.type = "ORTHO"
    camera.data.ortho_scale = scale
    look_at(camera, Vector(target))
    bpy.context.scene.camera = camera


def setup_render(path: Path, transparent: bool = True) -> None:
    scene = bpy.context.scene
    try:
        scene.render.engine = "BLENDER_EEVEE_NEXT"
    except TypeError:
        scene.render.engine = "BLENDER_EEVEE"
    scene.eevee.taa_render_samples = 64
    scene.render.resolution_x = FRAME_SIZE
    scene.render.resolution_y = FRAME_SIZE
    scene.render.film_transparent = transparent
    scene.world.color = (0.96, 0.94, 0.9) if not transparent else (0.0, 0.0, 0.0)
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.view_settings.view_transform = "Filmic"
    scene.view_settings.look = "Medium High Contrast"
    scene.render.filepath = str(path)


def bifly_materials() -> dict[str, bpy.types.Material]:
    return {
        "body": material("bifly_clear_cyan_jelly", (0.03, 0.86, 0.94, 1.0), 0.09),
        "inner": material("bifly_inner_cyan", (0.15, 1.0, 0.98, 0.16), 0.18, alpha=0.16),
        "rim_pink": material("bifly_magenta_edge", (0.95, 0.18, 0.78, 0.62), 0.18, alpha=0.62, emission=(1.0, 0.12, 0.7, 1), emission_strength=0.04),
        "rim_warm": material("bifly_warm_edge", (1.0, 0.82, 0.22, 0.56), 0.2, alpha=0.56),
        "shine": material("bifly_wet_highlight", (0.94, 1.0, 1.0, 0.56), 0.04, alpha=0.56),
        "bubble": material("bifly_internal_bubbles", (0.74, 1.0, 1.0, 0.3), 0.1, alpha=0.3),
        "ink": material("bifly_deep_ink", (0.008, 0.02, 0.15, 1.0), 0.4),
    }


def create_bifly() -> bpy.types.Object:
    mats = bifly_materials()

    def body_deform(x: float, y: float, z: float, sx: float, sy: float, sz: float):
        top_bias = max(0.0, z / sz)
        bottom_bias = max(0.0, -z / sz)
        left_bias = max(0.0, -x / sx)
        right_bias = max(0.0, x / sx)
        x *= 1.0 + 0.08 * top_bias * left_bias - 0.04 * top_bias * right_bias
        z += 0.10 * top_bias * left_bias - 0.08 * top_bias * right_bias
        z -= 0.06 * bottom_bias
        if z < -0.56:
            z = -0.56 + (z + 0.56) * 0.35
        return x, y, z

    body = superellipsoid_mesh("bifly_body_reference_shape", (0.98, 0.46, 0.68), mats["body"], 0.34, 0.34, deform=body_deform)
    body.location.z = 0.58
    body.rotation_euler[0] = math.radians(0.5)

    # Face
    add_uv_sphere("bifly_left_eye", (-0.35, -0.47, 0.74), (0.135, 0.018, 0.19), mats["ink"], (0, 0, math.radians(-6)), 40, 20)
    add_uv_sphere("bifly_right_eye", (0.36, -0.47, 0.74), (0.135, 0.018, 0.19), mats["ink"], (0, 0, math.radians(5)), 40, 20)
    add_curve("bifly_left_brow", [(-0.57, -0.5, 1.02), (-0.42, -0.52, 1.1), (-0.22, -0.52, 1.08)], mats["ink"], 0.038)
    add_curve("bifly_right_brow", [(0.22, -0.52, 1.08), (0.43, -0.52, 1.1), (0.57, -0.5, 1.02)], mats["ink"], 0.038)
    add_curve("bifly_smile", [(-0.3, -0.51, 0.45), (-0.08, -0.54, 0.36), (0.08, -0.54, 0.36), (0.32, -0.51, 0.45)], mats["ink"], 0.019)

    # Gloss and bubbles from the sheet.
    add_uv_sphere("bifly_top_gloss", (-0.35, -0.43, 1.16), (0.36, 0.016, 0.1), mats["shine"], (0, 0, math.radians(-10)), 48, 16)
    add_uv_sphere("bifly_left_gloss", (-0.76, -0.43, 0.76), (0.052, 0.012, 0.13), mats["shine"], (0, 0, math.radians(-10)), 24, 12)
    for index, (x, z, s) in enumerate([
        (-0.73, 0.37, 0.038), (-0.68, 0.47, 0.025), (0.72, 0.4, 0.035),
        (0.77, 0.51, 0.028), (0.68, 0.62, 0.021), (0.6, 0.28, 0.022),
    ]):
        add_uv_sphere(f"bifly_bubble_{index}", (x, -0.49, z), (s, 0.009, s * 1.25), mats["bubble"], segments=20, rings=10)

    return body


def nabatick_materials() -> dict[str, bpy.types.Material]:
    return {
        "body": material("nabatick_lime_body", (0.74, 0.98, 0.08, 1.0), 0.24),
        "body_dark": material("nabatick_body_soft_shadow", (0.44, 0.68, 0.03, 1.0), 0.38),
        "muzzle": material("nabatick_warm_muzzle", (0.98, 0.84, 0.45, 1.0), 0.34),
        "muzzle_shadow": material("nabatick_muzzle_lower_shadow", (0.74, 0.55, 0.22, 1.0), 0.42),
        "eye": material("nabatick_eye_warm_white", (0.99, 0.96, 0.78, 1.0), 0.22),
        "pupil": material("nabatick_pupil", (0.018, 0.024, 0.08, 1.0), 0.36),
        "catch": material("nabatick_eye_catchlight", (1.0, 1.0, 0.94, 1.0), 0.08),
        "leaf": material("nabatick_leaf_fresh", (0.33, 0.88, 0.09, 1.0), 0.28),
        "leaf_dark": material("nabatick_leaf_dark", (0.13, 0.5, 0.07, 1.0), 0.36),
        "leaf_vein": material("nabatick_leaf_vein", (0.84, 1.0, 0.22, 1.0), 0.32),
        "spot": material("nabatick_cheek_spots", (0.37, 0.64, 0.03, 0.76), 0.38, alpha=0.76),
        "ink": material("nabatick_brow_ink", (0.025, 0.026, 0.07, 1.0), 0.42),
    }


def create_nabatick() -> bpy.types.Object:
    mats = nabatick_materials()

    body = pear_body_mesh("nabatick_body_reference_shape", mats["body"])

    add_uv_sphere("nabatick_muzzle_main", (0.0, -0.61, 0.47), (0.56, 0.065, 0.19), mats["muzzle"], (0, 0, 0), 72, 20)
    add_uv_sphere("nabatick_muzzle_lower", (0.0, -0.616, 0.38), (0.48, 0.033, 0.082), mats["muzzle_shadow"], (0, 0, 0), 48, 14)
    add_curve("nabatick_smile_line", [(-0.50, -0.675, 0.52), (-0.25, -0.695, 0.43), (0.0, -0.7, 0.42), (0.25, -0.695, 0.43), (0.50, -0.675, 0.52)], mats["ink"], 0.015)

    add_uv_sphere("nabatick_left_eye_white", (-0.30, -0.63, 0.82), (0.165, 0.026, 0.245), mats["eye"], (0, 0, math.radians(-5)), 48, 22)
    add_uv_sphere("nabatick_right_eye_white", (0.30, -0.63, 0.82), (0.165, 0.026, 0.245), mats["eye"], (0, 0, math.radians(5)), 48, 22)
    add_uv_sphere("nabatick_left_pupil", (-0.30, -0.66, 0.79), (0.067, 0.012, 0.143), mats["pupil"], (0, 0, math.radians(-4)), 36, 18)
    add_uv_sphere("nabatick_right_pupil", (0.30, -0.66, 0.79), (0.067, 0.012, 0.143), mats["pupil"], (0, 0, math.radians(4)), 36, 18)
    add_uv_sphere("nabatick_left_catch", (-0.255, -0.674, 0.91), (0.025, 0.006, 0.043), mats["catch"], segments=20, rings=10)
    add_uv_sphere("nabatick_right_catch", (0.345, -0.674, 0.91), (0.025, 0.006, 0.043), mats["catch"], segments=20, rings=10)

    add_curve("nabatick_left_brow", [(-0.51, -0.655, 1.15), (-0.34, -0.675, 1.23), (-0.14, -0.665, 1.18)], mats["ink"], 0.036)
    add_curve("nabatick_right_brow", [(0.14, -0.665, 1.18), (0.34, -0.675, 1.23), (0.51, -0.655, 1.15)], mats["ink"], 0.036)

    # Two leaves and the small stem match the uploaded sheet's silhouette.
    add_uv_sphere("nabatick_leaf_stem", (0.0, -0.02, 1.47), (0.062, 0.05, 0.2), mats["leaf_dark"], (math.radians(10), 0, math.radians(-7)), 28, 14)
    add_leaf("nabatick_big_leaf", (0.31, -0.035, 1.68), (0.34, 0.052, 0.17), mats["leaf"], (math.radians(13), math.radians(-18), math.radians(-20)), mats["leaf_vein"])
    add_leaf("nabatick_small_leaf", (-0.18, -0.045, 1.55), (0.17, 0.04, 0.096), mats["leaf_dark"], (math.radians(16), math.radians(25), math.radians(31)), mats["leaf_vein"])

    for index, (x, z, size) in enumerate([
        (-0.62, 0.64, 0.052), (-0.68, 0.51, 0.039), (-0.59, 0.39, 0.027),
        (0.62, 0.64, 0.05), (0.68, 0.52, 0.038), (0.60, 0.41, 0.027),
    ]):
        add_uv_sphere(f"nabatick_spot_{index}", (x, -0.655, z), (size, 0.011, size * 1.15), mats["spot"], segments=18, rings=9)

    return body


def add_floor_glow(character: str) -> None:
    if character == "bifly":
        glow = material("bifly_floor_glow", (0.1, 0.92, 1.0, 0.26), 0.2, alpha=0.26, emission=(0.05, 0.8, 1.0, 1), emission_strength=0.12)
    else:
        glow = material("nabatick_floor_glow", (0.55, 1.0, 0.08, 0.28), 0.2, alpha=0.28, emission=(0.45, 0.95, 0.05, 1), emission_strength=0.12)
    add_uv_sphere(f"{character}_floor_orbit", (0, -0.03, 0.05), (0.92, 0.04, 0.055), glow, segments=72, rings=8)


def render_character(character: str, view: str, output_name: str) -> None:
    clear_scene()
    add_soft_lights()
    if character == "bifly":
        root = create_bifly()
        target = (0.0, 0.0, 0.67)
        camera_scale = 2.75
    else:
        root = create_nabatick()
        target = (0.0, 0.0, 0.86)
        camera_scale = 2.82
    add_floor_glow(character)

    if view == "three-quarter":
        for obj in bpy.context.scene.objects:
            if obj.type != "CAMERA" and not obj.name.startswith("large_") and not obj.name.startswith("warm_") and not obj.name.startswith("tiny_"):
                obj.rotation_euler.z += math.radians(-10)
                obj.rotation_euler.y += math.radians(10)
        cam_loc = (1.45, -6.6, 1.45)
    else:
        cam_loc = (0.0, -6.8, 1.34)
    set_camera(target, cam_loc, camera_scale)
    setup_render(OUT_DIR / output_name, transparent=False)
    bpy.ops.render.render(write_still=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(SCENE_DIR / f"{character}-reference-preview-{view}.blend"))


def render_contact_sheet() -> None:
    clear_scene()
    add_soft_lights()
    bpy.context.scene.render.resolution_x = 1600
    bpy.context.scene.render.resolution_y = 1000
    create_bifly()
    create_nabatick()
    for obj in bpy.context.scene.objects:
        if obj.name.startswith("bifly_"):
            obj.location.x -= 0.92
        elif obj.name.startswith("nabatick_"):
            obj.location.x += 1.05
    add_floor_glow("bifly")
    bpy.context.object.location.x = -0.92
    add_floor_glow("nabatick")
    bpy.context.object.location.x = 1.05
    set_camera((0.0, 0.0, 0.74), (0.0, -7.4, 1.6), 4.2)
    setup_render(OUT_DIR / "kaflul-blender-character-preview.png", transparent=False)
    bpy.context.scene.render.resolution_x = 1600
    bpy.context.scene.render.resolution_y = 1000
    bpy.ops.render.render(write_still=True)


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    SCENE_DIR.mkdir(parents=True, exist_ok=True)
    render_character("bifly", "front", "bifly-reference-front.png")
    render_character("bifly", "three-quarter", "bifly-reference-three-quarter.png")
    render_character("nabatick", "front", "nabatick-reference-front.png")
    render_character("nabatick", "three-quarter", "nabatick-reference-three-quarter.png")
    render_contact_sheet()


if __name__ == "__main__":
    main()
