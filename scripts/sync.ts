#!/usr/bin/env bun

import { readdir, readFile, writeFile, stat, mkdir, unlink, access } from "fs/promises";
import { join, basename } from "path";
import { execSync, exec } from "child_process";
import { createHash } from "crypto";
import { promisify } from "util";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import matter from "gray-matter";
import pLimit from "p-limit";

const execAsync = promisify(exec);

const CONTENT_DIR = join(process.cwd(), "journal");
const BUILD_DIR = join(process.cwd(), ".build");
const TEMPLATES_DIR = join(CONTENT_DIR, "templates");
const DIAGRAMS_DIR = join(BUILD_DIR, "diagrams");

const DIAGRAM_LIMIT = pLimit(4);
const FILE_LIMIT = pLimit(6);

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

interface ProtectedContent {
	text: string;
	placeholders: Map<string, string>;
}

interface MermaidBlock {
	content: string;
	hash: string;
	svgPath: string;
}

async function ensureDir(dir: string) {
	try {
		await mkdir(dir, { recursive: true });
	} catch {
		// Directory exists
	}
}

async function fileExists(path: string): Promise<boolean> {
	try {
		await access(path);
		return true;
	} catch {
		return false;
	}
}

function deriveSlug(filename: string): string {
	return basename(filename, ".md").replace(/^\d{4}-\d{2}-\d{2}-/, "");
}

function deriveDateFromFilename(filename: string): string {
	const match = filename.match(/^(\d{4}-\d{2}-\d{2})/);
	return match ? match[1] : new Date().toISOString().split("T")[0];
}

function hashContent(content: string): string {
	return createHash("md5").update(content).digest("hex").slice(0, 12);
}

