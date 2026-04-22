import admin from 'firebase-admin';
import dotenv from 'dotenv';
import firebase from 'firebase/auth'
dotenv.config();
 
console.log("Initializing Firebase Admin SDK");
var serviceAccount = JSON.parse(process.env.SER_ACCOUNT)

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


const db = admin.firestore();


export { admin, db };