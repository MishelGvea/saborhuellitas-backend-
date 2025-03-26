const express = require("express");
const multer = require("multer");
const cloudinary = require("../cloudinaryConfig");

const router = express.Router();
const storage = multer.memoryStorage();
const upload = multer({ storage });

router.post("/", upload.single("image"), async (req, res) => {
  try {
    const result = await cloudinary.uploader.upload_stream((error, result) => {
      if (error) {
        return res.status(500).json({ error: "Error subiendo la imagen" });
      }
      res.json({ imageUrl: result.secure_url });
    }).end(req.file.buffer);
  } catch (error) {
    res.status(500).json({ error: "Error interno del servidor" });
  }
});

module.exports = router;
