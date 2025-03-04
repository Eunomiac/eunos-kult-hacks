const currentLocation = game.settings.get("eunos-kult-hacks", "currentLocation");

new Dialog({
  title: "Go To Location",
  content: `
    <form>
      <div class="form-group">
        <div class="location-grid">
          <style>
            .location-grid {
              display: grid;
              /* Auto-fit will create as many columns as can fit, with each column being at least 100px wide */
              grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
              gap: 10px;
              margin-top: 10px;
            }
            .location-button {
              padding: 15px 10px;
              text-align: center;
              background: var(--K4-dBLACK);
              color: var(--K4-GOLD);
              border: 1px solid var(--K4-GOLD);
              border-radius: 3px;
              cursor: pointer;
              font-weight: bold;
              transition: all 0.3s ease;
            }
            .location-button:hover {
              color: var(--K4-bGOLD);
              border-color: var(--K4-bGOLD);
              box-shadow: 0 0 5px var(--K4-GOLD);
            }
            .location-button.selected {
              background: var(--K4-GOLD);
              color: var(--K4-BLACK);
              border-color: var(--K4-bGOLD);
            }
          </style>
          ${Object.keys(LOCATIONS).map(loc =>
            `<div class="location-button ${loc === currentLocation ? 'selected' : ''}"
                  data-location="${loc}">${loc}</div>`
          ).join("")}
        </div>
      </div>
    </form>
  `,
  buttons: {
    cancel: {
      icon: '<i class="fas fa-times"></i>',
      label: "Cancel"
    }
  },
  render: html => {
    // Add click handlers for the location buttons
    html.find(".location-button").click(event => {
      const location = event.currentTarget.dataset.location;
      EunosOverlay.instance.setLocation(location);
      // Close the dialog after selection
      html.closest(".dialog").find(".close").click();
    });
  },
  default: "cancel"
}).render(true);
