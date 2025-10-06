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
  const items = await db
    .table("order_items")
    .innerJoin("orders", "order_items.order_id", "orders.id")
    .innerJoin("users", "order_items.created_by", "users.id")
    .innerJoin("delivery", "delivery.id", "orders.delivery_id")
    .innerJoin("products", "products.id", "order_items.product_id")
    .innerJoin("product_sku", "product_sku.id", "order_items.sku_id")
    .where({ is_print: 0, "order_items.status": "1" })
    .whereNot({ "orders.status": "4" })
    .limit(5)
    .select([
      "order_items.id",
      "order_items.qty",
      "orders.set",
      "order_items.created_at as created_at",
      "users.display_name as created_by",
      "delivery.name as delivery_name",
      "orders.delivery_code",
      "products.title",
      "product_sku.name as sku_name",
      "order_items.addons",
      "order_items.remark",
    ]);

  const result: table_print_queue[] = items.map((x) => {
    const contentToPrint: Record<string, unknown>[] = [
      {
        type: "text",
        value: `តុលេខ: ${x.set}`,
        style: {
          fontSize: "20px",
          fontWeight: "bold",
          fontFamily: `Hanuman, 'Courier New', Courier, monospace`,
        },
      },
      {
        type: "text",
        value: `កាលបរិច្ឆេទ: ${x.created_at}`,
        style: {
          fontSize: "18px",
          fontWeight: "bold",
          fontFamily: `Hanuman, 'Courier New', Courier, monospace`,
        },
      },
      {
        type: "text",
        value: `បញ្ជាទិញដោយ: ${x.created_by}`,
        style: {
          fontSize: "18px",
          fontWeight: "bold",
          fontFamily: `Hanuman, 'Courier New', Courier, monospace`,
        },
      },
    ];

    if (x.delivery_name) {
      contentToPrint.push({
        type: "text",
        value: `ប្រភេទ: វេចខ្ចប់ (${x.delivery_name}-${x.delivery_code}) `,
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
        value: `ទំនិញ:   ${x.title} (${x.sku_name})`,
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
        value: `   + ${x.remarks}`,
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

    return {
      id: x.id,
      created_at: x.created_at,
      created_by: x.created_by,
      content: contentToPrint,
      printer_info: {
        name: "",
        printer_name: "",
      },
    };
  });
  res.json({ result });
});

export default router;
