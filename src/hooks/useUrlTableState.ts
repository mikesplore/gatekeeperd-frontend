import { useSearchParams } from "react-router-dom";

export function useUrlTableState(defaultPageSize = 25) {
  const [params, setParams] = useSearchParams();
  const pageSize = Number(params.get("pageSize") || defaultPageSize) || defaultPageSize;
  const page = Math.max(0, Number(params.get("page") || 0) || 0);

  const setTableParam = (key: string, value: string | number | undefined) => {
    const next = new URLSearchParams(params);
    if (value === undefined || value === "") next.delete(key);
    else next.set(key, String(value));
    setParams(next);
  };

  return {
    params,
    page,
    pageSize,
    offset: page * pageSize,
    setTableParam,
    resetPage: () => setTableParam("page", undefined),
  };
}
