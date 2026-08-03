(function attachMazeAxonometricProjection(root, factory) {
  "use strict";

  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
    return;
  }
  root.KaflulMazeAxonometric = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createMazeAxonometricProjection() {
  "use strict";

  // The supplied world sheets use a stylised 3/4 orthographic camera. Their
  // dominant wall axes stay almost square to the screen (about 10 degrees of
  // azimuth), while the visible wall height is set by a 56 degree elevation.
  // Gameplay remains on the original square grid; only the wall height is
  // projected so collision coordinates and routes never move.
  const CAMERA = Object.freeze({
    azimuthDegrees: 10,
    elevationDegrees: 56,
    tiltFromVerticalDegrees: 34,
    wallHeightInTiles: 0.5,
    eastFaceBias: 0.32
  });

  function toRadians(degrees) {
    return degrees * Math.PI / 180;
  }

  function computeProjection(tileSize, overrides = {}) {
    if (!Number.isFinite(tileSize) || tileSize <= 0) {
      throw new RangeError("tileSize must be a positive finite number.");
    }

    const elevationDegrees = overrides.elevationDegrees ?? CAMERA.elevationDegrees;
    const azimuthDegrees = overrides.azimuthDegrees ?? CAMERA.azimuthDegrees;
    const wallHeightInTiles = overrides.wallHeightInTiles ?? CAMERA.wallHeightInTiles;
    const eastFaceBias = overrides.eastFaceBias ?? CAMERA.eastFaceBias;
    if (![elevationDegrees, azimuthDegrees, wallHeightInTiles, eastFaceBias].every(Number.isFinite)) {
      throw new TypeError("Projection overrides must be finite numbers.");
    }
    if (elevationDegrees <= 0 || elevationDegrees >= 90 || wallHeightInTiles <= 0 || eastFaceBias < 0) {
      throw new RangeError("Projection angles, wall height and east-face bias are outside the supported range.");
    }

    // In an orthographic camera, a vertical wall projects by cos(elevation).
    // A small east-face bias preserves the readable square gameplay grid while
    // still exposing the right plane visible in the reference sheets.
    const projectedWallHeight = tileSize * wallHeightInTiles * Math.cos(toRadians(elevationDegrees));
    return Object.freeze({
      azimuthDegrees,
      elevationDegrees,
      tiltFromVerticalDegrees: 90 - elevationDegrees,
      wallHeightInTiles,
      projectedWallHeight,
      southDepth: projectedWallHeight,
      eastDepth: projectedWallHeight * eastFaceBias,
      contactShadowY: projectedWallHeight * 0.76,
      contactShadowX: projectedWallHeight * eastFaceBias * 0.48
    });
  }

  return Object.freeze({ CAMERA, computeProjection });
});
