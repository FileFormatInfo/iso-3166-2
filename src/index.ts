import "./styles.css";
import "../node_modules/tabulator-tables/dist/css/tabulator_bootstrap5.min.css";

import {
	CellComponent,
	DownloadModule,
	EditModule,
	ExportModule,
	Filter,
	FilterModule,
	FormatModule,
	InteractionModule,
	MoveColumnsModule,
	PopupModule,
	ResizeColumnsModule,
	ResizeTableModule,
	ResponsiveLayoutModule,
	Sorter,
	SortModule,
	Tabulator,
	TooltipModule,
} from "tabulator-tables";

type SearchEntry = {
	flag?: string;
	alpha_2: string;
	alpha_3: string;
	numeric: string;
	common_name_en: string;
	common_name_local: string;
	official_name_en: string;
	official_name_local: string;
	independent: boolean;
	un_member: boolean;
	tlds: string[];
};

type SearchData = {
	success: boolean;
	data: SearchEntry[];
};

const dataUrl = "/iso-3166-1.json";

function filterRegex(
	headerValue: string,
	rowValue: string,
	rowData: any,
	filterParams: any
) {
	if (!headerValue) return true;

	if (!rowValue) return false;

	if (headerValue.length == 1 && headerValue != "^" && headerValue != "/") {
		// single character, do starts with
		const search = headerValue.toLowerCase();
		if (rowValue.toLowerCase().startsWith(search)) {
			return true;
		}
		return false;
	}

	if (headerValue.startsWith("^")) {
		// starts with
		if (headerValue.length == 1) {
			return true;
		}
		const search = headerValue.substring(1).toLowerCase();
		if (rowValue.toLowerCase().startsWith(search)) {
			return true;
		}
		return false;
	}

	if (headerValue.startsWith("/") && headerValue.endsWith("/")) {
		// regex
		const pattern = headerValue.substring(1, headerValue.length - 1);
		try {
			const re = new RegExp(pattern, "i");
			if (re.test(rowValue)) {
				return true;
			}
			return false;
		} catch (e) {
			// bad regex
			return false;
		}
	}

	// contains
	const search = headerValue.toLowerCase();
	if (rowValue.toLowerCase().includes(search)) {
		return true;
	}
	return false;
}

function filterTags(
	headerValue: string,
	rowValue: string[],
	rowData: any,
	filterParams: any
) {
	if (!headerValue || headerValue.length == 0) return true;

	const headerVals = headerValue.split(/[ ,]+/);
	const rowVals: string[] = rowValue || [];

	for (const filterVal of headerVals) {
		if (filterVal.startsWith("!")) {
			if (rowVals.indexOf(filterVal.slice(1)) != -1) {
				return false;
			}
		} else {
			if (rowVals.indexOf(filterVal) == -1) {
				return false;
			}
		}
	}
	return true;
}

// from https://stackoverflow.com/a/30451878
function toFlag(alpha2: string): string {
    return String.fromCodePoint(127397 + alpha2.charCodeAt(0), 127397 + alpha2.charCodeAt(1));
}


function fmtTags(cell: CellComponent) {
	const tags = cell.getValue() as string[];
	const comment = cell.getRow().getData().comment as string | undefined;
	if (!tags && !comment) {
		return "";
	}

	const container = document.createElement("div");

	if (comment) {
		container.textContent = comment + " ";
	}

	if (tags) {
		const keys = tags.sort();

		for (const key of keys) {
			var el = document.createElement("span");
			el.className =
				"badge border border-primary text-primary me-1 mb-1 text-decoration-none";
			el.textContent = key.replace(/_/g, " ");
			el.style.cursor = "pointer";
			el.onclick = (e) => {
				e.preventDefault();
				e.stopPropagation();
				toggleTagFilter(cell, key);
			};
			container.appendChild(el);
		}
	}

	return container;
}

function showError(msg: string) {
	console.log(`ERROR: ${msg}`);
	document.getElementById("loading")!.classList.add("d-none");
	document.getElementById("errdiv")!.classList.remove("d-none");
	document.getElementById("errmsg")!.innerHTML = msg;
}

