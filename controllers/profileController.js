import { db } from "../config/firebase.js";
import { join, extname } from "path";

export async function updateProfile(req, res) {
  const { userId } = req.params;
  const {
    name,
    contactInfo,
    location,
    skills,
    experienceYears,
    servicesOffered,
    serviceArea,
    availability,
    serviceNeeds,
    preferredServiceTypes,
    locationPreferences,
    role,
  } = req.body;

  console.log(servicesOffered, experienceYears);

  try {
    // Ensure the user is authenticated and authorized
    // if (!req.user || req.user.userId !== userId) {
    //   return res.status(403).json({ error: "Unauthorized access." });
    // }

    // Prepare data for update; any undefined fields in req.body will be ignored
    const updateData = {
      ...(name && { name }),
      ...(role && { role }),
      ...(contactInfo && { contactInfo }),
      ...(location && { location }),
      ...(skills && { skills: skills.split(",").map((skill) => skill.trim()) }),
      ...(experienceYears && {
        experience_years: parseInt(experienceYears, 10),
      }),
      ...(servicesOffered && {
        servicesOffered: servicesOffered
          .split(",")
          .map((service) => service.trim()),
      }),
      ...(serviceArea && { serviceArea }),
      ...(availability && { availability }),
      ...(serviceNeeds && { serviceNeeds }),
      ...(preferredServiceTypes && {
        preferredServiceTypes: preferredServiceTypes
          .split(",")
          .map((type) => type.trim()),
      }),
      ...(locationPreferences && { locationPreferences }),
      ...(userId && { userId }),
    };

    // console.log(updateData);

    // Handle profile image if file was uploaded
    if (req.file) {
      updateData.profileImage = join(
        "uploads",
        `${userId}${extname(req.file.originalname)}`
      );
    }

    // Update or set the profile information in Firestore
    const profileRef = db.collection("profiles").doc(userId);
    await profileRef.set(updateData, { merge: true });

    res.status(200).json({ message: "Profile updated successfully" });
  } catch (error) {
    console.error("Error updating profile:", error);
    res
      .status(500)
      .json({ error: "Failed to update profile. Please try again later." });
  }
}

// Get profile by userId
export async function getProfile(req, res) {
  const { userId } = req.params;

  try {
    const profileRef = db.collection("profiles").doc(userId);
    const profileDoc = await profileRef.get();

    if (!profileDoc.exists) {
      return res.status(404).send({ error: "Profile not found" });
    }

    res.status(200).send(profileDoc.data());
  } catch (error) {
    console.error("Error retrieving profile:", error);
    res.status(500).send({ error: "Failed to retrieve profile" });
  }
}

// Get all profiles
export async function getAllProfiles(req, res) {
  try {
    const profilesRef = db.collection("profiles");
    const snapshot = await profilesRef.get();

    if (snapshot.empty) {
      return res.status(404).send({ message: "No profiles found" });
    }

    // Map over documents and return profile data
    const profiles = snapshot.docs.map((doc) => ({
      userId: doc.id,
      ...doc.data(),
    }));

    res.status(200).send(profiles);
  } catch (error) {
    console.error("Error retrieving profiles:", error);
    res.status(500).send({ error: "Failed to retrieve profiles" });
  }
}
