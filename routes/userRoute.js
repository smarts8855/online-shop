const { User } = require("../model/User");
const express = require("express");
const bcrypt = require("bcryptjs");
const generateToken = require("../helper/generateToken");
const isLogin = require("../middlewares/isLogin");
const router = express.Router();

//Regiter
router.post("/register", async (req, res) => {
  const {
    name,
    email,
    password,
    phone,
    isAdmin,
    street,
    apartment,
    zip,
    city,
    country,
  } = req.body;

  const userFoud = await User.findOne({ email });
  if (userFoud) {
    return res.status(401).json({ message: "User already exists!" });
  }
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  let user = new User({
    name,
    email,
    passwordHash: hashedPassword,
    phone,
    isAdmin,
    street,
    apartment,
    zip,
    city,
    country,
  });
  user = await user.save();
  if (!user) {
    res.status(500).send("User not created");
  }
  res.send(user);
});

//Login
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  //Check if email exist
  const userEmailFound = await User.findOne({ email });
  if (!userEmailFound) {
    return res.json({
      message: "Invalid login credentials",
    });
  }

  //verify password
  const isPasswordMatched = await bcrypt.compare(
    password,
    userEmailFound.passwordHash
  );
  if (!isPasswordMatched) {
    return res.json({ message: "Invalid login credentials" });
  }

  res.json({
    status: "success",
    data: {
      email: userEmailFound.email,
      name: userEmailFound.name,
      isAdmin: userEmailFound.isAdmin,
      token: generateToken(userEmailFound._id),
    },
  });
});

//Get all Users
router.get("/", async (req, res) => {
  const users = await User.find();
  if (!users) {
    return res.status(500).json({ message: "No users found!" });
  }

  res.status(200).send(users);
});

//Get single user
router.get("/profile", isLogin, async (req, res) => {
  const user = await User.findById(req.userAuth);
  if (!user) {
    return res.status(404).json({ message: "No user with the ID found" });
  }
  res.status(200).send(user);
});

module.exports = router;
