import AuthenticatorModel from "./Authenticator_Model.js";
import bcrypt from "bcrypt";
const authModel = new AuthenticatorModel();

export default class AuthenticatorService {
  async login({ email, password }) {
    const user = await authModel.findEmail(email);

    if (!user) {
      const err = new Error("Invalid email or password");
      err.status = 401;
      throw err;
    }

    const isPasswordValid = await bcrypt.compare(password, user.user_password);

    if (!isPasswordValid) {
      const err = new Error("Invalid email or password");
      err.status = 401;
      throw err;
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
}
