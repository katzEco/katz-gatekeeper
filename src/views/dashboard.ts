// ponytail: pure brutalist RawBlock HTML dashboard using DESIGN.md (Catppuccin Macchiato + Sapphire)
import { dbService } from "../db";
import { botState } from "../bot/discord";
import { getInviteUrl } from "../index";

export async function renderDashboardHtml(): Promise<string> {
  const [servers, rooms, whitelist] = await Promise.all([
    dbService.getAllServers().catch(() => []),
    dbService.getRooms().catch(() => []),
    dbService.getWhitelist().catch(() => []),
  ]);

  const inviteUrl = getInviteUrl();
  const uptimeMinutes = Math.floor(process.uptime() / 60);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>GATEKEEPER // CONTROL DASHBOARD</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Archivo+Black&family=Space+Mono:ital,wght@0,400;0,700;1,400&family=Work+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    /* Catppuccin Macchiato & RawBlock Design System Tokens */
    :root {
      --base: #24273a;
      --mantle: #1e2030;
      --crust: #181926;
      --surface-0: #363a4f;
      --surface-1: #494d64;
      --surface-2: #5b6078;
      --text: #cad3f5;
      --subtext-1: #b8c0e0;
      --subtext-0: #a5adcb;
      --overlay-0: #6e738d;
      --sapphire: #7dc4e4;
      --green: #a6da95;
      --peach: #f5a97f;
      --red: #ed8796;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      border-radius: 0px !important; /* radius-none: 0px everywhere */
      box-shadow: none !important;     /* shadow-none */
    }

    body {
      background-color: var(--base);
      color: var(--text);
      font-family: 'Work Sans', sans-serif;
      font-size: 16px;
      line-height: 1.6;
      padding: 32px 24px;
      max-width: 1400px;
      margin: 0 auto;
    }

    h1, h2, h3, h4 {
      font-family: 'Archivo Black', sans-serif;
      text-transform: uppercase;
      letter-spacing: -0.5px;
      line-height: 1.1;
      color: var(--text);
    }

    h1 { font-size: clamp(32px, 5vw, 56px); margin-bottom: 8px; }
    h2 { font-size: 24px; margin-bottom: 16px; }
    h3 { font-size: 18px; margin-bottom: 12px; }

    .mono {
      font-family: 'Space Mono', monospace;
    }

    /* Top Brutalist Header */
    header {
      background-color: var(--surface-0);
      border: 5px solid var(--crust);
      padding: 24px;
      margin-bottom: 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 20px;
    }

    .brand-title {
      display: flex;
      flex-direction: column;
    }

    .brand-subtitle {
      font-family: 'Space Mono', monospace;
      font-size: 13px;
      color: var(--sapphire);
      text-transform: uppercase;
      letter-spacing: 1px;
    }

    /* Chips */
    .chip-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
    }

    .chip {
      display: inline-flex;
      align-items: center;
      gap: 8px;
      padding: 4px 12px;
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 1px;
      background-color: var(--base);
      border: 2px solid var(--crust);
    }

    .chip-success {
      color: var(--green);
      border-color: var(--green);
    }

    .chip-error {
      color: var(--red);
      border-color: var(--red);
    }

    .chip-sapphire {
      color: var(--sapphire);
      border-color: var(--sapphire);
    }

    /* Buttons */
    .btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      padding: 10px 24px;
      font-family: 'Work Sans', sans-serif;
      font-size: 14px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 2px;
      cursor: pointer;
      text-decoration: none;
      transition: background-color 0.1s, color 0.1s;
    }

    .btn-primary {
      background-color: var(--sapphire);
      color: var(--crust);
      border: 3px solid var(--crust);
    }

    .btn-primary:hover {
      background-color: var(--base);
      color: var(--sapphire);
    }

    .btn-secondary {
      background-color: var(--surface-0);
      color: var(--text);
      border: 3px solid var(--crust);
    }

    .btn-secondary:hover {
      background-color: var(--crust);
      color: var(--sapphire);
    }

    .btn-destructive {
      background-color: var(--red);
      color: var(--crust);
      border: 3px solid var(--crust);
      padding: 6px 14px;
      font-size: 11px;
    }

    .btn-destructive:hover {
      background-color: var(--crust);
      color: var(--red);
    }

    /* Cards */
    .card {
      background-color: var(--surface-0);
      border: 3px solid var(--crust);
      padding: 24px;
      margin-bottom: 24px;
    }

    .card-elevated {
      border: 5px solid var(--sapphire);
    }

    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid var(--crust);
      padding-bottom: 12px;
      margin-bottom: 20px;
    }

    /* Metrics Grid */
    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 20px;
      margin-bottom: 32px;
    }

    .metric-card {
      background-color: var(--mantle);
      border: 3px solid var(--crust);
      padding: 20px;
      border-left: 6px solid var(--sapphire);
    }

    .metric-val {
      font-family: 'Archivo Black', sans-serif;
      font-size: 36px;
      color: var(--sapphire);
      line-height: 1;
      margin-bottom: 4px;
    }

    .metric-label {
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      text-transform: uppercase;
      color: var(--subtext-0);
      letter-spacing: 1px;
    }

    /* Layout Split */
    .layout-split {
      display: grid;
      grid-template-columns: 1fr;
      gap: 24px;
    }

    @media (min-width: 992px) {
      .layout-split {
        grid-template-columns: 1.5fr 1fr;
      }
    }

    /* Form Inputs */
    .form-group {
      margin-bottom: 16px;
    }

    label {
      display: block;
      font-family: 'Archivo Black', sans-serif;
      font-size: 12px;
      text-transform: uppercase;
      color: var(--text);
      margin-bottom: 6px;
      letter-spacing: 0.5px;
    }

    input, select {
      width: 100%;
      background-color: var(--mantle);
      color: var(--text);
      border: 3px solid var(--crust);
      font-family: 'Space Mono', monospace;
      font-size: 14px;
      padding: 10px 12px;
    }

    input:focus, select:focus {
      outline: none;
      border: 5px solid var(--sapphire);
    }

    /* Tables */
    .table-container {
      overflow-x: auto;
      border: 3px solid var(--crust);
      background-color: var(--mantle);
    }

    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }

    th {
      background-color: var(--crust);
      color: var(--sapphire);
      font-family: 'Archivo Black', sans-serif;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      padding: 12px;
      border-bottom: 3px solid var(--crust);
    }

    td {
      padding: 12px;
      font-family: 'Space Mono', monospace;
      font-size: 13px;
      border-bottom: 1px solid var(--crust);
      color: var(--text);
    }

    tr:hover td {
      background-color: var(--surface-0);
    }

    /* Live Check Box */
    .test-box {
      background-color: var(--mantle);
      border: 3px solid var(--crust);
      padding: 20px;
    }

    #testResult {
      margin-top: 16px;
      padding: 12px;
      display: none;
      font-family: 'Space Mono', monospace;
      font-weight: 700;
      font-size: 13px;
      border: 2px solid;
    }
  </style>
