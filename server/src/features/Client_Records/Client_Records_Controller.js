import ClientRecordsService from "./Client_Records_Service.js";

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
      console.error(error);
      const status = error.status || 500;
      return res.status(status).json({
        message: error.message || "Failed to fetch client record by ID.",
      });
    }
  }

  async addClient(req, res) {
    try {
      console.log("BODY:", req.body);
      console.log("FILE:", req.file);
      const { client_name, client_email, contact_no } = req.body;
      const newClient = await clientRecordsService.addClient({
        client_name,
        client_email,
        contact_no,
        created_by: req.session.user.name,
      });
      return res.status(201).json(newClient);
    } catch (error) {
      const status = error.status || 500;
      return res
        .status(status)
        .json({ message: error.message || "Something went wrong" });
    }
  }

  async editClient(req, res) {
    try {
      const { client_id } = req.params;
      const { client_name, client_email, contact_no } = req.body;

      if (!client_id) {
        return res.status(400).json({ message: "client_id is required" });
      }

      const updateClient = await clientRecordsService.editClient({
        client_id,
        client_name,
        client_email,
        contact_no,
        updated_by: req.session.user.name,
      });

      return res.status(200).json(updateClient);
    } catch (error) {
      const status = error.status || 500;
      return res
        .status(status)
        .json({ message: error.message || "Something went wrong" });
    }
  }

  // Controller
  async deleteClient(req, res) {
    try {
      const { client_id } = req.params;

      if (!client_id) {
        return res.status(400).json({ message: "client_id is required" });
      }

      const deletedClient = await clientRecordsService.deleteClient({
        client_id,
        deleted_by: req.session.user.name,
      });
      return res.status(200).json(deletedClient);
    } catch (error) {
      const status = error.status || 500;
      return res
        .status(status)
        .json({ message: error.message || "Something went wrong" });
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
        .json({ message: "Failed to fetch client record by ID." });
    }
  }

  async addPet(req, res) {
    try {
      const { client_id } = req.params;
      if (!client_id) {
        return res.status(400).json({ message: "client_id is required" });
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
        created_by: req.session.user.name,
      });

      return res.status(201).json(newPet);
    } catch (error) {
      const status = error.status || 500;
      return res
        .status(status)
        .json({ message: error.message || "Something went wrong" });
    }
  }

  async getPetById(req, res) {
    try {
      const { pets_id } = req.params;
      const pet = await clientRecordsService.getPetById(pets_id);
      return res.status(200).json(pet);
    } catch (error) {
      console.error(error);
      const status = error.status || 500;
      return res
        .status(status)
        .json({ message: error.message || "Failed to fetch pet." });
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
        updated_by: req.session.user.name,
      });

      return res.status(200).json(updatedPet);
    } catch (error) {
      const status = error.status || 500;
      return res
        .status(status)
        .json({ message: error.message || "Something went wrong" });
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
      const status = error.status || 500;
      return res
        .status(status)
        .json({ message: error.message || "Something went wrong" });
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
        .json({ message: "Failed to fetch selectSpecies." });
    }
  }
  async selectGender(req, res) {
    try {
      const response = await clientRecordsService.selectGender();
      return res.status(200).json(response);
    } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Failed to fetch selectGender." });
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
        .json({ message: "Failed to fetch selectPetStatus." });
    }
  }
}
