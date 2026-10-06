// Target Online Gate Plugin for xyOps
// Copyright (c) 2026 Felix Bartels
// MIT License

// Trigger Plugin: launch a scheduled job only if one of its targets is online.
// If all targets are offline, one job may still launch and wait in the queue.
// Further jobs are skipped while that job is pending.
// The event needs a Max Queue Limit of at least 1 for the queued job.
// Targets may be server IDs or group IDs. Events without targets always launch.
// Needs an API key in the XYOPS_API_KEY secret variable.

// Wrapped in an async function, because the temp file may not load as a module.
(async () => {
	const chunks = [];
	for await (const chunk of process.stdin) chunks.push(chunk);
	const data = JSON.parse(chunks.join(''));

	const baseUrl = data.base_url || process.env.XYOPS_BASE_URL;
	const apiKey = (data.secrets && data.secrets.XYOPS_API_KEY) || process.env.XYOPS_API_KEY;

	const api = async (name) => {
		const res = await fetch(`${baseUrl}/api/app/${name}/v1`, { headers: { 'X-API-Key': apiKey } });
		const body = await res.json();
		if (body.code) throw new Error(body.description || `API error ${body.code}`);
		return body.rows || [];
	};

	let servers = null;
	try {
		servers = (await api('get_active_servers')).filter((s) => s.enabled);
	} catch (err) {
		// Fail open, so a broken check never silently stops all jobs.
		console.error(`Server lookup failed, launching anyway: ${err.message}`);
	}

	// The input active_jobs list does not contain queued jobs, so ask the API.
	// Null means unknown, and offline events are then skipped to avoid aborts.
	let pending = null;
	try {
		pending = new Set((await api('get_active_jobs')).map((job) => job.event));
	} catch (err) {
		console.error(`Job lookup failed, skipping offline events: ${err.message}`);
	}

	data.items.forEach((item) => {
		const targets = item.job.targets || [];
		const online = !servers || !targets.length || servers.some((s) =>
			targets.includes(s.id) || (s.groups || []).some((g) => targets.includes(g))
		);
		item.launch = online || (pending !== null && !pending.has(item.job.id));
		// Remember launches, so one batch never queues two jobs for an event.
		if (item.launch && pending) pending.add(item.job.id);
	});

	process.stdout.write(JSON.stringify({ xy: 1, items: data.items }) + '\n');
})();
