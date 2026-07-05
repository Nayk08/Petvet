export default function isAuth(req, res, next) {
  if (!req.session.isLoggedIn) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
