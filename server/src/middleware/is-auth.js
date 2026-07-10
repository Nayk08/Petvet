export default function isAuth(req, res, next) {
  if (!req.session?.isLoggedIn || !req.session?.user) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}
  