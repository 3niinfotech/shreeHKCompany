const helper = require("../../helper.js");

const ARRAY_FILTER_FIELDS = [
  "lab",
  "type",
  "shape",
  "color",
  "intensity",
  "overtone",
  "clarity",
  "f_intensity",
  "package",
  "location",
  "main_group",
  "sub_group",
  "memo",
  "category",
  "size",
  "cut",
  "polish",
  "symmentry",
];

const normalizeArrayParam = (value) => {
  if (value == null || value === "") return null;
  if (Array.isArray(value)) return value.filter((v) => v != null && v !== "");
  if (typeof value === "object") return Object.values(value).filter((v) => v != null && v !== "");
  return [String(value)];
};

const normalizeInventoryQuery = (query = {}) => {
  const post = { ...query };

  ARRAY_FILTER_FIELDS.forEach((field) => {
    if (post[field] == null || post[field] === "") return;
    post[field] = normalizeArrayParam(post[field]);
  });

  if (post.type?.length) {
    const withoutPair = [];
    post.type.forEach((value) => {
      if (String(value).toLowerCase() === "pair") {
        post.pair = post.pair || "pair";
      } else {
        withoutPair.push(String(value).toLowerCase());
      }
    });
    if (withoutPair.length) post.type = withoutPair;
    else delete post.type;
  }

  if (!post.form_type && post.diamond) {
    post.form_type = post.diamond === "F" ? "fancy" : post.diamond === "W" ? "white" : "";
  }

  return post;
};

let categoryTreeCache = null;

const loadCategoryTree = async () => {
  if (categoryTreeCache) return categoryTreeCache;
  const rows = await helper.query("SELECT id, parent FROM category");
  const childrenByParent = new Map();
  rows.forEach((row) => {
    const parentId = Number(row.parent) || 0;
    const id = Number(row.id);
    if (!childrenByParent.has(parentId)) childrenByParent.set(parentId, []);
    childrenByParent.get(parentId).push(id);
  });
  categoryTreeCache = childrenByParent;
  return childrenByParent;
};

const expandCategoryIds = async (ids) => {
  if (!ids?.length) return [];
  const tree = await loadCategoryTree();
  const result = new Set();
  const walk = (id) => {
    const numericId = Number(id);
    if (!numericId) return;
    result.add(numericId);
    (tree.get(numericId) || []).forEach(walk);
  };
  ids.forEach(walk);
  return [...result];
};

const resolveInventoryPagination = (rawOffset, limit) => {
  const page = Math.max(1, parseInt(rawOffset, 10) || 1);
  return {
    page,
    limit,
    paginationOffset: (page - 1) * limit,
  };
};

module.exports = {
  normalizeArrayParam,
  normalizeInventoryQuery,
  expandCategoryIds,
  resolveInventoryPagination,
};
