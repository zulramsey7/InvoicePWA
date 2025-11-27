const firebaseConfig = {
    apiKey: "AIzaSyAV0W4ylVYBOO1h34kUNP-_PCYP2od3GhQ",
    authDomain: "persatuanukayperdana-6452e.firebaseapp.com",
    projectId: "persatuanukayperdana-6452e",
    storageBucket: "persatuanukayperdana-6452e.firebasestorage.app",
    messagingSenderId: "804848604454",
    appId: "1:804848604454:web:b85bef423e364134e65de7",
    measurementId: "G-V4WEBSTLR5"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db = firebase.firestore();

async function signIn(email, password) {
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        return userCredential.user;
    } catch (error) {
        console.error('Sign in error:', error);
        throw error;
    }
}

function signOut() {
    return auth.signOut();
}

// ... (konfigurasi firebase, inisialisasi auth & db kekal sama)

// Fungsi untuk mendaftarkan pengguna baru dengan nama, email, dan kata laluan
async function signUp(name, email, password) {
    try {
        // 1. Cipta pengguna dengan email dan kata laluan
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;

        // 2. Kemas kini profil pengguna dengan nama penuh
        await user.updateProfile({ displayName: name });

        console.log('User signed up and profile updated:', user);
        return user;
    } catch (error) {
        console.error('Sign up error:', error);
        throw error; // Lemparkan ralat untuk ditangkap di register.js
    }
}

// ... (fungsi signIn dan signOut kekal sama)