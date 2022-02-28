import { Router } from "express";
import { hash } from "bcryptjs";
import connection from "../database/connection";

const usersRouter = Router();

usersRouter.get("/", async (request, response) => {
  const users = await connection("users").select("*");

  return response.json(users);
});

usersRouter.post("/", async (request, response) => {
  const { username, password } = request.body;

  const passwordHashed = await hash(password, 8);

  const user = { username, password: passwordHashed };

  const newIds = await connection("users").insert(user);

  return response.json({
    id: newIds[0],
    ...user,
  });
});

export default usersRouter;
