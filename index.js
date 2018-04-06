const functions = require("firebase-functions");
const firebase  = require("firebase-admin");

firebase.initializeApp();

exports.createUser = functions.auth.user().onCreate((user) => {
  let db = firebase.firestore();
  let uref = db.collection("users").doc(user.uid);
  return db.batch()
    .create(uref, {
      //id: user.uid,
      name: user.displayName
    })
    .create(db.collection("usernames").doc(user.displayName), {
      user: user.uid
    })
    .commit();
});
exports.deleteUser = functions.auth.user().onDelete((user) => {
  let db = firebase.firestore();
  return db.batch()
    .delete(db.collection("users").doc(user.uid))
    .delete(db.collection("usernames").doc(user.displayName))
    .commit();
});

exports.signUp = functions.https.onCall(({email, displayName, password, photoURL}, context) => {
  if(!displayName) {
    throw new functions.https.HttpsError("invalid-argument", "displayName must be a non-empty string");
  }
  return firebase.firestore().collection("usernames").doc(displayName).get()
    .then((snap) => {
      if(snap.exists) {
        throw new functions.https.HttpsError("failed-precondition", "displayName already taken", displayName);
      }
      return firebase.auth().createUser({email, password, displayName, photoURL});
    });
});

function getUserEmail(userRef) {
  return firebase.auth().getUser(userRef.id).then((user) => user.email);
}

exports.getEmail = functions.https.onCall(({username, password}, context) => {
  return firebase.firestore().collection("usernames").doc(username).get()
    .then((snap) => {
      if(!snap.exists) {
        return Promise.resolve(username);
      }
      return getUserEmail(snap.get("user"));
    });
});
