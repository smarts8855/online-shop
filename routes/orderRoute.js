const express = require("express");
const isLogin = require("../middlewares/isLogin");
const { Order } = require("../model/Order");
const appErr = require("../helper/appErr");
const { OrderItem } = require("../model/Order-Item");
const isAdmin = require("../middlewares/isAdmin");
const { populate } = require("dotenv");
const router = express.Router();

//post method
router.post("/", isLogin, async (req, res) => {
  const {
    orderItems,
    shippingAddress1,
    shippingAddress2,
    city,
    zip,
    country,
    phone,
    status,
    totalPrice,
  } = req.body;
  const orderItemsIds = Promise.all(
    orderItems.map(async (orderItem) => {
      let newOrderItem = new OrderItem({
        quantity: orderItem.quantity,
        product: orderItem.product,
      });
      newOrderItem = await newOrderItem.save();
      return newOrderItem._id;
    })
  );
  const orderItemsIdResolved = await orderItemsIds;
  const totalPrices = await Promise.all(
    orderItemsIdResolved.map(async (orderItemId) => {
      const orderItem = await OrderItem.findById(orderItemId).populate(
        "product",
        "price"
      );
      const totalSum = orderItem.product.price * orderItem.quantity;
      return totalSum;
    })
  );

  const sum = totalPrices.reduce((a, b) => a + b, 0);

  let order = new Order({
    orderItems: orderItemsIdResolved,
    shippingAddress1,
    shippingAddress2,
    city,
    zip,
    country,
    phone,
    status,
    totalPrice: sum,
    user: req.userAuth,
  });
  order = await order.save();
  if (!order) {
    res.status(404).send("Order cannot be created.");
  }

  res.send(order);
});
router.get("/", isLogin, isAdmin, async (req, res, next) => {
  const orderList = await Order.find();
  if (!orderList) {
    return next(appErr(`Order cannot found`, 404));
  }
  res.send(orderList);
});

router.get("/single-order", isLogin, async (req, res, next) => {
  const order = await Order.find({ user: req.userAuth })
    .populate("user", "name")
    .populate({
      path: "orderItems",
      populate: { path: "product", populate: "category" },
    })
    .sort({ dateOrdered: -1 });
  if (!order) {
    return next(appErr("order with the ID is not found", 403));
  }
  res.send(order);
});

router.get(`/get/count`, isLogin, isAdmin, async (req, res, next) => {
  const orderCount = await Order.countDocuments();

  if (!orderCount) {
    return next(appErr("order not found", 403));
  }

  res.send({
    orderCount: orderCount,
  });
});

router.get(`/get/totalsales`, async (req, res, next) => {
  const totalSales = await Order.aggregate([
    { $group: { _id: null, totalsales: { sum: "$totalPrice" } } },
  ]);

  if (!totalSales) {
    return next(appErr("The order sales cannot be generated", 403));
  }
  res.send({ totalSales: totalSales.pop().totalSales });
});

module.exports = router;
