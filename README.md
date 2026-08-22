# 🎥 ProjectX by EPIC - Professional & Playful Projection Mapping Studio

ProjectX by EPIC is a cutting-edge Progressive Web App (PWA) designed for creating stunning projection mapping shows. It seamlessly blends professional-grade mapping tools (edge blending, N-point polygons, mesh warping) with an intuitive interface. Built with Next.js, React Three Fiber, and GLSL shaders.

![ProjectX by EPIC Showcase](https://your-screenshot-url-here.png) <!-- Ideally update this later -->

## 🚀 Key Features

### 🎨 Professional Mapping Tools
-   **Projection Canvas**: A full 3D workspace to position, scale, and rotate your projection surfaces.
-   **Media Library**: Drag-and-drop support for **Images**, **Videos**, and **Colors**.  Videos automatically generate thumbnails on import!
-   **N-Point Polygons**: Map onto complex shapes like hexagons or triangles, not just rectangles. Add/remove points dynamically.
-   **Mesh Warp**: Use a grid (up to 10x10) to warp your projection onto curved surfaces like cylinders or spheres.
-   **Corner Pinning**: Precise 4-point Keystone correction to align your projection with physical objects.
-   **Edge Blending**: Seamlessly stitch multiple projectors together with adjustable gradients and gamma.
-   **Snapping System**: Surfaces snap to each other and the grid for pixel-perfect alignment.

### 🎛️ Performance & Control
-   **Live Output Window**: Launch a dedicated, borderless window for your projector.
-   **MIDI Support**: Control everything with your physical MIDI controller.
-   **Audio Reactivity**: Map audio frequencies (Bass, Mid, Treble) to any property (Opacity, Scale, Effects).
-   **Global Effects**: Apply master brightness, contrast, and color grading.

---

## 🛠️ Getting Started

### Prerequisites
-   Node.js 18+
-   A modern browser (Chrome/Edge recommended for WebMIDI and performance)

### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/epicmangalore/ProjectX by EPIC.git
    cd ProjectX by EPIC
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    ```
4.  Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🎮 How to Use (Quick Start)

### 1. Import Media
-   Click the **Import** button in the **Media Library** (left panel).
-   Select images or videos from your computer.
-   **New**: Videos will instantly generate a preview thumbnail!

### 2. Create a Surface
-   Click `+ New Surface` in the top bar.
-   Or drag a media asset directly onto the canvas.
-   Click a surface to select it.

### 3. Map Your Object
-   **Select Mode (V)**: Move, scale, and rotate your surface.
-   **Corner Pin (C)**: Drag the four corners to match your physical object.
-   **Mesh Warp (M)**: Use the grid to warp the image onto curved surfaces.
-   **Polygon Mode**: In `Surface Properties`, add corners to create complex shapes.

### 4. Add Effects
-   With a surface selected, go to the **Properties Panel** (right side).
-   Adjust **Opacity**, **Blend Mode**, and **Color Correction**.
-   Enable **Audio Reactivity** to make it dance to music.

### 5. Go Live!
-   Click **LAUNCH OUTPUT** in the top bar.
-   Drag the new window to your projector display and make it fullscreen (F11).

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
| :--- | :--- |
| `V` | Select / Transform Mode |
| `C` | Corner Pin Mode |
| `M` | Mesh Warp Mode |
| `Ctrl + Z` | Undo |
| `Ctrl + Shift + Z` | Redo |
| `Backspace / Del` | Delete Selected Surface |
| `Ctrl + S` | Save Project (Auto-save is also active) |
| `Space` | Play/Pause Timeline & Video |
| `Shift + Drag` | Multi-select surfaces |

---

## 🧩 Architecture

-   **State Management**: `Zustand` for high-performance, transient updates (bypassing React render cycle for 60FPS).
-   **Graphics**: `React Three Fiber` (Three.js) for WebGL rendering.
-   **Storage**: `Dexie.js` (IndexedDB) for saving projects and large media files locally.
-   **Styles**: `Tailwind CSS` + `Radix UI` for a slick, dark-themed professional interface.

---

## 🤝 Contributing
Contributions are welcome! Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.

## 📄 License
MIT License - see the [LICENSE](LICENSE) file for details.