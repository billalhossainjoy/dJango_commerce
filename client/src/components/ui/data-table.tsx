"use client";

import type { ReactNode } from "react";
import {
  type ColumnDef,
  type RowData,
  columnFilteringFeature,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_equalsString,
  filterFn_includesString,
  rowPaginationFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_text,
  tableFeatures,
  useTable,
} from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  filteredRowModel: createFilteredRowModel(),
  filterFns: {
    equalsString: filterFn_equalsString,
    includesString: filterFn_includesString,
  },
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    text: sortFn_text,
  },
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});

const defaultPageSizeOptions = [10, 20, 50];

export type DataTableColumn<TData extends RowData> = ColumnDef<
  typeof dataTableFeatures,
  TData
>;

export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<typeof dataTableFeatures, TData>();
}

export type DataTableFilter = {
  columnId: string;
  label: string;
  options: ReadonlyArray<{ label: string; value: string }>;
};

type DataTableProps<TData extends RowData> = {
  columns: Array<DataTableColumn<TData>>;
  data: TData[];
  emptyMessage?: ReactNode;
  filters?: DataTableFilter[];
  getRowId?: (row: TData) => string;
  initialPageSize?: number;
  pageSizeOptions?: number[];
  search?: {
    columnId: string;
    placeholder?: string;
  };
};

export function DataTable<TData extends RowData>({
  columns,
  data,
  emptyMessage = "No results found.",
  filters = [],
  getRowId,
  initialPageSize = 10,
  pageSizeOptions = defaultPageSizeOptions,
  search,
}: DataTableProps<TData>) {
  const table = useTable(
    {
      columns,
      data,
      features: dataTableFeatures,
      getRowId,
      initialState: {
        pagination: { pageIndex: 0, pageSize: initialPageSize },
      },
      enableMultiSort: false,
    },
    (state) => ({
      columnFilters: state.columnFilters,
      pagination: state.pagination,
      sorting: state.sorting,
    }),
  );
  const searchColumn = search ? table.getColumn(search.columnId) : undefined;
  const rowCount = table.getRowCount();
  const pageCount = table.getPageCount();
  const { pageIndex, pageSize } = table.state.pagination;

  return (
    <div className="space-y-4">
      {search || filters.length > 0 ? (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          {search ? (
            <div className="relative w-full sm:max-w-sm">
              <SearchIcon />
              <Input
                aria-label={search.placeholder ?? "Search table"}
                className="h-10 border-slate-300 bg-white pl-9 text-sm text-slate-900 placeholder:text-slate-400"
                onChange={(event) =>
                  searchColumn?.setFilterValue(event.target.value)
                }
                placeholder={search.placeholder ?? "Search…"}
                type="search"
                value={String(searchColumn?.getFilterValue() ?? "")}
              />
            </div>
          ) : null}

          {filters.map((filter) => {
            const column = table.getColumn(filter.columnId);
            return (
              <select
                aria-label={filter.label}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                key={filter.columnId}
                onChange={(event) => column?.setFilterValue(event.target.value)}
                value={String(column?.getFilterValue() ?? "")}
              >
                <option value="">All {filter.label}</option>
                {filter.options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            );
          })}
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm shadow-slate-200/60">
        <div className="overflow-x-auto">
          <table className="w-full min-w-2xl text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => {
                    const sortDirection = header.column.getIsSorted();
                    return (
                      <th
                        aria-sort={
                          sortDirection === "asc"
                            ? "ascending"
                            : sortDirection === "desc"
                              ? "descending"
                              : undefined
                        }
                        className="px-5 py-3 font-semibold first:sm:px-6 last:sm:px-6"
                        key={header.id}
                        scope="col"
                      >
                        {header.isPlaceholder ? null : header.column.getCanSort() ? (
                          <button
                            className="inline-flex items-center gap-1.5 rounded-sm text-left outline-none hover:text-slate-900 focus-visible:ring-2 focus-visible:ring-indigo-500/30"
                            onClick={header.column.getToggleSortingHandler()}
                            title="Sort column"
                            type="button"
                          >
                            <table.FlexRender header={header} />
                            <span aria-hidden="true" className="text-slate-400">
                              {sortDirection === "asc"
                                ? "↑"
                                : sortDirection === "desc"
                                  ? "↓"
                                  : "↕"}
                            </span>
                          </button>
                        ) : (
                          <table.FlexRender header={header} />
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>
            <tbody className="divide-y divide-slate-100">
              {table.getRowModel().rows.length > 0 ? (
                table.getRowModel().rows.map((row) => (
                  <tr
                    className="transition-colors hover:bg-slate-50/70"
                    key={row.id}
                  >
                    {row.getAllCells().map((cell) => (
                      <td
                        className="px-5 py-4 first:sm:px-6 last:sm:px-6"
                        key={cell.id}
                      >
                        <table.FlexRender cell={cell} />
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td
                    className="px-6 py-14 text-center text-sm text-slate-500"
                    colSpan={table.getAllLeafColumns().length}
                  >
                    {emptyMessage}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p className="text-sm text-slate-500">
            {rowCount === 0
              ? "No results"
              : `${pageIndex * pageSize + 1}–${Math.min(
                  (pageIndex + 1) * pageSize,
                  rowCount,
                )} of ${rowCount}`}
          </p>

          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-500">
              Rows
              <select
                className="h-8 rounded-md border border-slate-300 bg-white px-2 text-sm text-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                onChange={(event) => table.setPageSize(Number(event.target.value))}
                value={pageSize}
              >
                {pageSizeOptions.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>

            <span className="text-sm text-slate-500">
              Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
            </span>
            <div className="flex items-center gap-2">
              <Button
                className="border-slate-300 bg-white text-slate-700"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
                type="button"
                variant="outline"
              >
                Previous
              </Button>
              <Button
                className="border-slate-300 bg-white text-slate-700"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
                type="button"
                variant="outline"
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}
