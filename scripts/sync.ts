#!/usr/bin/env bun

import { readdir, readFile, writeFile, stat, mkdir, unlink } from "fs/promises";
import { join, basename } from "path";
import { execSync } from "child_process";
import { createHash } from "crypto";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import matter from "gray-matter";

const CONTENT_DIR = join(process.cwd(), "journal");
const BUILD_DIR = join(process.cwd(), ".build");
const TEMPLATES_DIR = join(CONTENT_DIR, "templates");

interface Frontmatter {
	title: string;
	slug?: string;
	description?: string;
	tags?: string[];
	publishDate?: string | Date;
	published?: boolean;
	featured?: boolean;
	category?: string;
}

interface SyncResult {
	slug: string;
	action: "created" | "updated" | "skipped" | "deleted" | "error";
	error?: string;
}

async function ensureDir(dir: string) {
	try {
		await mkdir(dir, { recursive: true });
	} catch {
		// Directory exists
	}
}

function deriveSlug(filename: string): string {
	return basename(filename, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function deriveDateFromFilename(filename: string): string {
	const match = filename.match(/^(\d{4}-\d{2}-\d{2})/);
	return match ? match[1] : new Date().toISOString().split("T")[0];
}

// Convert markdown to Typst format
function markdownToTypst(
	markdown: string,
	frontmatter: Frontmatter
): string {
	let typst = `#import "templates/whitepaper.typ": whitepaper

#show: whitepaper.with(
  title: "${escapeTypstString(frontmatter.title)}",
  ${frontmatter.description ? `abstract: [${frontmatter.description}],` : ""}
  show-toc: true,
)

`;

	// Convert markdown body to Typst
	typst += convertMarkdownBodyToTypst(markdown);
	return typst;
}

function escapeTypstString(str: string): string {
	return str.replace(/"/g, '\\"').replace(/\\/g, "\\\\");
}

// Escape special Typst characters in content blocks (like table cells)
// @ is used for references/citations in Typst, so we escape it
function escapeTypstContent(text: string): string {
	return text.replace(/@/g, "\\@");
}

function convertMarkdownBodyToTypst(markdown: string): string {
	let result = markdown;

	// Convert headers
	result = result.replace(/^### (.+)$/gm, "=== $1");
	result = result.replace(/^## (.+)$/gm, "== $1");
	result = result.replace(/^# (.+)$/gm, "= $1");

	// Convert bold and italic (before other inline formatting)
	result = result.replace(/\*\*\*(.+?)\*\*\*/g, "_*$1*_"); // bold+italic
	result = result.replace(/\*\*(.+?)\*\*/g, "*$1*"); // bold
	// Don't convert single asterisks to avoid conflict with already converted bold
	result = result.replace(/__(.+?)__/g, "*$1*"); // bold (underscore)

	// Convert links [text](url) - before code blocks to avoid issues
	result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, "#link(\"$2\")[$1]");

	// Convert block math $$...$$ to Typst $ ... $
	// Need to convert LaTeX syntax to Typst math syntax
	result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
		const typstMath = convertLatexToTypstMath(math.trim());
		return `$ ${typstMath} $`;
	});

	// Convert inline math $...$ (but not $$)
	result = result.replace(/(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)/g, (_, math) => {
		const typstMath = convertLatexToTypstMath(math.trim());
		return `$${typstMath}$`;
	});

	// Convert code blocks with language - skip mermaid for now (pintorita has issues)
	result = result.replace(
		/```(\w+)\n([\s\S]*?)```/g,
		(_, lang, code) => {
			// Skip mermaid diagrams - just show as code for now
			// TODO: Re-enable when pintorita works
			return `\`\`\`${lang}\n${code.trim()}\n\`\`\``;
		}
	);

	// Convert plain code blocks
	result = result.replace(/```\n([\s\S]*?)```/g, "```\n$1```");

	// Convert unordered lists
	result = result.replace(/^(\s*)[-*] (.+)$/gm, (_, indent, text) => {
		const level = Math.floor(indent.length / 2);
		return "  ".repeat(level) + "- " + text;
	});

	// Convert ordered lists
	result = result.replace(/^(\s*)\d+\. (.+)$/gm, (_, indent, text) => {
		const level = Math.floor(indent.length / 2);
		return "  ".repeat(level) + "+ " + text;
	});

	// Convert blockquotes
	result = result.replace(/^> (.+)$/gm, "#quote[$1]");

	// Convert horizontal rules
	result = result.replace(/^---+$/gm, "#line(length: 100%)");

	// Convert images ![alt](src)
	result = result.replace(
		/!\[([^\]]*)\]\(([^)]+)\)/g,
		'#figure(image("$2"), caption: [$1])'
	);

	// Convert tables
	result = convertMarkdownTables(result);

	return result;
}

// Convert LaTeX math notation to Typst math notation
function convertLatexToTypstMath(latex: string): string {
	let result = latex;

	// Greek letters (already work in Typst, but ensure lowercase)
	// No conversion needed for most Greek letters

	// Common LaTeX commands to Typst
	result = result.replace(/\\mathbf\{([^}]+)\}/g, "bold($1)");
	result = result.replace(/\\mathit\{([^}]+)\}/g, "italic($1)");
	result = result.replace(/\\mathrm\{([^}]+)\}/g, "upright($1)");
	result = result.replace(/\\text\{([^}]+)\}/g, '"$1"');

	// Fractions
	result = result.replace(/\\frac\{([^}]+)\}\{([^}]+)\}/g, "($1) / ($2)");

	// Square root
	result = result.replace(/\\sqrt\{([^}]+)\}/g, "sqrt($1)");
	result = result.replace(/\\sqrt\[(\d+)\]\{([^}]+)\}/g, "root($1, $2)");

	// Subscripts and superscripts
	result = result.replace(/\^{([^}]+)}/g, "^($1)");
	result = result.replace(/_{([^}]+)}/g, "_($1)");

	// Infinity
	result = result.replace(/\\infty/g, "infinity");

	// Integrals
	result = result.replace(/\\int_\{([^}]+)\}\^\{([^}]+)\}/g, "integral_($1)^($2)");
	result = result.replace(/\\int/g, "integral");

	// Sum and product
	result = result.replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, "sum_($1)^($2)");
	result = result.replace(/\\prod_\{([^}]+)\}\^\{([^}]+)\}/g, "product_($1)^($2)");

	// dx, dy differentials - handle standalone dx
	result = result.replace(/\\,?d([xyz])\b/g, " dif $1");
	// Handle dx without backslash at word boundary
	result = result.replace(/\bd([xyz])\b(?!\w)/g, " dif $1");

	// Matrices - pmatrix
	result = result.replace(/\\begin\{pmatrix\}([\s\S]*?)\\end\{pmatrix\}/g, (_, content) => {
		// Convert LaTeX matrix to Typst mat()
		const rows = content.trim().split("\\\\").map((row: string) =>
			row.trim().split("&").map((cell: string) => cell.trim()).join(", ")
		);
		return `mat(\n  ${rows.join(";\n  ")};\n)`;
	});

	// Matrices - bmatrix
	result = result.replace(/\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/g, (_, content) => {
		const rows = content.trim().split("\\\\").map((row: string) =>
			row.trim().split("&").map((cell: string) => cell.trim()).join(", ")
		);
		return `mat(delim: "[",\n  ${rows.join(";\n  ")};\n)`;
	});

	// Common symbols
	result = result.replace(/\\cdot/g, "dot");
	result = result.replace(/\\times/g, "times");
	result = result.replace(/\\div/g, "div");
	result = result.replace(/\\pm/g, "plus.minus");
	result = result.replace(/\\leq/g, "<=");
	result = result.replace(/\\geq/g, ">=");
	result = result.replace(/\\neq/g, "!=");
	result = result.replace(/\\approx/g, "approx");
	result = result.replace(/\\equiv/g, "equiv");
	result = result.replace(/\\rightarrow/g, "->");
	result = result.replace(/\\leftarrow/g, "<-");
	result = result.replace(/\\Rightarrow/g, "=>");
	result = result.replace(/\\Leftarrow/g, "<=");

	// Remove remaining backslashes for common functions that work in Typst
	result = result.replace(/\\(sin|cos|tan|log|ln|exp|lim|max|min)/g, "$1");

	return result;
}

