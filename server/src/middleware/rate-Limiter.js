import rateLimit from "express-rate-limit";
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true, // adds RateLimit-* headers
  legacyHeaders: false, // disables X-RateLimit-* headers
  message: { message: "Too many attempts, please try again later." },
});
export default authLimiter;
