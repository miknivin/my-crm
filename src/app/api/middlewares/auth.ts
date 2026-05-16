import jwt from "jsonwebtoken";
import { NextRequest } from "next/server";
import User, { IUser } from "@/app/models/User";
import dbConnect from "@/app/lib/db/connection";

interface JwtPayload {
  id: string;
}

export const isAuthenticatedUser = async (req: NextRequest): Promise<IUser> => {
  await dbConnect();
  const token = req.cookies.get("token")?.value;

  if (!token) {
    throw new Error("You need to login to access this resource");
  }

  const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as JwtPayload;
  const user = await User.findById(decoded.id);

  if (!user) {
    throw new Error("User not found. Please login again.");
  }

  return user;
};

export const authorizeRoles = (user: IUser, ...roles: string[]): void => {
  if (!roles.includes(user.role)) {
    throw new Error("Not allowed");
  }
};