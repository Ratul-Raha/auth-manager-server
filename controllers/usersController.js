const User = require("../models/users");
const Item = require("../models/item");
const bcrypt = require("bcrypt");
var jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const Folder = require("../models/folder");
const { body, validationResult } = require("express-validator");

mongoose.set("sanitizeFilter", true);

const registerUser = async (req, res, next) => {
  const { name, email, password } = req.body;
  /* check if users exists */
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    return res
      .status(500)
      .send({ errorMessage: "Signup failed, try again later" });
  }

  if (existingUser) {
    return res.status(422).send({ errorMessage: "User already Exists" });
  }

  let hashPassword;
  try {
    const salt = await bcrypt.genSalt(10);
    hashPassword = await bcrypt.hash(password, salt);
  } catch (err) {
    return res
      .status(500)
      .send({ errorMessage: "Signup failed, try again later" });
  }
  const createdUser = new User({
    name,
    email,
    password: hashPassword,
  });

  try {
    let result = await createdUser.save();
    if (result) {
      return res.status(200).send({
        successMessage: "Signup completed",
        user: {
          id: result.id,
          email: result.email,
          firstName: result.first_name,
        },
      });
    } else {
      return res
        .status(500)
        .send({ errorMessage: "Signup failed, try again later" });
    }
  } catch (err) {
    return res
      .status(500)
      .send({ errorMessage: "Signup failed, try again later" });
  }
};

const login = async (req, res, next) => {
  const { email, password } = req.body;
  /* check if the user exists */
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ errorMessage: "Login failed" });
  }
  if (!existingUser) {
    return res
      .status(403)
      .send({ errorMessage: "Invalid username or password" });
  }

  if (existingUser) {
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, existingUser.password);
    } catch (err) {
      return res.status(500).send({
        errorMessage: "Please try again",
      });
    }
    if (!isValidPassword) {
      return res
        .status(403)
        .send({ errorMessage: "Invalid username or password" });
    } else {
      let token;
      try {
        token = jwt.sign(
          {
            userId: existingUser.id,
            email: existingUser.email,
          },
          "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789",
          { expiresIn: "1h" }
        );
      } catch (err) {
        return res.status(500).send({ errorMessage: "Login failed" });
      }
      res.json({
        token: token,
        user: {
          userId: existingUser.id,
          name: existingUser.name,
          email: existingUser.email,
        },
      });
    }
  }
};

const addItem = async (req, res, next) => {
  await body("name").trim().escape().isLength({ min: 1 }).run(req);
  await body("username").trim().escape().isLength({ min: 1 }).run(req);
  await body("url").trim().isURL().run(req);
  await body("password").trim().escape().isLength({ min: 6 }).run(req);
  await body("notes").optional().trim().escape().run(req);
  await body("type").trim().escape().isIn(["Social", "Official"]).run(req);
  const folderData = await Folder.findOne({ folderName: req.body.folder });

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errorMessage: errors.array() });
  }

  const { userEmail, name, username, url, password, notes, type, folder } =
    req.body;
  const user = await User.findOne({ email: userEmail });

  const createdItem = new Item({
    name: name,
    username: username,
    password: password,
    url: url,
    notes: notes,
    type: type,
    folder: folderData._id,
    userId: user._id,
  });

  try {
    let result = await createdItem.save();
    const allItems = await Item.find().where("userEmail").equals(userEmail);
    return res.status(200).send({
      successMessage: "Item was added successfully!",
      data:allItems
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ errorMessage: "Couldn't add item!" });
  }
};

const getAllItems = async (req, res, next) => {
  const { folder, superEmail } = req.body;
  const user = await User.findOne({ email: superEmail });
  const data = await Item.find().where("userId").equals(user._id);
  return res.status(200).send(data);
};

const getSingleItem = async (req, res, next) => {
  const { id } = req.body;
  const data = await Item.findById({ _id: id });
  return res.status(200).send(data);
};

const getCategoryWiseItem = async (req, res, next) => {
  const { type, superEmail } = req.body;
  const user = await User.findOne({ email: superEmail });

  const data = await Item.find({ type: type })
    .where("userId")
    .equals(user._id)
    .populate("folder");
  return res.status(200).send(data);
};

const getFolderWiseItem = async (req, res, next) => {
  const { folder, superEmail } = req.body;
  const user = await User.findOne({ email: superEmail });
  const folderData = await Folder.findOne({ folderName: folder });
  const folderId = folderData._id;

  const data = await Item.find({ folder: folderId })
    .where("userId")
    .equals(user._id)
    .populate("folder");
  return res.status(200).send(data);
};

