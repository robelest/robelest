/**
 * Format a date string to a compact format
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "10-23-2025")
 */
export function formatDate(dateString: string): string {
	const date = new Date(dateString);
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	const year = date.getFullYear();
	return `${month}-${day}-${year}`;
}

/**
 * Format a date string to a short format for compact lists
 * @param dateString - ISO date string
 * @returns Formatted date string (e.g., "Mar 24")
 */
export function formatShortDate(dateString: string): string {
	const date = new Date(dateString);
	const month = date.toLocaleString('en-US', { month: 'short' });
	const year = String(date.getFullYear()).slice(-2);
	return `${month} '${year}`;
}
