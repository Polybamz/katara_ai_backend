import UserService from "../../services/user/user";
import { admin } from "../../config/firebase";

class UserController {
    static verifyIdToken = async (req, res, next) => {
        // Accept idToken from body or Authorization header (Bearer)
        const { displayName, email, photoURL, uid, idToken: idTokenFromBody } = req.body || {};
        const authHeader = req.headers?.authorization || req.headers?.Authorization;
        const idTokenFromHeader = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;
        const idToken = idTokenFromBody || idTokenFromHeader;

        if (!idToken) {
            return res.status(400).send("ID Token is required");
        }

        try {
            // Verify the ID token using Firebase Admin SDK
            const decodedToken = await admin.auth().verifyIdToken(idToken);
            const uid = decodedToken.uid; // Firebase user ID

            // Optionally, fetch additional user data if needed
            const userRecord = await admin.auth().getUser(uid);
            console.log("Verified Firebase User:", userRecord);

            // Attach verified user info to the request and continue
            req.user = {
                uid,
                claims: decodedToken,
                user: userRecord,
                displayName,
                email,
                photoURL
            };

            return next();
        } catch (error) {
            console.error("Error verifying token:", error);
            return res.status(401).send("Unauthorized");
        }
    }
    ///sae user data to users collection
    static addUsersData = async (req, res) => {
        const { displayName, email, photoURL, uid } = req.user || {};
        try {
            const userRef = admin.firestore().collection("users").doc(uid);
            await userRef.set({ displayName, email, photoURL }, { merge: true });
            return res.status(200).json({ success: true, message: "User data saved successfully" });
        } catch(er) {
            return res.status(400).json({ success: false, message: er.message });
        }
    }
   

   
}

export default UserController;