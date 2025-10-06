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
    }
  }

  res.json(items);
});

export default router;
