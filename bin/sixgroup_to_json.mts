#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type NameWithFund = {
	"+content": string;
	"+@IsFund": string;
};

type ListOneEntry = {
	CtryNm: string;
	CcyNm: string | NameWithFund;
	Ccy: string;
	CcyNbr: string;
	CcyMnrUnts: string;
};

type SearchEntry = {
	alpha_3: string;
	numeric: string;
	name: string;
	countries: string[];
	subunit: number;
	is_fund: boolean;
	active: boolean;
};

type SearchData = {
	success: boolean;
	lastmod: string;
	data: SearchEntry[];
}

const entryMap: { [key:string]:SearchEntry } = {};

async function main() {
	console.log(`INFO: starting at ${new Date().toISOString()}`);

	const listOnePath = path.join( __dirname, '..', 'tmp', 'list-one.json' );
	const listThreePath = path.join( __dirname, '..', 'tmp', 'list-three.json' );
	const jsonPath = path.join( __dirname, '..', 'public', 'iso-4217.json' );

	try {
		await fs.access(listOnePath);
	} catch (err) {
		console.log(`INFO: list-one data file does not exist in ${listOnePath}`);
		process.exit(1);
	}

	console.log(`INFO: reading list-one data file from ${listOnePath}`);
	const listOneText = (await fs.readFile(listOnePath, "utf-8")).trim();
	const listOneData = JSON.parse(listOneText);
	const listOneEntries: ListOneEntry[] = listOneData.ISO_4217.CcyTbl.CcyNtry;

	for (const entry of listOneEntries) {

		const existing = entryMap[entry.Ccy];
		if (existing) {
			// already exists, just add country
			existing.countries.push(entry.CtryNm);
			continue;
		}

		const newEntry: SearchEntry = {
			alpha_3: entry.Ccy || '',
			numeric: entry.CcyNbr,
			name: typeof(entry.CcyNm) === 'string' ? entry.CcyNm : entry.CcyNm['+content'],
			countries: [ entry.CtryNm ],
			subunit: parseInt(entry.CcyMnrUnts, 10),
			is_fund: typeof(entry.CcyNm) !== 'string' && entry.CcyNm['+@IsFund'] === 'true',
			active: true,
		};
		entryMap[entry.Ccy] = newEntry;
	}

	try {
		await fs.access(listThreePath);
	} catch (err) {
		console.log(`INFO: list-three data file does not exist in ${listThreePath}`);
		process.exit(1);
	}

	console.log(`INFO: reading macro data file from ${listThreePath}`);
	const listThreeText = (await fs.readFile(listThreePath, "utf-8")).trim();
	const listThreeData = JSON.parse(listThreeText);


	for (const entry of listThreeData.ISO_4217.HstrcCcyTbl.HstrcCcyNtry) {
		const existing = entryMap[entry.Ccy];
		if (existing) {
			// already exists, just mark inactive
			console.log(`WARN: currency ${entry.Ccy} is both active and inactive`);
			continue;
		}
	}

	const data = Object.values(entryMap);
	data.sort( (a, b) => a.alpha_3.localeCompare(b.alpha_3) );

	const output: SearchData = {
		success: true,
		lastmod: new Date().toISOString(),
		data,
	};

	// Write the JSON data to a file
	console.log(`INFO: writing ${data.length} items to ${jsonPath}`);
	await fs.writeFile(jsonPath, JSON.stringify(output, null, 2), 'utf-8');
	console.log(`INFO: wrote JSON data to ${jsonPath}`);
}

main().then( () => {
	console.log(`INFO: complete at ${new Date().toISOString()}`);
});
