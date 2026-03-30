const { Resend } = require("resend");
require("dotenv").config();

const resend = new Resend(process.env.RESEND_APIKEY);

async function testEmail() {
  try {
    console.log("🧪 Testing email sending...");

    const { data, error } = await resend.emails.send({
      from: "Voulti <noreply@notifications.voulti.com>",
      to: ["csacanam@gmail.com"],
      subject: "🧪 Test Email - Vault Listener",
      html: `
        <h1>Test Email</h1>
        <p>This is a test email to verify that Resend is working correctly.</p>
        <p>If you receive this email, the email service is working!</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
      `,
    });

    if (error) {
      console.error("❌ Email error:", error);
    } else {
      console.log("✅ Email sent successfully:", data);
    }
  } catch (error) {
    console.error("❌ Failed to send email:", error);
  }
}

testEmail();
