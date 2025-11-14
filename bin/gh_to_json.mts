#!/usr/bin/env node

import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type NameWithFund = {
	"+content": string;
	"+@IsFund": string;
};

type CountryEntry = {
	name: {
		common: string;
		official: string;
		native: { [key: string]: {
				common: string;
				official: string;
			}
		}
	};
	tld: string[];
	cca2: string;
	cca3: string;
	ccn3: string;
	independent: boolean;
	unMember: boolean;
};

type SearchEntry = {
	alpha_2: string;
	alpha_3: string;
	numeric: string;
	common_name_en: string;
	official_name_en: string;
	name_local: { alpha3: string; common: string; official: string }[];
	independent: boolean;
	un_member: boolean;
	tlds: string[];
};

type SearchData = {
	success: boolean;
	lastmod: string;
	data: SearchEntry[];
};

const entryMap: { [key: string]: SearchEntry } = {};

async function main() {
	console.log(`INFO: starting at ${new Date().toISOString()}`);

	const countryPath = path.join(__dirname, "..", "tmp", "countries.json");
	const jsonPath = path.join(__dirname, "..", "public", "iso-3166-1.json");

	try {
		await fs.access(countryPath);
	} catch (err) {
		console.log(
			`INFO: list-one data file does not exist in ${countryPath}`
		);
		process.exit(1);
	}

	console.log(`INFO: reading list-one data file from ${countryPath}`);
	const countryText = (await fs.readFile(countryPath, "utf-8")).trim();

	const countryData = JSON.parse(countryText) as CountryEntry[];
	for (const entry of countryData) {
		const newEntry: SearchEntry = {
			alpha_2: entry.cca2,
			alpha_3: entry.cca3,
			numeric: entry.ccn3,
			common_name_en: entry.name.common,
			official_name_en: entry.name.official,
			name_local: Object.entries(entry.name.native).map(([key, val]) => ({
				alpha3: key,
				common: val.common,
				official: val.official,
			})),
			independent: entry.independent,
			un_member: entry.unMember,
			tlds: entry.tld,
		};
		entryMap[entry.cca3] = newEntry;
	}

	const data = Object.values(entryMap);
	data.sort((a, b) => a.alpha_2.localeCompare(b.alpha_2));

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
