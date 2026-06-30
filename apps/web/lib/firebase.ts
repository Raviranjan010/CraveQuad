import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "mock-api-key",
  authDomain: "campus-crave-dev.firebaseapp.com",
  projectId: "campus-crave-dev",
  storageBucket: "campus-crave-dev.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};

// Prevent duplicate initialization during Hot Module Replacement (HMR)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);
export default app;
