#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type CountryData = { [key:string]: CountryEntry };

type CountryEntry = { [key:string] : SubdivisionEntry };

type SubdivisionEntry = {
	name: string;
	localOtherName: string;
	type: string;
	parentCode: string|null;
	flag: string;
	latLng: [number, number];
	history: string;
};

type AltName = {
	name: string;
	lang: string;
}

type SearchEntry = {
	country: string;
	code: string;
	name: string;
	alt_names?: AltName[];
	flag: string;
};

type SearchData = {
	success: boolean;
	lastmod: string;
	data: SearchEntry[];
};

const entryMap: { [key: string]: SearchEntry } = {};

function readNextName(s: string): [string, string] {
	s = s.trim();
	if (s.startsWith("'")) {
		// quoted name
		const endIdx = s.indexOf("',");
		if (endIdx === -1) {
			return [s.slice(1, -1).trim(), ""];
		}
		const name = s.slice(1, endIdx).trim();
		const rest = s.slice(endIdx + 2).trim();
		return [name, rest];
	} else {
		// unquoted name
		const endIdx = s.indexOf(",");
		if (endIdx === -1) {
			return [s.trim(), ""];
		}
		const name = s.slice(0, endIdx).trim();
		const rest = s.slice(endIdx + 1).trim();
		return [name, rest];
	}
}

function parseAltNames(altNameStr: string): AltName[]|undefined {
	if (!altNameStr || altNameStr.trim().length === 0) {
		return undefined;
	}
	const altNames: AltName[] = [];

	let rest = altNameStr.trim();
	while (rest.length > 0) {
		// Read name
		const [name, afterName] = readNextName(rest);
		rest = afterName;

		const m = name.match(/^(.+) \((.+)\)$/);
		if (!m) {
			console.log(`WARN: alt name "${name}" is not in expected format`);
			continue;
		}
		altNames.push({
			name: m[1].trim().replace(/\u200e/g, ""),
			lang: m[2].trim(),
		});
	}

	return altNames.length > 0 ? altNames : undefined;
}

async function main() {
	console.log(`INFO: starting at ${new Date().toISOString()}`);

	const dataPath = path.join(__dirname, "..", "tmp", "iso3166_2.json");
	const jsonPath = path.join(__dirname, "..", "public", "iso-3166-2.json");

	try {
		await fs.access(dataPath);
	} catch (err) {
		console.log(
			`INFO: subdivision data file does not exist in ${dataPath}`
		);
		process.exit(1);
	}

	console.log(`INFO: reading subdivision data file from ${dataPath}`);
	const countryText = (await fs.readFile(dataPath, "utf-8")).trim();

	const countryData = JSON.parse(countryText) as CountryData;
	for (const country of Object.keys(countryData)) {
		const countryEntry = countryData[country];
		if (!countryEntry) {
			console.log(`ERROR: missing country entry for ${country}`);
			continue;
		}
		for (const subdivisionCode of Object.keys(countryEntry)) {
			const subdivision = countryEntry[subdivisionCode];
			if (!subdivision) {
				console.log(
					`ERROR: missing subdivision entry for ${subdivisionCode} in country ${country}`
				);
				continue;
			}
			const newEntry: SearchEntry = {
				country,
				code: subdivisionCode,
				name: subdivision.name,
				alt_names: parseAltNames(subdivision.localOtherName),
				flag: subdivision.flag,
			};
			entryMap[subdivisionCode] = newEntry;
		}
	}

	const data = Object.values(entryMap);
	data.sort((a, b) => a.code.localeCompare(b.code));

	const output: SearchData = {
		success: true,
		lastmod: new Date().toISOString(),
		data,
	};

	// Write the JSON data to a file
	console.log(`INFO: writing ${data.length} items to ${jsonPath}`);
	await fs.writeFile(jsonPath, JSON.stringify(output, null, 2), "utf-8");
	console.log(`INFO: wrote JSON data to ${jsonPath}`);
}

main().then(() => {
	console.log(`INFO: complete at ${new Date().toISOString()}`);
});
