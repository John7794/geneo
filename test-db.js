const admin = require("firebase-admin");
const config = require("./firebase-applet-config.json");

admin.initializeApp({ projectId: config.projectId });

async function test(dbId) {
  try {
    let db;
    if (dbId) {
      db = admin.firestore(admin.app(), dbId);
      // Wait, admin.firestore() doesn't officially document a dbId argument in older versions, let's use the alternative.
      // But let's try it.
    } else {
      db = admin.firestore();
    }
    await db.collection("test").doc("test").set({hello: "world"});
    console.log("Success with", dbId || "default");
  } catch (e) {
    console.error("Failed with", dbId || "default", e.message);
  }
}

async function run() {
  await test(null);
  await test(config.firestoreDatabaseId);
}

run();
