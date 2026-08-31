export function getHealth(_req, res) {
  res.status(200).json({
    success: true,
    message: 'Wedding Planning API is running',
  });
}
