const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const serviceAccount = require("./Key.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: "https://fir-tutorial-1-d98a5-default-rtdb.firebaseio.com",
});

// Firestore document creation trigger
exports.onDocumentCreate = functions.firestore
    .document("FCA/{documentId}")
    .onCreate((snapshot, context) => {
      // Get the document ID and data from the created document
      const documentId = context.params.documentId;
      const newData = snapshot.data();

      // Log the document ID and new data
      console.log("Document ID:", documentId);
      console.log("New Document Data:", newData);

      // Perform additional actions based on the document creation

      return null; // This is required for a background function
    });

// Firestore document update trigger
exports.onDocumentUpdate = functions.firestore
    .document("FCA/{documentId}")
    .onUpdate((change, context) => {
      // Get the document ID and updated data
      const documentId = context.params.documentId;
      const updatedData = change.after.data();

      // Log the document ID and updated data
      console.log("Document ID:", documentId);
      console.log("Updated Document Data:", updatedData);

      // Perform additional actions based on the document update

      return null; // This is required for a background function
    });

// Firestore document deletion trigger
exports.onDocumentDelete = functions.firestore
    .document("FCA/{documentId}")
    .onDelete((snap, context) => {
      const deletedDocumentId = context.params.documentId;
      console.log("Document deleted with ID:", deletedDocumentId);
      // You can perform additional actions here if needed
      return null;
    });

// Firestore document creation trigger
exports.monitorFCA = functions.firestore
    .document("FCA/{documentId}")
    .onUpdate((snap, context) => {
      const newData = snap.after.data();
      // const oldData = snap.before.data();

      if (newData.Model === "challenger") {
        console.log("document with ID: ", context.params.documentId);
        // You can perform additional actions here if needed
      }

      return null;
    });

// Authentication user is deleted
exports.deleteUserData = functions.auth.user()
    .onDelete(async (user) => {
      const uid = user.uid;
      /* Todo: delete associated photo in storage*/
      try {
        // Delete the document with the same UID from Firestore
        const userDocRef = admin.firestore().collection("users").doc(uid);
        await userDocRef.delete();

        console.log("User document with UID ${uid} deleted successfully.");
        return null;
      } catch (error) {
        console.error("Error deleting user document with UID ${uid}:", error);
        throw new Error("Error deleting user document with UID ${uid}");
      }
    });

// Storage new image is uploadded
exports.onResizedImageUpload = functions.storage.object()
    .onFinalize(async (object) => {
      // comment out console
      // Get the file reference
      const fileReference = admin.storage().bucket(object.bucket)
          .file(object.name);
      // console.log("File Reference:", fileReference.name);

      // if fileReference includes a specific location
      const folderPath = "profileImage/resized";

      if (!object.name.startsWith(folderPath)) {
        // console.log("File is not in the specified folder. Skipping.");
        return null;
      } else {
        // console.log("File is in the specified folder. Continue.");
      }

      // grap its metadata
      const metadata = object.metadata;

      // console.log("File Metadata:", metadata);
      // use address to test. will change to documentID. need change from app
      // console.log("DocumentID: ", metadata.address);
      // write this file reference to a specific document
      await admin.firestore().collection("profileCollection")
          .doc(metadata.address)
          .set({
            "resizedPhotoReference": fileReference.name,
          }, {merge: true});

      return null;
    });

// send a cloud message to topic : orderFromUsers
exports.sendNotification = functions.firestore
    .document("orders/{docId}")
    .onCreate(async (snap, context) => {
      console.log("New Order Document ID:", context.params.documentId);

      // const newData = snap.data();
      const topic = "orderFromUsers"; // Replace with the desired topic

      const payload = {
        notification: {
          title: "New Order Added",
          // Replace with the actual field name from your document
          body: "New document: ",
        },
      };

      try {
        const fcm = admin.messaging();
        const response = await fcm.sendToTopic(topic, payload);
        console.log("Notification sent:", response);
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    });

/* send a cloud message to device based on token,
when document field is changed to ready*/
exports.sendNotificationOnOrderReady = functions.firestore
    .document("orders/{orderId}")
    .onUpdate((change, context) => {
      const newValue = change.after.data();
      const previousValue = change.before.data();

      // Check if the orderStatus field changed to "ready"
      if (newValue.orderStatus === "ready" &&
       previousValue.orderStatus !== "ready") {
        const fcmToken = newValue.fcmToken;

        // Check if FCM token is available
        if (fcmToken) {
          // Construct the message payload
          const message = {
            notification: {
              title: "Order Status Update",
              body: "Your order is ready for pickup!",
            },
            token: fcmToken,
            apns: {
              payload: {
                aps: {
                  sound: "default",
                },
              },
            },
          };

          // Send the message using the FCM send API
          return admin.messaging().send(message)
              .then((response) => {
                console.log("Notification sent successfully:", response);
                return null;
              })
              .catch((error) => {
                console.error("Error sending notification:", error);
                return null;
              });
        } else {
          console.error("FCM token not available for the order.");
          return null;
        }
      } else {
        console.log("Order status is not ready, no notification sent.");
        return null;
      }
    });

// send a cloud message to offer1 when function is called directly
exports.sendOffer1 = functions
    .runWith({
    // Reject requests with missing or invalid App Check tokens
      enforceAppCheck: true,
    })
    .https.onCall(async (_, context) => {
    // Check if the request is authenticated
      if (!context.auth) {
        throw new functions.https
            .HttpsError("unauthenticated", "Authentication required.");
      }
      // Send a Cloud Message to a topic
      const topic = "offer1";
      const payload = {
        notification: {
          title: "offer1 title",
          body: "offer1 message body",
        },
      };

      try {
        const fcm = admin.messaging();
        const response = await fcm.sendToTopic(topic, payload);
        console.log("Notification sent:", response);
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    });

// send a cloud message to offer1 when function is called directly
exports.sendOffer2 = functions
    .runWith({
      // Reject requests with missing or invalid App Check tokens
      enforceAppCheck: true,
    })
    .https.onCall(async (_, context) => {
    // Check if the request is authenticated
      if (!context.auth) {
        throw new functions.https
            .HttpsError("unauthenticated", "Authentication required.");
      }
      // Send a Cloud Message to a topic
      const topic = "offer2";
      const payload = {
        notification: {
          title: "offer2 title",
          body: "offer2 message body",
        },
      };

      try {
        const fcm = admin.messaging();
        const response = await fcm.sendToTopic(topic, payload);
        console.log("Notification sent:", response);
      } catch (error) {
        console.error("Error sending notification:", error);
      }
    });
