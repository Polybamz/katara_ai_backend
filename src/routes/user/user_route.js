import UserController from "../../controller/user-contoller/user_controller";
import express from "express";

const router = express.Router();

router.post("/verify-id-token", UserController.verifyIdToken, UserController.addUsersData);
// router.post("/login", UserController.login);
// router.post("/logout", UserController.logout);

export default router;
