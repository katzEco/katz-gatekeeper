# RawBlock Design System

## Overview

RawBlock is an unapologetic, brutalist design system using the **Catppuccin Macchiato** palette with **Sapphire** as the primary accent. Built for high-contrast, functional interfaces, it embraces thick borders, terminal-inspired aesthetics, and rich dark tones. There are no rounded corners, no blur shadows, and no decorative fluff. Every element communicates hierarchy through border weight and scale contrast.

---

## Colors (Catppuccin Macchiato)

### Core Theme & Surfaces
- **Base** (`#24273a`): Main application background
- **Mantle** (`#1e2030`): Sunken surfaces, secondary containers
- **Crust** (`#181926`): Deepest background, structural borders, solid dark fills
- **Surface 0** (`#363a4f`): Card backgrounds, elevated components
- **Surface 1** (`#494d64`): Subtle borders, secondary hover fills
- **Surface 2** (`#5b6078`): Distinct borders, active component backgrounds

### Typography & Content
- **Text** (`#cad3f5`): Primary content, headings, body text
- **Subtext 1** (`#b8c0e0`): Secondary content, descriptions, helper text
- **Subtext 0** (`#a5adcb`): Tertiary content, placeholder text
- **Overlay 0** (`#6e738d`): Muted content, disabled borders, disabled text

### Accent & Semantics
- **Accent (Sapphire)** (`#7dc4e4`): Primary accent, hyperlinks, active states, focus rings
- **Success (Green)** (`#a6da95`): Completed tasks, success notifications, healthy state
- **Warning (Peach)** (`#f5a97f`): Warnings, pending actions, cautions
- **Error / Destructive (Red)** (`#ed8796`): Errors, deletions, failed states
- **Info (Sapphire)** (`#7dc4e4`): Informational notices (aligned with primary accent)

---

## Typography

- **Headline Font**: Archivo Black
- **Body Font**: Work Sans
- **Mono Font**: Space Mono

- **h1**: Archivo Black 64px regular, 1.0 line height
- **h2**: Archivo Black 48px regular, 1.05 line height
- **h3**: Archivo Black 32px regular, 1.1 line height
- **h4**: Work Sans 22px semibold, 1.2 line height
- **body**: Work Sans 16px regular, 1.6 line height
- **small**: Work Sans 14px regular, 1.5 line height
- **tiny**: Work Sans 12px regular, 1.4 line height
- **mono**: Space Mono 15px regular, 1.5 line height

---

## Spacing

Base unit: 8px (intentionally irregular usage)
Spacing is deliberately inconsistent to create visual tension. Use the scale below as a starting point, then break it when the design demands it.

- **sp-1**: 4px
- **sp-2**: 8px
- **sp-3**: 16px
- **sp-4**: 24px
- **sp-5**: 40px
- **sp-6**: 64px
- **sp-7**: 80px
- **sp-8**: 120px

---

## Border Radius

- **radius-none** (0px): All elements -- no rounding
  Every element uses 0px border radius (except circular radio indicators). No exceptions.

---

## Elevation

RawBlock uses **no shadows**. Visual hierarchy is achieved exclusively through border weight and color contrast.

- **shadow-none**: None. All elements.
  Use border-thin (1px Crust), border-thick (3px Crust/Sapphire), or border-heavy (5px Crust/Sapphire) to define element boundaries.

---

## Components

### Buttons

#### Primary
- Fill: Sapphire (`#7dc4e4`)
- Text: Crust (`#181926`)
- Border: 3px Crust (`#181926`), square
- Tracking: 2px, uppercase text-transform
- Hover: Background Base (`#24273a`), text Sapphire (`#7dc4e4`)
- Active: Background Crust (`#181926`), text Sapphire (`#7dc4e4`), border 5px Sapphire (`#7dc4e4`)

#### Secondary
- Fill: Surface 0 (`#363a4f`)
- Text: Text (`#cad3f5`)
- Border: 3px Crust (`#181926`), square
- Hover: Background Crust (`#181926`), text Sapphire (`#7dc4e4`)

#### Ghost
- Fill: Transparent
- Text: Text (`#cad3f5`)
- Border: None
- Text Decoration: Underline
- Hover: Text Sapphire (`#7dc4e4`)

#### Destructive
- Fill: Red (`#ed8796`)
- Text: Crust (`#181926`)
- Border: 3px Crust (`#181926`), square
- Hover: Background Crust (`#181926`), text Red (`#ed8796`)

#### Sizes
- Small: 6px 16px padding, 12px font, 32px height
- Medium: 10px 24px padding, 14px font, 44px height
- Large: 16px 40px padding, 18px font, 56px height

#### Disabled State
- Fill: Surface 0 (`#363a4f`)
- Text: Overlay 0 (`#6e738d`)
- Border: 3px Overlay 0 (`#6e738d`)
- Cursor: Not-allowed

---

### Cards

