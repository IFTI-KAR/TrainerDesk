const express = require('express');
const controller = require('../controllers/food.controller');
const { protect } = require('../middleware/auth');
const validate = require('../middleware/validate');
const {
  listFoodsSchema,
  foodIdParamSchema,
  createFoodSchema,
  updateFoodSchema,
} = require('../validators/diet.validator');

const router = express.Router();

router.use(protect);

router.get('/meta', controller.getFoodMeta);
router.get('/', validate(listFoodsSchema), controller.listFoods);
router.post('/', validate(createFoodSchema), controller.createFood);
router.patch('/:id', validate(updateFoodSchema), controller.updateFood);
router.delete('/:id', validate(foodIdParamSchema), controller.deleteFood);

module.exports = router;
