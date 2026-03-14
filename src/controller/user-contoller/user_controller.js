import UserService from "../../services/user/user";

class UserController {
    static register = async (req,res)=> {
        const {email, password} = req.body
        try {
            const user = await UserService.createUser(email, password)
            return res.status(200).json({
                success: true,
                user
            })
        } catch (er){
            return res.status(400).json({
                success:false, 
                message: er.message
            })
        }

    }
    // login
    static async  lofin(req,res) {
         const {email, password} = req.body
        try {
            const user = await UserService.loginUser(email, password)
            return res.status(200).json({
                success: true,
                user
            })
        } catch (er){
            return res.status(400).json({
                success:false, 
                message: er.message
            })
        }
        
    }

    // logout 

    static async logout(req,res){
        try{
            
        } catch(er){

        }
    }
}