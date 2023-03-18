const User = require("../models/users");
const Item = require("../models/item");
const bcrypt = require("bcrypt");
var jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const res = require("express/lib/response");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
const crypto = require("crypto");
const moment = require("moment");
const mongoose = require("mongoose");
const { userRoles } = require("../config");
const sgMail = require("@sendgrid/mail");

mongoose.set("sanitizeFilter", true);

const registerUser = async (req, res, next) => {
  const { name, email, password } = req.body;
  console.log(name, email, password);
  /* check if users exists */
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    return res.status(500).send({ errorMessage: "Signup failed, try again later" });
  }

  if (existingUser) {
    return res
      .status(422)
      .send({ errorMessage: "User already Exists"});
  }

  let hashPassword;
  try {
    const salt = await bcrypt.genSalt(10);
    hashPassword = await bcrypt.hash(password, salt);
  } catch (err) {
    return res.status(500).send({ errorMessage: "Signup failed, try again later" });
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
      return res.status(500).send({ errorMessage: "Signup failed, try again later" });
    }
  } catch (err) {
    return res.status(500).send({ errorMessage: "Signup failed, try again later" });
  }
};



const login = async (req, res, next) => {
  const { email, password } = req.body;

  console.log(email);

  /* check if the user exists */
  let existingUser;

  try {
    existingUser = await User.findOne({ email: email });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ errorMessage: "Login failed" });
  }
  if (!existingUser) {
    return res.status(403).send({ errorMessage: "Invalid username or password" });
  }

  if (existingUser) {
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, existingUser.password);
      console.log(isValidPassword);
    } catch (err) {
      return res.status(500).send({
        errorMessage: "Please try again",
      });
    }
    if (!isValidPassword) {
      return res.status(403).send({ errorMessage: "Invalid username or password" });
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
        return res
          .status(500)
          .send({ errorMessage: "Login failed" });
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
    folder: folder,
    userId: user._id,
  });

  try {
    let result = await createdItem.save();
    return res.status(200).send({
      successMessage: "Item was added successfully!",
    });
  } catch (err) {
    console.log(err);
    return res.status(500).send({ errorMessage: "Couldn't add item!" });
  }
};

const getCategoryWiseItem = async (req, res, next) => {
  const { type, superEmail } = req.body;
  const user = await User.findOne({email: superEmail});
  console.log(user._id);
  const data = await Item.find({ type: type}).where('userId').equals(user._id);
  console.log("bbbbbbbbbbb",data);
  return res.status(200).send(data);
};

const getFolderWiseItem = async (req, res, next) => {
  const { folder, superEmail } = req.body;

  const user = await User.findOne({email: superEmail});
  const data = await Item.find({ folder: folder }).where('userId').equals(user._id);
  console.log(data);
  return res.status(200).send(data);
};

const getCategoryWiseItemById = async (req, res, next) => {
  const { item } = req.body;
  console.log(item);
  const data = await Item.findById(item);
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
      item.folder = folder || item.folder;
      try {
        const result = await item.save();
        console.log("result", result);
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

const deleteItem = async (req, res, next) => {
  const { id, superEmail, type  } = req.body;
  try {
    const item = await Item.findOneAndDelete(id);
    const allItem = await Item.find({userEmail: superEmail, type: type});
    return res.status(200).send(allItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update item." });
  }
};

const deleteItemByFolder = async (req, res, next) => {
  const { id, superEmail, type  } = req.body;
  try {
    const item = await Item.findOneAndDelete(id);
    const allItem = await Item.find({email: superEmail, type: type});
    return res.status(200).send(allItem);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, message: "Failed to update item." });
  }
};

module.exports = {
  registerUser,
  login,
  addItem,
  getCategoryWiseItem,
  getFolderWiseItem,
  getCategoryWiseItemById,
  updateCategoryWiseItem,
  deleteItem,
  deleteItemByFolder
};
