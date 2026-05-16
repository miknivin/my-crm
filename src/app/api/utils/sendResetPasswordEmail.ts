import nodemailer from "nodemailer";

export async function sendPasswordResetEmail(email: string, resetToken: string) {
  try {
    // Create transporter for Zoho SMTP
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || "587"),
      secure: false, // Use TLS
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });

    // Email content
    const resetUrl = `${process.env.NEXT_PUBLIC_APP_URL}/signin?page=forget-password&token=${resetToken}`;
    const mailOptions = {
      from: `"${process.env.SMTP_FROM_NAME}" <${process.env.SMTP_FROM_EMAIL}>`,
      to: email,
      subject: "Password Reset Request",
      html: `
        <h2>Password Reset Request</h2>
        <p>You requested to reset your password. Please click the link below to reset it:</p>
        <a href="${resetUrl}" style="background-color: #4CAF50; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block;">
          Reset Password
        </a>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
    };

    // Send email
    await transporter.sendMail(mailOptions);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (error: any) {
    console.error("Error sending password reset email:", error);
    throw new Error("Failed to send password reset email");
  }
}