import admin from 'firebase-admin';
import dotenv from 'dotenv';
dotenv.config();
 
console.log("Initializing Firebase Admin SDK");
var serviceAccount = {
    //   "type": "service_account",
    //   "project_id": "yocaco-fb6f3",
    //   "private_key_id": "73e1a3c02e8a1e5f068e125f8835aabaaf69b7f7",
    //   "private_key": "-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANBgkqhkiG9w0BAQEFAASCBKcwggSjAgEAAoIBAQCanF24qWsY/6vl\nAcSb+zy26h2TgQIUERNfdO/tICuicZwANekf6Z4dvbPA9iDmLDWwKYiFJ2bAAAMQ\no5PtSBLxhxmiaGmLst7lufPGPl4OjpfaywdJTeIrrFBlbhGMMWDEAak+N9wPmkos\njzZXJT4T1xY/YQwEIug3G0UVDdCDqHtgcEQ5QqjGXzggF3fwsfOSUwsXgTXNLgK5\nkuiNIaMu5LH1KTVrBPfcQpU6dB7L4SpoZKO7KAe2gMx+5wciTBMnrSs0e240F7+Q\n5uFu0+o325j6kMFQkMbWV0HDJWrpTBDJzytop8Uisdlnz52XOj4I3Syl9LsDEVyR\nnkT0NE/fAgMBAAECggEAIu2fWKfhe4DK/w3islBUO4hxTRDwfMMMytxalYnWgbjD\nwuJq+5wl7dcc5ENWVFl5eYYwgtBPbKG0D468zPai3PCl8GRBL9+lbmWPdmJBkm1R\nTgre5wcSyMYBVaDDkxXWpAEyEE3DR70V87IY1yAhQY8uRfwxIEAYkNZ2yVZZHFza\nKdE57XKx8tOcgSS1vDFwDpkSQ3ntnFjDIqfkvGreyywwlnOs7pnMiA4wRfuPQi4w\nLoKRH80/pXnybDfgiCG0H8Mv89x9+TUxIEnXPdlxPc6LS9Q8Ia/aDNwXxewc49Ab\niWX2cuJSCedwxQtPkAJk+UTpZf8E4CnEmmuf2L2tEQKBgQDOsInSUP62qcmBe6hE\nKVju/X3Q4mPUeUNlfNb3yCtAybQzGpyxaF3mlXZ8CR2g4kpgnoofj8jNwQ2Bjlfz\nNvKFHBMy3j130zEE8o4mCziDyD+X3zr3Dly2m7l3oCaqbxiic5VaIzqs6zQHj0jj\nwfd7OapJ1ID4uyFQ3siEXeapLwKBgQC/fyROtW2Z61A93HY1CLIR+PiFO1PYTTFI\nRXT2nfGZizQl5ft0tjkT9YsslNu9YhKeg8CI0HVyMYagLBPZn32eg/UznifeFwyS\nqxcuiMvoee+NUhYMRskmW42RhrAHnzZJXmv2sPiA6vH1oSjVqnMHWzAJ7E5r5rwM\nJRbQL5G4UQKBgEwh4uJBS1FlQQAc2GIjCMsfPFTQzwzYjea4EUa7yJLYuTOJveXr\nF4tzymztvqggMl1ciGwPvltrnNn34JWJy9MUAE5gZivY8tlrrsh8oZiJDkOWylVu\nSOBKhAp4R0XIHj7YbE8DYv2GtWeDc8nRDKOrHfqL9+WmqCLtrNZ08B2pAoGAYFBQ\nMI4ru9iQmSyC/5WKCmQQiuIV/5qDiPf2Jfu2giVzawRK/p6QAqvi/d84zf2/o55c\nffNqvq6OKY1BxpjjE5EHCJkpMBijqDkJBcyj0h9SDuAUWsRXc0Vk5Ka7bnnzUd99\nqavEsQJ6A7K02RJLnI2Okc8aekaomeslmDv0rKECgYEAxxmcUzxGZsDvBY/e27FV\ntYUKmHZXY7gwoq6Xh8frqlLMklFIFHOhmSdlI25sq5NiC3MfP0yN0T+xe0fHgWgh\n1tdvC/2LyEGeo0ef59zHUmfM7mIF0zlJNKGmpYFmiMWg9Ki8/uNHPicBxhXUrJBi\nPwcBvMZdqn5TL3csHvy7+tY=\n-----END PRIVATE KEY-----\n",
    //   "client_email": "firebase-adminsdk-fbsvc@yocaco-fb6f3.iam.gserviceaccount.com",
    //   "client_id": "107451975429586128906",
    //   "auth_uri": "https://accounts.google.com/o/oauth2/auth",
      // "token_uri": "https://oauth2.googleapis.com/token",
    //   "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    //   "client_x509_cert_url": "https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40yocaco-fb6f3.iam.gserviceaccount.com",
    //   "universe_domain": "googleapis.com"
    "type": "service_account",
    "project_id": process.env.FIREBASE_PROJECT_ID,
    "private_key_id": process.env.FIREBASE_PRIVATE_KEY_ID,
    "private_key": process.env.FIREBASE_PRIVATE_KEY,
    "client_email": process.env.FIREBASE_CLIENT_EMAIL,
    "client_id": process.env.FIREBASE_CLIENT_ID,
    "auth_uri": process.env.FIREBASE_AUTH_URI,
    "token_uri": process.env.FIREBASE_TOKEN_URI,
    "auth_provider_x509_cert_url": process.env.FIREBASE_AUTH_PROVIDER_X509_CERT_URL,
    "client_x509_cert_url": process.env.FIREBASE_CLIENT_X509_CERT_URL,
    "universe_domain": "googleapis.com"
}
    ;

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


const db = admin.firestore();


export { admin, db };