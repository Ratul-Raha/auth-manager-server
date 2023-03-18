const express = require("express");
const usersController = require("../controllers/usersController");

const { authenticateToken } = require("../middlewares/login");
const router = express.Router();

router.post("/register", usersController.registerUser);

router.post("/login", usersController.login);

router.post("/add-item", usersController.addItem);
router.post("/get-category-wise-item", usersController.getCategoryWiseItem);
router.post("/get-folder-wise-item", usersController.getFolderWiseItem);
router.post(
  "/get-category-wise-item-by-id",
  usersController.getCategoryWiseItemById
);
router.post(
  "/update-category-wise-item",
  usersController.updateCategoryWiseItem
);
router.post("/delete-item", usersController.deleteItem);
router.post("/delete-item-by-folder", usersController.deleteItemByFolder);

module.exports = router;
