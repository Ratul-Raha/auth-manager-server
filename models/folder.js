const mongoose = require("mongoose");

const Schema = mongoose.Schema;

const folderSchema = new Schema({
  folderName: { type: String, required: true },
  userEmail: { type: String, required: true },
});

module.exports = mongoose.model("folder", folderSchema);