function toggleTagArray(tags: string[], tag: string): string[] {
	var idx = tags.indexOf(tag);
	if (idx != -1) {
		tags.splice(idx, 1);
		//tags.push(`!${tag}`);
		return tags;
	}

	idx = tags.indexOf(`!${tag}`);
	if (idx != -1) {
		tags.splice(idx);
		return tags;
	}

	tags.push(tag);
	return tags;
}

function toggleTagFilter(cell: CellComponent, tag: string): void {
	const tbl = cell.getTable();
	var headerFilter = "";
	const headerFilters = tbl.getHeaderFilters();
	var existingFilter: Filter | null = null;
	for (const hf of headerFilters) {
		if (hf.field == "tags") {
			headerFilter = hf.value;
			existingFilter = hf;
			break;
		}
	}

	if (existingFilter == null) {
		console.log(`adding to blank`);
		tbl.setHeaderFilterValue(cell.getColumn(), tag);
	} else {
		tbl.setHeaderFilterValue(
			cell.getColumn(),
			(existingFilter.value = toggleTagArray(
				headerFilter.split(/[ ,]+/),
				tag
			).join(" "))
		);
	}
	tbl.refreshFilter();
}

async function main() {

	var rawData:any;
	try {
		const resp = await fetch(dataUrl, {
			method: "GET",
			redirect: "follow",
		});
		if (!resp.ok) {
			showError(
				`HTTP Error fetching logo data: ${resp.status} ${resp.statusText}`
			);
			return;
		}
		rawData = (await resp.json() as SearchData);
	} catch (error) {
		showError(`Error fetching ISO 3166-1 data: ${error}`);
		return;
	}

	const data = rawData.data;

	for (const entry of data) {
		entry.flag = toFlag(entry.alpha_2);
	}

	console.log(data[0]);

	const qs = new URLSearchParams(window.location.search);
	const initialSort: Sorter[] = [ { column: "alpha_2", dir: "asc" } ];
	const filters: Filter[] = [];
	if (qs) {
		;
		for (const [key, value] of qs.entries()) {
			if (key == "sort") {
				initialSort[0].column = value;
				continue;
			}
			if (key == "dir") {
				initialSort[0].dir = value == "desc" ? "desc" : "asc";
				continue;
			}
			if (key && value) {
				filters.push({ field: key, type: "=", value: value });
			}
		}
	}

	Tabulator.registerModule([
		DownloadModule,
		EditModule,
		ExportModule,
		FilterModule,
		FormatModule,
		InteractionModule,
		MoveColumnsModule,
		PopupModule,
		ResizeColumnsModule,
		ResizeTableModule,
		ResponsiveLayoutModule,
		SortModule,
		TooltipModule,
	]);

	const table = new Tabulator("#datatable", {
		autoResize: true,
		columns: [
			{
				cellClick: (e, cell) => {
					const data = cell.getRow().getData();
					e.preventDefault();
					e.stopPropagation();
					table.alert(`${data.alpha_3} copied to clipboard`);
					setTimeout(() => table.clearAlert(), 1000);
					navigator.clipboard.writeText(data.emoji);
				},
				field: "",
				formatter: () =>
					`<img src="/images/icons/clipboard.svg" alt="Copy to clipboard" height="16">`,
				headerSort: false,
				title: "",
			},
			{
				cssClass: 'fs-2 py-0',
				download: false,
				field: 'flag',
				headerSort: false,
				hozAlign: 'center',
				responsive: 0,
				title: '',
				width: 75,
			},
			{
				field: "alpha_2",
				headerFilter: "input",
				headerFilterFunc: filterRegex,
				headerHozAlign: "center",
				hozAlign: "center",
				responsive: 0,
				title: "Alpha-2",
				titleDownload: "alpha_2",
				width: 150,
			},
			{
				field: "alpha_3",
				headerFilter: "input",
				headerFilterFunc: filterRegex,
				headerHozAlign: "center",
				hozAlign: "center",
				responsive: 0,
				title: "Alpha-3",
				titleDownload: "alpha_3",
				width: 150,
			},
			{
				field: "numeric",
				headerFilter: "input",
				headerFilterFunc: filterRegex,
				headerHozAlign: "center",
				hozAlign: "center",
				responsive: 10,
				title: "Numeric",
				titleDownload: "numeric",
				width: 150,
			},
			{
				field: "tlds",
				formatter: (cell) => cell.getValue().join(", "),
				headerFilter: "input",
				headerFilterFunc: filterTags,
				responsive: 5,
				title: "TLDs",
				titleDownload: "tlds",
				width: 200,
			},
			{
				field: "un_member",
				formatter: "tickCross",
				formatterParams: {
					allowEmpty: true,
					crossElement: false,
				},
				headerFilter: "tickCross",
				headerFilterParams: {
					tristate: true,
				},
				headerHozAlign: "center",
				hozAlign: "center",
				responsive: 20,
				title: "UN Member",
				titleDownload: "un_member",
				width: 125,
			},
			{
				field: "independent",
				formatter: "tickCross",
				formatterParams: {
					allowEmpty: true,
					crossElement: false,
				},
				headerFilter: "tickCross",
				headerFilterParams: {
					tristate: true,
				},
				headerHozAlign: "center",
				hozAlign: "center",
				responsive: 20,
				title: "Independent",
				titleDownload: "independent",
				width: 125,
			},
			{
				field: "common_name_en",
				headerFilter: "input",
				headerFilterFunc: filterRegex,
				responsive: 10,
				title: "Name (English)",
				titleDownload: "name_en",
				width: 250,
			},
			{
				field: "common_name_local",
				headerFilter: "input",
				headerFilterFunc: filterRegex,
				responsive: 10,
				title: "Name (Local)",
				titleDownload: "name_local",
				width: 250,
			},
		],
		data,
		downloadEncoder: function (fileContents, mimeType) {
			return new Blob([fileContents], {
				type: "text/plain;charset=utf-8",
			});
		},
		height: "100%",
		initialHeaderFilter: filters,
		initialSort,
		layout: "fitDataStretch",
		movableColumns: true,
		placeholder: "No matches",
		responsiveLayout: "hide",
		footerElement: `<span class="w-100 mx-2 my-1">
				<a href="https://www.fileformat.info/"><img id="favicon" src="/favicon.svg" class="pe-2 mb-1" style="height:1.5em;" alt="FileFormat.Info logo"/></a><span class="fw-bold">ISO 3166-1</span>
				<span id="rowcount" class="px-3">Rows: ${data.length.toLocaleString()}</span>
				<span class="d-none d-md-inline">
					Download: <a href="/iso-3166-1.json">JSON</a> <a class="px-1" id="download">CSV</a>
				</span>
				<a class="d-none d-lg-block float-end" href="https://github.com/FileFormatInfo/iso-3166-1">Source</a>
			</span>`,
	});

	table.on("dataFiltered", function (filters, rows) {
		var el = document.getElementById("rowcount");
		var qs = new URLSearchParams(window.location.search);
		for (const col of table.getColumns()) {
			qs.delete(col.getField());
		}
		if (filters && filters.length > 0) {
			el!.innerHTML = `Rows: ${rows.length.toLocaleString()} of ${data.length.toLocaleString()}`;
			for (const f of filters) {
				qs.set(f.field, f.value as string);
			}
		} else {
			el!.innerHTML = `Rows: ${data.length.toLocaleString()}`;
		}
		window.history.replaceState(null, "", "?" + qs);
	});

	table.on("dataSorted", function (sorters, rows) {
		var qs = new URLSearchParams(window.location.search);
		qs.set("sort", sorters[0]?.column.getField());
		qs.set("dir", sorters[0]?.dir);
		window.history.replaceState(null, "", "?" + qs);
	});
	table.on("tableBuilt", function () {
		console.log("INFO: table built");
		document.getElementById("download")!.addEventListener("click", (e) => {
			e.preventDefault();
			console.log("INFO: download clicked");
			table.downloadToTab("csv", "iso-3166-1.csv", {});
		});
	});

	document.getElementById("loading")!.classList.add("d-none");
	document.getElementById("datatable")!.classList.remove("d-none");
}

main();
