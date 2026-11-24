function parsePagination(query = {}, defaults = { page: 1, limit: 20, maxLimit: 100 }) {
  const rawPage = Number.parseInt(query.page, 10);
  const rawLimit = Number.parseInt(query.limit, 10);

  const page = Number.isFinite(rawPage) && rawPage >= 1 ? rawPage : defaults.page;
  const maxLimit = defaults.maxLimit || 100;
  const limit =
    Number.isFinite(rawLimit) && rawLimit >= 1 ? Math.min(rawLimit, maxLimit) : defaults.limit;
  const skip = (page - 1) * limit;

  return { page, limit, skip };
}

function buildPaginationMeta(total, page, limit) {
  const totalPages = Math.max(1, Math.ceil(total / limit));
  return {
    total,
    page,
    limit,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
}

module.exports = {
  parsePagination,
  buildPaginationMeta,
};
