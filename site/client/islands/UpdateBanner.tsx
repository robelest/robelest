import { createSignal, createMemo, Show, onMount } from "solid-js";
import { useQuery } from "convex-solidjs";
import { api } from "../../../convex/_generated/api.js";

export function UpdateBanner() {
	const deployment = useQuery(
		(api as any).staticHosting.getCurrentDeployment,
		{},
	);

	const [dismissedId, setDismissedId] = createSignal<string | null>(null);

	// Capture the deployment ID present when the page first loaded.
	// Component body runs once in Solid, so this is safe as a plain let.
	let initialId: string | null = null;

	const updateAvailable = createMemo(() => {
		const d = deployment.data();
		if (!d) return false;

		// Latch the first deployment we see
		if (initialId === null) {
			initialId = d.currentDeploymentId;
			return false;
		}

		return (
			d.currentDeploymentId !== initialId &&
			d.currentDeploymentId !== dismissedId()
		);
	});

	const dismiss = () => {
		const d = deployment.data();
		if (d) setDismissedId(d.currentDeploymentId);
	};

	return (
		<Show when={updateAvailable()}>
			<div class="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded border border-th-border bg-th-surface px-4 py-3 text-sm text-th-text shadow-lg">
				<span style={{ "font-family": "var(--font-display)" }}>
					A new version is available
				</span>
				<button
					onClick={() => window.location.reload()}
					class="rounded bg-th-accent px-3 py-1 text-xs font-medium text-th-base transition-colors hover:bg-th-accent-hover"
				>
					Reload
				</button>
				<button
					onClick={dismiss}
					aria-label="Dismiss"
					class="text-th-muted transition-colors hover:text-th-text"
				>
					&times;
				</button>
			</div>
		</Show>
	);
}
