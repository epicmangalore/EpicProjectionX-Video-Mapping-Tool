export const PROJECTOR_SETUP_COPY = {
  title: "Send this window to your projector",
  subtitle: "Your artwork is live. Move this window to the projector, then go fullscreen.",
  diagram: {
    computer: {
      label: "This computer",
      description: "Your controls",
    },
    projector: {
      label: "Projector",
      description: "Output only",
    },
  },
  steps: {
    extendDisplay: {
      title: "Extend your display",
      body: "Connect the projector and set it to Extend. Duplicate would show your controls on the projector too.",
    },
    dragWindow: {
      title: "Drag this window to the projector",
      body: "Drag the title bar past the edge of your screen. Keep your workspace on this computer.",
    },
    goFullscreen: {
      title: "Go fullscreen",
      body: "Double-click anywhere in this window, or use the button below. Press Esc to exit.",
    },
  },
  osInstructions: {
    windows: "Press [Win] + [P], then choose Extend.",
    mac: "Open System Settings → Displays, select the projector, and set \"Use as\" to Extended display.",
  },
  button: {
    label: "Go fullscreen",
    helper: "Double-click anywhere · Esc to exit",
  },
  notice: {
    title: "We can't detect your displays",
    body: "That's okay. Drag this window to the projector manually, then go fullscreen.",
  },
};
