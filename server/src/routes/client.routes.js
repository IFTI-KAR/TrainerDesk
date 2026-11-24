const express = require('express');
const clientController = require('../controllers/client.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const { uploadSingleImage } = require('../middleware/upload');
const {
  clientIdParamSchema,
  clientNoteParamSchema,
  listClientsSchema,
  createClientSchema,
  updateClientSchema,
  createClientNoteSchema,
} = require('../validators/client.validator');

const router = express.Router();

router.use(protect);

router.get('/stats', clientController.getClientStats);
router.get('/', validate(listClientsSchema), clientController.listClients);
router.get('/:id', validate(clientIdParamSchema), clientController.getClient);
router.post(
  '/',
  uploadSingleImage('photo'),
  validate(createClientSchema),
  clientController.createClient
);
router.patch(
  '/:id',
  uploadSingleImage('photo'),
  validate(updateClientSchema),
  clientController.updateClient
);
router.post('/:id/notes', validate(createClientNoteSchema), clientController.addClientNote);
router.delete(
  '/:id/notes/:noteId',
  validate(clientNoteParamSchema),
  clientController.deleteClientNote
);
router.delete('/:id', validate(clientIdParamSchema), clientController.deleteClient);

module.exports = router;
