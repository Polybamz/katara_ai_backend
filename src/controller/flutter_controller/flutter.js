import { FlutterManager } from "../../services/flutter/flutter_ser";


class FlutterContrpller {
    // create app
    static  createApp = async (req, res) => {
        const {appName, githubotps} = req.body;
        try {
            const result = await FlutterManager.createApp(appName,null, githubotps);
            return res.status(200).json({
                success: true,
                result
            })
        } catch (er){
            return res.status(400).json({
                success: false,
                er
            })
        }

    }
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
            const apk = await FlutterManager.build(projectPath)
            return res.send(apk)
        } catch (er){

        }

    }
}
export default FlutterContrpller;