// Convert markdown tables to Typst tables
function convertMarkdownTables(markdown: string): string {
	// Match markdown table pattern
	const tableRegex = /\|(.+)\|\n\|[-|\s:]+\|\n((?:\|.+\|\n?)+)/gm;

	return markdown.replace(tableRegex, (match, headerRow, bodyRows) => {
		const headers = headerRow.split("|").map((h: string) => h.trim()).filter(Boolean);
		const rows = bodyRows.trim().split("\n").map((row: string) =>
			row.split("|").map((cell: string) => cell.trim()).filter(Boolean)
		);

		const colCount = headers.length;
		const colSpec = `(${Array(colCount).fill("1fr").join(", ")})`;

		let typstTable = `#table(\n  columns: ${colSpec},\n  inset: 8pt,\n`;

		// Add headers (bold)
		headers.forEach((h: string) => {
			typstTable += `  [*${escapeTypstContent(h)}*],\n`;
		});

		// Add body rows
		rows.forEach((row: string[]) => {
			row.forEach((cell) => {
				typstTable += `  [${escapeTypstContent(cell)}],\n`;
			});
		});

		typstTable += ")";
		return typstTable;
	});
}

async function main() {
	const convexUrl = process.env.PUBLIC_CONVEX_URL;
	if (!convexUrl) {
		console.error("Error: PUBLIC_CONVEX_URL environment variable not set");
		process.exit(1);
	}

	console.log("📝 Starting journal sync...\n");

	const client = new ConvexHttpClient(convexUrl);
	const results: SyncResult[] = [];

	// Ensure build directories exist
	const pdfDir = join(BUILD_DIR, "pdfs");
	const typstDir = join(BUILD_DIR, "typst");
	await ensureDir(pdfDir);
	await ensureDir(typstDir);

	// Check if content directory exists
	let files: string[];
	try {
		const entries = await readdir(CONTENT_DIR, { recursive: true });
		files = entries.filter(
			(f) =>
				typeof f === "string" &&
				f.endsWith(".md") &&
				!f.includes("templates/")
		);
	} catch {
		console.log("No journal directory found. Creating...");
		await ensureDir(CONTENT_DIR);
		await ensureDir(TEMPLATES_DIR);
		console.log("Created journal/ and journal/templates/");
		console.log("Add .md files and run sync again.");
		return;
	}

	if (files.length === 0) {
		console.log("No .md files found in journal/");
		return;
	}

	// Track local slugs for deletion detection
	const localSlugs = new Set<string>();

	for (const file of files) {
		const filePath = join(CONTENT_DIR, file);
		const rawContent = await readFile(filePath, "utf-8");

		// Parse frontmatter with gray-matter
		const { data, content: markdown } = matter(rawContent);
		const frontmatter = data as Frontmatter;

		if (!frontmatter.title) {
			frontmatter.title = deriveSlug(file)
				.split("-")
				.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
				.join(" ");
		}

		const slug = frontmatter.slug || deriveSlug(file);
		localSlugs.add(slug);

		// Handle publishDate - gray-matter may parse it as Date object
		let publishDate: string;
		if (frontmatter.publishDate instanceof Date) {
			publishDate = frontmatter.publishDate.toISOString().split("T")[0];
		} else if (typeof frontmatter.publishDate === "string") {
			publishDate = frontmatter.publishDate;
		} else {
			publishDate = deriveDateFromFilename(basename(file));
		}
		const contentHash = createHash("md5").update(rawContent).digest("hex");

		try {
			// Convert markdown to Typst - write to journal/ so it can access templates/
			const typstContent = markdownToTypst(markdown, frontmatter);
			const typstPath = join(CONTENT_DIR, `.tmp-${slug}.typ`);
			await writeFile(typstPath, typstContent);

			// Compile to PDF
			const pdfPath = join(pdfDir, `${slug}.pdf`);
			execSync(
				`typst compile --root "${CONTENT_DIR}" "${typstPath}" "${pdfPath}"`,
				{ stdio: "pipe" }
			);

			// Get file stats
			const pdfStats = await stat(pdfPath);
			const pdfBuffer = await readFile(pdfPath);

			// Upload PDF to Convex Storage
			const uploadUrl = await client.mutation(
				api.journal.generateUploadUrl,
				{}
			);
			const uploadResponse = await fetch(uploadUrl, {
				method: "POST",
				headers: { "Content-Type": "application/pdf" },
				body: pdfBuffer,
			});

			if (!uploadResponse.ok) {
				throw new Error(`Upload failed: ${uploadResponse.statusText}`);
			}

			const { storageId } = (await uploadResponse.json()) as {
				storageId: Id<"_storage">;
			};

			// Upsert journal entry with markdown content
			const result = await client.mutation(api.journal.upsert, {
				slug,
				title: frontmatter.title,
				description: frontmatter.description,
				content: markdown, // Store original markdown
				pdfStorageId: storageId,
				publishDate,
				published: frontmatter.published ?? false,
				featured: frontmatter.featured,
				tags: frontmatter.tags,
				category: frontmatter.category,
				fileSize: pdfStats.size,
				contentHash,
			});

			results.push({ slug, action: result.action });
			const icon = result.action === "created" ? "✓" : "↻";
			console.log(`${icon} ${slug}: ${result.action}`);

			// Clean up temp typst file from journal/ directory
			await unlink(typstPath).catch(() => {});
		} catch (error) {
			results.push({
				slug,
				action: "error",
				error: error instanceof Error ? error.message : String(error),
			});
			console.error(`✗ ${slug}: ${error}`);
		}
	}

	// Handle deletions (entries in Convex but not in local files)
	try {
		const remoteSlugs = await client.query(api.journal.listSlugs, {});
		for (const remoteSlug of remoteSlugs) {
			if (!localSlugs.has(remoteSlug)) {
				await client.mutation(api.journal.remove, {
					slug: remoteSlug,
				});
				results.push({ slug: remoteSlug, action: "deleted" });
				console.log(`🗑 ${remoteSlug}: deleted`);
			}
		}
	} catch (error) {
		console.error("Warning: Could not check for deletions:", error);
	}

	// Summary
	console.log("\n" + "═".repeat(50));
	console.log("Sync Complete:");
	console.log(
		`  Created: ${results.filter((r) => r.action === "created").length}`
	);
	console.log(
		`  Updated: ${results.filter((r) => r.action === "updated").length}`
	);
	console.log(
		`  Deleted: ${results.filter((r) => r.action === "deleted").length}`
	);
	console.log(
		`  Errors:  ${results.filter((r) => r.action === "error").length}`
	);
}

main().catch(console.error);