function sanitizeFrontmatter(rawContent: string): string {
	const frontmatterMatch = rawContent.match(/^---\n([\s\S]*?)\n---/);
	if (!frontmatterMatch) return rawContent;

	const frontmatterBody = frontmatterMatch[1];
	const restOfContent = rawContent.slice(frontmatterMatch[0].length);

	const isAlreadyValid = (v: string) =>
		!v ||
		/^["'].*["']$/.test(v) ||
		/^-?\d+(\.\d+)?$/.test(v) ||
		/^(true|false|null|~)$/i.test(v) ||
		/^\d{4}-\d{2}-\d{2}/.test(v) ||
		/^[\[\{]/.test(v);

	// Regex: YAML special chars, em/en dashes, smart quotes, emojis
	const needsQuoting = (v: string) =>
		/[:\{\}\[\],&*#?|\-<>=!%@`]/.test(v) ||
		/[\u2014\u2013\u2018\u2019\u201c\u201d]/.test(v) ||
		/[\u{1F300}-\u{1F9FF}]/u.test(v) ||
		v.startsWith(" ") ||
		v.endsWith(" ");

	const sanitizedLines = frontmatterBody.split("\n").map((line) => {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith("#") || trimmed.startsWith("-") || !line.includes(":")) {
			return line;
		}

		const match = line.match(/^(\s*)([a-zA-Z_][a-zA-Z0-9_]*):(.*)$/);
		if (!match) return line;

		const [, indent, key, rawValue] = match;
		const value = rawValue.trim();

		if (isAlreadyValid(value)) return line;

		if (needsQuoting(value)) {
			const escaped = value.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
			return `${indent}${key}: "${escaped}"`;
		}

		return line;
	});

	return `---\n${sanitizedLines.join("\n")}\n---${restOfContent}`;
}

function extractMermaidBlocks(markdown: string): { 
	processedMarkdown: string; 
	blocks: MermaidBlock[] 
} {
	const blocks: MermaidBlock[] = [];
	
	const processedMarkdown = markdown.replace(
		/```mermaid\n([\s\S]*?)```/g,
		(_, diagram) => {
			const content = diagram.trim();
			const hash = hashContent(content);
			const pngPath = join(DIAGRAMS_DIR, `${hash}.png`);
			
			blocks.push({ content, hash, svgPath: pngPath });
			
			return `MERMAID_${hash}_ENDMERMAID`;
		}
	);
	
	return { processedMarkdown, blocks };
}

async function renderMermaidDiagram(block: MermaidBlock): Promise<void> {
	if (await fileExists(block.svgPath)) {
		return;
	}
	
	const mmdPath = join(DIAGRAMS_DIR, `${block.hash}.mmd`);
	await writeFile(mmdPath, block.content);
	
	try {
		await execAsync(
			`bunx mmdc -i "${mmdPath}" -o "${block.svgPath}" -b white -s 2`,
			{ timeout: 30000 }
		);
	} finally {
		await unlink(mmdPath).catch(() => {});
	}
}

/**
 * Render all mermaid diagrams in parallel with concurrency limit
 */
async function renderAllDiagrams(blocks: MermaidBlock[]): Promise<Map<string, boolean>> {
	const results = new Map<string, boolean>();
	
	if (blocks.length === 0) return results;
	
	const uniqueBlocks = new Map<string, MermaidBlock>();
	for (const block of blocks) {
		uniqueBlocks.set(block.hash, block);
	}
	
	const tasks = [...uniqueBlocks.values()].map((block) =>
		DIAGRAM_LIMIT(async () => {
			try {
				await renderMermaidDiagram(block);
				results.set(block.hash, true);
			} catch (error) {
				console.error(`  ⚠ Failed to render diagram ${block.hash}:`, error);
				results.set(block.hash, false);
			}
		})
	);
	
	await Promise.all(tasks);
	return results;
}

function markdownToTypst(
	markdown: string, 
	frontmatter: Frontmatter,
	diagramResults: Map<string, boolean>
): string {
	let typst = `#import "templates/whitepaper.typ": whitepaper

#show: whitepaper.with(
  title: "${escapeTypstString(frontmatter.title)}",
  ${frontmatter.description ? `abstract: [${frontmatter.description}],` : ""}
  show-toc: true,
)

`;
	typst += convertMarkdownBodyToTypst(markdown, diagramResults);
	return typst;
}

function escapeTypstString(str: string): string {
	return str.replace(/"/g, '\\"').replace(/\\/g, "\\\\");
}

function escapeTypstTableContent(text: string): string {
	return text
		.replace(/@/g, '#"@"')
		.replace(/\*/g, "\\*")
		.replace(/_/g, "\\_")
		.replace(/\$/g, "\\$");
}

function protectCodeAndSpecialSyntax(markdown: string): ProtectedContent {
	const placeholders = new Map<string, string>();
	let counter = 0;
	let text = markdown;

	const protect = (match: string): string => {
		const key = `PROTECTED${counter++}ENDPROTECTED`;
		placeholders.set(key, match);
		return key;
	};

	// 1. Fenced code blocks (``` ... ```)
	text = text.replace(/```[\s\S]*?```/g, protect);

	// 2. Inline code (` ... `)
	text = text.replace(/`[^`\n]+`/g, protect);

	// 3. Paired emphasis (_text_ with content, not standalone _)
	text = text.replace(/_([^\s_][^_]*[^\s_])_/g, protect);
	text = text.replace(/_(\S)_/g, protect);

	// 4. Block math ($$...$$)
	text = text.replace(/\$\$[\s\S]+?\$\$/g, protect);

	// 5. Inline math ($...$) - paired only
	text = text.replace(/(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)/g, protect);

	return { text, placeholders };
}

function escapeUnpairedTypstChars(text: string): string {
	return text
		.replace(/\$/g, "\\$")
		.replace(/_/g, "\\_")
		.replace(/@/g, '#"@"');
}

function restorePlaceholders(
	text: string,
	placeholders: Map<string, string>
): string {
	let result = text;
	for (const [key, value] of placeholders) {
		result = result.replace(key, value);
	}
	return result;
}

function convertMarkdownBodyToTypst(
	markdown: string,
	diagramResults: Map<string, boolean>
): string {
	// PHASE 1: Protect code, inline code, emphasis pairs, and math pairs
	const { text: protectedText, placeholders } =
		protectCodeAndSpecialSyntax(markdown);

	// PHASE 2: Escape unpaired $ and _ (safe now since paired ones are protected)
	let result = escapeUnpairedTypstChars(protectedText);

	// PHASE 3: Restore protected content
	result = restorePlaceholders(result, placeholders);

	// PHASE 4: Replace mermaid placeholders with #image() or fallback
	result = result.replace(/MERMAID_([a-f0-9]+)_ENDMERMAID/g, (_, hash) => {
		if (diagramResults.get(hash)) {
			return `#figure(\n  image("../.build/diagrams/${hash}.png", width: 80%),\n  kind: "diagram",\n  supplement: none,\n)`;
		}
		return `#rect(width: 100%, height: 3cm, stroke: gray)[_Diagram could not be rendered_]`;
	});

	// PHASE 5: Convert markdown to Typst

	// Headers
	result = result.replace(/^### (.+)$/gm, "=== $1");
	result = result.replace(/^## (.+)$/gm, "== $1");
	result = result.replace(/^# (.+)$/gm, "= $1");

	// Bold and italic
	result = result.replace(/\*\*\*(.+?)\*\*\*/g, "_*$1*_");
	result = result.replace(/\*\*(.+?)\*\*/g, "*$1*");
	result = result.replace(/__(.+?)__/g, "*$1*");

	// Links [text](url)
	result = result.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '#link("$2")[$1]');

	// Block math $$...$$ to Typst $ ... $
	result = result.replace(/\$\$([\s\S]+?)\$\$/g, (_, math) => {
		const typstMath = convertLatexToTypstMath(math.trim());
		return `$ ${typstMath} $`;
	});

	// Inline math $...$
	result = result.replace(
		/(?<!\$)\$(?!\$)([^$\n]+?)(?<!\$)\$(?!\$)/g,
		(_, math) => {
			const typstMath = convertLatexToTypstMath(math.trim());
			return `$${typstMath}$`;
		}
	);

	// Code blocks with language
	result = result.replace(/```(\w+)\n([\s\S]*?)```/g, (_, lang, code) => {
		return `\`\`\`${lang}\n${code.trim()}\n\`\`\``;
	});

	// Plain code blocks
	result = result.replace(/```\n([\s\S]*?)```/g, "```\n$1```");

	// Unordered lists
	result = result.replace(/^(\s*)[-*] (.+)$/gm, (_, indent, text) => {
		const level = Math.floor(indent.length / 2);
		return "  ".repeat(level) + "- " + text;
	});

	// Ordered lists
	result = result.replace(/^(\s*)\d+\. (.+)$/gm, (_, indent, text) => {
		const level = Math.floor(indent.length / 2);
		return "  ".repeat(level) + "+ " + text;
	});

	// Blockquotes
	result = result.replace(/^> (.+)$/gm, "#quote[$1]");

	// Horizontal rules
	result = result.replace(/^---+$/gm, "#line(length: 100%)");

	// Images ![alt](src)
	result = result.replace(
		/!\[([^\]]*)\]\(([^)]+)\)/g,
		'#figure(image("$2"), caption: [$1])'
	);

	// Tables
	result = convertMarkdownTables(result);

	return result;
}

function convertLatexToTypstMath(latex: string): string {
	let result = latex;

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
	result = result.replace(
		/\\int_\{([^}]+)\}\^\{([^}]+)\}/g,
		"integral_($1)^($2)"
	);
	result = result.replace(/\\int/g, "integral");

	// Sum and product
	result = result.replace(/\\sum_\{([^}]+)\}\^\{([^}]+)\}/g, "sum_($1)^($2)");
	result = result.replace(
		/\\prod_\{([^}]+)\}\^\{([^}]+)\}/g,
		"product_($1)^($2)"
	);

	// dx, dy differentials
	result = result.replace(/\\,?d([xyz])\b/g, " dif $1");
	result = result.replace(/\bd([xyz])\b(?!\w)/g, " dif $1");

	// Matrices - pmatrix
	result = result.replace(
		/\\begin\{pmatrix\}([\s\S]*?)\\end\{pmatrix\}/g,
		(_, content) => {
			const rows = content
				.trim()
				.split("\\\\")
				.map((row: string) =>
					row
						.trim()
						.split("&")
						.map((cell: string) => cell.trim())
						.join(", ")
				);
			return `mat(\n  ${rows.join(";\n  ")};\n)`;
		}
	);

	// Matrices - bmatrix
	result = result.replace(
		/\\begin\{bmatrix\}([\s\S]*?)\\end\{bmatrix\}/g,
		(_, content) => {
			const rows = content
				.trim()
				.split("\\\\")
				.map((row: string) =>
					row
						.trim()
						.split("&")
						.map((cell: string) => cell.trim())
						.join(", ")
				);
			return `mat(delim: "[",\n  ${rows.join(";\n  ")};\n)`;
		}
	);

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

	// Common functions
	result = result.replace(/\\(sin|cos|tan|log|ln|exp|lim|max|min)/g, "$1");

	return result;
}