const getCategoryWiseItemById = async (req, res, next) => {
  const { item } = req.body;
  const data = await Item.findById(item).populate("folder");
  return res.status(200).send(data);
};

const updateCategoryWiseItem = async (req, res, next) => {
  const { name, username, password, url, notes, type, folder } =
    req.body.updatedItem;
  try {
    const item = await Item.findById(req.body.id);
    if (item) {
      item.name = name || item.name;
      item.username = username || item.username;
      item.password = password || item.password;
      item.url = url || item.url;
      item.notes = notes || item.notes;
      item.type = type || item.type;
      try {
        const result = await item.save();
        return res.status(200).send(item);
      } catch (err) {
        return next(err);
      }
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update item." });
  }
};

const deleteDashboardItem = async (req, res, next) => {
  const { id, superEmail, type } = req.body;
  try {
    const item = await Item.findOneAndDelete(id);
    const allItem = await Item.find({ userEmail: superEmail});
    return res.status(200).send(allItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete item." });
  }
};

const deleteItem = async (req, res, next) => {
  const { id, superEmail, type } = req.body;
  try {
    const item = await Item.findOneAndDelete(id);
    const allItem = await Item.find({ userEmail: superEmail, type: type });
    return res.status(200).send(allItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to delete item." });
  }
};

const deleteItemByFolder = async (req, res, next) => {
  const { id, superEmail, folder, name } = req.body;
  const singleFolder = await Folder.findOne({folderName: folder});
  try {
    const item = await Item.findOneAndDelete(id);
    const allItem = await Item.find({ email: superEmail, folder: singleFolder.id });
    console.log(allItem)
    return res.status(200).send(allItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update item." });
  }
};

const deleteItemByCategory = async (req, res, next) => {
  const { id, superEmail, type, name } = req.body;
  try {
    const item = await Item.findOneAndDelete(id);
    const allItem = await Item.find({ email: superEmail, type: type });
    console.log(allItem)
    return res.status(200).send(allItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update item." });
  }
};

const createFolder = async (req, res, next) => {
  const { userEmail, folderName } = req.body;

  let existingFolder;

  existingFolder = await Folder.findOne({
    userEmail: userEmail,
    folderName: folderName,
  });
  if (existingFolder) {
    return res
      .status(403)
      .send({ errorMessage: "Can not create folder with same name" });
  } else {
    const resultCreated = new Folder({
      folderName: folderName,
      userEmail: userEmail,
    });

    try {
      const response = await resultCreated.save();
      const folders = await Folder.find({ userEmail: userEmail });
      return res
        .status(200)
        .send({ successMessage: "Fetched all the folders", folders: folders });
    } catch (err) {
      console.log(err);
      return res
        .status(403)
        .send({ errorMessage: "Something went wrong, please try again" });
    }
  }
};

const updateFolder = async (req, res, next) => {
  const { userEmail, editFolderName, updatedFolderName } = req.body;

  const folder = await Folder.findOne()
    .where("userEmail")
    .equals(userEmail)
    .where("folderName")
    .equals(editFolderName);

  try {
    folder.folderName = updatedFolderName;

    const response = await folder.save();
    const folders = await Folder.find({ userEmail: userEmail });
    return res
      .status(200)
      .send({ successMessage: "Fetched all the folders", folders: folders });
  } catch (err) {
    console.log(err);
    return res
      .status(403)
      .send({ errorMessage: "Something went wrong, please try again" });
  }
};

const getFolder = async (req, res, next) => {
  const { userEmail } = req.body;

  const folder = await Folder.find({ userEmail: userEmail });

  return res
    .status(200)
    .send({ successMessage: "New folder is created", folders: folder });
};

const deleteFolder = async (req, res, next) => {
  const { userEmail, folderName } = req.body;

  const folderDeleted = await Folder.findOneAndDelete({
    userEmail: userEmail,
    folderName: folderName,
  });

  const folder = await Folder.find({ userEmail: userEmail });
  return res
    .status(200)
    .send({ successMessage: "Folder is deleted", folders: folder });
};

module.exports = {
  registerUser,
  login,
  addItem,
  getAllItems,
  getSingleItem,
  getCategoryWiseItem,
  getFolderWiseItem,
  getCategoryWiseItemById,
  updateCategoryWiseItem,
  deleteItem,
  deleteDashboardItem,
  deleteItemByFolder,
  deleteItemByCategory,
  createFolder,
  getFolder,
  deleteFolder,
  updateFolder,
};
