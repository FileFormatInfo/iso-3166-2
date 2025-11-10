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
	alpha_3: string;
	alpha_3_b: string;
	alpha_3_t: string;
	alpha_2: string;
	name_ref: string;
	comment?: string;
	tags: string[];
	parent?: string;
	children?: string[];
	active: boolean;
};

type SearchData = {
	success: boolean;
	data: SearchEntry[];
};

const dataUrl = "/iso-639-3.json";



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
		showError(`Error fetching ISO 639-3 data: ${error}`);
		return;
	}

	const data = rawData.data;

	console.log(data[0]);

	const qs = new URLSearchParams(window.location.search);
	const initialSort: Sorter[] = [ { column: "alpha_3", dir: "asc" } ];
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
				field: "alpha_3_b",
				formatter: (cell: CellComponent) => {
					let value = cell.getValue();
					if (value === "") {
						return value;
					}
					const t_value = cell.getRow().getData().alpha_3_t;
					if (!t_value || t_value === value) {
						return value;
					}
					return `${value}/${t_value}`;
				},
				headerFilter: "input",
				headerFilterFunc: filterRegex,
				headerHozAlign: "center",
				hozAlign: "center",
				responsive: 0,
				title: "639-2",
				titleDownload: "alpha_3_b/t",
				width: 150,
			},
			{
				field: "alpha_2",
				headerFilter: "input",
				headerFilterFunc: filterRegex,
				headerHozAlign: "center",
				hozAlign: "center",
				responsive: 10,
				title: "Alpha-2",
				titleDownload: "alpha_2",
				width: 150,
			},
			{
				field: "parent",
				headerFilter: "input",
				headerFilterFunc: filterRegex,
				headerHozAlign: "center",
				hozAlign: "center",
				responsive: 10,
				title: "Parent",
				titleDownload: "parent",
				width: 150,
			},
			{
				field: "name_ref",
				headerFilter: "input",
				headerFilterFunc: filterRegex,
				responsive: 0,
				title: "Name",
				titleDownload: "name_ref",
				width: 375,
			},
			{
				download: false,
				field: "tags",
				formatter: fmtTags,
				headerFilter: "input",
				headerFilterFunc: filterTags,
				responsive: 0,
				title: "Tags & Comments",
				width: 375,
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
				<a href="https://www.fileformat.info/"><img id="favicon" src="/favicon.svg" class="pe-2 mb-1" style="height:1.5em;" alt="FileFormat.Info logo"/></a><span class="fw-bold">ISO 639-3</span>
				<span id="rowcount" class="px-3">Rows: ${data.length.toLocaleString()}</span>
				<span class="d-none d-md-inline">
					Download: <a href="/iso-639-3.json">JSON</a> <a class="px-1" id="download">CSV</a>
				</span>
				<a class="d-none d-lg-block float-end" href="https://github.com/FileFormatInfo/iso-639-3">Source</a>
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
			table.downloadToTab("csv", "iso-639-3.csv", {});
		});
	});

	document.getElementById("loading")!.classList.add("d-none");
	document.getElementById("datatable")!.classList.remove("d-none");
}

main();
