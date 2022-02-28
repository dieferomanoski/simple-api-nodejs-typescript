import { Router } from "express";
import multer from "multer";
import { celebrate, Joi } from "celebrate";
import connection from "../database/connection";
import multerConfig from "../config/multer";
import isAuthenticated from "../middlewares/isAuthenticated";

const locationsRouter = Router();

const upload = multer(multerConfig);

locationsRouter.use(isAuthenticated);

locationsRouter.get("/", async (request, response) => {
  const { city, uf, items } = request.query;

  if (items) {
    const parsedItems: Number[] = String(items)
      .split(",")
      .map((item) => Number(item.trim()));

    const locations = await connection("locations")
      .join("location_items", "locations.id", "=", "location_items.location_id")
      .whereIn("location_items.item_id", parsedItems)
      .where("city", "like", `%${city ? String(city) : ""}%`)
      .where("uf", "like", `%${uf ? String(uf) : ""}%`)
      .distinct()
      .select("locations.*");
    return response.json(locations);
  } else {
    const locations = await connection("locations").select("*");
    return response.json(locations);
  }
});

locationsRouter.get("/:id", async (request, response) => {
  const { id } = request.params;

  const location = await connection("locations").where("id", id).first();

  if (!location) {
    return response.status(400).json({ message: "Location not found." });
  }

  const items = await connection("items")
    .join("location_items", "items.id", "=", "location_items.item_id")
    .where("location_items.location_id", id)
    .select("items.title");

  return response.json({
    location,
    items,
  });
});

locationsRouter.post(
  "/",
  celebrate(
    {
      body: Joi.object().keys({
        name: Joi.string().required(),
        email: Joi.string().email().required(),
        whatsapp: Joi.string().required(),
        latitude: Joi.number().required(),
        longitude: Joi.number().required(),
        city: Joi.string().required(),
        uf: Joi.string().max(2).required(),
        items: Joi.array().required(),
      }),
    },
    {
      abortEarly: false,
    }
  ),
  async (request, response) => {
    const { name, email, whatsapp, latitude, longitude, city, uf, items } =
      request.body;

    const location = {
      image: "fake_image.jpg",
      name,
      email,
      whatsapp,
      latitude,
      longitude,
      city,
      uf,
    };

    //transaction started
    const transaction = await connection.transaction();

    const newIds = await transaction("locations").insert(location);

    const location_id = newIds[0];

    const locationItems = items.map((item_id: number) => {
      const selectedItem = transaction("items").where("id", item_id).first();

      if (!selectedItem) {
        return response.status(400).json({ message: "Item not found." });
      }

      return {
        item_id,
        location_id,
      };
    });

    await transaction("location_items").insert(locationItems);

    //transaction ended
    await transaction.commit();

    return response.json({
      id: location_id,
      ...location,
    });
  }
);

locationsRouter.put(
  "/:id",
  upload.single("image"),
  async (request, response) => {
    const { id } = request.params;

    const image = request.file?.filename;

    const location = await connection("locations").where("id", id).first();

    if (!location) {
      return response.status(400).json({ message: "Location not found!" });
    }

    const locationUpdated = {
      ...location,
      image,
    };

    await connection("locations").update(locationUpdated).where("id", id);

    return response.json(locationUpdated);
  }
);
export default locationsRouter;
