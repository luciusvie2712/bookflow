export type ApiErrorBody = Readonly<{
  code: string;
  message: string;
  details?: Readonly<Record<string, unknown>>;
}>;

export type ApiSuccess<T> = Readonly<{
  data: T;
  requestId: string;
}>;

export type ApiFailure = Readonly<{
  error: ApiErrorBody;
  requestId: string;
}>;

export type PaginationMeta = Readonly<{
  page: number;
  pageSize: number;
  total: number;
}>;

export type Paginated<T> = Readonly<{
  items: readonly T[];
  meta: PaginationMeta;
}>;
