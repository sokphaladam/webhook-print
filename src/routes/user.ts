import { Router } from "express";
import getKnex from "../database/connection";
import md5 from "md5";

const router = Router();

router.post("/auth/login", async (req, res) => {
  const db = await getKnex();
  const items = await db
    .table("users")
    .where({ username: req.body.username })
    .first();

  if (items) {
    if (items.password === md5(req.body.password)) {
      res.json({
        token: items.token,
      });
    } else {
      res.status(401).json({ status: "error", message: "Invalid password" });
    }
  } else {
    res.status(401).json({ status: "error", message: "User not found" });
  }
});

export default router;
