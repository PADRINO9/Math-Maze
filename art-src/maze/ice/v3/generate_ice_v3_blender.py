"""Generate the original Math Maze ice-v3 wall and collectible source renders.

Run with Blender 4.5 LTS:
  Blender --background --factory-startup --python generate_ice_v3_blender.py

The script is deterministic and uses only Blender primitives and procedural
shader nodes. It does not load the user's visual reference or any third-party
texture.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[4]
SOURCE_ROOT = ROOT / "art-src" / "maze" / "ice" / "v3"
RENDER_ROOT = SOURCE_ROOT / "renders"
WALL_ROOT = RENDER_ROOT / "walls"
PATH_SHARD_ROOT = RENDER_ROOT / "path-shard"
POWER_CRYSTAL_ROOT = RENDER_ROOT / "power-crystal"
BONUS_CRYSTAL_ROOT = RENDER_ROOT / "bonus-crystal"

TILE_RESOLUTION = 256
COLLECTIBLE_RESOLUTION = 128

NORTH = 1
EAST = 2
SOUTH = 4
WEST = 8


def srgb(hex_color: str) -> tuple[float, float, float, float]:
    value = hex_color.removeprefix("#")
    return tuple(int(value[index : index + 2], 16) / 255 for index in (0, 2, 4)) + (1.0,)


def clear_scene() -> None:
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for datablocks in (bpy.data.meshes, bpy.data.curves, bpy.data.materials, bpy.data.cameras, bpy.data.lights):
        for datablock in list(datablocks):
            datablocks.remove(datablock)


def configure_scene() -> bpy.types.Scene:
    scene = bpy.context.scene
    scene.render.engine = "BLENDER_EEVEE_NEXT"
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_percentage = 100
    scene.render.resolution_x = TILE_RESOLUTION
    scene.render.resolution_y = TILE_RESOLUTION
    scene.render.pixel_aspect_x = 1
    scene.render.pixel_aspect_y = 1
    scene.render.image_settings.compression = 20
    scene.render.use_file_extension = True
    scene.render.use_overwrite = True

    scene.world.color = (0.004, 0.012, 0.026)
    world_nodes = scene.world.node_tree.nodes
    background = world_nodes.get("Background")
    background.inputs["Color"].default_value = srgb("#071b32")
    background.inputs["Strength"].default_value = 0.14

    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass

    camera_data = bpy.data.cameras.new("AtlasCamera")
    camera = bpy.data.objects.new("AtlasCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (0.0, 0.0, 10.0)
    camera.rotation_euler = (0.0, 0.0, 0.0)
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 3.0
    camera_data.lens = 52
    scene.camera = camera

    key_data = bpy.data.lights.new("ColdKey", "AREA")
    key_data.energy = 360
    key_data.shape = "DISK"
    key_data.size = 4.8
    key_data.color = srgb("#d9f9ff")[:3]
    key = bpy.data.objects.new("ColdKey", key_data)
    key.location = (-3.8, -4.6, 8.5)
    bpy.context.collection.objects.link(key)
    point_at(key, (0.0, 0.0, 0.2))

    fill_data = bpy.data.lights.new("BlueFill", "AREA")
    fill_data.energy = 210
    fill_data.shape = "DISK"
    fill_data.size = 3.6
    fill_data.color = srgb("#2ebcff")[:3]
    fill = bpy.data.objects.new("BlueFill", fill_data)
    fill.location = (4.2, 3.4, 5.2)
    bpy.context.collection.objects.link(fill)
    point_at(fill, (0.0, 0.0, 0.0))

    rim_data = bpy.data.lights.new("FrostRim", "AREA")
    rim_data.energy = 320
    rim_data.shape = "RECTANGLE"
    rim_data.size = 2.5
    rim_data.size_y = 5.0
    rim_data.color = srgb("#8be9ff")[:3]
    rim = bpy.data.objects.new("FrostRim", rim_data)
    rim.location = (3.7, -1.6, 4.8)
    bpy.context.collection.objects.link(rim)
    point_at(rim, (0.0, 0.0, 0.25))

    return scene


def point_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


def clear_renderables() -> None:
    preserved = {"AtlasCamera", "ColdKey", "BlueFill", "FrostRim"}
    for obj in list(bpy.context.scene.objects):
        if obj.name not in preserved:
            bpy.data.objects.remove(obj, do_unlink=True)


def make_flat_material(name: str, color: str, roughness: float = 0.45, emission: float = 0.0) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = srgb(color)
    principled.inputs["Roughness"].default_value = roughness
    if "Coat Weight" in principled.inputs:
        principled.inputs["Coat Weight"].default_value = 0.24
    if emission > 0:
        principled.inputs["Emission Color"].default_value = srgb(color)
        principled.inputs["Emission Strength"].default_value = emission
    return material


def make_ice_material(name: str, seed: int, charged: bool = False) -> bpy.types.Material:
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    principled = nodes.new("ShaderNodeBsdfPrincipled")
    texcoord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    noise = nodes.new("ShaderNodeTexNoise")
    voronoi = nodes.new("ShaderNodeTexVoronoi")
    ramp = nodes.new("ShaderNodeValToRGB")
    fracture_ramp = nodes.new("ShaderNodeValToRGB")
    mix = nodes.new("ShaderNodeMixRGB")
    bump = nodes.new("ShaderNodeBump")

    mapping.inputs["Location"].default_value = (
        ((seed * 37) % 17) / 9.0,
        ((seed * 53) % 19) / 11.0,
        ((seed * 29) % 13) / 7.0,
    )
    noise.noise_dimensions = "3D"
    noise.inputs["Scale"].default_value = 3.2 if not charged else 4.6
    noise.inputs["Detail"].default_value = 5.0
    noise.inputs["Roughness"].default_value = 0.62
    noise.inputs["Distortion"].default_value = 0.18
    voronoi.distance = "EUCLIDEAN"
    voronoi.feature = "DISTANCE_TO_EDGE"
    voronoi.voronoi_dimensions = "3D"
    voronoi.inputs["Scale"].default_value = 5.4 if not charged else 7.2

    ramp.color_ramp.elements.remove(ramp.color_ramp.elements[1])
    deep = ramp.color_ramp.elements[0]
    deep.position = 0.13
    deep.color = srgb("#023a63" if not charged else "#0054a8")
    mid = ramp.color_ramp.elements.new(0.46)
    mid.color = srgb("#0a77a3" if not charged else "#00b9ef")
    pale = ramp.color_ramp.elements.new(0.73)
    pale.color = srgb("#3aa4c7" if not charged else "#5ce8ff")
    cap = ramp.color_ramp.elements.new(0.95)
    cap.color = srgb("#87d4e7" if not charged else "#d4fbff")

    fracture_ramp.color_ramp.elements[0].position = 0.010
    fracture_ramp.color_ramp.elements[0].color = srgb("#2d829f")
    fracture_ramp.color_ramp.elements[1].position = 0.046
    fracture_ramp.color_ramp.elements[1].color = (0.0, 0.0, 0.0, 1.0)
    mix.blend_type = "SCREEN"
    mix.inputs["Fac"].default_value = 0.14 if not charged else 0.42

    principled.inputs["Roughness"].default_value = 0.24 if not charged else 0.18
    principled.inputs["IOR"].default_value = 1.31
    if "Transmission Weight" in principled.inputs:
        principled.inputs["Transmission Weight"].default_value = 0.04 if not charged else 0.10
    if "Coat Weight" in principled.inputs:
        principled.inputs["Coat Weight"].default_value = 0.48
        principled.inputs["Coat Roughness"].default_value = 0.12
    principled.inputs["Metallic"].default_value = 0.02
    if charged:
        principled.inputs["Emission Color"].default_value = srgb("#33dfff")
        principled.inputs["Emission Strength"].default_value = 0.72

    bump.inputs["Strength"].default_value = 0.22
    bump.inputs["Distance"].default_value = 0.09

    links.new(texcoord.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    links.new(mapping.outputs["Vector"], voronoi.inputs["Vector"])
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(voronoi.outputs["Distance"], fracture_ramp.inputs["Fac"])
    links.new(ramp.outputs["Color"], mix.inputs[1])
    links.new(fracture_ramp.outputs["Color"], mix.inputs[2])
    links.new(mix.outputs["Color"], principled.inputs["Base Color"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(bump.outputs["Normal"], principled.inputs["Normal"])
    links.new(principled.outputs["BSDF"], output.inputs["Surface"])
    return material


def occupied_cells(mask: int) -> set[tuple[int, int]]:
    cells = {(1, 1)}
    if mask & NORTH:
        cells.add((1, 2))
    if mask & EAST:
        cells.add((2, 1))
    if mask & SOUTH:
        cells.add((1, 0))
    if mask & WEST:
        cells.add((0, 1))
    return cells


def polyomino_outline(mask: int) -> list[tuple[float, float]]:
    coordinates = (-1.5, -0.58, 0.58, 1.5)
    cells = occupied_cells(mask)
    edges: list[tuple[tuple[float, float], tuple[float, float]]] = []
    for x, y in cells:
        x0, x1 = coordinates[x], coordinates[x + 1]
        y0, y1 = coordinates[y], coordinates[y + 1]
        if (x, y - 1) not in cells:
            edges.append(((x0, y0), (x1, y0)))
        if (x + 1, y) not in cells:
            edges.append(((x1, y0), (x1, y1)))
        if (x, y + 1) not in cells:
            edges.append(((x1, y1), (x0, y1)))
        if (x - 1, y) not in cells:
            edges.append(((x0, y1), (x0, y0)))

    next_point = {start: end for start, end in edges}
    start = min(next_point, key=lambda point: (point[1], point[0]))
    outline = [start]
    cursor = start
    while True:
        cursor = next_point[cursor]
        if cursor == start:
            break
        outline.append(cursor)
        if len(outline) > len(edges) + 1:
            raise RuntimeError(f"Failed to close topology mask {mask}")
    return outline


def create_prism(name: str, outline: list[tuple[float, float]], height: float, z_base: float, material: bpy.types.Material,
                 bevel: float, offset: tuple[float, float] = (0.0, 0.0)) -> bpy.types.Object:
    vertex_count = len(outline)
    vertices = [
        (x + offset[0], y + offset[1], z_base)
        for x, y in outline
    ] + [
        (x + offset[0], y + offset[1], z_base + height)
        for x, y in outline
    ]
    faces = [list(reversed(range(vertex_count))), list(range(vertex_count, vertex_count * 2))]
    for index in range(vertex_count):
        next_index = (index + 1) % vertex_count
        faces.append((index, next_index, vertex_count + next_index, vertex_count + index))

    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)

    bevel_modifier = obj.modifiers.new("HandCarvedBevel", "BEVEL")
    bevel_modifier.width = bevel
    bevel_modifier.segments = 4
    bevel_modifier.limit_method = "ANGLE"
    bevel_modifier.angle_limit = math.radians(20)
    bevel_modifier.harden_normals = True
    return obj


def add_frost_inclusions(mask: int) -> None:
    # A handful of restrained, embedded inclusions adds scale without creating
    # freestanding decorative props.
    pale = make_flat_material(f"FrostInclusion{mask:02d}", "#d9fbff", roughness=0.24, emission=0.08)
    for index in range(3):
        angle = math.radians((mask * 47 + index * 113) % 360)
        radius = 0.18 + ((mask + index * 3) % 5) * 0.055
        x = math.cos(angle) * radius
        y = math.sin(angle) * radius
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.035 + index * 0.009, location=(x, y, 0.585))
        inclusion = bpy.context.object
        inclusion.name = f"EmbeddedAir{mask:02d}_{index}"
        inclusion.scale.z = 0.18
        inclusion.data.materials.append(pale)


def render_wall(scene: bpy.types.Scene, mask: int) -> None:
    clear_renderables()
    outline = polyomino_outline(mask)
    top = make_ice_material(f"GlacierTop{mask:02d}", seed=mask + 41)

    # Runtime draws one continuous body, contour and directional side faces.
    # Keeping the atlas crop to the top cap avoids dark baked concave corners
    # becoming repeated pinholes where independently drawn masks meet.
    create_prism(f"GlacierWall{mask:02d}", outline, 0.58, 0.0, top, 0.105)

    scene.render.resolution_x = TILE_RESOLUTION
    scene.render.resolution_y = TILE_RESOLUTION
    # Render only the centre logical cell while neighbouring geometry extends
    # beyond the crop. Connected edges therefore reach the atlas boundary and
    # join without holes; only genuinely exposed edges show bevel/side depth.
    scene.camera.data.ortho_scale = 1.38
    scene.render.filepath = str(WALL_ROOT / f"wall-mask-{mask:02d}.png")
    bpy.ops.render.render(write_still=True)


def bicone_mesh(name: str, sides: int, radius: float, top: float, bottom: float, material: bpy.types.Material) -> bpy.types.Object:
    vertices = [(0.0, 0.0, top), (0.0, 0.0, bottom)]
    vertices.extend((math.cos(index * math.tau / sides) * radius, math.sin(index * math.tau / sides) * radius, 0.0) for index in range(sides))
    faces = []
    for index in range(sides):
        current = 2 + index
        nxt = 2 + ((index + 1) % sides)
        faces.append((0, current, nxt))
        faces.append((1, nxt, current))
    mesh = bpy.data.meshes.new(f"{name}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    obj = bpy.data.objects.new(name, mesh)
    bpy.context.collection.objects.link(obj)
    obj.data.materials.append(material)
    bevel_modifier = obj.modifiers.new("PrismEdge", "BEVEL")
    bevel_modifier.width = 0.025
    bevel_modifier.segments = 2
    return obj


def add_collectible_shadow(name: str, scale: tuple[float, float]) -> None:
    material = make_flat_material(f"{name}ShadowMaterial", "#020f1d", roughness=0.78)
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=0.58, depth=0.018, location=(0.08, -0.12, -0.72))
    shadow = bpy.context.object
    shadow.name = f"{name}Shadow"
    shadow.scale.x, shadow.scale.y = scale
    shadow.data.materials.append(material)


def render_collectible(scene: bpy.types.Scene, frame: int, powered: bool) -> None:
    clear_renderables()
    material = make_ice_material(
        f"{'Power' if powered else 'Path'}CrystalMaterial{frame:02d}",
        seed=300 + frame + (80 if powered else 0),
        charged=True,
    )
    spin = frame * math.tau / 8
    sway = math.sin(spin) * math.radians(24)

    if powered:
        add_collectible_shadow("PowerCrystal", (1.32, 0.45))
        center = bicone_mesh("PowerCore", 6, 0.48, 1.08, -0.75, material)
        center.rotation_euler = (math.radians(11), sway, spin * 0.32)
        for direction in (-1, 1):
            shard = bicone_mesh(f"PowerWing{direction}", 5, 0.29, 0.75, -0.48, material)
            shard.location = (direction * 0.48, -0.06, -0.08)
            shard.rotation_euler = (math.radians(18), direction * math.radians(28) + sway * 0.45, spin * 0.21)
    else:
        add_collectible_shadow("PathShard", (0.92, 0.34))
        crystal = bicone_mesh("PathShard", 6, 0.48, 0.93, -0.72, material)
        crystal.rotation_euler = (math.radians(13), sway, spin * 0.38)

    scene.render.resolution_x = COLLECTIBLE_RESOLUTION
    scene.render.resolution_y = COLLECTIBLE_RESOLUTION
    scene.camera.data.ortho_scale = 2.02 if powered else 1.72
    output_root = POWER_CRYSTAL_ROOT if powered else PATH_SHARD_ROOT
    scene.render.filepath = str(output_root / f"frame-{frame:02d}.png")
    bpy.ops.render.render(write_still=True)


def render_bonus_collectible(scene: bpy.types.Scene) -> None:
    clear_renderables()
    material = make_ice_material("BonusCrystalMaterial", seed=463, charged=True)
    add_collectible_shadow("BonusCrystal", (1.05, 0.28))
    bonus = bicone_mesh("BonusCrystal", 8, 0.58, 0.62, -0.62, material)
    bonus.rotation_euler = (math.radians(16), math.radians(-19), math.radians(22))
    inner = make_flat_material("BonusCoreMaterial", "#e5fbff", roughness=0.16, emission=0.42)
    core = bicone_mesh("BonusCore", 6, 0.21, 0.31, -0.31, inner)
    core.rotation_euler = bonus.rotation_euler

    scene.render.resolution_x = COLLECTIBLE_RESOLUTION
    scene.render.resolution_y = COLLECTIBLE_RESOLUTION
    scene.camera.data.ortho_scale = 1.82
    scene.render.filepath = str(BONUS_CRYSTAL_ROOT / "bonus-crystal.png")
    bpy.ops.render.render(write_still=True)


def main() -> None:
    for directory in (WALL_ROOT, PATH_SHARD_ROOT, POWER_CRYSTAL_ROOT, BONUS_CRYSTAL_ROOT):
        directory.mkdir(parents=True, exist_ok=True)
    clear_scene()
    scene = configure_scene()
    for mask in range(16):
        render_wall(scene, mask)
    for frame in range(8):
        render_collectible(scene, frame, powered=False)
        render_collectible(scene, frame, powered=True)
    render_bonus_collectible(scene)
    print(f"ICE_V3_RENDER_COMPLETE walls=16 collectibles=17 output={RENDER_ROOT}")


if __name__ == "__main__":
    main()
