import FlutterContrpller from "../../controller/flutter_controller/flutter";
import express from "express";

const router = express.Router();

router.post('/build_apk/:projectPath', FlutterContrpller.build())