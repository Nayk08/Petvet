import AuthenticatorModel from "./Authenticator_Model.js";
import bcrypt from "bcrypt";
const authModel = new AuthenticatorModel();

export default class AuthenticatorService {
  async login({ email, password }) {
    const user = await authModel.findEmail(email);

    if (!user) throw new Error("Invalid email or password");

    const isPasswordValid = await bcrypt.compare(password, user.user_password);

    if (!isPasswordValid) {
      throw new Error("Invalid email or password");
    }

    const profile = await authModel.findUserProfile(user.users_id);

    return {
      id: user.users_id,
      name: profile?.user_name || user.user_name,
      email: user.user_email,
      role: profile?.user_level,
      user_level_id: profile?.user_level_id, // primary role, for display
      level_ids: profile?.level_ids, // all roles, for permission checks
      user_picture: profile?.user_picture ?? null,
    };
  }

  async updateMyPicture(users_id, user_picture) {
    return authModel.updateUserPicture(users_id, user_picture);
  }

  async registerUser(email, password, confirmPassword, firstName, lastName) {
    if (!password || password.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    if (password !== confirmPassword) {
      throw new Error("Passwords do not match");
    }

    const userName = [firstName, lastName]
      .map((name) => name?.trim())
      .filter(Boolean)
      .join(" ");

    if (!userName) {
      throw new Error("Name is required");
    }

    const existingUser = await authModel.findEmail(email);
    if (existingUser) {
      throw new Error("Email already exists");
    }

    const defaultUserLevelId = await authModel.findUserLevelId("Client");

    if (!defaultUserLevelId) {
      throw new Error("Default user role not found");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await authModel.registerUser(
      userName,
      email,
      hashedPassword,
      defaultUserLevelId,
    );

    return newUser;
  }
}
