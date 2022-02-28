import { Router } from "express";
import connection from "../database/connection";

const itemsRouter = Router();

itemsRouter.get("/", async (request, response) => {
  const items = await connection("items").select("*");
  const serializedItems = items.map((item) => {
    return {
      id: item.id,
      title: item.title,
      image_url: `http://localhost:3333/uploads/${item.image}`,
    };
  });

  return response.json(serializedItems);
});

export default itemsRouter;