function convertMarkdownTables(markdown: string): string {
	const tableRegex = /\|(.+)\|\n\|[-|\s:]+\|\n((?:\|.+\|\n?)+)/gm;

	return markdown.replace(tableRegex, (match, headerRow, bodyRows) => {
		const headers = headerRow
			.split("|")
			.map((h: string) => h.trim())
			.filter(Boolean);
		const rows = bodyRows
			.trim()
			.split("\n")
			.map((row: string) =>
				row
					.split("|")
					.map((cell: string) => cell.trim())
					.filter(Boolean)
			);

		const colCount = headers.length;
		const colSpec = `(${Array(colCount).fill("1fr").join(", ")})`;

		let typstTable = `#table(\n  columns: ${colSpec},\n  inset: 8pt,\n`;

		headers.forEach((h: string) => {
			typstTable += `  [*${escapeTypstTableContent(h)}*],\n`;
		});

		rows.forEach((row: string[]) => {
			row.forEach((cell) => {
				typstTable += `  [${escapeTypstTableContent(cell)}],\n`;
			});
		});

		typstTable += ")";
		return typstTable;
	});
}

interface FileToProcess {
	file: string;
	filePath: string;
	rawContent: string;
	frontmatter: Frontmatter;
	slug: string;
	publishDate: string;
	contentHash: string;
	markdown: string;
	mermaidBlocks: MermaidBlock[];
	processedMarkdown: string;
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

