export function validateRequest(rules) {
  return (req, res, next) => {
    for (const [field, rule] of Object.entries(rules)) {
      const value = req.body[field];
      if (rule.required && (value === undefined || value === null || value === '')) {
        res.status(400);
        return next(new Error(rule.message || `${field} is required`));
      }
      if (value !== undefined && value !== null && rule.enum && !rule.enum.includes(value)) {
        res.status(400);
        return next(new Error(rule.message || `Invalid value for ${field}`));
      }
      if (value !== undefined && value !== null && rule.minLength && String(value).length < rule.minLength) {
        res.status(400);
        return next(new Error(rule.message || `${field} is too short`));
      }
    }
    return next();
  };
}
