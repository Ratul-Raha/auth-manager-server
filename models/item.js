const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const itemSchema = new Schema({
  name: { type: String, required: true },
  username: { type: String, required: true },
  password: { type: String, required: false, minlength: 8 },
  url: { type: String, required: true },
  notes: { type: String, required: true },
  folder: { type: String, required: true },
  type: { type: String, required: true },
  userId: { type: String, required: true },
});

module.exports = mongoose.model("item", itemSchema);
