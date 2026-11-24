const asyncHandler = require('../utils/asyncHandler');
const clientService = require('../services/client.service');

const getClientStats = asyncHandler(async (req, res) => {
  const stats = await clientService.getClientStats({ trainerId: req.trainerId });
  res.status(200).json({
    success: true,
    data: { stats },
  });
});

const listClients = asyncHandler(async (req, res) => {
  const { clients, pagination } = await clientService.listClients({
    trainerId: req.trainerId,
    query: req.query,
  });
  res.status(200).json({
    success: true,
    data: { clients, pagination },
  });
});

const getClient = asyncHandler(async (req, res) => {
  const client = await clientService.getClientById({
    trainerId: req.trainerId,
    clientId: req.params.id,
  });
  res.status(200).json({
    success: true,
    data: { client },
  });
});

const createClient = asyncHandler(async (req, res) => {
  const client = await clientService.createClient({
    trainerId: req.trainerId,
    payload: req.body,
    file: req.file,
  });
  res.status(201).json({
    success: true,
    data: { client },
  });
});

const updateClient = asyncHandler(async (req, res) => {
  const client = await clientService.updateClient({
    trainerId: req.trainerId,
    clientId: req.params.id,
    payload: req.body,
    file: req.file,
  });
  res.status(200).json({
    success: true,
    data: { client },
  });
});

const addClientNote = asyncHandler(async (req, res) => {
  const client = await clientService.addClientNote({
    trainerId: req.trainerId,
    clientId: req.params.id,
    text: req.body.text,
  });
  res.status(201).json({
    success: true,
    data: { client },
  });
});

const deleteClientNote = asyncHandler(async (req, res) => {
  const client = await clientService.deleteClientNote({
    trainerId: req.trainerId,
    clientId: req.params.id,
    noteId: req.params.noteId,
  });
  res.status(200).json({
    success: true,
    data: { client },
  });
});

const deleteClient = asyncHandler(async (req, res) => {
  await clientService.deleteClient({
    trainerId: req.trainerId,
    clientId: req.params.id,
  });
  res.status(200).json({
    success: true,
    message: 'Client deleted',
  });
});

module.exports = {
  getClientStats,
  listClients,
  getClient,
  createClient,
  updateClient,
  addClientNote,
  deleteClientNote,
  deleteClient,
};
