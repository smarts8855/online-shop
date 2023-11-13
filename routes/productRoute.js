const express = require("express");
const Product = require("../model/Product");
const { Category } = require("../model/Category");
const mongoose = require("mongoose");
const appErr = require("../helper/appErr");
const isLogin = require("../middlewares/isLogin");
const isAdmin = require("../middlewares/isAdmin");
const multer = require("multer");
const storageFile = require("../helper/cloudinary");
const router = express.Router();


const uploadFile = multer({storageFile})


const FILE_TYPE_MAP = {
  "image/png": "png",
  "image/jpeg": "jpeg",
  "image/peg": "peg",
};

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const isValid = FILE_TYPE_MAP[file.mimetype];
    let uploadError = new Error("Invalid image type");
    if (isValid) {
      uploadError = null;
    }
    cb(uploadError, "public/uploads");
  },
  filename: function (req, file, cb) {
    const filName = file.originalname.replace(" ", "-");
    const extension = FILE_TYPE_MAP[file.mimetype];
    cb(null, `${filName}-${Date.now()}.${extension}`);
  },
});

const upload = multer({ storage: storage });

//Create Product
router.post(
  `/`,  
  isLogin,
  isAdmin,
  upload.single("image"),
  async (req, res, next) => {
    const categoryFound = await Category.findById(req.body.category);
    if (!categoryFound) {
      return next(appErr("Invalid Category", 400));
    }

    const file = req.file;
    if (!file) return next(appErr("Provide the product image", 405));

    const {
      name,
      shortDescription,
      longDescription,
      image,
      brand,
      price,
      category,
      countInStock,
      rating,
      numReviews,
      isFeatured,
    } = req.body;
    const fileName = req.file.filename;
    const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
    const productFound = await Product.findOne({ name });
    if (productFound) {
      return next(appErr(`${name} already exists`, 404));
    }
    const product = new Product({
      name,
      shortDescription,
      longDescription,
      image: `${basePath}${fileName}`,
      brand,
      price,
      category,
      countInStock,
      rating,
      numReviews,
      isFeatured,
    });
    await product.save();
    if (!product) {
      return next(appErr(`Product not created`, 404));
    }
    res.send(product);
  }
);

//Get All Products
router.get(`/`, async (req, res) => {
  let filter = {};
  if (req.query.categories) {
    filter = { category: req.query.categories.split(",") };
  }
  const products = await Product.find(filter).populate("category");
  if (!products) {
    res.status(404).send("Products not found");
  }

  res.send(products);
});

//Get Single Product
router.get("/:id", async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) {
    return res.status(404).send("Invalid product ID");
  }
  const product = await Product.findById(req.params.id)
    .select("name image category ")
    .populate("category");
  if (!product) {
    return res.status(404).send("Product not found");
  }
  res.send(product);
});

//Update Product
router.put("/:id", upload.single("image"), async (req, res, next) => {
  const {
    name,
    shortDescription,
    longDescription,
    image,
    brand,
    price,
    category,
    countInStock,
    rating,
    numReviews,
    isFeatured,
  } = req.body;
  if (!mongoose.isValidObjectId(req.params.id)) {
    return next(appErr("Invalid Product ID", 400));
  }
  const categoryFound = await Category.findById(req.body.category);
  if (!categoryFound) return next(appErr("Invalid Category", 400));

  const productFound = await Product.findById(req.params.id);
  if (!productFound) return next(appErr("Invalid Product", 400));

  const file = req.file;
  let imagepath;

  if (file) {
    const fileName = req.file.filename;
    const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
    imagepath = `${basePath}${fileName}`;
  } else {
    imagepath = productFound.image;
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    {
      name,
      shortDescription,
      longDescription,
      image: imagepath,
      brand,
      price,
      category,
      countInStock,
      rating,
      numReviews,
      isFeatured,
    },
    {
      new: true,
    }
  );
  if (!product) {
    return res.status(404).send("Product not updated");
  }
  res.send(product);
});

router.delete("/:id", (req, res) => {
  Product.findByIdAndRemove(req.params.id)
    .then((product) => {
      if (product) {
        return res.status(200).json({
          success: true,
          message: "The Product deleted successfully!",
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "The Product could not be found!",
        });
      }
    })
    .catch((err) => {
      return res.status(400).json({ success: false, message: err });
    });
});

router.get(`/get/count`, async (req, res) => {
  const productCount = await Product.countDocuments();
  if (!productCount) {
    res.status(404).json({ success: false });
  }

  res.send({
    productCount: productCount,
  });
});

router.get(`/get/featured/:count`, async (req, res) => {
  const count = req.params.count;
  const products = await Product.find({ isFeatured: true }).limit(+count);
  if (!products) {
    res.status(404).json({ success: false });
  }

  res.send(products);
});

router.put(
  "/gallery-images/:id",
  upload.array("images", 10),
  async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return next(appErr("Invalid Product ID", 400));
    }
    const files = req.files;
    let imagesPaths = [];
    const basePath = `${req.protocol}://${req.get("host")}/public/uploads/`;
    if (files) {
      files.map((file) => {
        imagesPaths.push(`${basePath}${file.filename}`);
      });
    }

    const product = await Product.findByIdAndUpdate(
      req.params.id,
      {
        images: imagesPaths,
      },
      {
        new: true,
      }
    );
    if (!product) {
      return res.status(404).send("Product not updated");
    }

    res.send(product);
  }
);

module.exports = router;
