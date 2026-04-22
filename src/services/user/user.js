import { db, admin } from "../../config/firebase.js";

class UserService {
    static createUser = async (email, password) => {
        try {
            const user = await admin.auth().createUser({
                email: email,
                password: password,
                emailVerified: false,
            });
            const docRef = db.collection('users').doc(user.uid);
            const doc = {
                uid: user.uid,
                email: email,
                name: name,
                isSubscribed: false,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };
            await docRef.set(doc);
            const token = await admin.auth().createCustomToken(user.uid);
            const data = await this.getUserById(user.uid);
            return res.status(201).json({
                message: 'User created successfully',
                token: token,
                user: data
            });
        } catch (error) {
            console.log(error);
            return res.status(400).json({ 
                message: 'Error creating user', 
                error: error.message 
            });
        }
    }
    // ==============================================

    static loginUser = async (email,password) => {
        try {
            const userRecord = await admin.auth().getUserByEmail(email);
            const user = await admin.auth().verifyPassword(userRecord.uid, password);
            if (!user) {
                throw 'Invalid credentials' ;
            }
            const data = await this.getUserById(userRecord.uid);
            const token = await admin.auth().createCustomToken(userRecord.uid);
            return { token: token, user: data };
        } catch (error) {
            console.log(error);
            throw { message: 'Error logging in', error: error.message };
        }
    }
    static getUserById = async (uid) => {
        try {
            const userDoc = await db.collection('users').doc(uid).get();
            if (!userDoc.exists) {
                throw 'User doesn\'t Exist' 
            }
            const user = userDoc.data();
            return user;
        } catch (error) {
            console.log(error);
           throw error
        }
    }
    static logoutUser = async (token) => {
        try {
            if (!token) {
                throw  'No token provided' ;
            }
            await admin.auth().revokeRefreshTokens(token);
            return { message: 'User logged out successfully' };
        } catch (error) {
            console.log(error);
            throw { ...error };
        }
    }
    static addUserSubscription = async (uid, plan, token,start_date, end_date) => {
        try {
            const userDoc = await db.collection('subscription').doc(uid)
            const subs = await userDoc.set({
                uid,
                plan,
                token,
                start_date,
                end_date,
                updatedAt: new Date().toISOString()
            })
        } catch (er){
            throw {...er}
        }
    }

    // user preference
    static addPreference = (isSubscribed, token,  ) => {

    }
}

export default UserService;