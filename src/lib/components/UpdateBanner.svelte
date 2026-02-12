<script lang="ts">
  import { useQuery } from 'convex-svelte';
  import { api } from '../../../convex/_generated/api';

  const deployment = useQuery(api.staticHosting.getCurrentDeployment, {});

  let initialId: string | null = $state(null);
  let dismissed = $state(false);

  $effect(() => {
    const id = deployment.data?._id;
    if (id && initialId === null) {
      initialId = id;
    }
  });

  const showBanner = $derived(
    initialId !== null &&
    deployment.data?._id !== undefined &&
    deployment.data._id !== initialId &&
    !dismissed
  );
</script>

{#if showBanner}
  <div class="fixed bottom-4 right-4 z-50 flex items-center gap-3 rounded border border-th-border bg-th-surface px-4 py-3 text-sm text-th-text shadow-lg">
    <span style="font-family: var(--font-display)">A new version is available</span>
    <button
      class="rounded bg-th-accent px-3 py-1 text-xs font-medium text-th-base transition-colors hover:bg-th-accent-hover"
      onclick={() => window.location.reload()}
    >
      Reload
    </button>
    <button
      class="text-th-muted transition-colors hover:text-th-text"
      aria-label="Dismiss"
      onclick={() => (dismissed = true)}
    >
      ×
    </button>
  </div>
{/if}
