import FlutterController from "../../controller/flutter_controller/flutter.js";
import express from "express";

const router = express.Router();

router.post('/build_apk/:projectPath', FlutterController.build())