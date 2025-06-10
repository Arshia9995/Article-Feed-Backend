import nodemailer from 'nodemailer';

export const sendOTPEmail = async (email: string, otp: string) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAILER_USER,
      pass: process.env.MAILER_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.MAILER_USER,
    to: email,
    subject: 'InsightFeed OTP Verification',
    html: `
      <h2>Verify Your Email</h2>
      <p>Your OTP is <strong>${otp}</strong>. It is valid for 10 minutes.</p>
      <p>Do not share this OTP with anyone.</p>
    `,
  };

  await transporter.sendMail(mailOptions);
};