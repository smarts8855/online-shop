const express = require("express");
const { Category } = require("../model/Category");
const isLogin = require("../middlewares/isLogin");
const router = express.Router();

//Create Category
router.post("/", isLogin, async (req, res) => {
  let category = new Category({  
    icon: req.body.icon,
    color: req.body.color,
  });
  await category.save();
  if (!category) {
    res.status(500).send("Category not created");
  }
  res.send(category);
});

//Get all categories from
router.get("/", isLogin, async (req, res) => {
  const categories = await Category.find();

  if (!categories) {
    res.status(404).send("Categories not found");
  }

  res.send(categories);
});

//Get single category
router.get("/:id", async (req, res) => {
  const category = await Category.findById(req.params.id);
  if (!category) {
    res.status(404).json({ message: "Category with the ID is not found" });
  }

  res.send(category);
});

//Update category
router.put("/:id", async (req, res) => {
  const category = await Category.findByIdAndUpdate(
    req.params.id,
    {
      name: req.body.name,
      icon: req.body.icon,
      color: req.body.color,
    },
    {
      new: true,
    }
  );

  if (!category) {
    return res.status(404).send("The category with the ID is not found ");
  }

  res.send(category);
});

router.delete("/:id", (req, res) => {
  Category.findByIdAndRemove(req.params.id)
    .then((category) => {
      if (category) {
        return res.status(200).json({
          success: true,
          message: "The category deleted successfully!",
        });
      } else {
        return res.status(500).json({
          success: false,
          message: "The category could not be found!",
        });
      }
    })
    .catch((err) => {
      return res.status(400).json({ success: false, message: err });
    });
});

module.exports = router;
