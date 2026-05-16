import { IUser } from "@/app/models/User";
import { NextResponse } from "next/server";

// Define the response interface
interface TokenResponse {
  success: boolean;
  token: string;
  user: {
    id?: string; // Made optional to match IUser's _id
    name?: string;
    email: string;
  };
}

const sendToken = (user: IUser, statusCode: number): NextResponse<TokenResponse> => {
  const token = user.getJwtToken();

  // Set cookie options without sameSite
  const cookieOptions: {
    httpOnly: boolean;
    secure: boolean;
    maxAge: number;
    path: string;
  } = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    maxAge: (Number(process.env.COOKIE_EXPIRES_TIME) || 7) * 24 * 60 * 60,
    path: "/",
  };

  // Create the response
  const response = NextResponse.json(
    {
      success: true,
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
      },
    },
    { status: statusCode }
  );

  // Set the cookie in the response headers
  response.cookies.set("token", token, cookieOptions);

  return response;
};

export default sendToken;