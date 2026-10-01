import ClientRecordsService from "./Client_Records_Service.js";
import { sendError } from "../../../utils/errorResponse.js";

const clientRecordsService = new ClientRecordsService();

export default class ClientRecordsController {
  async getClients(req, res) {
    try {
      const { page, limit, search, name } = req.query;
      const filters = { name };

      const { rows, pagination } = await clientRecordsService.getClients({
        page,
        limit,
        search,
        filters,
      });

      return res.status(200).json({ rows, pagination });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Failed to fetch client records." });
    }
  }

  async getClientById(req, res) {
    try {
      const { client_id } = req.params;
      const client = await clientRecordsService.getClientById(client_id);
      return res.status(200).json(client);
    } catch (error) {
      return sendError(res, error, "Failed to fetch client record.");
    }
  }

  async addClient(req, res) {
    try {
      const {
        client_name,
        client_email,
        contact_no,
        emergency_contact_name,
        emergency_contact_number,
        address,
      } = req.body;
      const newClient = await clientRecordsService.addClient({
        client_name,
        client_email,
        contact_no,
        emergency_contact_name,
        emergency_contact_number,
        address,
        created_by: req.session.user.name,
      });
      return res.status(201).json(newClient);
    } catch (error) {
      return sendError(res, error, "Failed to add client.");
    }
  }

  async editClient(req, res) {
    try {
      const { client_id } = req.params;
      const {
        client_name,
        client_email,
        contact_no,
        emergency_contact_name,
        emergency_contact_number,
        address,
      } = req.body;

      if (!client_id) {
        return res.status(400).json({ message: "Client ID is required." });
      }

      const updateClient = await clientRecordsService.editClient({
        client_id,
        client_name,
        client_email,
        contact_no,
        emergency_contact_name,
        emergency_contact_number,
        address,
        updated_by: req.session.user.name,
      });

      return res.status(200).json(updateClient);
    } catch (error) {
      return sendError(res, error, "Failed to update client.");
    }
  }

  async deleteClient(req, res) {
    try {
      const { client_id } = req.params;

      if (!client_id) {
        return res.status(400).json({ message: "Client ID is required." });
      }

      const deletedClient = await clientRecordsService.deleteClient({
        client_id,
        deleted_by: req.session.user.name,
      });
      return res.status(200).json(deletedClient);
    } catch (error) {
      return sendError(res, error, "Failed to delete client.");
    }
  }

  async getArchivedClients(req, res) {
    try {
      const { page, limit, search } = req.query;
      const { rows, pagination } = await clientRecordsService.getArchivedClients({
        page,
        limit,
        search,
      });
      return res.status(200).json({ rows, pagination });
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Failed to fetch archived client records." });
    }
  }

  async restoreClient(req, res) {
    try {
      const { client_id } = req.params;

      if (!client_id) {
        return res.status(400).json({ message: "Client ID is required." });
      }

      const restoredClient = await clientRecordsService.restoreClient({
        client_id,
        updated_by: req.session.user.name,
      });
      return res.status(200).json(restoredClient);
    } catch (error) {
      return sendError(res, error, "Failed to restore client.");
    }
  }

  async permanentlyDeleteClient(req, res) {
    try {
      const { client_id } = req.params;
      const deleted = await clientRecordsService.permanentlyDeleteClient({
        client_id,
      });
      if (!deleted) {
        return res.status(404).json({ message: "Archived client not found." });
      }
      return res.status(200).json(deleted);
    } catch (error) {
      return sendError(res, error, "Failed to permanently delete client.");
    }
  }

  async getClienPetById(req, res) {
    try {
      const { client_id } = req.params;
      const { page, limit, search } = req.query;
      const client = await clientRecordsService.getClienPetById({
        client_id,
        page,
        limit,
        search,
      });
      return res.status(200).json(client);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Failed to fetch client's pet records." });
    }
  }

  async addPet(req, res) {
    try {
      const { client_id } = req.params;
      if (!client_id) {
        return res.status(400).json({ message: "Client ID is required." });
      }

      const {
        pets_name,
        breed,
        is_spayed_neutered,
        date_of_birth,
        weight_kg,
        pet_status_id,
        species_id,
        gender_id,
        allergies,
        medical_conditions,
        temperament,
      } = req.body;

      const newPet = await clientRecordsService.addPet({
        client_id,
        pets_name,
        breed,
        is_spayed_neutered,
        date_of_birth,
        weight_kg,
        pet_status_id,
        species_id,
        gender_id,
        pet_image: req.file ? req.file.path : null,
        allergies,
        medical_conditions,
        temperament,
        created_by: req.session.user.name,
      });

      return res.status(201).json(newPet);
    } catch (error) {
      return sendError(res, error, "Failed to add pet.");
    }
  }

  async getPetById(req, res) {
    try {
      const { pets_id } = req.params;
      const pet = await clientRecordsService.getPetById(pets_id);
      return res.status(200).json(pet);
    } catch (error) {
      return sendError(res, error, "Failed to fetch pet record.");
    }
  }

  async editPet(req, res) {
    try {
      const { pets_id } = req.params;
      const {
        pets_name,
        breed,
        is_spayed_neutered,
        date_of_birth,
        weight_kg,
        pet_status_id,
        species_id,
        gender_id,
        allergies,
        medical_conditions,
        temperament,
      } = req.body;

      let pet_image = req.file?.path;
      if (!pet_image) {
        const existing = await clientRecordsService.getPetById(pets_id);
        pet_image = existing?.pet_image ?? null;
      }

      const updatedPet = await clientRecordsService.editPet({
        pets_id: pets_id,
        pets_name,
        breed,
        is_spayed_neutered,
        date_of_birth,
        weight_kg,
        pet_status_id,
        species_id,
        gender_id,
        pet_image,
        allergies,
        medical_conditions,
        temperament,
        updated_by: req.session.user.name,
      });

      return res.status(200).json(updatedPet);
    } catch (error) {
      return sendError(res, error, "Failed to update pet.");
    }
  }

  async transferPetOwner(req, res) {
    try {
      const { pets_id } = req.params;
      const { new_client_id } = req.body;

      const updatedPet = await clientRecordsService.transferPetOwner({
        pets_id,
        new_client_id,
        updated_by: req.session.user.name,
      });

      return res.status(200).json(updatedPet);
    } catch (error) {
      return sendError(res, error, "Failed to transfer pet ownership.");
    }
  }

  async deletePet(req, res) {
    try {
      const { pets_id } = req.params;
      const response = await clientRecordsService.deletePet({
        pets_id,
        deleted_by: req.session.user.name,
      });
      return res.status(200).json(response);
    } catch (error) {
      return sendError(res, error, "Failed to delete pet.");
    }
  }

  async selectSpecies(req, res) {
    try {
      const response = await clientRecordsService.selectSpecies();
      return res.status(200).json(response);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Failed to fetch species list." });
    }
  }
  async selectGender(req, res) {
    try {
      const response = await clientRecordsService.selectGender();
      return res.status(200).json(response);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to fetch gender list." });
    }
  }
  async selectPetStatus(req, res) {
    try {
      const response = await clientRecordsService.selectPetStatus();
      return res.status(200).json(response);
    } catch (error) {
      console.error(error);
      return res
        .status(500)
        .json({ message: "Failed to fetch pet status list." });
    }
  }
}
