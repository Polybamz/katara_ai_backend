import { FlutterManager } from "../../services/flutter/flutter_ser.js";


class FlutterController {

    /// flutter pub get
    static pubGet = async (req, res) => {
        const {projectPath} = req.params
        try {
           const result = await FlutterManager.pubGet(projectPath)
           return res.status(200).json({
            success: true,
            result
           })
        } catch (er) {
            return res.status(400).json({
                success:false,
                er
            })

        }

    }
    /// build apk
    static build = async (req,res) => {
        const {projectPath} = req.params;
        try {
            const apk = await FlutterManager.buildAPK(projectPath)
            return res.status(200).json(
                {success: true,
                apk})
        } catch (er){
            return res.status(400).json({success: false,er})
        }

    }
}
export default FlutterController;