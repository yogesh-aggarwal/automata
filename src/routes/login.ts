import { Request, Response } from "express";

export function rootLogin(req: Request, res: Response) {
  res.send("Hello World");
}