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
        req.session.user = {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          user_level_id: user.user_level_id,
          level_ids: user.level_ids,
          user_picture: user.user_picture,
        };
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

  async me(req, res) {
    res.status(200).json({ user: req.session.user });
  }

  // /me and /nav both just read req.session.user rather than querying the
  // DB fresh each time — so a picture change needs to write through to the
  // session here too, or it wouldn't show up anywhere until the next login.
  async updateMyPicture(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No image uploaded" });
      }

      const user_picture = await authService.updateMyPicture(
        req.session.user.id,
        req.file.path,
      );
      req.session.user.user_picture = user_picture;

      req.session.save((err) => {
        if (err) {
          return res.status(500).json({ message: "Failed to save session" });
        }
        res.status(200).json({ user: req.session.user });
      });
    } catch (error) {
      const status = error.status || 500;
      res.status(status).json({ message: error.message || "Something went wrong" });
    }
  }
}
