import AuthenticatorService from "./Authenticator_Service.js";
const authService = new AuthenticatorService();

export default class AuthenticatorController {
  async registerUser(req, res) {
    try {
      const { email, password, confirmPassword, firstName, lastName } =
        req.body;
      const newUser = await authService.registerUser(
        email,
        password,
        confirmPassword,
        firstName,
        lastName,
      );

      res
        .status(201)
        .json({ message: "User registered successfully", user: newUser });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }

  async login(req, res) {
    try {
      const { email, password } = req.body;
      const user = await authService.login({ email, password });

      req.session.regenerate((err) => {
        if (err) {
          return res.status(500).json({ error: "Login failed" });
        }
        req.session.user = { id: user.id, email: user.email };
        req.session.isLoggedIn = true;
        res
          .status(200)
          .json({ message: "Login successful", user: req.session.user });
      });
    } catch (error) {
      res.status(401).json({ error: error.message });
    }
  }

  async logout(req, res) {
    try {
      req.session.destroy((err) => {
        if (err) {
          return res.status(500).json({ error: "Failed to logout" });
        }
        res.clearCookie("connect.sid", {
          secure: process.env.NODE_ENV === "production",
          httpOnly: true,
          sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
        });
        res.status(200).json({ message: "Logout successful" });
      });
    } catch (error) {
      res.status(400).json({ error: error.message });
    }
  }
}
