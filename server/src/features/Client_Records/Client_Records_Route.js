import express from "express";
import hasPermission from "../../middleware/has-permission.js";
import ClientRecordsController from "./Client_Records_Controller.js";
import upload from "../../middleware/upload.js";

import {
  validateBody,
  validateParams,
  validateImage,
} from "../../middleware/validate.js";
import {
  addClientSchema,
  editClientParamsSchema,
  editClientBodySchema,
  clientIdParamSchema,
} from "../../validators/clientSchema.js";
import {
  addPetSchema,
  editPetSchema,
  petIdParamSchema,
} from "../../validators/petSchema.js";

const router = express.Router();
const clientRecordsController = new ClientRecordsController();

router.get("/client", hasPermission("C_P_RECORDS", "can_view"), (req, res) =>
  clientRecordsController.getClients(req, res),
);

router.get(
  "/client/:client_id",
  hasPermission("C_P_RECORDS", "can_view"),
  validateParams(clientIdParamSchema),
  (req, res) => clientRecordsController.getClientById(req, res),
);

router.post(
  "/client/add-client",
  hasPermission("C_P_RECORDS", "can_create"),
  upload.single("client_image"),
  validateBody(addClientSchema),
  (req, res) => clientRecordsController.addClient(req, res),
);

router.put(
  "/client/:client_id/edit-client",
  hasPermission("C_P_RECORDS", "can_edit"),
  upload.single("client_image"),
  validateParams(editClientParamsSchema),
  validateBody(editClientBodySchema),
  (req, res) => clientRecordsController.editClient(req, res),
);

router.put(
  "/client/:client_id/delete-client",
  hasPermission("C_P_RECORDS", "can_delete"),
  validateParams(clientIdParamSchema),
  (req, res) => clientRecordsController.deleteClient(req, res),
);

router.get(
  "/client/:client_id/pets",
  hasPermission("C_P_RECORDS", "can_view"),
  validateParams(clientIdParamSchema),
  (req, res) => clientRecordsController.getClienPetById(req, res),
);

router.post(
  "/client/:client_id/pets",
  hasPermission("C_P_RECORDS", "can_create"),
  validateParams(clientIdParamSchema),
  validateBody(addPetSchema),
  (req, res) => clientRecordsController.addPet(req, res),
);

router.get("/species", hasPermission("C_P_RECORDS", "can_view"), (req, res) =>
  clientRecordsController.selectSpecies(req, res),
);

router.get("/gender", hasPermission("C_P_RECORDS", "can_view"), (req, res) =>
  clientRecordsController.selectGender(req, res),
);

router.get(
  "/pet-status",
  hasPermission("C_P_RECORDS", "can_view"),
  (req, res) => clientRecordsController.selectPetStatus(req, res),
);

router.get(
  "/pets/:pets_id",
  hasPermission("C_P_RECORDS", "can_view"),
  validateParams(petIdParamSchema),
  (req, res) => clientRecordsController.getPetById(req, res),
);

router.put(
  "/pets/:pets_id/edit-pet",
  hasPermission("C_P_RECORDS", "can_edit"),
  validateParams(petIdParamSchema),
  validateBody(editPetSchema),
  (req, res) => clientRecordsController.editPet(req, res),
);

router.put(
  "/pets/:pets_id/delete-pet",
  hasPermission("C_P_RECORDS", "can_delete"),
  validateParams(petIdParamSchema),
  (req, res) => clientRecordsController.deletePet(req, res),
);

export default router;
