<p align="center"><img src="https://git.9wd.eu/apps/xyplug-target-online-gate/raw/branch/main/logo.png" height="160" alt="Target Online Gate"/></p>
<h1 align="center">Target Online Gate</h1>

Skip scheduled jobs while every target server of an event is offline, instead of piling up aborted or queued jobs.

This is a [xyOps](https://xyops.io) Trigger Plugin, written in plain Node.js with no dependencies and shipped as an inline script. Add it to any scheduled event that targets servers which are not always online, such as laptops, workstations, or machines that sleep at night.

## Features

- Launches a scheduled job if at least one of the event's targets is online.
- Targets may be individual servers or server groups.
- While all targets are offline, lets **one** job launch and wait in the queue, so the work runs as soon as a target comes back. Further runs are skipped while that job is pending.
- Events without targets always launch.
- Fails open: if the server lookup fails, jobs launch as if the plugin were not there.
- Uses only documented, read-only xyOps APIs.

## Requirements

- xyOps 1.1.4 or newer.
- Node.js 18 or newer on the primary conductor. Trigger Plugins run on the primary conductor, and xyOps itself runs on Node.js, so no extra software is needed.
- A xyOps API key stored in a Secret Vault as `XYOPS_API_KEY`.

## Installation

Install **Target Online Gate** from the xyOps Marketplace, or import the plugin file directly:

1. Download [`xyops.json`](https://git.9wd.eu/apps/xyplug-target-online-gate/raw/tag/v1.0.0/xyops.json) from the release you want.
2. In the xyOps UI, click **Plugins** in the sidebar, then **Import File...**, or run `xy import xyops.json --confirm`.

The source lives at [git.9wd.eu/apps/xyplug-target-online-gate](https://git.9wd.eu/apps/xyplug-target-online-gate). The GitHub repository is a read-only mirror for the marketplace; please report issues on the main repository.

## Secret Vault / API Key Setup

1. In the xyOps UI, click **API Keys** in the sidebar and create a new API key. No special privileges are needed; the plugin only reads active servers and active jobs.
2. Click **Secrets** in the sidebar and create a new Secret Vault.
3. Add the variable `XYOPS_API_KEY` with the API key as its value.
4. Assign the Secret Vault to the **Target Online Gate** plugin.

## Event Setup

1. Edit the event you want to gate.
2. Keep its normal schedule trigger (for example hourly). The schedule decides *when* the plugin is consulted.
3. Add a **Plugin** trigger and select **Target Online Gate**. It has no parameters.
4. Under limits, add a **Max Queue Limit** of at least `1`, and a **Max Jobs Limit** (xyOps requires one whenever queueing is enabled). Without a queue limit, the one job that is allowed through while all targets are offline is aborted with "No available servers matching targets".

## How It Decides

On every scheduled run, the plugin fetches the active servers ([get_active_servers](https://docs.xyops.io/#Docs/api/get_active_servers)) and the active jobs ([get_active_jobs](https://docs.xyops.io/#Docs/api/get_active_jobs)), which includes queued jobs. Disabled servers count as offline.

| Situation | Result |
|-----------|--------|
| Event has no targets | Launch |
| At least one target server, or a server in a target group, is online | Launch |
| All targets offline, no job of this event is active or queued | Launch (job waits in the queue) |
| All targets offline, a job of this event is already active or queued | Skip |
| Server lookup failed (for example missing or invalid `XYOPS_API_KEY`) | Launch (fail open) |
| Server lookup worked, job lookup failed, all targets offline | Skip (avoids aborted jobs) |

If the same event is scheduled several times in one batch (for example when catching up on missed runs), at most one of those runs is queued.

Lookup errors are written to STDERR.

## Local Testing

The plugin reads a trigger payload on STDIN and writes its decisions to STDOUT. To test it against a real xyOps instance:

```sh
export XYOPS_API_KEY="YOUR_API_KEY_HERE"

cat <<'JSON' | node index.js
{
  "xy": 1,
  "type": "trigger",
  "base_url": "https://xyops.example.com",
  "secrets": {},
  "active_jobs": [],
  "items": [
    { "params": {}, "job": { "id": "etest1", "title": "Test", "targets": ["main"] } }
  ]
}
JSON
```

Replace `https://xyops.example.com` with your xyOps URL and `main` with a server or group ID. Each output item has `"launch": true` or `"launch": false`.

## Development

The plugin source lives in `index.js`. The marketplace installs the copy embedded in `xyops.json`, so run this after every change to `index.js`:

```sh
npm run build
```

## Data Collection

This plugin does not collect telemetry, analytics, or usage metrics. It only talks to your own xyOps instance.

## License

MIT
