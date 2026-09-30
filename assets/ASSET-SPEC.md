# assets/ — generation spec

**This folder is intentionally empty of binaries.** The environment that produced
`index.html` has no image-generation tool and cannot write binary files (no PIL,
no ImageMagick, no browser). Nothing here was silently substituted: every slot is
wired in `index.html` and currently filled by a procedural canvas painter.

Drop the files below in with these exact names and the page picks them up. One
visual world throughout: a specialty coffee roastery at dawn, vintage roaster in
the background, warm amber window light. Key light camera-left, soft fill
camera-right, same colour temperature in every prompt.

---

## 1. Manifest — the only code you touch

Near the top of the inline `<script>` in `index.html`:

```js
var ASSETS = {
  bg:    'assets/hero-bg.webp',
  mid:   'assets/hero-mid.webp',
  fg:    'assets/hero-fg.webp',
  noise: 'assets/noise.png'
};
var SEQ_FRAMES = {
  desktop: function (i) { return 'assets/frames/desktop/frame-' + String(i + 1).padStart(3, '0') + '.webp'; },
  mobile:  function (i) { return 'assets/frames/mobile/frame-'  + String(i + 1).padStart(3, '0') + '.webp'; }
};
var FRAME_COUNT = 3;   // 3 keyframes, or 30 for the Stage 4b build
```

Setting a path automatically: loads the image, registers the load with
`window.preloader.register(...)`, hides the procedural stand-in, and (for frames)
switches on range-based lazy loading around the playhead.

Also uncomment the LCP preload in `<head>` once `hero-bg.webp` exists:

```html
<link rel="preload" as="image" href="assets/hero-bg.webp" fetchpriority="high">
```

---

## 2. Stage 3 — hero layers

| File | Size | Format | Notes |
|---|---|---|---|
| `hero-bg.webp` | 1920×1080 | WebP q80 | opaque, LCP element |
| `hero-mid.webp` | 1920×1080 | WebP q80 **+ alpha** | primary subject |
| `hero-fg.webp` | 1920×1080 | WebP q80 **+ alpha** | corners only |
| `noise.png` | 512×512 | PNG | seamless tile |

**hero-bg.webp**
> A cinematic wide-angle interior of a specialty coffee roastery at dawn. Deep
> charcoal shadows, warm amber light from a window, a vintage roaster in the
> background, negative space in the center-left. No people, no text, no
> watermark. Photorealistic, 35mm film grain, muted palette with warm highlights.

**hero-mid.webp**
> A single pour-over coffee setup, ceramic dripper on a glass carafe with steam
> rising, isolated on a transparent background. Three-quarter perspective. Warm
> amber key light from camera-left, soft fill from camera-right. Subject occupies
> about 60% of the frame, centered. Photorealistic, film grain. No text, no
> watermark.

**hero-fg.webp**
> Soft steam and a few blurred coffee beans isolated on a transparent background,
> occupying the bottom-right and top-left corners with the center clear. Warm
> amber lighting. Photorealistic, film grain.

**noise.png**
> Seamless tileable film grain texture, monochrome, subtle, high-frequency noise.

### Transparency protocol (hero-mid, hero-fg)

- [ ] **A** Ask for a transparent background. Open in PIL, confirm mode is `RGBA`
      and that real transparent pixels exist (`img.getextrema()[3][0] == 0`).
      Report the check.
- [ ] **B** If opaque: regenerate on flat `#FF00FF`, then knock it out —
      `magick in.webp -fuzz 10% -transparent "#FF00FF" out.png` — and inspect the
      edges for magenta fringe; defringe if present.
- [ ] **C** If fringe persists: ship that layer with
      `mix-blend-mode: screen` (steam/beans) or `multiply`, and say so.
- [ ] **D** If all fail: reduce to two layers (hero-bg + one composite) and say so.

Export finals as **WebP with alpha, quality 80**. Do not ship PNG intermediates.

### Verify each asset, regenerate once on failure

| Check | bg | mid | fg |
|---|---|---|---|
| No text / watermark | ☐ | ☐ | ☐ |
| Shadow direction matches (key camera-left) | ☐ | ☐ | ☐ |
| Centre-left clear for headline | ☐ | — | — |
| Clean alpha edges, no fringe | — | ☐ | ☐ |

> Readability note: `.hero-scrim` already lays a left-to-right gradient of
> `rgba(12,10,9,.93 → 0)` over the composite. Body copy measures ≈13.9:1 and the
> subhead ≈10:1 against it — both clear WCAG AA (4.5:1) — so a *centred* 60%
> subject per the prompt still leaves the headline legible.

---

## 3. Stage 4 — frame sequence

```
assets/frames/key-1.webp  key-2.webp  key-3.webp        1280×720 WebP q70
assets/frames/desktop/frame-001.webp … frame-030.webp   1280×720 WebP q70
assets/frames/mobile/frame-001.webp  … frame-030.webp    640×360 WebP q65
```

Three keyframes, one camera / one light / one background. Use `hero-bg.webp` and
`hero-mid.webp` as reference or edit sources so perspective matches.

1. **key-1** — *The pour-over setup in its raw state: unground coffee beans
   beside the ceramic dripper, empty carafe, no steam.*
2. **key-2** — *The pour-over setup mid-brew: water being poured into the dripper,
   steam rising.*
3. **key-3** — *The pour-over setup finished: full carafe, steam settling.*

Mobile 640×360 versions must be **resized from the finals, not regenerated.**

Verify lighting, background and perspective match across all three keys;
regenerate the odd one out once if not.

### Stage 4b — 30 frames

Generate 30 frames in order between the three keyframe states, matching camera,
light and background exactly. **If consistency cannot be held, keep the
3-keyframe version** and say so — set `FRAME_COUNT = 3`.

The cross-fade maths is already frame-count agnostic: `f = p * (FRAME_COUNT - 1)`,
which reduces to the specified `f = p * 2` at three frames. The first 10 frames
load before the preloader can finish; the rest load in a window of `[-2, +6]`
around the playhead so decoded memory stays bounded.

---

## 4. Stage 6 — noscript image

`<noscript>` inside `#sequence` references `assets/frames/desktop/key-3.webp`.
It only loads with JS disabled; `alt` text carries the description if the file is
still missing.
