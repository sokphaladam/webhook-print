import dayjs from "dayjs";
import { Router } from "express";
import getKnex from "../database/connection";

const router = Router();

interface table_print_queue {
  id?: number;
  created_at: string;
  created_by: string;
  content: any[];
  printer_info: {
    name?: string;
    printer_name?: string;
    status?: string;
    [key: string]: any;
  };
}

router.get("/", async (req, res) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }
  const db = await getKnex();
  const query = db("order_items")
    .select(
      "orders.id as orderId",
      "order_items.id",
      "products.code",
      "products.title as title", //
      "orders.set", //
      "delivery.name as delivery", //
      "orders.delivery_code", //
      "order_items.printed_at as date", //
      "product_sku.name as sku", //
      "order_items.qty as qty", //
      "order_items.addons", //
      "remark", //
      "users.display_name as order_by" //
    )
    .innerJoin("orders", "orders.id", "order_items.order_id")
    .innerJoin("products", "products.id", "order_items.product_id")
    .innerJoin("product_sku", "product_sku.id", "order_items.sku_id")
    .leftJoin("delivery", "delivery.id", "orders.delivery_id")
    .leftJoin("users", "users.id", "order_items.created_by")
    .where("order_items.is_print", false)
    .andWhere("orders.status", "=", "1")
    .orderBy("order_items.printed_at", "asc")
    .limit(5)
    .offset(0);

  if (req.query.keyword) {
    console.log("Filter by keyword: " + req.query.keyword);
    query.andWhereRaw("LEFT(products.code, 2) = ?", [req.query.keyword]);
  }

  const items = await query.select();

  const result: table_print_queue[] = items.map((x) => {
    const date = dayjs(new Date(x.date)).format("YYYY-MM-DD HH:mm:ss");
    const contentToPrint: Record<string, unknown>[] = [
      {
        type: "text",
        value: `តុលេខ: ${x.set > 50 ? "D" + x.set : x.set}`,
        style: {
          fontSize: "20px",
          fontWeight: "bold",
          fontFamily: `Hanuman, 'Courier New', Courier, monospace`,
        },
      },
      {
        type: "text",
        value: `កាលបរិច្ឆេទ: ${date}`,
        style: {
          fontSize: "18px",
          fontWeight: "bold",
          fontFamily: `Hanuman, 'Courier New', Courier, monospace`,
        },
      },
      {
        type: "text",
        value: `បញ្ជាទិញដោយ: ${x.order_by}`,
        style: {
          fontSize: "18px",
          fontWeight: "bold",
          fontFamily: `Hanuman, 'Courier New', Courier, monospace`,
        },
      },
    ];

    if (x.delivery) {
      contentToPrint.push({
        type: "text",
        value: `ប្រភេទ: វេចខ្ចប់ (${x.delivery}-${x.delivery_code}) `,
        style: {
          fontSize: "18px",
          fontWeight: "bold",
          fontFamily: `Hanuman, 'Courier New', Courier, monospace`,
        },
      });
    }

    contentToPrint.push(
      {
        type: "text",
        value: `ចំនួន: x${x.qty}`,
        style: {
          fontSize: "18px",
          fontWeight: "bold",
          fontFamily: `Hanuman, 'Courier New', Courier, monospace`,
        },
      },
      {
        type: "text",
        value: "--------------------------------",
        style: {
          fontFamily: `Hanuman, 'Courier New', Courier, monospace`,
        },
      },
      {
        type: "text",
        value: `ទំនិញ:   ${x.title} (${x.sku})`,
        style: {
          fontSize: "18px",
          fontWeight: "bold",
          fontFamily: `Hanuman, 'Courier New', Courier, monospace`,
          whiteSpace: "pre-wrap",
          width: "257px",
          display: "block",
          wordBreak: "break-word",
        },
      }
    );

    if (x.addons) {
      contentToPrint.push({
        type: "text",
        value: `   + ${x.addons}`,
        style: {
          fontSize: "18px",
          fontWeight: "bold",
          fontFamily: `Hanuman, 'Courier New', Courier, monospace`,
        },
      });
    }
    if (x.remark) {
      contentToPrint.push({
        type: "text",
        value: `   + ${x.remark}`,
        style: {
          fontSize: "18px",
          fontWeight: "bold",
          fontFamily: `Hanuman, 'Courier New', Courier, monospace`,
        },
      });
    }
    contentToPrint.push({
      type: "text",
      value: "--------------------------------",
      style: {
        fontFamily: `Hanuman, 'Courier New', Courier, monospace`,
      },
    });
    contentToPrint.push({
      type: "qrCode",
      value: `${x.id}`,
      width: "100",
      height: "100",
      style: {
        textAlign: "center",
        fontFamily: "Hanuman, 'Courier New', Courier, monospace",
        margin: "10 20px 20 20px",
      },
      fontsize: 12,
    });

    let printer = "Print to Chasier";

    if (x.code.substring(0, 2) === "SD") {
      console.log("Print to SD " + x.id);
      printer = "Print to Chasier";
    } else if (x.code.substring(0, 2) === "BL") {
      console.log("Print to BL" + x.id);
      printer = "Printe to BL";
    } else if (x.code.substring(0, 2) === "GR") {
      console.log("Print to GR" + x.id);
      printer = "Print to GR_";
    } else if (x.code.substring(0, 2) === "FR") {
      console.log("Print to FR" + x.id);
      printer = "Print to FR_";
    } else if (x.code.substring(0, 2) === "FT") {
      console.log("print to FT" + x.id);
      printer = "Print to FT";
    } else if (x.code.substring(0, 2) === "SN") {
      console.log("print to FT" + x.id);
      printer = "Print to SN";
    }

    return {
      id: x.id,
      created_at: x.created_at,
      created_by: x.created_by,
      content: contentToPrint,
      printer_info: {
        name: "",
        printer_name: printer,
      },
    };
  });
  res.json({ result });
});

router.delete("/delete", async (req, res) => {
  if (!req.headers.authorization) {
    return res.status(401).json({ status: "error", message: "Unauthorized" });
  }

  const db = await getKnex();
  const ids: number[] = req.body.ids;

  await db("order_items").whereIn("id", ids).update({ is_print: true });
  res.json({ status: "ok", message: "Deleted successfully" });
});

export default router;
