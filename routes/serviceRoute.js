// serviceRoute.js
import express from "express";
import {
  createService,
  getServiceById,
  getAllServices,
  getServicesByProviderId,
  updateService,
  deleteService,
} from "../controllers/serviceController.js";

const router = express.Router();

router.post("/postService", createService);
router.get("/getServiceById/:serviceId", getServiceById);
router.get("/getAllServices", getAllServices);
router.get("/getServicesByProviderId/:providerId", getServicesByProviderId);
router.put("/updateService/:serviceId", updateService);
router.delete("/deleteService/:serviceId", deleteService);

export default router;
