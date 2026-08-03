"""Render deterministic 3/4 orthographic wall modules for all maze worlds.

The camera is calibrated to the supplied world sheets: 10 degree azimuth,
56 degree elevation and visible top/front/right planes. Only local Blender
primitives and procedural materials are used.
"""

from __future__ import annotations

import math
from pathlib import Path

import bpy
from mathutils import Vector


ROOT = Path(__file__).resolve().parents[4]
OUTPUT = ROOT / "art-src" / "maze" / "axonometric" / "v1" / "renders"
RESOLUTION = 256
NORTH, EAST, SOUTH, WEST = 1, 2, 4, 8

WORLD_STYLES = {
    "ice": {
        "top": ("#06345b", "#1688ad", "#78cde2"),
        "side": "#052944",
        "edge": "#bff8ff",
        "roughness": 0.22,
        "emission": 0.03,
        "key": "#dffcff",
        "fill": "#31b9ed",
    },
    "lava": {
        "top": ("#08080b", "#1d1719", "#48251f"),
        "side": "#0b0506",
        "edge": "#ff6d23",
        "roughness": 0.58,
        "emission": 0.015,
        "key": "#ffb65b",
        "fill": "#ff421e",
    },
    "ancient": {
        "top": ("#604923", "#a98650", "#d8bf84"),
        "side": "#3b2914",
        "edge": "#ead19a",
        "roughness": 0.72,
        "emission": 0.0,
        "key": "#fff0c2",
        "fill": "#4fc9ba",
    },
    "diamond": {
        "top": ("#261d71", "#5268cf", "#c378dc"),
        "side": "#17114d",
        "edge": "#dffcff",
        "roughness": 0.2,
        "emission": 0.025,
        "key": "#f4ffff",
        "fill": "#b15cff",
    },
}


def srgb(value: str) -> tuple[float, float, float, float]:
    value = value.removeprefix("#")
    return tuple(int(value[index:index + 2], 16) / 255 for index in (0, 2, 4)) + (1.0,)


def point_at(obj: bpy.types.Object, target: tuple[float, float, float]) -> None:
    direction = Vector(target) - obj.location
    obj.rotation_euler = direction.to_track_quat("-Z", "Y").to_euler()


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
    scene.render.image_settings.compression = 18
    scene.render.resolution_percentage = 100
    scene.render.resolution_x = RESOLUTION
    scene.render.resolution_y = RESOLUTION
    scene.render.use_file_extension = True
    scene.render.use_overwrite = True
    scene.world.color = (0.002, 0.002, 0.004)
    scene.world.node_tree.nodes.get("Background").inputs["Strength"].default_value = 0.08
    try:
        scene.view_settings.look = "AgX - Medium High Contrast"
    except TypeError:
        pass

    camera_data = bpy.data.cameras.new("AxonometricCamera")
    camera = bpy.data.objects.new("AxonometricCamera", camera_data)
    bpy.context.collection.objects.link(camera)
    camera.location = (1.6, -9.1, 13.7)
    point_at(camera, (0.0, 0.0, 0.18))
    camera_data.type = "ORTHO"
    camera_data.ortho_scale = 1.62
    scene.camera = camera

    for name, location, energy, size in (
        ("WorldKey", (-4.8, -5.6, 9.4), 520, 4.8),
        ("WorldFill", (5.0, 2.5, 6.2), 260, 3.8),
        ("WorldRim", (4.8, -2.2, 7.4), 360, 3.0),
    ):
        data = bpy.data.lights.new(name, "AREA")
        data.energy = energy
        data.shape = "DISK"
        data.size = size
        light = bpy.data.objects.new(name, data)
        light.location = location
        bpy.context.collection.objects.link(light)
        point_at(light, (0.0, 0.0, 0.15))
    return scene


def clear_renderables() -> None:
    preserved = {"AxonometricCamera", "WorldKey", "WorldFill", "WorldRim"}
    for obj in list(bpy.context.scene.objects):
        if obj.name not in preserved:
            bpy.data.objects.remove(obj, do_unlink=True)


def configure_lighting(world: str) -> None:
    style = WORLD_STYLES[world]
    bpy.data.lights["WorldKey"].color = srgb(style["key"])[:3]
    bpy.data.lights["WorldFill"].color = srgb(style["fill"])[:3]
    bpy.data.lights["WorldRim"].color = srgb(style["edge"])[:3]


def make_side_material(world: str, mask: int) -> bpy.types.Material:
    style = WORLD_STYLES[world]
    material = bpy.data.materials.new(f"{world.title()}Side{mask:02d}")
    material.use_nodes = True
    principled = material.node_tree.nodes.get("Principled BSDF")
    principled.inputs["Base Color"].default_value = srgb(style["side"])
    principled.inputs["Roughness"].default_value = min(0.92, style["roughness"] + 0.18)
    if "Coat Weight" in principled.inputs:
        principled.inputs["Coat Weight"].default_value = 0.12
    return material


