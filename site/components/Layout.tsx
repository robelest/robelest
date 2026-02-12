import type { PropsWithChildren } from 'hono/jsx';

type LayoutProps = PropsWithChildren<{
	title: string;
	description?: string;
	ogUrl?: string;
	ogType?: string;
	bodyClass?: string;
	head?: any;
}>;

export default function Layout({
	title,
	description = 'Building software that amplifies human compassion.',
	ogUrl = 'https://robelestifanos.com',
	ogType = 'website',
	children,
	bodyClass,
	head,
}: LayoutProps) {
	return (
		<html lang="en">
			<head>
				<meta charset="utf-8" />
				<meta name="viewport" content="width=device-width, initial-scale=1" />
				<title>{title}</title>
				<meta name="description" content={description} />

				{/* Open Graph */}
				<meta property="og:title" content={title} />
				<meta property="og:description" content={description} />
				<meta property="og:url" content={ogUrl} />
				<meta property="og:type" content={ogType} />
				<meta property="og:image" content="/logo512.png" />

				{/* Twitter Card */}
				<meta name="twitter:card" content="summary_large_image" />
				<meta name="twitter:title" content={title} />
				<meta name="twitter:description" content={description} />
				<meta name="twitter:image" content="/logo512.png" />

				{/* Styles */}
				<link rel="stylesheet" href="/styles.css" />
				<link
					rel="stylesheet"
					href="https://cdn.jsdelivr.net/npm/katex@0.16.27/dist/katex.min.css"
				/>

				{head}
			</head>
			<body class={bodyClass}>
				<a
					href="#main-content"
					class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-50 focus:px-4 focus:py-2 focus:bg-th-accent focus:text-white focus:rounded"
				>
					Skip to main content
				</a>

				<div id="main-content" class="min-h-screen bg-th-base text-th-text">
					{children}
				</div>

				<div id="react-root"></div>
				<script type="module" src="/client.js"></script>
			</body>
		</html>
	);
}
