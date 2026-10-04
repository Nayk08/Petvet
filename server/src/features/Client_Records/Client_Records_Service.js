import ClientRecordModel from "./Client_Records_Model.js";
import AppointmentService from "../Appointment/Appointment_Service.js";

const clientRecordModel = new ClientRecordModel();
const appointmentService = new AppointmentService();

// A duplicate email/mobile used to surface as a generic 500 "Failed to add
// client." — say what's actually wrong. (Archived clients count too: the
// unique constraints cover them, so restore the archived record instead.)
function duplicateClientError(error) {
  if (error?.code !== "23505") return null;
  const field = /mobile/i.test(error.constraint ?? "") ? "mobile number" : "email";
  const err = new Error(
    `A client with this ${field} already exists (check Archived clients too).`,
  );
  err.status = 409;
  return err;
}
export default class ClientRecordsService {
  async getClients({ page = 1, limit = 10, search = "", filters = {} } = {}) {
    try {
      const result = await clientRecordModel.getClients({
        page,
        limit,
        search,
        filters,
      });
      return result;
    } catch (error) {
      console.error("Error in ClientRecordsService getClients:", error);
      throw error;
    }
  }

  async getClientById(client_id) {
    try {
      const client = await clientRecordModel.getClientById(client_id);
      return client;
    } catch (error) {
      console.log("Error in ClientRecordsService getClientById:", error);
      throw error;
    }
  }

  async addClient({
    client_name,
    client_email,
    contact_no,
    emergency_contact_name,
    emergency_contact_number,
    address,
    created_by,
  }) {
    try {
      const res = await clientRecordModel.addClient({
        client_name,
        client_email,
        contact_no,
        emergency_contact_name,
        emergency_contact_number,
        address,
        created_by,
      });

      return res;
    } catch (error) {
      console.log(`Error on addClient Service ${error}`);
      throw duplicateClientError(error) ?? error;
    }
  }

  async editClient({
    client_id,
    client_name,
    client_email,
    contact_no,
    emergency_contact_name,
    emergency_contact_number,
    address,
    updated_by,
  }) {
    try {
      const res = await clientRecordModel.editClient({
        client_id,
        client_name,
        client_email,
        contact_no,
        emergency_contact_name,
        emergency_contact_number,
        address,
        updated_by,
      });
      return res;
    } catch (error) {
      console.log(`Error on editClient Service ${error}`);
      throw duplicateClientError(error) ?? error;
    }
  }

  async deleteClient({ client_id, deleted_by }) {
    // Archiving a client used to leave their upcoming appointments and
    // unpaid bills live, attached to an archived record nobody could see.
    const open = await clientRecordModel.getOpenItemsForClient(client_id);
    if (open.appointments > 0 || open.payments > 0) {
      const err = new Error(
        `This client still has ${open.appointments} upcoming appointment(s) and ${open.payments} unpaid/unsettled payment(s). Cancel or settle them first.`,
      );
      err.status = 409;
      throw err;
    }
    try {
      const res = await clientRecordModel.deleteClient({
        client_id,
        deleted_by,
      });
      return res;
    } catch (error) {
      console.log(`Error on deleteClient Service ${error}`);
      throw error;
    }
  }

  async getArchivedClients({ page = 1, limit = 10, search = "" } = {}) {
    try {
      const result = await clientRecordModel.getArchivedClients({
        page,
        limit,
        search,
      });
      return result;
    } catch (error) {
      console.error("Error in ClientRecordsService getArchivedClients:", error);
      throw error;
    }
  }

  async restoreClient({ client_id, updated_by }) {
    try {
      const res = await clientRecordModel.restoreClient({
        client_id,
        updated_by,
      });
      return res;
    } catch (error) {
      console.log(`Error on restoreClient Service ${error}`);
      throw error;
    }
  }

  async permanentlyDeleteClient({ client_id }) {
    try {
      return await clientRecordModel.permanentlyDeleteClient({ client_id });
    } catch (error) {
      console.log(`Error on permanentlyDeleteClient Service ${error}`);
      throw error;
    }
  }

  async getClienPetById({ client_id, page = 1, limit = 10, search = "" } = {}) {
    try {
      return await clientRecordModel.getClienPetById({
        client_id,
        page,
        limit,
        search,
      });
    } catch (error) {
      console.log("Error in ClientRecordsService getClienPetById:", error);
      throw error;
    }
  }

  async addPet({
    client_id,
    pets_name,
    breed,
    is_spayed_neutered,
    date_of_birth,
    weight_kg,
    microchip_number,
    pet_status_id,
    species_id,
    gender_id,
    pet_image,
    allergies,
    medical_conditions,
    temperament,
    created_by,
  }) {
    try {
      const res = await clientRecordModel.addPet({
        client_id,
        pets_name,
        breed,
        is_spayed_neutered,
        date_of_birth,
        weight_kg,
        microchip_number,
        pet_status_id,
        species_id,
        gender_id,
        pet_image,
        allergies,
        medical_conditions,
        temperament,
        created_by,
      });
      return res;
    } catch (error) {
      console.log(`Error on addPet Service ${error}`);
      throw error;
    }
  }

  async getPetById(pets_id) {
    try {
      return await clientRecordModel.getPetById(pets_id);
    } catch (error) {
      console.log("Error in ClientRecordsService getPetById:", error);
      throw error;
    }
  }

  async getPetHistory(pets_id) {
    await this.getPetById(pets_id); // throws if the pet doesn't exist
    return appointmentService.getAppointmentHistoryForPet(pets_id);
  }

  async editPet(payload) {
    try {
      return await clientRecordModel.editPet(payload);
    } catch (error) {
      console.log(`Error on editPet Service ${error}`);
      throw error;
    }
  }

  async transferPetOwner({ pets_id, new_client_id, updated_by }) {
    let newOwner;
    try {
      newOwner = await clientRecordModel.getClientById(new_client_id);
    } catch {
      const err = new Error("Selected client not found.");
      err.statusCode = 404;
      throw err;
    }

    const pet = await clientRecordModel.getPetById(pets_id);
    if (String(pet.client_id) === String(newOwner.client_id)) {
      const err = new Error("This pet is already owned by that client.");
      err.statusCode = 409;
      throw err;
    }

    return clientRecordModel.transferPetOwner({
      pets_id,
      new_client_id,
      updated_by,
    });
  }

  async deletePet({ pets_id, deleted_by }) {
    // Archiving a pet used to leave its upcoming bookings live.
    const upcoming = await clientRecordModel.countOpenAppointmentsForPet(pets_id);
    if (upcoming > 0) {
      const err = new Error(
        `This pet still has ${upcoming} upcoming appointment(s). Cancel them first.`,
      );
      err.status = 409;
      throw err;
    }
    try {
      const res = await clientRecordModel.deletePet({ pets_id, deleted_by });
      return res;
    } catch (error) {
      console.log("Error in ClientRecordsService getPetById:", error);
      throw error;
    }
  }

  async selectSpecies() {
    try {
      const res = await clientRecordModel.selectSpecies();
      return res;
    } catch (error) {
      console.log("Error in ClientRecordsService selectSpecies:", error);
      throw error;
    }
  }
  async selectGender() {
    try {
      const res = await clientRecordModel.selectGender();
      return res;
    } catch (error) {
      console.log("Error in ClientRecordsService selectGender:", error);
      throw error;
    }
  }
  async selectPetStatus() {
    try {
      const res = await clientRecordModel.selectPetStatus();
      return res;
    } catch (error) {
      console.log("Error in ClientRecordsService selectPetStatus:", error);
      throw error;
    }
  }
}