#### Default
- Fill: Surface 0 (`#363a4f`)
- Border: 3px Crust (`#181926`), square
- Shadow: None
- Padding: sp-4 (24px)

#### Elevated
- Fill: Surface 0 (`#363a4f`)
- Border: 5px Sapphire (`#7dc4e4`), square
- Shadow: None
- Padding: sp-4 (24px)

---

### Inputs

- Fill: Mantle (`#1e2030`)
- Text: Text (`#cad3f5`)
- Border: 3px Crust (`#181926`), square
- Font: Space Mono 15px
- Padding: 10px 12px

- **Default**: 3px Crust (`#181926`) border
- **Hover**: 3px Surface 2 (`#5b6078`) border, background Surface 0 (`#363a4f`)
- **Focus**: 5px Sapphire (`#7dc4e4`) border, outline none
- **Error**: 3px Red (`#ed8796`) border
- **Disabled**: 3px Overlay 0 (`#6e738d`) border, background Surface 0 (`#363a4f`)

#### Label
- Text: Text (`#cad3f5`)
- Font: Archivo Black 14px regular uppercase
- Margin: 4px margin-bottom

#### Helper Text
- Text: Subtext 1 (`#b8c0e0`) (default) | Red (`#ed8796`) (error state)
- Font: Work Sans 12px regular
- Margin: 4px margin-top

---

### Chips

#### Filter Chip
- Fill: Surface 0 (`#363a4f`)
- Text: Text (`#cad3f5`)
- Border: 2px Crust (`#181926`), square
- Padding: 4px 12px, uppercase, 10px font, tracking 1px
- Active: Background Sapphire (`#7dc4e4`), text Crust (`#181926`), border 2px Sapphire (`#7dc4e4`)

#### Status Chip
- Shape: Square, 2px respective color border
- Font: 11px semibold uppercase tracking 1px
- Padding: 2px 10px

- **Active / Success**: Base (`#24273a`) fill, Green (`#a6da95`) text, Green (`#a6da95`) border
- **Warning**: Base (`#24273a`) fill, Peach (`#f5a97f`) text, Peach (`#f5a97f`) border
- **Error**: Base (`#24273a`) fill, Red (`#ed8796`) text, Red (`#ed8796`) border
- **Default / Info**: Base (`#24273a`) fill, Sapphire (`#7dc4e4`) text, Sapphire (`#7dc4e4`) border

---

### Lists

- Fill: Transparent
- Font: Work Sans 16px, Text (`#cad3f5`)
- Divider: 3px Crust (`#181926`) divider
- Padding: 12px 0px item padding
- Hover: Text Sapphire (`#7dc4e4`), text-decoration underline
- Active: Background Crust (`#181926`), text Sapphire (`#7dc4e4`), full-width

---

### Checkboxes

- Size: 20px x 20px, 3px Crust (`#181926`) border, square
- Unchecked: Mantle (`#1e2030`) background
- Checked: Sapphire (`#7dc4e4`) background, Crust (`#181926`) 3px stroke checkmark
- Focus: 5px Sapphire (`#7dc4e4`) border
- Disabled: Border Overlay 0 (`#6e738d`), background Surface 0 (`#363a4f`)

---

### Radio Buttons

- Size: 20px x 20px, 3px Crust (`#181926`) border
- Shape: Circle (exception to 0px radius)
- Unchecked: Mantle (`#1e2030`) fill
- Selected: Crust (`#181926`) border, inner dot 10px Sapphire (`#7dc4e4`)
- Focus: 5px Sapphire (`#7dc4e4`) border
- Disabled: Border Overlay 0 (`#6e738d`)

---

### Tooltips

- Fill: Crust (`#181926`)
- Text: Text (`#cad3f5`), 13px Space Mono
- Border: 1px Sapphire (`#7dc4e4`)
- Shadow: None
- Padding: 8px 12px, max width 260px

---

## Do's and Don'ts

1. **Do** use thick borders (3-5px) as the primary visual organizer; they replace shadows entirely.
2. **Don't** round any corners -- ever (except circular radio dots). Sharp edges are non-negotiable.
3. **Do** use Sapphire (`#7dc4e4`) as the primary interactive accent against Macchiato dark surfaces.
4. **Don't** use opacity for disabled states; use Overlay 0 (`#6e738d`) borders and Surface 0 (`#363a4f`) fills instead.
5. **Do** use Archivo Black at large sizes (48-64px) for maximum visual impact.
6. **Don't** use non-palette colors; restrict all styling to Catppuccin Macchiato tokens.
7. **Do** embrace intentional spacing irregularity -- asymmetric layouts are encouraged.
8. **Do** use uppercase + tracking for buttons and labels to amplify the raw aesthetic.
9. **Don't** add decorative gradients, blurs, or illustrations; typography, borders, and colors do the work.
10. **Don't** polish or soften brutalist aesthetic.
