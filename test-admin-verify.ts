import admin from 'firebase-admin';
admin.initializeApp({ projectId: "celtic-biplane-j8gvj" });
admin.auth().verifyIdToken("invalid").then(console.log).catch(console.error);