	const pdfDir = join(BUILD_DIR, "pdfs");
	const typstDir = join(BUILD_DIR, "typst");
	await ensureDir(pdfDir);
	await ensureDir(typstDir);
	await ensureDir(DIAGRAMS_DIR);

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

	// PHASE 1: Read all files and extract mermaid blocks
	console.log(`📄 Reading ${files.length} files...`);
	const filesToProcess: FileToProcess[] = [];
	const allMermaidBlocks: MermaidBlock[] = [];

	for (const file of files) {
		const filePath = join(CONTENT_DIR, file);
		const rawContent = await readFile(filePath, "utf-8");

		const { data, content: markdown } = matter(sanitizeFrontmatter(rawContent));
		const frontmatter = data as Frontmatter;

		if (!frontmatter.title) {
			frontmatter.title = deriveSlug(file)
				.split("-")
				.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
				.join(" ");
		}

		const slug = frontmatter.slug || deriveSlug(file);

		let publishDate: string;
		if (frontmatter.publishDate instanceof Date) {
			publishDate = frontmatter.publishDate.toISOString().split("T")[0];
		} else if (typeof frontmatter.publishDate === "string") {
			publishDate = frontmatter.publishDate;
		} else {
			publishDate = deriveDateFromFilename(basename(file));
		}

		const contentHash = createHash("md5").update(rawContent).digest("hex");

		// Extract mermaid blocks
		const { processedMarkdown, blocks } = extractMermaidBlocks(markdown);
		allMermaidBlocks.push(...blocks);

		filesToProcess.push({
			file,
			filePath,
			rawContent,
			frontmatter,
			slug,
			publishDate,
			contentHash,
			markdown,
			mermaidBlocks: blocks,
			processedMarkdown,
		});
	}

	// PHASE 2: Render all mermaid diagrams in parallel
	if (allMermaidBlocks.length > 0) {
		const uniqueCount = new Set(allMermaidBlocks.map(b => b.hash)).size;
		console.log(`🎨 Rendering ${uniqueCount} unique diagrams...`);
	}
	const diagramResults = await renderAllDiagrams(allMermaidBlocks);
	const successCount = [...diagramResults.values()].filter(Boolean).length;
	if (allMermaidBlocks.length > 0) {
		console.log(`   ✓ ${successCount}/${diagramResults.size} diagrams ready\n`);
	}

	// PHASE 3: Process files in parallel (compile Typst, upload to Convex)
	const localSlugs = new Set<string>();

	const processFile = async (fileData: FileToProcess): Promise<SyncResult> => {
		const { slug, frontmatter, publishDate, contentHash, processedMarkdown, markdown } = fileData;
		localSlugs.add(slug);

		try {
			const typstContent = markdownToTypst(processedMarkdown, frontmatter, diagramResults);
			const typstPath = join(CONTENT_DIR, `.tmp-${slug}.typ`);
			await writeFile(typstPath, typstContent);

			const pdfPath = join(pdfDir, `${slug}.pdf`);
			execSync(
				`typst compile --root "${process.cwd()}" "${typstPath}" "${pdfPath}"`,
				{ stdio: "pipe" }
			);

			const pdfStats = await stat(pdfPath);
			const pdfBuffer = await readFile(pdfPath);

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

			const result = await client.mutation(api.journal.upsert, {
				slug,
				title: frontmatter.title,
				description: frontmatter.description,
				content: markdown,
				pdfStorageId: storageId,
				publishDate,
				published: frontmatter.published ?? false,
				featured: frontmatter.featured,
				tags: frontmatter.tags,
				category: frontmatter.category,
				fileSize: pdfStats.size,
				contentHash,
			});

			await unlink(typstPath).catch(() => {});

			const icon = result.action === "created" ? "✓" : "↻";
			console.log(`${icon} ${slug}: ${result.action}`);

			return { slug, action: result.action };
		} catch (error) {
			console.error(`✗ ${slug}: ${error}`);
			return {
				slug,
				action: "error",
				error: error instanceof Error ? error.message : String(error),
			};
		}
	};

	// Process all files with concurrency limit
	const fileResults = await Promise.all(
		filesToProcess.map((fileData) => FILE_LIMIT(() => processFile(fileData)))
	);
	results.push(...fileResults);

	// PHASE 4: Clean up deleted entries
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