def make_top_material(world: str, mask: int) -> bpy.types.Material:
    style = WORLD_STYLES[world]
    material = bpy.data.materials.new(f"{world.title()}Top{mask:02d}")
    material.use_nodes = True
    nodes = material.node_tree.nodes
    links = material.node_tree.links
    nodes.clear()

    output = nodes.new("ShaderNodeOutputMaterial")
    principled = nodes.new("ShaderNodeBsdfPrincipled")
    texcoord = nodes.new("ShaderNodeTexCoord")
    mapping = nodes.new("ShaderNodeMapping")
    noise = nodes.new("ShaderNodeTexNoise")
    ramp = nodes.new("ShaderNodeValToRGB")
    bump = nodes.new("ShaderNodeBump")
    mapping.inputs["Location"].default_value = (
        ((mask * 37 + len(world) * 11) % 19) / 8.0,
        ((mask * 53 + len(world) * 7) % 23) / 9.0,
        ((mask * 29 + len(world) * 5) % 17) / 7.0,
    )
    noise.noise_dimensions = "3D"
    noise.inputs["Scale"].default_value = 5.8 if world in {"ice", "diamond"} else 4.1
    noise.inputs["Detail"].default_value = 5.0
    noise.inputs["Roughness"].default_value = 0.66
    noise.inputs["Distortion"].default_value = 0.12 if world == "ancient" else 0.28
    deep, middle, light = style["top"]
    ramp.color_ramp.elements[0].position = 0.12
    ramp.color_ramp.elements[0].color = srgb(deep)
    mid = ramp.color_ramp.elements.new(0.52)
    mid.color = srgb(middle)
    ramp.color_ramp.elements[1].position = 0.9
    ramp.color_ramp.elements[1].color = srgb(light)
    principled.inputs["Roughness"].default_value = style["roughness"]
    principled.inputs["Metallic"].default_value = 0.09 if world == "diamond" else 0.01
    if "Coat Weight" in principled.inputs:
        principled.inputs["Coat Weight"].default_value = 0.5 if world in {"ice", "diamond"} else 0.18
        principled.inputs["Coat Roughness"].default_value = 0.12
    if style["emission"] > 0:
        principled.inputs["Emission Color"].default_value = srgb(style["edge"])
        principled.inputs["Emission Strength"].default_value = style["emission"]
    bump.inputs["Strength"].default_value = 0.28 if world != "ancient" else 0.4
    bump.inputs["Distance"].default_value = 0.07
    links.new(texcoord.outputs["Generated"], mapping.inputs["Vector"])
    links.new(mapping.outputs["Vector"], noise.inputs["Vector"])
    links.new(noise.outputs["Fac"], ramp.inputs["Fac"])
    links.new(noise.outputs["Fac"], bump.inputs["Height"])
    links.new(ramp.outputs["Color"], principled.inputs["Base Color"])
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
            raise RuntimeError(f"Could not close mask {mask}")
    return outline


def create_wall(world: str, mask: int) -> None:
    outline = polyomino_outline(mask)
    count = len(outline)
    base_z, height = 0.0, 0.58
    vertices = [(x, y, base_z) for x, y in outline] + [(x, y, base_z + height) for x, y in outline]
    faces = [list(reversed(range(count))), list(range(count, count * 2))]
    for index in range(count):
        nxt = (index + 1) % count
        faces.append((index, nxt, count + nxt, count + index))
    mesh = bpy.data.meshes.new(f"{world.title()}Wall{mask:02d}Mesh")
    mesh.from_pydata(vertices, [], faces)
    mesh.update()
    wall = bpy.data.objects.new(f"{world.title()}Wall{mask:02d}", mesh)
    bpy.context.collection.objects.link(wall)
    wall.data.materials.append(make_side_material(world, mask))
    wall.data.materials.append(make_top_material(world, mask))
    wall.data.polygons[0].material_index = 0
    wall.data.polygons[1].material_index = 1
    for polygon in wall.data.polygons[2:]:
        polygon.material_index = 0
    bevel = wall.modifiers.new("ModularEdgeBevel", "BEVEL")
    bevel.width = 0.075 if world != "ancient" else 0.055
    bevel.segments = 3 if world != "diamond" else 2
    bevel.limit_method = "ANGLE"
    bevel.angle_limit = math.radians(18)
    bevel.harden_normals = True


def render_wall(scene: bpy.types.Scene, world: str, mask: int) -> None:
    clear_renderables()
    configure_lighting(world)
    create_wall(world, mask)
    output = OUTPUT / world
    output.mkdir(parents=True, exist_ok=True)
    scene.render.filepath = str(output / f"wall-mask-{mask:02d}.png")
    bpy.ops.render.render(write_still=True)


def main() -> None:
    clear_scene()
    scene = configure_scene()
    for world in WORLD_STYLES:
        for mask in range(16):
            render_wall(scene, world, mask)
    print(f"AXONOMETRIC_WORLDS_COMPLETE worlds={len(WORLD_STYLES)} masks=16 output={OUTPUT}")


if __name__ == "__main__":
    main()
