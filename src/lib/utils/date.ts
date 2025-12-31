/**
 * Format a date string to a compact format
 * @param dateString - ISO date string (YYYY-MM-DD)
 * @returns Formatted date string (e.g., "10-23-2025")
 */
export function formatDate(dateString: string): string {
	const [year, month, day] = dateString.split('-');
	return `${month}-${day}-${year}`;
}
