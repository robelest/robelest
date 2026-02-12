import { createSignal, createEffect, Show } from "solid-js";
import { useQuery } from "convex-solidjs";
import { api } from "../../../convex/_generated/api.js";

export function UpdateBanner() {
	const deployment = useQuery(
		(api as any).staticHosting.getCurrentDeployment,
		{},
	);

	const [initialId, setInitialId] = createSignal<string | null>(null);
	const [dismissedId, setDismissedId] = createSignal<string | null>(null);

	// Capture the initial deployment ID on first load
	createEffect(() => {
		const d = deployment.data();
		if (d && initialId() === null) {
			setInitialId(d.currentDeploymentId);
		}
	});

	const updateAvailable = () => {
		const d = deployment.data();
		const init = initialId();
		if (!d || init === null) return false;
		return d.currentDeploymentId !== init && d.currentDeploymentId !== dismissedId();
	};

	const reload = () => window.location.reload();

	const dismiss = () => {
		const d = deployment.data();
		if (d) setDismissedId(d.currentDeploymentId);
	};

	return (
		<Show when={updateAvailable()}>
			<div
				style={{
					position: "fixed",
					bottom: "1rem",
					right: "1rem",
					"background-color": "#1a1a2e",
					color: "#fff",
					padding: "1rem 1.5rem",
					"border-radius": "8px",
					"box-shadow": "0 4px 12px rgba(0, 0, 0, 0.3)",
					display: "flex",
					"align-items": "center",
					gap: "1rem",
					"z-index": 9999,
					"font-family": "system-ui, -apple-system, sans-serif",
					"font-size": "14px",
				}}
			>
				<span>A new version is available!</span>
				<button
					onClick={reload}
					style={{
						"background-color": "#4f46e5",
						color: "#fff",
						border: "none",
						padding: "0.5rem 1rem",
						"border-radius": "4px",
						cursor: "pointer",
						"font-weight": 500,
					}}
				>
					Reload
				</button>
				<button
					onClick={dismiss}
					aria-label="Dismiss"
					style={{
						background: "none",
						border: "none",
						color: "#888",
						cursor: "pointer",
						padding: "0.25rem",
						"font-size": "18px",
						"line-height": 1,
					}}
				>
					&times;
				</button>
			</div>
		</Show>
	);
}
