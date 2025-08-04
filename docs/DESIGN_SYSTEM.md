# Design System

This document outlines the design system for the PBS Invoicing application, ensuring a consistent and uniform user experience.

## Color Palette

| Color | Usage | Hex Code | Tailwind Class |
| --- | --- | --- | --- |
| Primary | Main brand color, used for primary buttons and links. | `#0078D7` | `bg-primary` |
| Secondary | Accent color, used for highlights and secondary actions. | `#EF3A4D` | `bg-secondary` |
| Success | Used for success messages and indicators. | `#10B981` | `bg-green-500` |
| Warning | Used for warnings and alerts. | `#F59E0B` | `bg-yellow-500` |
| Error | Used for error messages and destructive actions. | `#EF4444` | `bg-red-500` |
| Gray | Used for text, borders, and backgrounds. | Various | `bg-gray-50` to `bg-gray-900` |

## Typography

*   **Font Family:** Montserrat, sans-serif
*   **Headings:**
    *   `h1`: `text-2xl font-bold`
    *   `h2`: `text-xl font-bold`
    *   `h3`: `text-lg font-medium`
*   **Body:** `text-base`
*   **Links:** `text-primary hover:underline`

## Components

### Buttons

*   **Primary:** `<button class="btn btn-primary">...</button>`
*   **Secondary:** `<button class="btn btn-secondary">...</button>`
*   **Destructive:** `<button class="btn btn-danger">...</button>`

### Forms

*   **Input:** `<input class="form-input" />`
*   **Select:** `<select class="form-select" />`
*   **Label:** `<label class="form-label" />`

### Badges

*   `<StatusBadge status="..." />`

This document should be used as a reference for all new UI development to ensure consistency across the application.
