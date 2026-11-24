function cleanValue(value) {
  if (typeof value === 'string') {
    return value.replace(/\0/g, '');
  }
  if (Array.isArray(value)) {
    return value.map(cleanValue);
  }
  if (value && typeof value === 'object' && !(value instanceof Date)) {
    const cleaned = {};
    for (const [key, val] of Object.entries(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        continue;
      }
      cleaned[key] = cleanValue(val);
    }
    return cleaned;
  }
  return value;
}

function sanitize(req, _res, next) {
  if (req.body && typeof req.body === 'object') {
    req.body = cleanValue(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = cleanValue(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = cleanValue(req.params);
  }
  next();
}

module.exports = sanitize;
