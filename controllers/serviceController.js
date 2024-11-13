// serviceController.js
import { db } from "../config/firebase.js";

// Collection reference
const servicesCollection = db.collection("Services");

// Custom Error Response Utility
const errorResponse = (res, message, statusCode = 500) => {
  return res.status(statusCode).json({ error: message });
};

// Create a new service
export const createService = async (req, res) => {
  try {
    const {
      userId, // userId provided in the request
      title,
      description,
      price,
      availability,
      location,
      category,
    } = req.body;

    if (
      !userId ||
      !title ||
      !description ||
      price == null ||
      availability == null ||
      !location ||
      !category
    ) {
      return res.status(400).json({ error: "All fields are required" });
    }

    // Query the Profiles collection to get the profileId using userId
    const profilesCollection = db.collection("profiles");
    const profileQuerySnapshot = await profilesCollection
      .where("userId", "==", userId)
      .limit(1)
      .get();

    console.log(profileQuerySnapshot);

    // Check if profile exists for the given userId
    if (profileQuerySnapshot.empty) {
      return res
        .status(404)
        .json({ error: "Profile not found for the given userId" });
    }

    // Extract the profileId from the query result
    const profileDoc = profileQuerySnapshot.docs[0];
    const providerId = profileDoc.id; // profileId from the document ID

    // Create the new service with the retrieved providerId
    const newService = {
      providerId,
      title,
      description,
      price,
      availability,
      location,
      category,
      rating: 0,
    };

    const docRef = await servicesCollection.add(newService);

    return res
      .status(201)
      .json({ message: "Service created successfully!", serviceId: docRef.id });
  } catch (error) {
    console.error("Error creating service:", error);
    return res.status(500).json({ error: "Failed to create service" });
  }
};

// Get a single service by ID
export const getServiceById = async (req, res) => {
  try {
    const { serviceId } = req.params;

    if (!serviceId) return errorResponse(res, "Service ID is required", 400);

    const doc = await servicesCollection.doc(serviceId).get();
    if (!doc.exists) return errorResponse(res, "Service not found", 404);

    return res.status(200).json(doc.data());
  } catch (error) {
    console.error("Error retrieving service:", error);
    return errorResponse(res, "Failed to retrieve service");
  }
};

// Get all services
export const getAllServices = async (req, res) => {
  try {
    const snapshot = await servicesCollection.get();
    const services = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return res.status(200).json(services);
  } catch (error) {
    console.error("Error retrieving all services:", error);
    return errorResponse(res, "Failed to retrieve services");
  }
};

// Get services by provider ID
export const getServicesByProviderId = async (req, res) => {
  try {
    const { providerId } = req.params;

    if (!providerId) return errorResponse(res, "Provider ID is required", 400);

    const snapshot = await servicesCollection
      .where("providerId", "==", providerId)
      .get();
    if (snapshot.empty)
      return errorResponse(res, "No services found for this provider", 404);

    const services = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    return res.status(200).json(services);
  } catch (error) {
    console.error("Error retrieving services by provider ID:", error);
    return errorResponse(res, "Failed to retrieve services");
  }
};

// Update a service
export const updateService = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const updatedData = req.body;

    if (!serviceId) return errorResponse(res, "Service ID is required", 400);
    if (Object.keys(updatedData).length === 0)
      return errorResponse(res, "No data provided for update", 400);

    await servicesCollection.doc(serviceId).update(updatedData);
    return res.status(200).json({ message: "Service updated successfully" });
  } catch (error) {
    console.error("Error updating service:", error);
    return errorResponse(res, "Failed to update service");
  }
};

// Delete a service
export const deleteService = async (req, res) => {
  try {
    const { serviceId } = req.params;

    if (!serviceId) return errorResponse(res, "Service ID is required", 400);

    await servicesCollection.doc(serviceId).delete();
    return res.status(200).json({ message: "Service deleted successfully" });
  } catch (error) {
    console.error("Error deleting service:", error);
    return errorResponse(res, "Failed to delete service");
  }
};
