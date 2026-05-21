const admin = require('firebase-admin');
admin.initializeApp({ projectId: "celtic-biplane-j8gvj" });
admin.auth().createCustomToken("test").then(console.log).catch(console.error);
