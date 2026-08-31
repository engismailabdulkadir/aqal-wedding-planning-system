import mongoose from 'mongoose';

export function validateObjectId(paramName = 'id') {
  return (req, res, next) => {
    const id = req.params[paramName];
    if (!mongoose.isValidObjectId(id)) {
      res.status(400);
      return next(new Error('Invalid resource ID'));
    }
    return next();
  };
}