</head>
<body>

  <!-- Top Brutalist Header -->
  <header>
    <div class="brand-title">
      <span class="brand-subtitle">// RAWBLOCK ACCESS GATEWAY</span>
      <h1>GATEKEEPER</h1>
    </div>

    <div class="chip-bar">
      <div class="chip ${botState.connected ? "chip-success" : "chip-error"}">
        BOT: ${botState.connected ? `ONLINE (${botState.tag})` : "OFFLINE"}
      </div>
      <div class="chip chip-success">
        POSTGRES: 5431/gatekeeper
      </div>
      <div class="chip chip-success">
        REDIS: 6380
      </div>
      <div class="chip chip-sapphire">
        UPTIME: ${uptimeMinutes}M
      </div>
      ${
        inviteUrl
          ? `<a href="${inviteUrl}" target="_blank" class="btn btn-primary" style="padding: 6px 16px; font-size: 12px;">+ INVITE BOT</a>`
          : ""
      }
    </div>
  </header>

  <!-- Metrics Grid -->
  <div class="metrics-grid">
    <div class="metric-card">
      <div class="metric-val">${servers.length}</div>
      <div class="metric-label">Target Servers</div>
    </div>
    <div class="metric-card">
      <div class="metric-val">${rooms.length}</div>
      <div class="metric-label">Monitored Rooms</div>
    </div>
    <div class="metric-card">
      <div class="metric-val">${whitelist.length}</div>
      <div class="metric-label">Whitelisted Entities</div>
    </div>
    <div class="metric-card">
      <div class="metric-val">${botState.ping >= 0 ? `${botState.ping}MS` : "HTTP"}</div>
      <div class="metric-label">Gateway Latency</div>
    </div>
  </div>

  <div class="layout-split">
    <!-- Left Main Column: Whitelist Manager & Table -->
    <div>
      <div class="card card-elevated">
        <div class="card-header">
          <h2>WHITELIST REGISTRY</h2>
          <span class="mono" style="font-size: 12px; color: var(--subtext-0);">${whitelist.length} TOTAL ENTRIES</span>
        </div>

        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Server ID</th>
                <th>Target ID</th>
                <th>Type</th>
                <th>Reason</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              ${
                whitelist.length === 0
                  ? `<tr><td colspan="5" style="text-align: center; color: var(--overlay-0); padding: 24px;">NO WHITELISTED ENTRIES FOUND</td></tr>`
                  : whitelist
                      .map(
                        (w) => `
                <tr>
                  <td>${w.server_id}</td>
                  <td style="color: var(--sapphire); font-weight: 700;">${w.target_id}</td>
                  <td><span class="chip chip-sapphire" style="font-size: 9px; padding: 2px 6px;">${w.target_type}</span></td>
                  <td>${w.reason || "-"}</td>
                  <td>
                    <button class="btn btn-destructive" onclick="removeWhitelist('${w.server_id}', '${w.target_id}')">REMOVE</button>
                  </td>
                </tr>
              `
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>

      <!-- Target Servers & Monitored Rooms -->
      <div class="card">
        <div class="card-header">
          <h2>TARGET GUILDS & ROOMS</h2>
        </div>
        <div class="table-container">
          <table>
            <thead>
              <tr>
                <th>Server ID</th>
                <th>Server Name</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              ${
                servers.length === 0
                  ? `<tr><td colspan="4" style="text-align: center; color: var(--overlay-0); padding: 20px;">NO TARGET SERVERS REGISTERED</td></tr>`
                  : servers
                      .map(
                        (s) => `
                <tr>
                  <td class="mono">${s.id}</td>
                  <td style="font-weight: 700;">${s.name}</td>
                  <td><span class="chip ${s.enabled ? "chip-success" : "chip-error"}" style="font-size: 9px; padding: 2px 6px;">${s.enabled ? "ACTIVE" : "DISABLED"}</span></td>
                  <td>
                    <button class="btn btn-destructive" onclick="removeServer('${s.id}', '${s.name.replace(/'/g, "\\'")}')">REMOVE</button>
                    <button class="btn btn-secondary" style="padding: 6px 10px; font-size: 11px; margin-left: 6px;" onclick="clearServerWhitelist('${s.id}')">CLEAR WL</button>
                  </td>
                </tr>
              `
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Right Column: Add Entry & Quick Access Tester -->
    <div>
      <!-- Whitelist Add Form -->
      <div class="card">
        <div class="card-header">
          <h3>ADD WHITELIST ENTRY</h3>
        </div>
        <form id="addWhitelistForm" onsubmit="addWhitelist(event)">
          <div class="form-group">
            <label>Server / Guild</label>
            ${
              servers.length > 0
                ? `<select id="wlServerId">
                    ${servers.map((s) => `<option value="${s.id}">${s.name} (${s.id})</option>`).join("")}
                  </select>`
                : `<input type="text" id="wlServerId" placeholder="e.g. 1525008222077976597" required>`
            }
          </div>
          <div class="form-group">
            <label>User or Role ID</label>
            <input type="text" id="wlTargetId" placeholder="e.g. 456789012345678901" required>
          </div>
          <div class="form-group">
            <label>Target Type</label>
            <select id="wlTargetType">
              <option value="user">USER</option>
              <option value="role">ROLE</option>
            </select>
          </div>
          <div class="form-group">
            <label>Reason / Note</label>
            <input type="text" id="wlReason" placeholder="e.g. Core Moderator">
          </div>
          <button type="submit" class="btn btn-primary" style="width: 100%;">GRANT WHITELIST ACCESS</button>
        </form>
      </div>

      <!-- Server Registration Form -->
      <div class="card">
        <div class="card-header">
          <h3>REGISTER SERVER</h3>
        </div>
        <form id="addServerForm" onsubmit="addServer(event)">
          <div class="form-group">
            <label>Guild / Server ID</label>
            <input type="text" id="srvId" placeholder="e.g. 1525008222077976597" required>
          </div>
          <div class="form-group">
            <label>Guild Name</label>
            <input type="text" id="srvName" placeholder="e.g. Community Gate" required>
          </div>
          <button type="submit" class="btn btn-secondary" style="width: 100%;">REGISTER GUILD</button>
        </form>
      </div>

      <!-- Real-Time Access Check Tester -->
      <div class="card test-box">
        <div class="card-header">
          <h3>REAL-TIME ACCESS CHECK</h3>
        </div>
        <div class="form-group">
          <label>Server ID</label>
          <input type="text" id="testServerId" placeholder="Guild ID">
        </div>
        <div class="form-group">
          <label>Target ID</label>
          <input type="text" id="testTargetId" placeholder="User or Role ID">
        </div>
        <button type="button" class="btn btn-secondary" style="width: 100%;" onclick="runAccessCheck()">VERIFY ACCESS (CACHE & DB)</button>
        <div id="testResult"></div>
      </div>

      <!-- Room Connection Permission Swapper -->
      <div class="card test-box">
        <div class="card-header">
          <h3>SWAP ROOM ROLE ACCESS</h3>
        </div>
        <div class="form-group">
          <label>Target Room ID</label>
          <input type="text" id="swapRoomId" placeholder="Voice or Channel ID">
        </div>
        <div class="form-group">
          <label>Target Role ID</label>
          <input type="text" id="swapRoleId" placeholder="Discord Role ID">
        </div>
        <button type="button" class="btn btn-primary" style="width: 100%;" onclick="runSwapConnection()">SWAP ALLOW CONNECTION</button>
        <div id="swapResult" style="margin-top: 16px; padding: 12px; display: none; font-family: 'Space Mono', monospace; font-weight: 700; font-size: 13px; border: 2px solid;"></div>
      </div>
    </div>
  </div>

  <script>
    async function addWhitelist(e) {
      e.preventDefault();
      const serverId = document.getElementById('wlServerId').value.trim();
      const targetId = document.getElementById('wlTargetId').value.trim();
      const targetType = document.getElementById('wlTargetType').value;
      const reason = document.getElementById('wlReason').value.trim();

      const res = await fetch('/api/whitelist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId, targetId, targetType, reason })
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json();
        alert('Error: ' + (err.error || 'Failed to add whitelist'));
      }
    }

    async function removeWhitelist(serverId, targetId) {
      if (!confirm('Revoke whitelist access for ' + targetId + '?')) return;
      const res = await fetch('/api/whitelist', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ serverId, targetId })
      });

      if (res.ok) {
        window.location.reload();
      } else {
        alert('Failed to remove entry');
      }
    }

    async function addServer(e) {
      e.preventDefault();
      const id = document.getElementById('srvId').value.trim();
      const name = document.getElementById('srvName').value.trim();

      const res = await fetch('/api/servers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, name, enabled: true })
      });

      if (res.ok) {
        window.location.reload();
      } else {
        const err = await res.json();
        alert('Failed to register server');
      }
    }

    async function removeServer(id, name) {
      if (!confirm('Permanently remove target server ' + (name || id) + ' and all associated whitelist/rooms?')) return;
      const res = await fetch('/api/servers', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id })
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('Failed to remove target server');
      }
    }

    async function clearServerWhitelist(serverId) {
      if (!confirm('Remove ALL whitelist entries for server ' + serverId + '?')) return;
      const res = await fetch('/api/whitelist?serverId=' + encodeURIComponent(serverId), {
        method: 'DELETE'
      });
      if (res.ok) {
        window.location.reload();
      } else {
        alert('Failed to clear whitelist for server');
      }
    }

    async function runAccessCheck() {
      const serverId = document.getElementById('testServerId').value.trim();
      const targetId = document.getElementById('testTargetId').value.trim();
      const box = document.getElementById('testResult');

      if (!serverId || !targetId) {
        alert('Please provide both Server ID and Target ID');
        return;
      }

      const res = await fetch('/api/whitelist/check?serverId=' + encodeURIComponent(serverId) + '&targetId=' + encodeURIComponent(targetId));
      const data = await res.json();

      box.style.display = 'block';
      if (data.allowed) {
        box.style.borderColor = 'var(--green)';
        box.style.color = 'var(--green)';
        box.style.backgroundColor = 'var(--crust)';
        box.innerText = 'ACCESS GRANTED // ENTITY IS ON WHITELIST';
      } else {
        box.style.borderColor = 'var(--red)';
        box.style.color = 'var(--red)';
        box.style.backgroundColor = 'var(--crust)';
        box.innerText = 'ACCESS DENIED // ENTITY NOT WHITELISTED';
      }
    }

    async function runSwapConnection() {
      const roomId = document.getElementById('swapRoomId').value.trim();
      const roleId = document.getElementById('swapRoleId').value.trim();
      const box = document.getElementById('swapResult');

      if (!roomId || !roleId) {
        alert('Please provide both Room ID and Role ID');
        return;
      }

      const res = await fetch('/api/rooms/swap-connection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roomId, roleId })
      });

      const data = await res.json();
      box.style.display = 'block';

      if (res.ok) {
        const isAllowed = data.allowed;
        box.style.borderColor = isAllowed ? 'var(--green)' : 'var(--red)';
        box.style.color = isAllowed ? 'var(--green)' : 'var(--red)';
        box.style.backgroundColor = 'var(--crust)';
        box.innerText = 'SWAPPED // CONNECTION ACCESS: ' + (isAllowed ? 'ALLOWED' : 'DENIED') + ' (' + (data.roleName || roleId) + ')';
      } else {
        box.style.borderColor = 'var(--red)';
        box.style.color = 'var(--red)';
        box.style.backgroundColor = 'var(--crust)';
        box.innerText = 'ERROR // ' + (data.error || 'Failed to swap connection');
      }
    }
  </script>
</body>
</html>
`;
}
