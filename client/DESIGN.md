# IMovies Client Design System & Foundations

## 1. Reference Products & Concrete Takeaways

1. **BookMyShow**
   - **Takeaway:** *Showtime & Venue Grouping*. Instead of card grids for each show, group strictly by theatre venue (name, locality/area, amenities like 4K/Dolby Atmos) with horizontal availability-state pills (`Available`, `Filling Fast`, `Almost Full`). Users make decisions based on venue locality and showtime slots, not generic card tiles.

2. **District by Zomato**
   - **Takeaway:** *Border-Free Media Cards & Flat Information Architecture*. Ditch heavily padded cards with drop-shadows and glassmorphism. Media cards place the pure 2:3 poster directly on the canvas, with title, genre, and language cleanly stacked beneath it in a tight vertical lockup.

3. **Letterboxd / MUBI**
   - **Takeaway:** *Cinema-First Monochrome Hierarchy*. High-contrast, disciplined dark canvas where color is never decorative. Background is a warm near-black canvas; text is structured in strict typographic hierarchy; and only ONE accent color is reserved for primary actions (seat selection and confirmation CTA).

---

## 2. Design Tokens

Defined as native CSS custom properties and registered in Tailwind CSS v4 `@theme`.

| Token | Value | Purpose |
| :--- | :--- | :--- |
| `--color-bg-base` | `#0f0f11` | Warm near-black background (NOT neutral-950) |
| `--color-surface` | `#18181c` | Solid, unblurred elevated surface (cards, bars, modals) |
| `--color-surface-hover` | `#222227` | Subtle interactive hover state for rows and dropdowns |
| `--color-border` | `#2a2a30` | Single crisp, quiet structural border |
| `--color-text-primary` | `#f4f4f6` | High-contrast off-white for titles and primary text |
| `--color-text-secondary`| `#92929e` | Accessible muted gray for metadata, genres, timestamps |
| `--color-accent` | `#e50914` | Single accent color strictly for primary actions & selected seats |
| `--color-accent-hover` | `#c80812` | Hover state for primary action buttons |

### Semantic Seat State Tokens
| State | Surface | Border | Text |
| :--- | :--- | :--- | :--- |
| **Available** | `#1e1e24` | `#3e3e4a` | `#d4d4dc` |
| **Selected** | `#e50914` (Accent) | `#e50914` | `#ffffff` |
| **Held (Others)** | `#451a03` | `#d97706` | `#fef3c7` |
| **Booked / Taken**| `#18181c` | `#222226` | `#4a4a55` |

---

## 3. Typography & Spacing

### Self-Hosted Typefaces (via `@fontsource`)
- **Display Face:** `Outfit` (weights: 600, 700) — Used for movie titles, primary headings, hero banners, and brand lockup.
- **Body & Interface:** `Inter` (weights: 400, 500, 600) — Used for body copy, UI controls, navigation, and numeric metadata.
- *Strictly no runtime Google CDN requests and removed system-ui fallback stack.*

### Type Scale (Strict 8 Sizes Max)
1. `xs` — 12px (line-height 16px) — Badges, small metadata, keyboard hints
2. `sm` — 14px (line-height 20px) — Secondary descriptions, filter chips, table labels
3. `base` — 16px (line-height 24px) — Body text, input values, button labels
4. `lg` — 18px (line-height 26px) — Subheadings, theatre names, price callouts
5. `xl` — 20px (line-height 28px) — Section headings, card headers
6. `2xl` — 24px (line-height 32px) — Page titles, modal headers
7. `3xl` — 30px (line-height 36px) — Featured hero titles, movie titles
8. `4xl` — 36px (line-height 44px) — Hero display headlines

### Spacing Scale (4px / 8px Grid)
- `1` (4px), `2` (8px), `3` (12px), `4` (16px), `5` (20px), `6` (24px), `8` (32px), `10` (40px), `12` (48px), `16` (64px).

---

## 4. Negative Design Rules ("What We Will NOT Do")

1. **NO gradient glow blobs or radial neon blurs** behind cards or sections.
2. **NO indiscriminate glassmorphism (`backdrop-blur`)** on every bar or panel. Navbars and sheets use solid, opaque `--color-surface` and `--color-bg-base`.
3. **NO emojis** in copy, labels, headers, or buttons.
4. **NO purple/pink gradients** or generic Web3/crypto style aesthetics.
5. **NO identical `rounded-2xl` cards with hover-lift / `transform translateY(-4px)`** on every single container.
6. **NO "Book Showtimes →" hover-overlay text** covering movie poster artwork on hover. The poster remains clean and unobstructed.
7. **NO decorative icons next to every label**. Icons are strictly communicative (e.g. search magnifying glass, map pin, close X).
