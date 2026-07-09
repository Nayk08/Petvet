import express from "express";

import CommonController from "./Common_Controller.js";
import isAuth from "../../middleware/is-auth.js";
const router = express.Router();
const commonController = new CommonController();

// ✅ wrapped in arrow function
router.get("/nav", isAuth, (req, res) =>
  commonController.getNavbarData(req, res),
);

router.get("/categoryUserLevel", isAuth, (req, res) =>
  commonController.getCategoryUserLevel(req, res),
);

export default router;
