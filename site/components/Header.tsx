export default function Header({ title = 'Robel Estifanos' }: { title?: string }) {
	return (
		<header class="w-full max-w-3xl mx-auto px-4 sm:px-6 pt-10 sm:pt-16 pb-6">
			<nav class="flex items-center justify-between" aria-label="Main navigation">
				<a
					href="/"
					class="text-lg sm:text-xl md:text-2xl text-th-text"
					style="font-family: var(--font-display);"
				>
					{title}
				</a>
			</nav>
		</header>
	);
}
