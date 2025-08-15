"use client";

export default function SettingsModal() {
  // We intentionally keep inputs uncontrolled and IDs intact so
  // existing vanilla logic in public/script.js can continue to
  // read values and attach listeners during incremental migration.
  return (
    <div id="settings-modal" className="modal">
      <div className="modal-content">
        <span className="close">&times;</span>
        <div className="modal-body">
          <h2>Settings</h2>
          <h3>Wedding Details</h3>
          <div className="form-group">
            <label>Bride's Name:</label>
            <input type="text" id="settings-bride-name" placeholder="Enter Bride's Name" />
          </div>
          <div className="form-group">
            <label>Wedding Date:</label>
            <input type="date" id="settings-wedding-date" />
          </div>
          <div className="form-group">
            <label>Location:</label>
            <input type="text" id="settings-location" placeholder="Enter Location" />
          </div>
          <div className="form-group">
            <label>Bride Ready Time:</label>
            <input type="time" id="settings-bride-ready-time" defaultValue="11:00" />
          </div>

          <h3>Duration Settings</h3>
          <div className="duration-settings">
            <div className="duration-row">
              <label>Bride Makeup:</label>
              <input type="number" id="settings-bride-makeup-duration" defaultValue={90} min={15} max={180} /> min
            </div>
            <div className="duration-row">
              <label>
                <input type="checkbox" id="settings-bride-hair-two-parts" />
                {" "}
                Bride's hair is done in 2 parts
              </label>
            </div>
            <div className="duration-row" id="bride-hair-single-row">
              <label>Bride Hair:</label>
              <input type="number" id="settings-bride-hair-duration" defaultValue={90} min={15} max={180} /> min
            </div>
            <div className="duration-row" id="bride-hair-part1-row" style={{ display: 'none' }}>
              <label>Bride's Hair Part I:</label>
              <input type="number" id="settings-bride-hair-part1-duration" defaultValue={60} min={15} max={120} /> min
            </div>
            <div className="duration-row" id="bride-hair-part2-row" style={{ display: 'none' }}>
              <label>Bride's Hair Part II:</label>
              <input type="number" id="settings-bride-hair-part2-duration" defaultValue={30} min={15} max={120} /> min
            </div>
            <div className="duration-row">
              <label>Guest Makeup:</label>
              <input type="number" id="settings-guest-makeup-duration" defaultValue={45} min={15} max={120} /> min
            </div>
            <div className="duration-row">
              <label>Guest Hair:</label>
              <input type="number" id="settings-guest-hair-duration" defaultValue={45} min={15} max={120} /> min
            </div>
          </div>
        </div>
        <div className="modal-footer">
          <button id="save-settings-btn" className="btn btn-primary">Save Settings</button>
        </div>
      </div>
    </div>
  );
}
