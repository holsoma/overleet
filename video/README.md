# OVERLEET promo

A local Remotion project for the 15-second OVERLEET promo. It renders 450 frames at 30 fps, 1920 × 1080, as an H.264 MP4 with on-screen text and no audio. The interface examples are simplified illustrations of the study flow.

## Preview and render

From the repository root:

```sh
npm run video:setup
npm run video:studio
```

Open the local URL printed by Studio and select `OverleetPromo`. The preview stays open while the source changes. No PostgreSQL database, OAuth credentials or model API is needed.

```sh
npm run video:check
npm run video:render
```

The render writes `docs/media/overleet-promo.mp4`, linked from the main README. The first render may download Remotion's Chrome Headless Shell. Later renders reuse the local browser. The final MP4 and authored SVG poster are delivery assets; intermediate renders belong in the ignored `video/out/` folder.

To save a frame for inspection:

```sh
npm run poster --prefix video
```

## Timeline

| Time | Scene |
|---|---|
| 0–3 seconds | Think it through. |
| 3–7 seconds | Choose a question. |
| 7–11 seconds | Explain. Then check. |
| 11–15 seconds | OVERLEET and the public site address. |

Each scene has its own composition in Studio. Animation depends on the current frame, so preview and export use the same timing. System fonts and authored React/SVG elements avoid remote asset requests during rendering. No stock media or generated voice is used.

This subproject has its own dependency lockfile and TypeScript/lint configuration. The Next.js app excludes it from its compilation. Keep Remotion packages on the same version when updating dependencies, and run the video check and a full render afterwards. Remotion itself has [separate licence terms](https://github.com/remotion-dev/remotion/blob/main/LICENSE.md).

The lockfile overrides Zod to 4.6.7 to address the vulnerability in the scaffold's recommended 4.5.4. Remotion reports this as a version warning. This composition uses no Zod schemas; its type check, Studio preview and full render are the compatibility checks for that override.
